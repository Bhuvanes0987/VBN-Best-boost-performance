from app import app
from extension import db
from models.role_model import Role

with app.app_context():
    roles = Role.query.all()
    for r in roles:
        print(f"ID={r.id}, name={r.name}, requires_payment={r.requires_payment}, role_type={r.role_type}")
