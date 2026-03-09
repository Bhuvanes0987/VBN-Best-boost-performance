from flask import Blueprint, request, jsonify
from extension import db
from models.question_model import Question
from models.subject_model import Subject
from datetime import datetime
import json

question_bp = Blueprint("questions", __name__)


@question_bp.route("/questions", methods=["POST"])
def create_question():

    data = request.json

    subject = Subject.query.get(data["subject_id"])

    if not subject:
        return jsonify({"error": "Subject not found"}), 400

    # Validate subject belongs to class
    if not any(c.id == data["class_id"] for c in subject.classes):
        return jsonify({"error": "Subject not assigned to this class"}), 400

    question = Question(
        question_text=data["question"],
        question_type=data["type"],
        class_id=data["class_id"],
        subject_id=data["subject_id"],
        answer_data=json.dumps(data.get("answer_data")),
        map_image=data.get("map_image"),
        created_by="admin"
    )

    db.session.add(question)
    db.session.commit()

    return jsonify({"message": "Question created successfully"})

@question_bp.route("/questions", methods=["GET"])
def get_questions():

    questions = Question.query.filter_by(status=1).all()

    result = []

    for q in questions:

        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "class_id": q.class_id,
            "subject_id": q.subject_id,
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

    subjects = Subject.query.filter_by(status=1).all()

    result = []

    for s in subjects:
        # check if subject belongs to this class
        if any(c.id == class_id for c in s.classes):

            result.append({
                "id": s.id,
                "subject_name": s.subject_name
            })

    return jsonify({"subjects": result})