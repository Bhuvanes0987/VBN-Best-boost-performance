import os
from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
from extension import db
from models.custom_table_model import CustomTableHeader, CustomTableRow, CustomTableFile
from datetime import datetime

custom_table_bp = Blueprint("custom_table", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "..", "uploads", "custom-table")
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "zip", "png", "jpg", "jpeg"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _ensure_upload_dir():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ─── GET table state ──────────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table", methods=["GET"])
def get_table():
    school_id = request.args.get("school_id", type=int)
    if not school_id:
        return jsonify({"error": "school_id is required"}), 400

    headers = (
        CustomTableHeader.query
        .filter_by(school_id=school_id)
        .order_by(CustomTableHeader.col_index)
        .all()
    )
    rows = (
        CustomTableRow.query
        .filter_by(school_id=school_id)
        .order_by(CustomTableRow.row_order, CustomTableRow.id)
        .all()
    )

    return jsonify({
        "headers": [
            {"id": h.id, "col_index": h.col_index, "header_name": h.header_name}
            for h in headers
        ],
        "rows": [
            {
                "id":        r.id,
                "row_order": r.row_order,
                "col0":      r.col0 or "",
                "col1":      r.col1 or "",
                "col2":      r.col2 or "",
                "link":      r.link or "",
                "files": [
                    {
                        "id":        f.id,
                        "file_name": f.file_name,
                        "file_size": f.file_size,
                        "mime_type": f.mime_type,
                    }
                    for f in r.files
                ],
            }
            for r in rows
        ],
    })


# ─── Save / upsert headers ────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/headers", methods=["POST"])
def save_headers():
    data = request.get_json()
    school_id = data.get("school_id")
    headers   = data.get("headers", [])   # [{col_index, header_name}, ...]

    if not school_id:
        return jsonify({"error": "school_id is required"}), 400

    for item in headers:
        col_index   = item.get("col_index")
        header_name = item.get("header_name", "")
        existing = CustomTableHeader.query.filter_by(
            school_id=school_id, col_index=col_index
        ).first()
        if existing:
            existing.header_name = header_name
            existing.updated_at  = datetime.utcnow()
        else:
            db.session.add(CustomTableHeader(
                school_id=school_id,
                col_index=col_index,
                header_name=header_name,
            ))

    db.session.commit()
    return jsonify({"message": "Headers saved"}), 200


# ─── Add row ──────────────────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/row", methods=["POST"])
def add_row():
    data      = request.get_json()
    school_id = data.get("school_id")

    if not school_id:
        return jsonify({"error": "school_id is required"}), 400

    last = (
        CustomTableRow.query
        .filter_by(school_id=school_id)
        .order_by(CustomTableRow.row_order.desc())
        .first()
    )
    next_order = (last.row_order + 1) if last else 0

    row = CustomTableRow(
        school_id=school_id,
        row_order=next_order,
        col0=data.get("col0", ""),
        col1=data.get("col1", ""),
        col2=data.get("col2", ""),
        link=data.get("link", ""),
    )
    db.session.add(row)
    db.session.commit()

    return jsonify({"message": "Row added", "id": row.id, "row_order": row.row_order}), 201


# ─── Update row ───────────────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/row/<int:row_id>", methods=["PUT"])
def update_row(row_id):
    row  = CustomTableRow.query.get_or_404(row_id)
    data = request.get_json()

    row.col0       = data.get("col0", row.col0)
    row.col1       = data.get("col1", row.col1)
    row.col2       = data.get("col2", row.col2)
    row.link       = data.get("link", row.link)
    row.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "Row updated"}), 200


# ─── Delete row ───────────────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/row/<int:row_id>", methods=["DELETE"])
def delete_row(row_id):
    row = CustomTableRow.query.get_or_404(row_id)

    # Remove files from disk
    for f in row.files:
        if os.path.exists(f.file_path):
            os.remove(f.file_path)

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Row deleted"}), 200


# ─── Upload file to a row (col 3 – Documents) ────────────────────────────────

@custom_table_bp.route("/custom-table/row/<int:row_id>/file", methods=["POST"])
def upload_file(row_id):
    row = CustomTableRow.query.get_or_404(row_id)

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    if not _allowed(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    _ensure_upload_dir()
    safe_name = secure_filename(file.filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    stored_name = f"{row_id}_{timestamp}_{safe_name}"
    file_path   = os.path.join(UPLOAD_FOLDER, stored_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)
    mime_type = file.content_type or ""

    record = CustomTableFile(
        row_id=row_id,
        school_id=row.school_id,
        file_name=safe_name,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        "message":   "File uploaded",
        "id":        record.id,
        "file_name": record.file_name,
        "file_size": record.file_size,
        "mime_type": record.mime_type,
    }), 201


# ─── Download / view a file ───────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/file/<int:file_id>/download", methods=["GET"])
def download_file(file_id):
    record = CustomTableFile.query.get_or_404(file_id)
    if not os.path.exists(record.file_path):
        return jsonify({"error": "File not found on disk"}), 404
    return send_file(
        record.file_path,
        download_name=record.file_name,
        as_attachment=False,
        mimetype=record.mime_type or "application/octet-stream",
    )


# ─── Delete a file ────────────────────────────────────────────────────────────

@custom_table_bp.route("/custom-table/file/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    record = CustomTableFile.query.get_or_404(file_id)
    if os.path.exists(record.file_path):
        os.remove(record.file_path)
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "File deleted"}), 200
