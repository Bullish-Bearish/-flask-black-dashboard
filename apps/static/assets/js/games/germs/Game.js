import Germs from './Germs.js';
import Player from './Player.js';
import Pickups from './Pickups.js';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.player;
        this.germs;
        this.pickups;

        this.introText;
        this.scoreText;
        this.topText;
        this.score = 0;
        this.highscore = 0;
        this.newHighscore = false;

        this.top1 = 0
        this.top2 = 0

        this.startTime = 0
    }

    create ()
    {
        var data = JSON.stringify({
            req_type: 'getScore'
        })

        this.registry.set("startTime", new Date().getTime())
        this.score = 0;
        this.highscore = this.registry.get('highscore');
        this.newHighscore = false;
        this.getHighScore(data, false) // Freeze here to get the initial high score from server

        this.add.image(400, 300, 'background').setScale(2);

        this.germs = new Germs(this.physics.world, this);

        this.pickups = new Pickups(this.physics.world, this);

        this.player = new Player(this, 400, 400);

        this.scoreText = this.add.bitmapText(16, 12, 'slime', 'Score   0', 40).setDepth(1);
        this.highscoreText = this.add.bitmapText(600, 12, 'slime', 'Best   ' + this.registry.get("top1"), 40).setDepth(1);
        this.topText = this.add.bitmapText(400, 200, 'slime', '', 60).setOrigin(0.5).setCenterAlign().setDepth(1);
        this.introText = this.add.bitmapText(400, 400, 'slime', 'Avoid the Germs\nCollect the Rings', 60).setOrigin(0.5).setCenterAlign().setDepth(1);


        this.pickups.start();

        this.input.once('pointerdown', () => {

            this.player.start();
            this.germs.start();

            this.sound.play('start');

            this.tweens.add({
                targets: this.introText,
                alpha: 0,
                duration: 300
            });

        });

        this.physics.add.overlap(this.player, this.pickups, (player, pickup) => this.playerHitPickup(player, pickup));
        this.physics.add.overlap(this.player, this.germs, (player, germ) => this.playerHitGerm(player, germ));
    }

    playerHitGerm (player, germ)
    {
        //  We don't count a hit if the germ is fading in or out
        if (player.isAlive && germ.alpha === 1)
        {
            this.gameOver();
        }
    }

    playerHitPickup (player, pickup)
    {
        this.score++;

        this.scoreText.setText('Score   ' + this.score);

        if (!this.newHighscore && this.score > this.highscore)
        {
            if (this.highscore > 0)
            {
                //  Only play the victory sound if they actually set a new highscore
                this.sound.play('victory');
            }
            else
            {
                this.sound.play('pickup');
            }

            this.newHighscore = true;
        }
        else
        {
            this.sound.play('pickup');
        }

        this.pickups.collect(pickup);
    }

    gameOver ()
    {
        this.player.kill();
        this.germs.stop();

        this.sound.stopAll();
        this.sound.play('fail');

        this.introText.setText('Game Over!');

        this.tweens.add({
            targets: this.introText,
            alpha: 1,
            duration: 300
        });

        this.add.image(400, 450, 'QrPic').setScale(0.5);
        if (this.newHighscore)
        {
            this.registry.set('highscore', this.score);
        }

        var endTime = new Date().getTime()
        var duration = endTime - this.registry.get("startTime")
        // AVOID CHEATING
        // Score is about linearly scale with duration (in s) with a ration of 1:1
        // Score must be less than 2 times of duration (in s) to be valid
        // If not valid, send duration and score of -1 to server
        // TODO: do better?
        var validScore = this.score <= 2*duration/1000.0
        var data = this.prepare_data("submitScore", "1", "A", this.score, duration, validScore)

        this.getHighScore(data, true)
        // Note as the getHighScore is async, the following might not get the latest result
        var top1 = this.registry.get('top1')
        var top2 = this.registry.get('top2')
        console.log("Score: " + top1 + "," + top2)

        if (validScore) {
            if (this.score > top1) {
                this.highscoreText.setText('Best   ' + this.score);
                this.topText.setText('You are the best');
            } else if (this.score > top2) {
                this.topText.setText('You are the runner-up');
            } else {
                this.topText.setText('Earn ' + top2 + " to move\nto the next tier!");
            }
        } else {
            this.topText.setText('Sorry! Something wrong!');
        }

        this.tweens.add({
            targets: this.topText,
            alpha: 1,
            duration: 300
        });


        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }

    getPlayer (target)
    {
        target.x = this.player.x;
        target.y = this.player.y;

        return target;
    }

    getHighScore (data, async)
    {
        var server_url = window.location.protocol + "//" + window.location.host + "/highscores/germs"
        var top1 = 0
        var top2 = 0
        var xhr = new XMLHttpRequest()
        var context = this

        xhr.open("POST", server_url, async)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                top1 = json.top1
                top2 = json.top2
                context.set_tops(context, json.top1, json.top2)
            }
        }
        xhr.send(data)
        return 0
    }

    set_tops(context, top1, top2) {
        context.registry.set('top1', top1)
        context.registry.set('top2', top2)
    }

    prepare_data(req_type, id, name, score, duration, valid) {
        if (valid) {
            return JSON.stringify({
                req_type: req_type,
                id: id,
                name: name,
                score: this.score,
                duration: duration
            })
        } else {
            return JSON.stringify({
                req_type: req_type,
                id: id,
                name: name,
                score: -1,
                duration: -1
            })
        }
    }
}
