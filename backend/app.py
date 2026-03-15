from flask import Flask
from flask_cors import CORS

from config import Config
from extension import db, migrate

# IMPORT ALL MODELS (VERY IMPORTANT)
from models.user_model import User
from models.role_model import Role
from models.user_role_model import UserRole
from models.permission_model import Permission
from models.role_permission_model import RolePermission

# ROUTES
from routes.question_routes import question_bp
from routes.user_routes import user_bp
from routes.class_routes import class_bp
from routes.subject_routes import subject_bp
from routes.signup_routes import auth_bp
from routes.role_routes import role_bp
from routes.user_role_routes import user_role_bp

app = Flask(__name__)

app.config.from_object(Config)

CORS(app)

db.init_app(app)
migrate.init_app(app, db)

app.register_blueprint(question_bp)
app.register_blueprint(user_bp)
app.register_blueprint(class_bp)
app.register_blueprint(subject_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(role_bp)
app.register_blueprint(user_role_bp)

# TEMP create tables
with app.app_context():
    db.create_all()
    if Permission.query.count() == 0:

        permissions = [
            Permission(name="Users", page="users"),
            Permission(name="Classes", page="classes"),
            Permission(name="Subjects", page="subjects"),
            Permission(name="Questions", page="questions"),
            Permission(name="Quiz", page="quiz"),
            Permission(name="Results", page="results"),
            Permission(name="Payments", page="payments"),
        ]

        db.session.add_all(permissions)
        db.session.commit()

        print("Permissions seeded")

if __name__ == "__main__":
    app.run(debug=True, port=8900)