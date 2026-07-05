from flask import Blueprint, request, jsonify
from extension import db
from models.user_model import User
from models.role_model import Role
from models.school_model import School
from models.payment_model import Payment
from sqlalchemy import func
from datetime import datetime

admin_payment_bp = Blueprint('admin_payment_bp', __name__)

@admin_payment_bp.route('/api/admin/payments/dashboard', methods=['GET'])
def get_dashboard_stats():
    try:
        # Total Collected (from successful payments)
        total_revenue = db.session.query(func.sum(Payment.amount)).filter(Payment.status == 'paid').scalar() or 0
        
        # Total users marked as paid/unpaid (excluding admins)
        total_paid_users = User.query.filter(User.payment_status == 'paid', User.position != 1).count()
        total_unpaid_users = User.query.filter(User.payment_status == 'unpaid', User.position != 1).count()
        
        # Month-wise revenue for current year
        current_year = datetime.now().year
        # Note: func.extract works better across different SQL dialects (SQLite vs MySQL)
        # Using EXTRACT(MONTH from created_at)
        monthly_data = db.session.query(
            func.extract('month', Payment.created_at).label('month'),
            func.sum(Payment.amount).label('total')
        ).filter(
            Payment.status == 'paid',
            func.extract('year', Payment.created_at) == current_year
        ).group_by(func.extract('month', Payment.created_at)).all()
        
        monthly_revenue = [{"month": int(m.month), "total": float(m.total)} for m in monthly_data]

        return jsonify({
            "success": True,
            "totalRevenue": float(total_revenue),
            "totalPaidUsers": total_paid_users,
            "totalUnpaidUsers": total_unpaid_users,
            "monthlyRevenue": monthly_revenue
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@admin_payment_bp.route('/api/admin/payments/users', methods=['GET'])
def get_users_payment_data():
    try:
        search = request.args.get('search', '').lower()
        school_id = request.args.get('school_id')
        payment_status = request.args.get('payment_status')
        
        # Exclude Admins (position = 1)
        query = User.query.filter(User.position != 1)
        
        if school_id:
            query = query.filter(User.school_id == school_id)
        if payment_status:
            query = query.filter(User.payment_status == payment_status)
        if search:
            query = query.filter(
                (func.lower(User.name).like(f"%{search}%")) |
                (func.lower(User.email).like(f"%{search}%"))
            )
            
        users = query.all()
        
        result = []
        for u in users:
            school_name = "Unknown"
            if u.school_id:
                school = School.query.get(u.school_id)
                if school:
                    school_name = school.name
                    
            result.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "schoolName": school_name,
                "paymentStatus": u.payment_status or 'unpaid',
                "loginCount": u.login_count or 0,
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
            
        return jsonify({"success": True, "users": result}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@admin_payment_bp.route('/api/admin/payments/users/<int:user_id>/status', methods=['PUT'])
def update_user_payment_status(user_id):
    try:
        data = request.json
        new_status = data.get('status')
        if new_status not in ['paid', 'unpaid']:
            return jsonify({"success": False, "message": "Invalid status"}), 400
            
        user = User.query.get_or_404(user_id)
        user.payment_status = new_status
        db.session.commit()
        
        return jsonify({"success": True, "message": "Status updated successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@admin_payment_bp.route('/api/admin/payments/roles', methods=['GET'])
def get_roles_config():
    try:
        roles = Role.query.filter(Role.id != 1).all()
        result = [{"id": r.id, "name": r.name, "requiresPayment": r.requires_payment} for r in roles]
        return jsonify({"success": True, "roles": result}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@admin_payment_bp.route('/api/admin/payments/roles/<int:role_id>', methods=['PUT'])
def update_role_config(role_id):
    try:
        data = request.json
        requires_payment = data.get('requiresPayment', False)
        
        role = Role.query.get_or_404(role_id)
        role.requires_payment = bool(requires_payment)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Role configuration updated"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@admin_payment_bp.route('/api/admin/payments/users/<int:user_id>/reset-trial', methods=['PUT'])
def reset_user_trial(user_id):
    try:
        user = User.query.get_or_404(user_id)
        user.login_count = 0
        user.last_login_date = None
        db.session.commit()
        return jsonify({"success": True, "message": "Trial reset successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
