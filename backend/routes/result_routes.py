from flask import Blueprint, request, jsonify
from extension import db
from models.test_result_model import TestResult
from models.subject_model import Subject
from models.unit_model import Unit
from datetime import datetime, timezone

result_bp = Blueprint("results", __name__)

@result_bp.route("/results", methods=["GET"])
def get_results():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"message": "user_id required"}), 400

    results = TestResult.query.filter_by(user_id=int(user_id))\
                              .order_by(TestResult.taken_at.desc()).all()
    data = []
    for r in results:
        subject_name = None
        unit_name = None
        if r.subject_id:
            s = Subject.query.get(r.subject_id)
            subject_name = s.subject_name if s else None
        if r.unit_id:
            u = Unit.query.get(r.unit_id)
            unit_name = f"Unit {u.unit_number}: {u.unit_name}" if u else None

        data.append({
            "id": r.id,
            "subject_name": subject_name,
            "unit_name": unit_name,
            "total_questions": r.total_questions,
            "correct_answers": r.correct_answers,
            "score_percent": round(r.score_percent, 1) if r.score_percent else 0,
            "test_type": r.test_type,
            "taken_at": r.taken_at.isoformat() if r.taken_at else None
        })
    return jsonify({"results": data})


@result_bp.route("/results/stats", methods=["GET"])
def get_stats():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"stats": {}}), 400

    results = TestResult.query.filter_by(user_id=int(user_id)).all()
    if not results:
        return jsonify({"stats": {
            "totalTests": 0, "avgScore": 0,
            "bestScore": 0, "streak": 0
        }})

    scores = [r.score_percent for r in results if r.score_percent is not None]
    avg = round(sum(scores) / len(scores), 1) if scores else 0
    best = round(max(scores), 1) if scores else 0

    return jsonify({"stats": {
        "totalTests": len(results),
        "avgScore": avg,
        "bestScore": best,
        "streak": 0 
    }})


@result_bp.route("/results", methods=["POST"])
def save_result():
    data = request.json
    result = TestResult(
        user_id=data["user_id"],
        school_id=data.get("school_id"),
        class_id=data.get("class_id"),
        subject_id=data.get("subject_id"),
        unit_id=data.get("unit_id"),
        total_questions=data["total_questions"],
        correct_answers=data["correct_answers"],
        score_percent=round((data["correct_answers"] / data["total_questions"]) * 100, 1),
        test_type=data.get("test_type", "subject_test"),
        taken_at=datetime.now(timezone.utc)
    )
    db.session.add(result)
    db.session.commit()
    return jsonify({"message": "Result saved", "id": result.id}), 201