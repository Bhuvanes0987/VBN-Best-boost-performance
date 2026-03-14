from flask import Flask
from flask_cors import CORS

from config import Config
from extension import db, migrate

from routes.question_routes import question_bp
from routes.user_routes import user_bp
from routes.class_routes import class_bp
from routes.subject_routes import subject_bp
from routes.signup_routes import auth_bp
from routes.role_routes import role_bp
from routes.user_role_routes import user_role_bp   # if you created roles

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

if __name__ == "__main__":
    app.run(debug=True, port=8900)