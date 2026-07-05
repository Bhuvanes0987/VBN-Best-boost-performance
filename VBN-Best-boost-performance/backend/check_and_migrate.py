from app import app
from extension import db
from sqlalchemy import inspect, text

with app.app_context():
    insp = inspect(db.engine)
    cols = [c['name'] for c in insp.get_columns('roles')]
    print("Existing columns:", cols)
    if 'requires_payment' not in cols:
        print("Column missing! Adding it...")
        db.session.execute(text("ALTER TABLE roles ADD COLUMN requires_payment BOOLEAN DEFAULT 0"))
        db.session.commit()
        print("Done! Column added.")
    else:
        print("Column already exists.")
    
    # Also check users table
    user_cols = [c['name'] for c in insp.get_columns('users')]
    print("User columns:", user_cols)
    for col_def in [('payment_status', "ALTER TABLE users ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'"), 
                    ('login_count', "ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0"),
                    ('last_login_date', "ALTER TABLE users ADD COLUMN last_login_date DATE")]:
        if col_def[0] not in user_cols:
            print(f"Adding {col_def[0]}...")
            db.session.execute(text(col_def[1]))
            db.session.commit()
            print(f"Done!")
        else:
            print(f"User column {col_def[0]} already exists.")
