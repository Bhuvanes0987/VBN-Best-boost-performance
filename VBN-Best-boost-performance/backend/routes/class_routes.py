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
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    name = data.get("name") or data.get("class_name")
    school_id = data.get("school_id")

    if not name:
        return jsonify({"message": "Class name is required"}), 400

    # 🔥 Check if deleted class exists → reuse it
    existing = Class.query.filter_by(
        class_name=name,
        school_id=school_id
    ).first()

    if existing:
        if existing.status == 0:
            existing.status = 1
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({"message": "Class restored", "id": existing.id}), 200
        else:
            return jsonify({"message": "Class already exists"}), 400

    # ✅ Create new
    c = Class(
        class_name=name,
        school_id=school_id,
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
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    name = data.get("name") or data.get("class_name") or c.class_name
    school_id = data.get("school_id") if "school_id" in data else c.school_id

    existing = Class.query.filter(
        Class.class_name == name,
        Class.school_id == school_id,
        Class.id != id,
        Class.status == 1
    ).first()

    if existing:
        return jsonify({"message": "Class already exists for this school"}), 400

    c.class_name = name
    c.school_id = school_id
    c.updated_by = "admin"
    c.updated_at = datetime.utcnow()

    db.session.commit()
    db.session.refresh(c)   # 🔥 important

    return jsonify({
        "message": "Class updated",
        "class": {
            "id": c.id,
            "name": c.class_name,
            "school_id": c.school_id
        }
    })    
@class_bp.route("/classes/<int:id>", methods=["DELETE"])
def delete_class(id):
    c = Class.query.get_or_404(id)
    c.status = 0
    c.updated_by = "admin"
    c.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Class deleted"})