from flask import Blueprint, request, jsonify
from extension import db
from models.test_result_model import TestResult
from models.subject_model import Subject
from models.unit_model import Unit
from models.user_model import User
from models.school_model import School
from sqlalchemy import func, desc
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
        unit_name    = None
        if r.subject_id:
            s = Subject.query.get(r.subject_id)
            subject_name = s.subject_name if s else None
        if r.unit_id:
            u = Unit.query.get(r.unit_id)
            unit_name = f"Unit {u.unit_number}: {u.unit_name}" if u else None

        data.append({
            "id":               r.id,
            "subject_name":     subject_name,
            "unit_name":        unit_name,
            "total_questions":  r.total_questions,
            "correct_answers":  r.correct_answers,
            "score_percent":    round(r.score_percent, 1) if r.score_percent else 0,
            "test_type":        r.test_type,
            "taken_at":         r.taken_at.isoformat() if r.taken_at else None
        })
    return jsonify({"results": data})


@result_bp.route("/results/stats", methods=["GET"])
def get_stats():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"stats": {"totalTests": 0, "avgScore": 0, "bestScore": 0, "streak": 0}})

    results = TestResult.query.filter_by(user_id=int(user_id)).all()
    if not results:
        return jsonify({"stats": {"totalTests": 0, "avgScore": 0, "bestScore": 0, "streak": 0}})

    scores = [r.score_percent for r in results if r.score_percent is not None]
    avg  = round(sum(scores) / len(scores), 1) if scores else 0
    best = round(max(scores), 1) if scores else 0

    return jsonify({"stats": {
        "totalTests": len(results),
        "avgScore":   avg,
        "bestScore":  best,
        "streak":     0
    }})


@result_bp.route("/results", methods=["POST"])
def save_result():
    data = request.json
    if not data.get("user_id") or not data.get("total_questions"):
        return jsonify({"message": "Missing required fields"}), 400

    total   = data["total_questions"]
    correct = data["correct_answers"]
    percent = round((correct / total) * 100, 1) if total > 0 else 0

    result = TestResult(
        user_id         = data["user_id"],
        school_id       = data.get("school_id"),
        class_id        = data.get("class_id"),
        subject_id      = data.get("subject_id"),
        unit_id         = data.get("unit_id"),
        total_questions = total,
        correct_answers = correct,
        score_percent   = percent,
        test_type       = data.get("test_type", "daily_random"),
        taken_at        = datetime.now(timezone.utc)
    )
    db.session.add(result)
    db.session.commit()
    return jsonify({"message": "Result saved", "id": result.id}), 201


# ── NEW: leaderboard ──────────────────────────────────────────────────────────

@result_bp.route("/results/leaderboard", methods=["GET"])
def leaderboard():
    """
    Top N users ranked by best single-test score, avg score as tiebreaker.

    Query params:
      limit     – entries to return (default 10, max 1000)
      school_id – optional: filter to one school
      class_id  – optional: filter to one class
    """
    limit     = min(int(request.args.get("limit", 10)), 1000)
    school_id = request.args.get("school_id")
    class_id  = request.args.get("class_id")

    q = (
        db.session.query(
            TestResult.user_id,
            func.max(TestResult.score_percent).label("best_score"),
            func.avg(TestResult.score_percent).label("avg_score"),
            func.count(TestResult.id).label("tests_taken"),
        )
        .group_by(TestResult.user_id)
    )

    if school_id:
        q = q.filter(TestResult.school_id == int(school_id))
    if class_id:
        q = q.filter(TestResult.class_id == int(class_id))

    rows = (
        q.order_by(desc("best_score"), desc("avg_score"))
         .limit(limit)
         .all()
    )

    board = []
    for rank, row in enumerate(rows, start=1):
        user   = User.query.get(row.user_id)
        school = School.query.get(user.school_id) \
                 if user and getattr(user, "school_id", None) else None
        board.append({
            "rank":        rank,
            "user_id":     row.user_id,
            "name":        user.name if user else "Unknown",
            "school_name": school.name if school else None,
            "best_score":  round(row.best_score or 0, 1),
            "avg_score":   round(row.avg_score  or 0, 1),
            "tests_taken": row.tests_taken,
        })

    return jsonify({"leaderboard": board})