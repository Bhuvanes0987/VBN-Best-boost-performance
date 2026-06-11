from flask import Flask
from flask_cors import CORS

from config import Config
from extension import db, migrate, mail

from models.user_model import User
from models.role_model import Role
from models.user_role_model import UserRole
from models.permission_model import Permission
from models.role_permission_model import RolePermission
from models.school_model import School      
from models.class_model import Class
from models.subject_model import Subject
from models.unit_model import Unit          
from models.question_model import Question
from models.test_result_model import TestResult  
from models.payment_model import Payment
from models.custom_table_model import CustomTableHeader, CustomTableRow, CustomTableFile

from routes.question_routes import question_bp
from routes.user_routes import user_bp
from routes.class_routes import class_bp
from routes.subject_routes import subject_bp
from routes.signup_routes import auth_bp
from routes.role_routes import role_bp
from routes.user_role_routes import user_role_bp
from routes.school_routes import school_bp  
from routes.result_routes import result_bp
from routes.profile_routes import profile_bp
from routes.payment_routes import payment_bp
from routes.custom_table_routes import custom_table_bp
from apscheduler.schedulers.background import BackgroundScheduler
import os

from routes.daily_quiz_report import (
    send_daily_quiz_report
)

from routes.subject_quiz_report import (
    send_subject_quiz_report
)
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)
migrate.init_app(app, db)
mail.init_app(app)
scheduler = BackgroundScheduler(
    timezone="Asia/Kolkata"
)

scheduler.add_job(
    func=lambda:
        send_daily_quiz_report(app),

    trigger="cron",
    hour=21,    
    minute=0
)

scheduler.add_job(
    func=lambda:
        send_subject_quiz_report(app),

    trigger="cron",
    hour=21,
    minute=0
)

if os.environ.get(
    "WERKZEUG_RUN_MAIN"
) == "true":

    scheduler.start()

    print(
        "Quiz report scheduler started..."
    )

app.register_blueprint(question_bp)
app.register_blueprint(user_bp)
app.register_blueprint(class_bp)
app.register_blueprint(subject_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(role_bp)
app.register_blueprint(user_role_bp)
app.register_blueprint(school_bp)  
app.register_blueprint(result_bp)  
app.register_blueprint(profile_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(custom_table_bp)

with app.app_context():
    db.create_all()

    db.session.execute(db.text("SET SESSION sql_mode = ''"))
    db.session.commit()

    # Roles
    if Role.query.count() == 0:
        db.session.add_all([
            Role(id=1, name="Admin", description="Full access to all features", status=1),
            Role(id=2, name="Student", description="Default user access", status=1),
            Role(id=3, name="Teacher", description="Teacher access", status=1),
            Role(id=4, name="Principal", description="Principal access", status=1)
        ])
        db.session.commit()
        print("Default roles seeded")

    db.session.execute(
        db.text("ALTER TABLE roles AUTO_INCREMENT = 5")
    )
    db.session.commit()

    # School
    if School.query.count() == 0:
        default_school = School(
            id=1,
            name="Default",
            code="DEFAULT",
            status=1,
            created_by="admin"
        )

        db.session.add(default_school)
        db.session.commit()

        print("Default school seeded")

    # Class
    if Class.query.count() == 0:
        default_class = Class(
            id=1,
            class_name="Default Class",
            school_id=1,
            status=1,
            created_by="admin"
        )

        db.session.add(default_class)
        db.session.commit()

        print("Default class seeded")

    # Permissions
    if Permission.query.count() == 0:
        permissions = [
            Permission(name="Users", page="users", scope="global"),
            Permission(name="Schools", page="schools", scope="global"),
            Permission(name="Roles", page="roles", scope="global"),
            Permission(name="Classes", page="classes", scope="school"),
            Permission(name="Subjects", page="subjects", scope="school"),
            Permission(name="Questions", page="questions", scope="school"),
            Permission(name="Results", page="results", scope="school"),
            Permission(name="Payments", page="payments", scope="school"),
            Permission(name="Quiz", page="quiz", scope="class"),
        ]
        db.session.add_all(permissions)
        db.session.commit()
        print("Permissions seeded")
if __name__ == "__main__":

    print(
        "Server starting..."
    )

    app.run(
        debug=True,
        port=8900
    )
