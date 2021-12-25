export default class QR extends Phaser.Scene
{
    constructor ()
    {
        super('QR');
    }

    create ()
    {
        this.add.image(400, 300, 'QrPic').setScale(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}