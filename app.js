const API_BASE = "http://127.0.0.1:5000";

let currentUser = null;
let financeApp = null;
let connectionStatus = 'checking';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkBackendConnection();
});

// Check if backend is running
async function checkBackendConnection() {
    try {
        const response = await fetch(API_BASE + '/health', { 
            method: 'GET',
            timeout: 5000 
        });
        
        if (response.ok) {
            connectionStatus = 'connected';
            hideLoading();
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        console.warn('Backend connection failed, continuing with frontend-only mode');
        connectionStatus = 'disconnected';
        hideLoading();
    }
}

function hideLoading() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    
    // Add connection status indicator
    const statusDiv = document.createElement('div');
    statusDiv.className = `connection-status ${connectionStatus}`;
    statusDiv.textContent = connectionStatus === 'connected' ? 
        'Backend Connected' : 'Offline Mode';
    document.body.appendChild(statusDiv);
}

// Tab switching between Login and Register forms
function switchTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginTab = document.querySelector(".auth-tab:nth-child(1)");
    const registerTab = document.querySelector(".auth-tab:nth-child(2)");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        loginTab.classList.remove("active");
        registerTab.classList.add("active");
    }
}

// Show error message
function showError(message) {
    const errorEl = document.getElementById("errorMessage");
    errorEl.textContent = message;
    errorEl.style.display = "block";
    setTimeout(() => {
        errorEl.style.display = "none";
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successEl = document.getElementById("successMessage");
    successEl.textContent = message;
    successEl.style.display = "block";
    setTimeout(() => {
        successEl.style.display = "none";
    }, 5000);
}

// API call helper function with fallback to mock data
async function apiRequest(url, method = "GET", body = null) {
    if (connectionStatus === 'connected') {
        try {
            const options = {
                method,
                headers: { "Content-Type": "application/json" },
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(API_BASE + url, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.warn(`API request failed: ${error.message}`);
            connectionStatus = 'disconnected';
            return handleMockRequest(url, method, body);
        }
    } else {
        return handleMockRequest(url, method, body);
    }
}

// Mock data handler for offline functionality
function handleMockRequest(url, method, body) {
    const mockData = getMockData();
    
    if (url === '/login' && method === 'POST') {
        const { email, password } = body;
        if (email === 'demo@financetracker.com' && password === 'demo123') {
            return {
                id: '1',
                name: 'Demo User',
                email: email
            };
        }
        throw new Error('Invalid credentials');
    }
    
    if (url === '/register' && method === 'POST') {
        return { message: 'Registration successful (mock mode)' };
    }
    
    if (url === '/transactions/1' && method === 'GET') {
        return mockData.transactions;
    }
    
    if (url === '/transactions/1' && method === 'POST') {
        const newTransaction = {
            id: Date.now().toString(),
            ...body,
            timestamp: new Date().toISOString()
        };
        mockData.transactions.unshift(newTransaction);
        return newTransaction;
    }
    
    if (url.startsWith('/transactions/1') && method === 'DELETE') {
        const transactionId = new URLSearchParams(url.split('?')[1]).get('id');
        const index = mockData.transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            mockData.transactions.splice(index, 1);
            return { message: 'Transaction deleted' };
        }
        throw new Error('Transaction not found');
    }
    
    throw new Error('Mock endpoint not found');
}

// Get mock data
function getMockData() {
    if (!window.mockData) {
        window.mockData = {
            transactions: [
                {
                    id: "1",
                    description: "Monthly Salary",
                    amount: 5000,
                    type: "income",
                    category: "Salary",
                    date: "2025-09-01",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "2",
                    description: "Grocery Shopping",
                    amount: 150,
                    type: "expense",
                    category: "Food",
                    date: "2025-09-02",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "3",
                    description: "Gas Bill",
                    amount: 80,
                    type: "expense",
                    category: "Utilities",
                    date: "2025-09-01",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "4",
                    description: "Coffee Shop",
                    amount: 25,
                    type: "expense",
                    category: "Food",
                    date: "2025-09-02",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "5",
                    description: "Freelance Project",
                    amount: 800,
                    type: "income",
                    category: "Freelance",
                    date: "2025-08-30",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "6",
                    description: "Restaurant Dinner",
                    amount: 85,
                    type: "expense",
                    category: "Food",
                    date: "2025-08-29",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "7",
                    description: "Transportation",
                    amount: 45,
                    type: "expense",
                    category: "Transportation",
                    date: "2025-08-28",
                    timestamp: new Date().toISOString()
                }
            ]
        };
    }
    return window.mockData;
}

// Handle user login
async function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
        showError("Please enter both email and password");
        return;
    }

    try {
        const user = await apiRequest("/login", "POST", { email, password });
        currentUser = user;
        showMainApp();
    } catch (error) {
        showError(error.message);
    }
}

// Handle user registration
async function handleRegister() {
    const userData = {
        name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        password: document.getElementById("registerPassword").value,
        confirmPassword: document.getElementById("confirmPassword").value,
    };

    // Client-side validation
    if (!userData.name || !userData.email || !userData.password) {
        showError("Please fill in all fields");
        return;
    }

    if (userData.password !== userData.confirmPassword) {
        showError("Passwords do not match");
        return;
    }

    if (userData.password.length < 6) {
        showError("Password must be at least 6 characters long");
        return;
    }

    try {
        await apiRequest("/register", "POST", userData);
        showSuccess("Account created successfully! You can now sign in.");
        switchTab("login");
        document.getElementById("loginEmail").value = userData.email;
    } catch (error) {
        showError(error.message);
    }
}

// Show main app UI and initialize finance app
function showMainApp() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("userWelcome").textContent = `Welcome, ${currentUser.name}!`;

    if (financeApp) {
        financeApp.updateDisplay();
    } else {
        financeApp = new FinanceApp(currentUser);
    }
}

// Logout user
function logout() {
    currentUser = null;
    financeApp = null;
    document.getElementById("mainApp").style.display = "none";
    document.getElementById("loginPage").style.display = "block";
    switchTab("login");
    document.getElementById("loginForm").reset();
    document.getElementById("registerForm").reset();
    
    // Reset to demo credentials
    document.getElementById("loginEmail").value = "demo@financetracker.com";
    document.getElementById("loginPassword").value = "demo123";
}

// Clear all filters
function clearFilters() {
    document.getElementById("filterType").value = "";
    document.getElementById("filterCategory").value = "";
    document.getElementById("filterDate").value = "";
    if (financeApp) {
        financeApp.updateDisplay();
    }
}

// Finance App Class
class FinanceApp {
    constructor(user) {
        this.user = user;
        this.chart = null;
        this.allTransactions = [];
        this.categories = {
            income: ["Salary", "Freelance", "Investment", "Gift", "Other Income"],
            expense: [
                "Food",
                "Transportation",
                "Utilities",
                "Entertainment",
                "Healthcare",
                "Shopping",
                "Rent",
                "Other",
            ],
        };
        this.initializeApp();
    }

    async initializeApp() {
        this.setupEventListeners();
        this.populateCategories();
        this.setDefaultDate();
        
        await this.loadTransactions();
        this.setupChart();
        this.updateDisplay();
    }

    setupEventListeners() {
        document.getElementById("transactionForm").addEventListener("submit", (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        document.getElementById("type").addEventListener("change", (e) => {
            this.populateCategories(e.target.value);
        });

        ["filterType", "filterCategory", "filterDate"].forEach((id) => {
            document.getElementById(id).addEventListener("change", () => {
                this.updateDisplay();
            });
        });
    }

    populateCategories(type = null) {
        const categorySelect = document.getElementById("category");
        const filterCategorySelect = document.getElementById("filterCategory");

        categorySelect.innerHTML = '<option value="">Select Category</option>';

        if (type && this.categories[type]) {
            this.categories[type].forEach((cat) => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }

        const allCategories = [...new Set([...this.categories.income, ...this.categories.expense])];
        filterCategorySelect.innerHTML = '<option value="">All Categories</option>';
        allCategories.forEach((cat) => {
            filterCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("date").value = today;
    }

    async loadTransactions() {
        try {
            this.allTransactions = await apiRequest(`/transactions/${this.user.id}`, "GET");
            console.log("Loaded transactions:", this.allTransactions.length);
        } catch (error) {
            console.error("Failed to load transactions:", error);
            this.allTransactions = [];
            this.showNotification("Failed to load transactions", "error");
        }
    }

    async addTransaction() {
        const formData = {
            description: document.getElementById("description").value.trim(),
            amount: parseFloat(document.getElementById("amount").value),
            type: document.getElementById("type").value,
            category: document.getElementById("category").value,
            date: document.getElementById("date").value,
        };

        if (!formData.description || !formData.amount || !formData.type || !formData.category || !formData.date) {
            this.showNotification("Please fill in all fields", "error");
            return;
        }

        if (formData.amount <= 0) {
            this.showNotification("Amount must be greater than 0", "error");
            return;
        }

        try {
            const newTransaction = await apiRequest(`/transactions/${this.user.id}`, "POST", formData);
            this.allTransactions.unshift(newTransaction);
            this.clearForm();
            this.updateDisplay();
            this.showNotification("Transaction added successfully!", "success");
        } catch (error) {
            this.showNotification(error.message, "error");
        }
    }

    clearForm() {
        document.getElementById("transactionForm").reset();
        this.setDefaultDate();
        document.getElementById("category").innerHTML = '<option value="">Select Category</option>';
    }

    async deleteTransaction(id) {
        if (!confirm("Are you sure you want to delete this transaction?")) return;

        try {
            await apiRequest(`/transactions/${this.user.id}?id=${id}`, "DELETE");
            this.allTransactions = this.allTransactions.filter(t => t.id !== id);
            this.updateDisplay();
            this.showNotification("Transaction deleted successfully!", "success");
        } catch (error) {
            this.showNotification(error.message, "error");
        }
    }

    getFilteredTransactions() {
        const typeFilter = document.getElementById("filterType").value;
        const categoryFilter = document.getElementById("filterCategory").value;
        const monthFilter = document.getElementById("filterDate").value;

        let filtered = [...this.allTransactions];

        if (typeFilter) {
            filtered = filtered.filter((t) => t.type === typeFilter);
        }

        if (categoryFilter) {
            filtered = filtered.filter((t) => t.category === categoryFilter);
        }

        if (monthFilter) {
            filtered = filtered.filter((t) => t.date.startsWith(monthFilter));
        }

        return filtered;
    }

    updateDisplay() {
        const filteredTransactions = this.getFilteredTransactions();
        this.renderStats(filteredTransactions);
        this.renderTransactions(filteredTransactions);
        this.updateChart(filteredTransactions);
    }

    renderStats(transactions) {
        const income = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expenses = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const balance = income - expenses;
        const savingsRate = income > 0 ? (balance / income) * 100 : 0;

        document.getElementById("totalIncome").textContent = this.formatCurrency(income);
        document.getElementById("totalExpenses").textContent = this.formatCurrency(expenses);
        document.getElementById("netBalance").textContent = this.formatCurrency(balance);
        document.getElementById("savingsRate").textContent = savingsRate.toFixed(1) + "%";

        const balanceElement = document.getElementById("netBalance");
        balanceElement.className = `stat-value ${balance >= 0 ? "income" : "expenses"}`;
    }

    renderTransactions(transactions) {
        const listElement = document.getElementById("transactionList");

        if (transactions.length === 0) {
            listElement.innerHTML = '<div class="no-transactions">No transactions found matching your filters.</div>';
            return;
        }

        listElement.innerHTML = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((transaction) => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-details">
                            ${transaction.category} • ${this.formatDate(transaction.date)}
                        </div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === "income" ? "+" : "-"}${this.formatCurrency(parseFloat(transaction.amount))}
                    </div>
                    <button class="btn btn-delete" onclick="financeApp.deleteTransaction('${transaction.id}')">
                        🗑️
                    </button>
                </div>
            `).join("");
    }

    setupChart() {
        const canvas = document.getElementById("expenseChart");
        if (!canvas) {
            console.error("Chart canvas not found!");
            return;
        }
        
        const ctx = canvas.getContext("2d");
        
        try {
            this.chart = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
                            "#9966FF", "#FF9F40", "#FF8C00", "#32CD32",
                            "#FFB6C1", "#87CEEB"
                        ],
                        borderWidth: 2,
                        borderColor: "#fff",
                        hoverBorderWidth: 3
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 12
                                }
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                },
            });
            console.log("Chart initialized successfully");
        } catch (error) {
            console.error("Chart initialization failed:", error);
        }
    }

    updateChart(transactions) {
        if (!this.chart) {
            console.error("Chart not initialized");
            return;
        }

        const expensesByCategory = {};
        
        transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const amount = parseFloat(t.amount);
                if (!isNaN(amount) && amount > 0) {
                    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amount;
                }
            });

        const labels = Object.keys(expensesByCategory);
        const data = Object.values(expensesByCategory);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        
        try {
            this.chart.update();
        } catch (error) {
            console.error("Chart update failed:", error);
        }

        const chartMessage = document.getElementById("chartMessage");
        if (data.length === 0 || data.every(val => val === 0)) {
            chartMessage.style.display = "block";
        } else {
            chartMessage.style.display = "none";
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Event Listeners
document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
});

document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleRegister();
});

// Global functions
window.logout = logout;
window.switchTab = switchTab;
window.clearFilters = clearFilters;
window.financeApp = null;
