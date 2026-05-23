from extension import db
from datetime import datetime


class CustomTableHeader(db.Model):
    """Stores custom column header names per school."""
    __tablename__ = "custom_table_headers"

    id         = db.Column(db.Integer, primary_key=True)
    school_id  = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    col_index  = db.Column(db.Integer, nullable=False)
    header_name = db.Column(db.String(200), nullable=False, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("school_id", "col_index", name="uq_custom_header_school_col"),
    )


class CustomTableRow(db.Model):
    """Stores one row of free-text data (cols 0-2) plus a link (col 4)."""
    __tablename__ = "custom_table_rows"

    id         = db.Column(db.Integer, primary_key=True)
    school_id  = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    row_order  = db.Column(db.Integer, nullable=False, default=0)
    col0       = db.Column(db.Text, default="")
    col1       = db.Column(db.Text, default="")
    col2       = db.Column(db.Text, default="")
    link       = db.Column(db.Text, default="")   # col index 4
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    files = db.relationship("CustomTableFile", backref="row", cascade="all, delete-orphan", lazy=True)


class CustomTableFile(db.Model):
    """Stores files uploaded to col 3 (Documents) per row."""
    __tablename__ = "custom_table_files"

    id         = db.Column(db.Integer, primary_key=True)
    row_id     = db.Column(db.Integer, db.ForeignKey("custom_table_rows.id", ondelete="CASCADE"), nullable=False)
    school_id  = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    file_name  = db.Column(db.String(255), nullable=False)
    file_path  = db.Column(db.String(500), nullable=False)
    file_size  = db.Column(db.Integer, default=0)
    mime_type  = db.Column(db.String(100), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
