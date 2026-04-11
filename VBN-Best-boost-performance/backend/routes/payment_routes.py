from flask import Blueprint, request, jsonify, current_app
import razorpay
from extension import db
from models.payment_model import Payment
import hmac
import hashlib

payment_bp = Blueprint('payment_bp', __name__)

def get_razorpay_client():
    return razorpay.Client(
        auth=(current_app.config['RAZORPAY_KEY_ID'], current_app.config['RAZORPAY_KEY_SECRET'])
    )

@payment_bp.route('/api/payment/create-order', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        amount = data.get('amount')  # Amount in paise (e.g., 100 for ₹1)
        currency = data.get('currency', 'INR')
        description = data.get('description', 'Subscription Payment')
        user_id = data.get('user_id') # Optional

        client = get_razorpay_client()
        
        # Create Razorpay Order
        razorpay_order = client.order.create({
            'amount': amount,
            'currency': currency,
            'payment_capture': '1'
        })

        # Save to database
        payment = Payment(
            order_id=razorpay_order['id'],
            amount=amount / 100, # Store in rupees
            currency=currency,
            status='created',
            user_id=user_id,
            description=description
        )
        db.session.add(payment)
        db.session.commit()

        return jsonify({
            "order_id": razorpay_order['id'],
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency'],
            "key": current_app.config['RAZORPAY_KEY_ID']
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@payment_bp.route('/api/payment/verify', methods=['POST'])
def verify_payment():
    try:
        data = request.get_json()
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')

        # Verify signature
        client = get_razorpay_client()
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }

        try:
            client.utility.verify_payment_signature(params_dict)
            
            # Update database
            payment = Payment.query.filter_by(order_id=razorpay_order_id).first()
            if payment:
                payment.payment_id = razorpay_payment_id
                payment.signature = razorpay_signature
                payment.status = 'paid'
                db.session.commit()
                
                return jsonify({
                    "success": True,
                    "payment_id": razorpay_payment_id,
                    "order_id": razorpay_order_id,
                    "message": "Payment verified successfully"
                }), 200
            else:
                return jsonify({"success": False, "message": "Order not found"}), 404

        except Exception as e:
            # Verification failed
            payment = Payment.query.filter_by(order_id=razorpay_order_id).first()
            if payment:
                payment.status = 'failed'
                payment.error_description = "Signature verification failed"
                db.session.commit()
            return jsonify({"success": False, "message": "Payment verification failed"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@payment_bp.route('/api/payment/failed', methods=['POST'])
def payment_failed():
    try:
        data = request.get_json()
        order_id = data.get('razorpay_order_id')
        error_code = data.get('error_code')
        error_description = data.get('error_description')

        payment = Payment.query.filter_by(order_id=order_id).first()
        if payment:
            payment.status = 'failed'
            payment.error_code = error_code
            payment.error_description = error_description
            db.session.commit()
            return jsonify({"success": True, "message": "Failure recorded"}), 200
        else:
            return jsonify({"success": False, "message": "Order not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@payment_bp.route('/api/payment/status/<order_id>', methods=['GET'])
def get_status(order_id):
    try:
        payment = Payment.query.filter_by(order_id=order_id).first()
        if payment:
            return jsonify(payment.to_dict()), 200
        else:
            return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
