from flask import Blueprint, request, jsonify
from extension import db
from models.class_model import Class
from datetime import datetime

class_bp = Blueprint("classes", __name__)


# =========================
# CREATE CLASS
# =========================
@class_bp.route("/classes", methods=["POST"])
def create_class():

    data = request.json

    new_class = Class(
        class_name=data["class_name"],
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )

    db.session.add(new_class)
    db.session.commit()

    return jsonify({
        "message": "Class created successfully"
    })


# =========================
# GET CLASSES
# =========================
@class_bp.route("/classes", methods=["GET"])
def get_classes():

    classes = Class.query.filter_by(status=1).all()

    result = []

    for c in classes:

        result.append({
            "id": c.id,
            "class_name": c.class_name,
            "created_at": c.created_at
        })

    return jsonify({
        "classes": result
    })


# =========================
# UPDATE CLASS
# =========================
@class_bp.route("/classes/<int:id>", methods=["PUT"])
def update_class(id):

    class_obj = Class.query.get_or_404(id)

    data = request.json

    class_obj.class_name = data["class_name"]
    class_obj.updated_by = "admin"
    class_obj.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "message": "Class updated successfully"
    })


# =========================
# DELETE CLASS (SOFT DELETE)
# =========================
@class_bp.route("/classes/<int:id>", methods=["DELETE"])
def delete_class(id):

    class_obj = Class.query.get_or_404(id)

    class_obj.status = 0
    class_obj.updated_by = "admin"
    class_obj.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "message": "Class deleted successfully"
    })