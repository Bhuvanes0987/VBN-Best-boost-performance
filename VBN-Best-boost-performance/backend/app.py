from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

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
import os
# NEW
from routes.daily_quiz_report import send_daily_quiz_report


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

    trigger='cron',
    hour=15,
    minute=41
)

if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    scheduler.start()
    print("Daily quiz scheduler started...")

print("Daily quiz scheduler started...")


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


with app.app_context():

    db.create_all()

    db.session.execute(
        db.text("SET SESSION sql_mode = ''")
    )
    db.session.commit()

    role_count = db.session.execute(
        db.text(
            "SELECT COUNT(*) FROM roles"
        )
    ).scalar()

    if role_count == 0:

        db.session.execute(
            db.text(
                "INSERT INTO roles (id,name,description,status) VALUES "
                "(1,'Admin','Full access to all features',1),"
                "(2,'Student','Default user access',1)"
            )
        )

        db.session.commit()

        print("Default roles seeded")

    db.session.execute(
        db.text(
            "ALTER TABLE roles AUTO_INCREMENT = 3"
        )
    )

    db.session.commit()

    print("Default roles ready")

    if Permission.query.count() == 0:

        permissions = [

            Permission(
                name="Users",
                page="users",
                scope="global"
            ),

            Permission(
                name="Schools",
                page="schools",
                scope="global"
            ),

            Permission(
                name="Roles",
                page="roles",
                scope="global"
            ),

            Permission(
                name="Classes",
                page="classes",
                scope="school"
            ),

            Permission(
                name="Subjects",
                page="subjects",
                scope="school"
            ),

            Permission(
                name="Questions",
                page="questions",
                scope="school"
            ),

            Permission(
                name="Results",
                page="results",
                scope="school"
            ),

            Permission(
                name="Payments",
                page="payments",
                scope="school"
            ),

            Permission(
                name="Quiz",
                page="quiz",
                scope="class"
            )
        ]

        db.session.add_all(permissions)

        db.session.commit()

        print("Permissions seeded")


if __name__ == "__main__":
    app.run(
        debug=True,
        port=8900
    )