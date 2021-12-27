# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from apps.highscores import blueprint
from flask import render_template, request, jsonify
from flask_login import login_required
from flask import Response
from jinja2 import TemplateNotFound
import pandas as pd
import json
from datetime import datetime
import os.path


# Table format: (id[String], name[String], score[Int], duration[Int], timestamp[String])
record_init = dict(
    id="",
    name="",
    score=0,
    duration=0,
    timestamp="",
)


@blueprint.route('/<game>', methods=['GET', 'POST'])
# @login_required
def highscores_template(game):
    content = request.json
    req_type = content.get('req_type', "")
    id = content.get('id', "")
    name = content.get('name', "")
    score = content.get('score', 0)
    duration = content.get('duration', 0)

    now = datetime.now()
    current_date = now.strftime("%Y-%m-%d")
    file_name = "apps/highscores/{}/{}.csv".format(game, current_date)

    record = record_init.copy()
    record["id"] = id
    record["name"] = name
    record["score"] = score
    record["duration"] = duration
    record["timestamp"] = now.strftime("%Y-%m-%d %H:%M:%S")

    # If file not exists, create one
    # TODO: good with concurrency?
    if not os.path.isfile(file_name):
        file = open(file_name, "w")
        file.write(",".join(record.keys()))
        file.write("\n" + ",".join([str(item) for item in record_init.values()]))
        file.close()

    score_table = pd.read_csv(file_name)
    best_scores = score_table \
                      .sort_values("score", ascending=False) \
                      .drop_duplicates(subset=["score"], keep='first') \
                      .score.tolist()[:2]
    best_scores = best_scores + [0] * (2 - len(best_scores))

    json_string = dict(
        top1=best_scores[0],
        top2=best_scores[1]
    )

    if req_type == "submitScore":
        file = open(file_name, "a")
        file.write("\n" + ",".join([str(item) for item in record.values()]))
        return Response(
            json.dumps(json_string),
            status=200
        )
    elif req_type == "getScore":
        return Response(
            json.dumps(json_string),
            status=200
        )
    else:
        return Response(
            "Request type not found",
            status=400
        )
