from flask import Blueprint, request, jsonify
from extension import db
from models.question_model import Question
from models.subject_model import Subject
from models.unit_model import Unit
from datetime import datetime, timezone
import json
import random as rnd
import re

question_bp = Blueprint("questions", __name__)


def _normalize_match_like_answer_data(answer_data):
    """Normalize match-style payload into {'pairs': [...], 'options': [...]} format."""
    data = answer_data or {}
    pairs = data.get("pairs") if isinstance(data, dict) else []
    options = data.get("options") if isinstance(data, dict) else []

    clean_pairs = []
    for p in pairs or []:
        if not isinstance(p, dict):
            continue
        left = (p.get("left") or "").strip()
        right = (p.get("right") or "").strip()
        if left and right:
            clean_pairs.append({"left": left, "right": right})

    clean_options = []
    for o in options or []:
        txt = (o or "").strip()
        if txt:
            clean_options.append(txt)

    return {"pairs": clean_pairs, "options": clean_options}


BASE64_REGEX = re.compile(r'^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$')

def _sanitize_map_image(value):
    if not value or not isinstance(value, str):
        return None

    cleaned = value.strip()
    cleaned = re.sub(r'\s+', '', cleaned)
    cleaned = re.sub(r':\d+$', '', cleaned)

    if cleaned.startswith('data:'):
        parts = cleaned.split(',', 1)
        if len(parts) != 2:
            return None
        header, payload = parts
        payload = re.sub(r'[^A-Za-z0-9+/=]', '', payload)
        if not BASE64_REGEX.match(payload):
            return None
        return f'{header},{payload}'

    payload = re.sub(r'[^A-Za-z0-9+/=]', '', cleaned)
    if not BASE64_REGEX.match(payload):
        return None
    return f'data:image/png;base64,{payload}'


def serialize_question(q, include_map=True):
    """Shared serializer so map_image is never forgotten."""
    unit_name = None
    if q.unit_id:
        unit = Unit.query.get(q.unit_id)
        unit_name = f"Unit {unit.unit_number}: {unit.unit_name}" if unit else None

    return {
        "id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "class_id": q.class_id,
        "subject_id": q.subject_id,
        "unit_id": q.unit_id,
        "unit_name": unit_name,
        "school_id": q.school_id,
        "answer_data": json.loads(q.answer_data) if q.answer_data else None,
        # Always include sanitized map_image so the frontend can render it
        "map_image": _sanitize_map_image(q.map_image) if include_map else None,
    }


@question_bp.route("/questions", methods=["POST"])
def create_question():
    data = request.json

    subject = Subject.query.get(data["subject_id"])
    if not subject:
        return jsonify({"error": "Subject not found"}), 400

    if not any(c.id == data["class_id"] for c in subject.classes):
        return jsonify({"error": "Subject not assigned to this class"}), 400

    q_type = data.get("type")
    answer_data = data.get("answer_data")
    map_image = _sanitize_map_image(data.get("map_image"))

    if q_type in ("match", "map"):
        answer_data = _normalize_match_like_answer_data(answer_data)
        if len(answer_data["pairs"]) < 1:
            return jsonify({"error": "At least one valid pair is required"}), 400

    if q_type == "map" and not map_image:
        return jsonify({"error": "Map image is required for map questions"}), 400

    question = Question(
        question_text=data["question"],
        question_type=q_type,
        class_id=data["class_id"],
        subject_id=data["subject_id"],
        unit_id=data.get("unit_id"),
        school_id=data.get("school_id"),
        answer_data=json.dumps(answer_data) if answer_data else None,
        map_image=map_image,
        status=1,
        created_by="admin",
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(question)
    db.session.commit()
    return jsonify({"message": "Question created successfully", "id": question.id}), 201


@question_bp.route("/questions", methods=["GET"])
def get_questions():
    school_id  = request.args.get("school_id")
    class_id   = request.args.get("class_id")
    subject_id = request.args.get("subject_id")
    unit_id    = request.args.get("unit_id")

    # Support comma-separated multi-select values from the frontend
    school_ids  = [int(x) for x in school_id.split(",")  if x.strip()] if school_id  else []
    class_ids   = [int(x) for x in class_id.split(",")   if x.strip()] if class_id   else []
    subject_ids = [int(x) for x in subject_id.split(",") if x.strip()] if subject_id else []
    unit_ids    = [int(x) for x in unit_id.split(",")    if x.strip()] if unit_id    else []

    query = Question.query.filter_by(status=1)
    if school_ids:  query = query.filter(Question.school_id.in_(school_ids))
    if class_ids:   query = query.filter(Question.class_id.in_(class_ids))
    if subject_ids: query = query.filter(Question.subject_id.in_(subject_ids))
    if unit_ids:    query = query.filter(Question.unit_id.in_(unit_ids))

    questions = query.all()
    return jsonify({"questions": [serialize_question(q) for q in questions]})


@question_bp.route("/questions/<int:id>", methods=["PUT"])
def update_question(id):
    question = Question.query.get_or_404(id)
    data = request.json

    q_type = data.get("type")
    answer_data = data.get("answer_data")
    map_image = _sanitize_map_image(data.get("map_image"))

    if q_type in ("match", "map"):
        answer_data = _normalize_match_like_answer_data(answer_data)
        if len(answer_data["pairs"]) < 1:
            return jsonify({"error": "At least one valid pair is required"}), 400

    if q_type == "map" and not map_image:
        return jsonify({"error": "Map image is required for map questions"}), 400

    question.question_text = data["question"]
    question.question_type = q_type
    question.class_id      = data["class_id"]
    question.subject_id    = data["subject_id"]
    question.unit_id       = data.get("unit_id")
    question.school_id     = data.get("school_id")
    question.answer_data   = json.dumps(answer_data) if answer_data else None
    question.map_image     = map_image
    question.updated_at    = datetime.now(timezone.utc)
    question.updated_by    = "admin"

    db.session.commit()
    return jsonify({"message": "Question updated successfully"})


@question_bp.route("/questions/<int:id>", methods=["DELETE"])
def delete_question(id):
    question = Question.query.get_or_404(id)
    question.status     = 0
    question.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Question deleted"})


@question_bp.route("/subjects-by-class/<int:class_id>", methods=["GET"])
def subjects_by_class(class_id):
    subjects = Subject.query.filter_by(status=1).all()
    result = []
    for s in subjects:
        if any(c.id == class_id for c in s.classes):
            units = Unit.query.filter_by(subject_id=s.id, status=1) \
                              .order_by(Unit.unit_number).all()
            result.append({
                "id": s.id,
                "subject_name": s.subject_name,
                "units": [{"id": u.id, "unit_name": u.unit_name,
                           "unit_number": u.unit_number} for u in units]
            })
    return jsonify({"subjects": result})


@question_bp.route("/questions/daily-test", methods=["GET"])
def daily_test():
    class_id        = request.args.get("class_id")
    school_id       = request.args.get("school_id")
    subject_ids_str = request.args.get("subject_ids")
    limit           = int(request.args.get("limit", 20))

    if not class_id:
        return jsonify({"error": "class_id required"}), 400

    query = Question.query.filter_by(class_id=int(class_id), status=1)

    if school_id and school_id != "None":
        query = query.filter_by(school_id=int(school_id))

    if subject_ids_str:
        subject_ids = [int(x) for x in subject_ids_str.split(",") if x.strip()]
        if subject_ids:
            query = query.filter(Question.subject_id.in_(subject_ids))

    questions = query.all()
    if not questions:
        return jsonify({"questions": [], "message": "No questions found for this class"})

    selected = rnd.sample(questions, min(limit, len(questions)))
    # include_map=True so map questions render correctly in the quiz
    return jsonify({"questions": [serialize_question(q) for q in selected]})


@question_bp.route("/questions/subject-test", methods=["GET"])
def subject_test():
    class_id   = request.args.get("class_id")
    subject_id = request.args.get("subject_id")
    unit_id    = request.args.get("unit_id")
    school_id  = request.args.get("school_id")
    limit      = int(request.args.get("limit", 20))

    query = Question.query.filter_by(status=1)
    if class_id:   query = query.filter_by(class_id=int(class_id))
    if subject_id: query = query.filter_by(subject_id=int(subject_id))
    if unit_id and unit_id != "all":
        query = query.filter_by(unit_id=int(unit_id))
    if school_id:  query = query.filter_by(school_id=int(school_id))

    questions = query.all()
    if not questions:
        return jsonify({"questions": [], "message": "No questions found"})

    selected = rnd.sample(questions, min(limit, len(questions)))
    return jsonify({"questions": [serialize_question(q) for q in selected]})