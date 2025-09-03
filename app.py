from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from your frontend

users = {
    "demo@financetracker.com": {
        "id": "1",
        "name": "Demo User",
        "email": "demo@financetracker.com",
        "password": "demo123"  # In real apps, store hashed passwords!
    }
}

transactions = {
    "1": []  # user_id -> list of transactions
}

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    if email in users:
        return jsonify({"error": "Email already registered"}), 400
    if data.get("password") != data.get("confirmPassword"):
        return jsonify({"error": "Passwords do not match"}), 400
    user_id = str(uuid.uuid4())
    users[email] = {
        "id": user_id,
        "name": data.get("name"),
        "email": email,
        "password": data.get("password"),  # Hash in real apps
    }
    transactions[user_id] = []
    return jsonify({"message": "Registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = users.get(data.get("email"))
    if not user or user["password"] != data.get("password"):
        return jsonify({"error": "Invalid email or password"}), 400
    return jsonify({"id": user["id"], "name": user["name"], "email": user["email"]})

@app.route("/transactions/<user_id>", methods=["GET", "POST", "DELETE"])
def manage_transactions(user_id):
    if user_id not in transactions:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        return jsonify(transactions[user_id])

    if request.method == "POST":
        data = request.json
        transaction = {
            "id": str(uuid.uuid4()),
            "description": data["description"],
            "amount": data["amount"],
            "type": data["type"],
            "category": data["category"],
            "date": data["date"],
            "timestamp": datetime.utcnow().isoformat(),
        }
        transactions[user_id].append(transaction)
        return jsonify(transaction), 201

    if request.method == "DELETE":
        transaction_id = request.args.get("id")
        transactions[user_id] = [t for t in transactions[user_id] if t["id"] != transaction_id]
        return jsonify({"message": "Deleted"}), 200

if __name__ == "__main__":
    app.run(debug=True)
