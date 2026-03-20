from flask import Blueprint, request, jsonify
from extension import db
from models.class_model import Class
from datetime import datetime

class_bp = Blueprint("classes", __name__)

@class_bp.route("/classes", methods=["GET"])
def get_classes():
    school_id = request.args.get("school_id")
    query = Class.query.filter_by(status=1)
    if school_id:
        query = query.filter_by(school_id=int(school_id))
    classes = query.all()
    return jsonify({"classes": [{"id": c.id, "name": c.class_name, "school_id": c.school_id}
                                 for c in classes]})

@class_bp.route("/classes", methods=["POST"])
def create_class():
    data = request.json
    existing = Class.query.filter_by(
        class_name=data["name"],
        school_id=data.get("school_id"),
        status=1
    ).first()
    if existing:
        return jsonify({"message": "Class already exists for this school"}), 400

    c = Class(
        class_name=data["name"],
        school_id=data.get("school_id"),  
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({"message": "Class created", "id": c.id}), 201

@class_bp.route("/classes/<int:id>", methods=["PUT"])
def update_class(id):
    c = Class.query.get_or_404(id)
    data = request.json
    c.class_name = data["name"]
    c.school_id = data.get("school_id", c.school_id)
    c.updated_by = "admin"
    c.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Class updated"})

@class_bp.route("/classes/<int:id>", methods=["DELETE"])
def delete_class(id):
    c = Class.query.get_or_404(id)
    c.status = 0
    c.updated_by = "admin"
    c.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Class deleted"})