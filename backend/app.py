from flask import Flask
from flask_cors import CORS

from config import Config
from extension import db

from routes.question_routes import question_bp
from routes.user_routes import user_bp
from routes.class_routes import class_bp
from routes.subject_routes import subject_bp

app = Flask(__name__)

app.config.from_object(Config)

CORS(app)

db.init_app(app)

app.register_blueprint(question_bp)
app.register_blueprint(user_bp)
app.register_blueprint(class_bp)
app.register_blueprint(subject_bp)

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True,port=8900)