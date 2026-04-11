from flask import Blueprint, request, jsonify
from extension import db
from models.school_model import School
from datetime import datetime

school_bp = Blueprint("schools", __name__)

@school_bp.route("/schools", methods=["GET"])
def get_schools():
    schools = School.query.filter_by(status=1).all()
    return jsonify({
        "schools": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code
            }
            for s in schools
        ]
    })



@school_bp.route("/schools/<int:id>", methods=["GET"])
def get_school(id):
    school = School.query.get_or_404(id)
    return jsonify({
        "id": school.id,
        "name": school.name,
        "code": school.code
    })



@school_bp.route("/schools", methods=["POST"])
def create_school():
    data = request.json

    if not data.get("name"):
        return jsonify({"message": "School name is required"}), 400

    existing_name = School.query.filter_by(name=data["name"], status=1).first()
    if existing_name:
        return jsonify({"message": "School with this name already exists"}), 400

    if data.get("code"):
        existing_code = School.query.filter_by(code=data["code"], status=1).first()
        if existing_code:
            return jsonify({"message": "School with this code already exists"}), 400

    school = School(
        name=data["name"],
        code=data.get("code"),
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )
    db.session.add(school)
    db.session.commit()

    return jsonify({
        "message": "School created successfully",
        "id": school.id
    }), 201


@school_bp.route("/schools/<int:id>", methods=["PUT"])
def update_school(id):
    school = School.query.get_or_404(id)
    data = request.json

    if not data.get("name"):
        return jsonify({"message": "School name is required"}), 400

    existing_name = School.query.filter(
        School.name == data["name"],
        School.id != id,
        School.status == 1
    ).first()
    if existing_name:
        return jsonify({"message": "School with this name already exists"}), 400

    if data.get("code"):
        existing_code = School.query.filter(
            School.code == data["code"],
            School.id != id,
            School.status == 1
        ).first()
        if existing_code:
            return jsonify({"message": "School with this code already exists"}), 400

    school.name = data["name"]
    school.code = data.get("code")
    school.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "School updated successfully"})


@school_bp.route("/schools/<int:id>", methods=["DELETE"])
def delete_school(id):
    school = School.query.get_or_404(id)

    from models.user_model import User
    active_users = User.query.filter_by(school_id=id, status=1).count()
    if active_users > 0:
        return jsonify({
            "message": f"Cannot delete school — {active_users} active users assigned to it"
        }), 400

    school.status = 0
    school.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "School deleted successfully"})