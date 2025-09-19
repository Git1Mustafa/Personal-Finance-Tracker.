from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "finance_tracker.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

db = SQLAlchemy(app)

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'created_at': self.created_at.isoformat()}

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'description': self.description,
            'amount': float(self.amount),
            'type': self.type,
            'category': self.category,
            'date': self.date.strftime('%Y-%m-%d'),
            'timestamp': self.timestamp.isoformat()
        }

def create_tables():
    try:
        with app.app_context():
            db.create_all()

            demo_user = User.query.filter_by(email='demo@financetracker.com').first()
            if not demo_user:
                demo_user = User(name='Demo User', email='demo@financetracker.com')
                demo_user.set_password('demo123')
                db.session.add(demo_user)
                db.session.commit()

                demo_transactions = [
                    {"description":"Monthly Salary","amount":5000.0,"type":"income","category":"Salary","date":"2025-09-01"},
                    {"description":"Grocery Shopping","amount":150.0,"type":"expense","category":"Food","date":"2025-09-02"},
                    {"description":"Gas Bill","amount":80.0,"type":"expense","category":"Utilities","date":"2025-09-01"},
                    {"description":"Coffee Shop","amount":25.0,"type":"expense","category":"Food","date":"2025-09-02"},
                    {"description":"Freelance Project","amount":800.0,"type":"income","category":"Freelance","date":"2025-08-30"}
                ]

                for td in demo_transactions:
                    transaction = Transaction(
                        user_id=demo_user.id,
                        description=td['description'],
                        amount=td['amount'],
                        type=td['type'],
                        category=td['category'],
                        date=datetime.strptime(td['date'],'%Y-%m-%d').date()
                    )
                    db.session.add(transaction)
                db.session.commit()
                print("✅ Demo user and transactions created successfully!")
    except Exception as e:
        print("❌ Database creation error:", e)
        db.session.rollback()

@app.route("/health", methods=["GET"])
def health_check():
    try:
        db.session.execute('SELECT 1')
        return jsonify({"status":"ok","message":"Backend is running","database":"connected"}), 200
    except Exception as e:
        return jsonify({"status":"ok","message":"Backend running but database error","error":str(e)}), 200

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json or {}
        required_fields = ['name','email','password','confirmPassword']
        if not all(field in data and data[field] for field in required_fields):
            return jsonify({"error":"All fields are required"}), 400

        email = data.get('email').strip().lower()
        name = data.get('name').strip()
        password = data.get('password')
        confirm_password = data.get('confirmPassword')

        if not email or "@" not in email or "." not in email:
            return jsonify({"error":"Valid email is required"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error":"Email already registered"}), 400

        if password != confirm_password:
            return jsonify({"error":"Passwords do not match"}), 400

        if len(password) < 6:
            return jsonify({"error":"Password must be at least 6 characters long"}), 400

        new_user = User(name=name, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message":"Registration successful"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json or {}
        if not data.get('email') or not data.get('password'):
            return jsonify({"error":"Email and password are required"}), 400

        email = data.get('email').strip().lower()
        password = data.get('password')

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"error":"Invalid email or password"}), 400

        return jsonify(user.to_dict()), 200
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@app.route("/transactions/<user_id>", methods=["GET","POST","DELETE"])
def manage_transactions(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error":"User not found"}), 404

        if request.method == "GET":
            transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc(), Transaction.timestamp.desc()).all()
            return jsonify([t.to_dict() for t in transactions]), 200

        if request.method == "POST":
            data = request.json or {}
            required_fields = ['description','amount','type','category','date']
            if not all(field in data and data[field] for field in required_fields):
                return jsonify({"error":"All fields are required"}), 400

            if data['type'] not in ['income','expense']:
                return jsonify({"error":"Type must be 'income' or 'expense'"}), 400

            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return jsonify({"error":"Amount must be positive"}), 400
            except (ValueError, TypeError):
                return jsonify({"error":"Invalid amount"}), 400

            try:
                transaction_date = datetime.strptime(data['date'],'%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error":"Invalid date format. Use YYYY-MM-DD"}), 400

            new_t = Transaction(
                user_id=user_id,
                description=data['description'].strip(),
                amount=amount,
                type=data['type'],
                category=data['category'],
                date=transaction_date
            )
            db.session.add(new_t)
            db.session.commit()
            return jsonify(new_t.to_dict()), 201

        if request.method == "DELETE":
            transaction_id = request.args.get('id')
            if not transaction_id:
                return jsonify({"error":"Transaction ID is required"}), 400

            t = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
            if not t:
                return jsonify({"error":"Transaction not found"}), 404
            db.session.delete(t)
            db.session.commit()
            return jsonify({"message":"Transaction deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Transaction operation failed: {str(e)}"}), 500

@app.route("/categories", methods=["GET"])
def get_categories():
    categories = {
        "income": ["Salary", "Freelance", "Investment", "Gift", "Other Income"],
        "expense": ["Food", "Transportation", "Utilities", "Entertainment", "Healthcare", "Shopping", "Rent", "Other"]
    }
    return jsonify(categories), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error":"Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({"error":"Internal server error"}), 500

if __name__ == "__main__":
    create_tables()
    print("🚀 Personal Finance Tracker Backend (SQLite)")
    print("🔗 Frontend should connect to: http://127.0.0.1:5000")
    app.run(debug=True, host='127.0.0.1', port=5000)
