from extension import db

class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    page = db.Column(db.String(100))
    scope = db.Column(db.String(50), default='school')