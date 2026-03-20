from flask import Blueprint, request, jsonify
from extension import db
from models.question_model import Question
from models.subject_model import Subject
from models.unit_model import Unit
from datetime import datetime
import json

question_bp = Blueprint("questions", __name__)

@question_bp.route("/questions", methods=["POST"])
def create_question():
    data = request.json

    subject = Subject.query.get(data["subject_id"])
    if not subject:
        return jsonify({"error": "Subject not found"}), 400

    if not any(c.id == data["class_id"] for c in subject.classes):
        return jsonify({"error": "Subject not assigned to this class"}), 400

    question = Question(
        question_text=data["question"],
        question_type=data["type"],
        class_id=data["class_id"],
        subject_id=data["subject_id"],
        unit_id=data.get("unit_id"),      
        school_id=data.get("school_id"),  
        answer_data=json.dumps(data.get("answer_data")),
        map_image=data.get("map_image"),
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )
    db.session.add(question)
    db.session.commit()
    return jsonify({"message": "Question created successfully", "id": question.id}), 201


@question_bp.route("/questions", methods=["GET"])
def get_questions():
    school_id = request.args.get("school_id")
    class_id = request.args.get("class_id")
    subject_id = request.args.get("subject_id")
    unit_id = request.args.get("unit_id")

    query = Question.query.filter_by(status=1)
    if school_id:  query = query.filter_by(school_id=int(school_id))
    if class_id:   query = query.filter_by(class_id=int(class_id))
    if subject_id: query = query.filter_by(subject_id=int(subject_id))
    if unit_id:    query = query.filter_by(unit_id=int(unit_id))

    questions = query.all()
    result = []
    for q in questions:
        # Get unit name
        unit_name = None
        if q.unit_id:
            unit = Unit.query.get(q.unit_id)
            unit_name = f"Unit {unit.unit_number}: {unit.unit_name}" if unit else None

        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "class_id": q.class_id,
            "subject_id": q.subject_id,
            "unit_id": q.unit_id,
            "unit_name": unit_name,
            "school_id": q.school_id,
            "answer_data": json.loads(q.answer_data) if q.answer_data else None
        })
    return jsonify({"questions": result})


@question_bp.route("/questions/<int:id>", methods=["PUT"])
def update_question(id):
    question = Question.query.get_or_404(id)
    data = request.json

    question.question_text = data["question"]
    question.question_type = data["type"]
    question.class_id = data["class_id"]
    question.subject_id = data["subject_id"]
    question.unit_id = data.get("unit_id")      
    question.school_id = data.get("school_id")  
    question.answer_data = json.dumps(data.get("answer_data"))
    question.map_image = data.get("map_image")
    question.updated_at = datetime.utcnow()
    question.updated_by = "admin"

    db.session.commit()
    return jsonify({"message": "Question updated successfully"})


@question_bp.route("/questions/<int:id>", methods=["DELETE"])
def delete_question(id):
    question = Question.query.get_or_404(id)
    question.status = 0
    question.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Question deleted"})


@question_bp.route("/subjects-by-class/<int:class_id>", methods=["GET"])
def subjects_by_class(class_id):
    from models.unit_model import Unit
    subjects = Subject.query.filter_by(status=1).all()
    result = []
    for s in subjects:
        if any(c.id == class_id for c in s.classes):
            units = Unit.query.filter_by(subject_id=s.id, status=1)\
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
    import random as rnd
    class_id = request.args.get("class_id")
    school_id = request.args.get("school_id")
    limit = int(request.args.get("limit", 20))

    if not class_id:
        return jsonify({"error": "class_id required"}), 400

    questions = Question.query.filter_by(
        class_id=int(class_id),
        school_id=int(school_id) if school_id else Question.school_id,
        status=1
    ).all()

    selected = rnd.sample(questions, min(limit, len(questions)))
    result = [{
        "id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "subject_id": q.subject_id,
        "unit_id": q.unit_id,
        "answer_data": json.loads(q.answer_data) if q.answer_data else None
    } for q in selected]

    return jsonify({"questions": result})