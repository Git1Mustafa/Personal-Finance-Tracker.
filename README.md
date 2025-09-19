Personal Finance Tracker
A comprehensive web application for managing personal finances with real-time data visualization, transaction management, and user authentication.

Features
🔐 Authentication System
User registration and login

Secure password hashing

Demo account included

💰 Financial Management
Add income and expense transactions

Categorize transactions (Food, Transportation, Utilities, etc.)

Real-time balance calculations

Savings rate tracking

📊 Data Visualization
Interactive spending overview chart (Chart.js)

Category-wise expense breakdown

Visual financial statistics

🔍 Advanced Features
Filter transactions by type, category, and customizable date range (From Date - To Date)

Search and sort functionality

Responsive design for all devices

Offline mode with mock data fallback

Tech Stack
Frontend
HTML5 - Semantic markup

CSS3 - Modern styling with Flexbox/Grid

JavaScript (ES6+) - Dynamic functionality and API integration

Chart.js - Data visualization library

Backend
Flask - Python web framework

SQLAlchemy - ORM database access

SQLite - Lightweight database

Flask-CORS - Cross-origin resource sharing

Installation & Setup
Prerequisites
Python 3.8+

Modern web browser

Backend Setup
# Clone the repository
git clone https://github.com/yourusername/personal-finance-tracker.git
cd personal-finance-tracker

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py

# Backend runs at http://127.0.0.1:5000
Frontend Setup
Open index.html in a modern browser

Or serve via a local server:

bash
python -m http.server 8000
Navigate to http://localhost:8000 in your browser

Usage
Demo Account
Email: demo@financetracker.com

Password: demo123

Adding Transactions
Login to your account

Fill in the "Add Transaction" form

Select income or expense type

Choose appropriate category

Click "Add Transaction"

Viewing Analytics
Dashboard shows total income, expenses, net balance, and savings rate

Spending overview chart displays expense breakdown by category

Filter transactions by type, category, or date range

API Endpoints
Method	Endpoint	Description
GET	/health	Backend health check
POST	/login	User login
POST	/register	User registration
GET	/transactions/<user_id>	Fetch transactions for user
POST	/transactions/<user_id>	Add transaction
DELETE	/transactions/<user_id>?id=<id>	Delete transaction
GET	/categories	Fetch available categories
Project Structure
text
personal-finance-tracker/
├── app.py                 # Flask backend application  
├── index.html             # Frontend HTML  
├── style.css              # CSS styling  
├── app.js                 # Frontend JavaScript logic  
├── requirements.txt       # Python dependencies  
├── README.md              # Project documentation  
├── .gitignore             # Git ignore rules  
└── finance_tracker.db     # SQLite database (auto-generated)  
Browser Compatibility
Chrome 80+

Firefox 75+

Safari 13+

Edge 80+

Contributing
Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

License
This project is licensed under the MIT License. See the LICENSE file for details.

Acknowledgments
Chart.js for beautiful data visualization

Flask community for excellent documentation

Material Design for UI inspiration

