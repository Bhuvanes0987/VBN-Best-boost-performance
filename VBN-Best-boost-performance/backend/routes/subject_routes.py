from flask import Blueprint, request, jsonify
from extension import db
from models.subject_model import Subject
from models.class_model import Class
from models.unit_model import Unit
from datetime import datetime

subject_bp = Blueprint("subjects", __name__)

@subject_bp.route("/subjects", methods=["GET"])
def get_subjects():
    school_id = request.args.get("school_id")
    query = Subject.query.filter_by(status=1)
    if school_id:
        query = query.filter_by(school_id=int(school_id))
    subjects = query.all()
    result = []
    for s in subjects:
        units = Unit.query.filter_by(subject_id=s.id, status=1)\
                          .order_by(Unit.unit_number).all()
        result.append({
            "id": s.id,
            "subject_name": s.subject_name,
            "school_id": s.school_id,
            "classes": [{"id": c.id, "name": c.class_name} for c in s.classes],
            "units": [{"id": u.id, "unit_name": u.unit_name, "unit_number": u.unit_number}
                      for u in units]
        })
    return jsonify({"subjects": result})


@subject_bp.route("/subjects", methods=["POST"])
def create_subject():
    data = request.json

    if not data.get("subject_name"):
        return jsonify({"message": "Subject name is required"}), 400

    subject = Subject(
        subject_name=data["subject_name"],
        school_id=data.get("school_id"),
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )
    class_ids = data.get("class_ids", [])
    subject.classes = Class.query.filter(Class.id.in_(class_ids)).all()
    db.session.add(subject)
    db.session.commit()

    units_data = data.get("units", [])
    for u in units_data:
        unit = Unit(
            unit_name=u["unit_name"],
            unit_number=u.get("unit_number"),
            subject_id=subject.id,
            school_id=data.get("school_id"),
            status=1,
            created_by="admin"
        )
        db.session.add(unit)
    db.session.commit()

    return jsonify({"message": "Subject created", "id": subject.id}), 201


@subject_bp.route("/subjects/<int:id>", methods=["PUT"])
def update_subject(id):
    subject = Subject.query.get_or_404(id)
    data = request.json

    subject.subject_name = data["subject_name"]
    subject.school_id = data.get("school_id", subject.school_id)
    subject.updated_by = "admin"
    subject.updated_at = datetime.utcnow()

    class_ids = data.get("class_ids", [])
    subject.classes = Class.query.filter(Class.id.in_(class_ids)).all()

    # Update units without hard-deleting to preserve foreign key constraints
    existing_units = {u.id: u for u in Unit.query.filter_by(subject_id=id).all()}
    payload_units = data.get("units", [])
    payload_unit_ids = set()

    for u in payload_units:
        unit_id = u.get("id")
        if unit_id and unit_id in existing_units:
            existing_unit = existing_units[unit_id]
            existing_unit.unit_name = u["unit_name"]
            existing_unit.unit_number = u.get("unit_number")
            existing_unit.school_id = data.get("school_id", subject.school_id)
            existing_unit.status = 1  # reactivate if previously soft-deleted
            existing_unit.updated_at = datetime.utcnow()
            payload_unit_ids.add(unit_id)
        else:
            new_unit = Unit(
                unit_name=u["unit_name"],
                unit_number=u.get("unit_number"),
                subject_id=id,
                school_id=data.get("school_id", subject.school_id),
                status=1,
                created_by="admin",
                created_at=datetime.utcnow()
            )
            db.session.add(new_unit)

    # Soft-delete (set status=0) any existing units not in the request payload
    for existing_id, existing_unit in existing_units.items():
        if existing_id not in payload_unit_ids:
            existing_unit.status = 0
            existing_unit.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "Subject updated"})


@subject_bp.route("/subjects/<int:id>", methods=["DELETE"])
def delete_subject(id):
    subject = Subject.query.get_or_404(id)
    subject.status = 0
    subject.updated_at = datetime.utcnow()
    Unit.query.filter_by(subject_id=id).update({"status": 0})
    db.session.commit()
    return jsonify({"message": "Subject deleted"})


@subject_bp.route("/subjects/by-class/<int:class_id>", methods=["GET"])
def get_subjects_by_class(class_id):
    subjects = Subject.query.filter_by(status=1)\
        .join(Subject.classes).filter(Class.id == class_id).all()
    result = []
    for s in subjects:
        units = Unit.query.filter_by(subject_id=s.id, status=1)\
                          .order_by(Unit.unit_number).all()
        result.append({
            "id": s.id,
            "subject_name": s.subject_name,
            "units": [{"id": u.id, "unit_name": u.unit_name, "unit_number": u.unit_number}
                      for u in units]
        })
    return jsonify({"subjects": result})


@subject_bp.route("/subjects/<int:subject_id>/units", methods=["GET"])
def get_units(subject_id):
    units = Unit.query.filter_by(subject_id=subject_id, status=1)\
                      .order_by(Unit.unit_number).all()
    return jsonify({"units": [{"id": u.id, "unit_name": u.unit_name,
                                "unit_number": u.unit_number} for u in units]})

@subject_bp.route("/units", methods=["POST"])
def create_unit():
    data = request.json
    unit = Unit(
        unit_name=data["unit_name"],
        unit_number=data.get("unit_number", 1),
        subject_id=data["subject_id"],
        status=1,
        created_by="admin"
    )
    db.session.add(unit)
    db.session.commit()
    return jsonify({"message": "Unit created", "id": unit.id}), 201

@subject_bp.route("/units/<int:id>", methods=["PUT"])
def update_unit(id):
    unit = Unit.query.get_or_404(id)
    data = request.json
    unit.unit_name = data["unit_name"]
    unit.unit_number = data.get("unit_number", unit.unit_number)
    unit.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Unit updated"})

@subject_bp.route("/units/<int:id>", methods=["DELETE"])
def delete_unit(id):
    unit = Unit.query.get_or_404(id)
    unit.status = 0
    db.session.commit()
    return jsonify({"message": "Unit deleted"})