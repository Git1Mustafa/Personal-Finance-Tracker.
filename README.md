# Personal Finance Tracker

A comprehensive web application for managing personal finances with real-time data visualization, transaction management, and user authentication.

## Features

### 🔐 **Authentication System**
- User registration and login
- Secure password hashing
- Demo account included

### 💰 **Financial Management**
- Add income and expense transactions
- Categorize transactions (Food, Transportation, Utilities, etc.)
- Real-time balance calculations
- Savings rate tracking

### 📊 **Data Visualization**
- Interactive spending overview chart (Chart.js)
- Category-wise expense breakdown
- Visual financial statistics

### 🔍 **Advanced Features**
- Filter transactions by type, category, and date
- Search and sort functionality
- Responsive design for all devices
- Offline mode with mock data

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **JavaScript (ES6+)** - Dynamic functionality
- **Chart.js** - Data visualization library

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Lightweight database
- **Flask-CORS** - Cross-origin resource sharing

## Installation & Setup

### Prerequisites
- Python 3.8+
- Modern web browser

### Backend Setup
1. **Clone the repository**
git clone https://github.com/yourusername/personal-finance-tracker.git
cd personal-finance-tracker

2. **Install dependencies**
pip install -r requirements.txt

3. **Run the Flask server**
python app.py

4. **Server will start on**
http://127.0.0.1:5000

### Frontend Setup
1. **Open `index.html`** in your web browser
2. **Or serve with a local server**
Python 3
python -m http.server 8000
Then visit: http://localhost:8000

## Usage

### Demo Account
- **Email:** demo@financetracker.com
- **Password:** demo123

### Adding Transactions
1. Login to your account
2. Fill in the "Add Transaction" form
3. Select income or expense type
4. Choose appropriate category
5. Click "Add Transaction"

### Viewing Analytics
- Dashboard shows total income, expenses, and savings rate
- Spending overview chart displays expense breakdown by category
- Filter transactions by type, category, or date

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/login` | User authentication |
| POST | `/register` | User registration |
| GET | `/transactions/<user_id>` | Get user transactions |
| POST | `/transactions/<user_id>` | Add new transaction |
| DELETE | `/transactions/<user_id>?id=<id>` | Delete transaction |
| GET | `/categories` | Get available categories |

## Project Structure
personal-finance-tracker/
├── app.py # Flask backend
├── index.html # Frontend HTML
├── styles.css # CSS styling
├── app.js # JavaScript logic
├── requirements.txt # Python dependencies
├── README.md # Documentation
├── .gitignore # Git ignore rules
└── finance_tracker.db # SQLite database (auto-generated)

## Features in Detail

### Real-time Statistics
- **Total Income:** Sum of all income transactions
- **Total Expenses:** Sum of all expense transactions  
- **Net Balance:** Income minus expenses
- **Savings Rate:** Percentage of income saved

### Transaction Categories

**Income Categories:**
- Salary, Freelance, Investment, Gift, Other Income

**Expense Categories:**
- Food, Transportation, Utilities, Entertainment, Healthcare, Shopping, Rent, Other

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface
- Accessible design principles

## Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Chart.js for beautiful data visualization
- Flask community for excellent documentation
- Material Design for UI inspiration

## Contact
**Mustafa** - [Your Email]
- GitHub: [@yourusername](https://github.com/yourusername)
- Project Link: [https://github.com/yourusername/personal-finance-tracker](https://github.com/yourusername/personal-finance-tracker)

---

**Built with ❤️ by Mustafa** - Computer Science Student, Mumbai University
