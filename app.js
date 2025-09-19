/* app.js
   Full frontend logic:
   - backend connection check (with AbortController)
   - login/register
   - load/add/delete transactions
   - chart rendering (Chart.js)
   - offline mock fallback (demo user + demo transactions)
*/

const API_BASE = "http://127.0.0.1:5000";

let currentUser = null;
let financeApp = null;
let connectionStatus = 'checking'; // 'connected' | 'disconnected'
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Prepare UI defaults
    document.getElementById('loginPage').classList.remove('hidden'); // show login by default, hide loading when ready
    document.getElementById('mainApp').style.display = 'none';

    checkBackendConnection();
    setupFormListeners();
    document.getElementById("loginEmail").value = "demo@financetracker.com";
    document.getElementById("loginPassword").value = "demo123";
});

async function checkBackendConnection() {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            connectionStatus = 'connected';
            hideLoading();
        } else {
            connectionStatus = 'disconnected';
            console.warn('Health returned non-ok, switching to offline mode');
            hideLoading();
        }
    } catch (err) {
        connectionStatus = 'disconnected';
        console.warn('Backend connection failed, continuing with frontend-only mode', err);
        hideLoading();
    }
}

function hideLoading() {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');

    const login = document.getElementById('loginPage');
    if (login) login.classList.remove('hidden');

    // connection status badge
    const statusDiv = document.createElement('div');
    statusDiv.className = `connection-status ${connectionStatus}`;
    statusDiv.textContent = connectionStatus === 'connected' ? 'Backend Connected' : 'Offline Mode';
    document.body.appendChild(statusDiv);
}

/* ---------------------------
   Helper: API request (with fallback)
   --------------------------- */
async function apiRequest(url, method = "GET", body = null) {
    if (connectionStatus === 'connected') {
        try {
            const options = {
                method,
                headers: { "Content-Type": "application/json" },
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(API_BASE + url, options);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            return data;
        } catch (err) {
            console.warn('API request failed, switching to offline mock:', err.message || err);
            connectionStatus = 'disconnected';
            return handleMockRequest(url, method, body);
        }
    } else {
        return handleMockRequest(url, method, body);
    }
}

/* ---------------------------
   Mock data handler (offline support)
   --------------------------- */
function handleMockRequest(url, method, body) {
    const mock = getMockData();

    // Login
    if (url === '/login' && method === 'POST') {
        const { email, password } = body || {};
        if (email === 'demo@financetracker.com' && password === 'demo123') {
            return { id: '1', name: 'Demo User', email: email };
        }
        throw new Error('Invalid credentials');
    }

    // Register
    if (url === '/register' && method === 'POST') {
        return { message: 'Registration successful (mock mode)' };
    }

    // Get transactions
    if (url.startsWith('/transactions/') && method === 'GET') {
        return mock.transactions;
    }

    // Add transaction
    if (url.startsWith('/transactions/') && method === 'POST') {
        const newTransaction = {
            id: Date.now().toString(),
            user_id: '1',
            ...body,
            timestamp: new Date().toISOString()
        };
        mock.transactions.unshift(newTransaction);
        return newTransaction;
    }

    // Delete transaction
    if (url.startsWith('/transactions/') && method === 'DELETE') {
        const params = new URLSearchParams(url.split('?')[1] || '');
        const id = params.get('id');
        const idx = mock.transactions.findIndex(t => t.id === id);
        if (idx >= 0) {
            mock.transactions.splice(idx, 1);
            return { message: 'Transaction deleted' };
        }
        throw new Error('Transaction not found (mock)');
    }

    // Categories
    if (url === '/categories' && method === 'GET') {
        return {
            income: ["Salary", "Freelance", "Investment", "Gift", "Other Income"],
            expense: ["Food", "Transportation", "Utilities", "Entertainment", "Healthcare", "Shopping", "Rent", "Other"]
        };
    }

    throw new Error('Mock endpoint not found: ' + url);
}

function getMockData() {
    if (!window.mockData) {
        window.mockData = {
            transactions: [
                { id: "1", user_id: "1", description: "Monthly Salary", amount: 5000, type: "income", category: "Salary", date: "2025-09-01", timestamp: new Date().toISOString() },
                { id: "2", user_id: "1", description: "Grocery Shopping", amount: 150, type: "expense", category: "Food", date: "2025-09-02", timestamp: new Date().toISOString() },
                { id: "3", user_id: "1", description: "Gas Bill", amount: 80, type: "expense", category: "Utilities", date: "2025-09-01", timestamp: new Date().toISOString() },
                { id: "4", user_id: "1", description: "Coffee Shop", amount: 25, type: "expense", category: "Food", date: "2025-09-02", timestamp: new Date().toISOString() },
                { id: "5", user_id: "1", description: "Freelance Project", amount: 800, type: "income", category: "Freelance", date: "2025-08-30", timestamp: new Date().toISOString() }
            ]
        };
    }
    return window.mockData;
}

/* ---------------------------
   UI helpers
   --------------------------- */
function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

/* ---------------------------
   Auth: login / register
   --------------------------- */
function setupFormListeners() {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    document.getElementById("transactionForm").addEventListener("submit", (e) => {
        e.preventDefault();
        if (financeApp) financeApp.addTransaction();
    });

    document.getElementById("type").addEventListener("change", (e) => {
        if (financeApp) financeApp.populateCategories(e.target.value);
    });

    ["filterType","filterCategory","filterDateFrom","filterDateTo"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { if (financeApp) financeApp.updateDisplay(); });
    });
}

async function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
        showError("Please enter both email and password");
        return;
    }

    try {
        const user = await apiRequest("/login", "POST", { email, password });
        // apiRequest returns thrown Error on failure; else it returns user object.
        currentUser = user;
        localStorage.setItem('ft_user', JSON.stringify(user));
        showMainApp();
    } catch (err) {
        showError(err.message || String(err));
    }
}

async function handleRegister() {
    const userData = {
        name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        password: document.getElementById("registerPassword").value,
        confirmPassword: document.getElementById("confirmPassword").value
    };

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
        showSuccess("Account created successfully! Please sign in.");
        switchTab('login');
        document.getElementById("loginEmail").value = userData.email;
    } catch (err) {
        showError(err.message || String(err));
    }
}

/* ---------------------------
   UI: tabs, logout, etc.
   --------------------------- */
function switchTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginTab = document.querySelector(".auth-tab:nth-child(1)");
    const registerTab = document.querySelector(".auth-tab:nth-child(2)");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (errorMessage) errorMessage.style.display = "none";
    if (successMessage) successMessage.style.display = "none";

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        if (loginTab) loginTab.classList.add("active");
        if (registerTab) registerTab.classList.remove("active");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        if (loginTab) loginTab.classList.remove("active");
        if (registerTab) registerTab.classList.add("active");
    }
}

function logout() {
    currentUser = null;
    financeApp = null;
    localStorage.removeItem('ft_user');
    document.getElementById("mainApp").style.display = "none";
    document.getElementById("loginPage").style.display = "block";
    switchTab('login');
    document.getElementById("loginForm").reset();
    document.getElementById("registerForm").reset();
    document.getElementById("loginEmail").value = "demo@financetracker.com";
    document.getElementById("loginPassword").value = "demo123";
}

/* ---------------------------
   FinanceApp class
   --------------------------- */
class FinanceApp {
    constructor(user) {
        this.user = user;
        this.allTransactions = [];
        this.chart = null;
        this.categories = {
            income: ["Salary", "Freelance", "Investment", "Gift", "Other Income"],
            expense: ["Food","Transportation","Utilities","Entertainment","Healthcare","Shopping","Rent","Other"]
        };
        this.initializeApp();
    }

    async initializeApp() {
        this.populateCategories(); // populate filter & default category list
        this.setDefaultDate();
        await this.loadTransactions();
        this.setupChart();
        this.updateDisplay();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.value = today;
    }

    async loadTransactions() {
        try {
            const tx = await apiRequest(`/transactions/${this.user.id}`, "GET");
            // ensure array
            this.allTransactions = Array.isArray(tx) ? tx : [];
            console.log("Loaded transactions:", this.allTransactions.length);
        } catch (err) {
            console.error("Failed to load transactions:", err);
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
            date: document.getElementById("date").value
        };

        if (!formData.description || !formData.amount || !formData.type || !formData.category || !formData.date) {
            this.showNotification("Please fill in all fields", "error");
            return;
        }

        if (isNaN(formData.amount) || formData.amount <= 0) {
            this.showNotification("Amount must be a positive number", "error");
            return;
        }

        try {
            const newTx = await apiRequest(`/transactions/${this.user.id}`, "POST", formData);
            // some backends return created object, ensure consistent format
            this.allTransactions.unshift(newTx);
            this.clearForm();
            this.updateDisplay();
            this.showNotification("Transaction added successfully!", "success");
        } catch (err) {
            this.showNotification(err.message || String(err), "error");
        }
    }

    clearForm() {
        document.getElementById("transactionForm").reset();
        this.setDefaultDate();
        // reset category to default
        document.getElementById("category").innerHTML = '<option value="">Select Category</option>';
        this.populateCategories();
    }

    async deleteTransaction(id) {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await apiRequest(`/transactions/${this.user.id}?id=${id}`, "DELETE");
            this.allTransactions = this.allTransactions.filter(t => t.id !== id);
            this.updateDisplay();
            this.showNotification("Transaction deleted successfully!", "success");
        } catch (err) {
            this.showNotification(err.message || String(err), "error");
        }
    }

    populateCategories(type = null) {
        const categorySelect = document.getElementById("category");
        const filterCategorySelect = document.getElementById("filterCategory");
        if (!categorySelect || !filterCategorySelect) return;

        categorySelect.innerHTML = '<option value="">Select Category</option>';
        const allCategories = Array.from(new Set([...this.categories.income, ...this.categories.expense]));

        if (type && this.categories[type]) {
            this.categories[type].forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        } else {
            // default show income categories first
            this.categories.income.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }

        // populate filter categories (unique)
        filterCategorySelect.innerHTML = '<option value="">All Categories</option>';
        allCategories.forEach(cat => {
            filterCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    getFilteredTransactions() {
        const typeFilter = document.getElementById("filterType").value;
        const categoryFilter = document.getElementById("filterCategory").value;
        const dateFromFilter = document.getElementById("filterDateFrom").value;
        const dateToFilter = document.getElementById("filterDateTo").value;

        let filtered = [...this.allTransactions];

        if (typeFilter) filtered = filtered.filter(t => t.type === typeFilter);
        if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);
        if (dateFromFilter) filtered = filtered.filter(t => t.date >= dateFromFilter);
        if (dateToFilter) filtered = filtered.filter(t => t.date <= dateToFilter);
        return filtered;
    }

    updateDisplay() {
        const filtered = this.getFilteredTransactions();
        this.renderStats(filtered);
        this.renderTransactions(filtered);
        this.updateChart(filtered);
    }

    renderStats(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s + parseFloat(t.amount), 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + parseFloat(t.amount), 0);
        const balance = income - expenses;
        const savingsRate = income > 0 ? (balance / income) * 100 : 0;

        document.getElementById("totalIncome").textContent = this.formatCurrency(income);
        document.getElementById("totalExpenses").textContent = this.formatCurrency(expenses);
        const netBalanceEl = document.getElementById("netBalance");
        netBalanceEl.textContent = this.formatCurrency(balance);
        netBalanceEl.className = `stat-value ${balance >= 0 ? 'income' : 'expenses'}`;
        document.getElementById("savingsRate").textContent = savingsRate.toFixed(1) + "%";
    }

    renderTransactions(transactions) {
        const list = document.getElementById("transactionList");
        if (!list) return;

        if (!transactions || transactions.length === 0) {
            list.innerHTML = '<div class="no-transactions">No transactions found matching your filters.</div>';
            return;
        }

        list.innerHTML = transactions
            .sort((a,b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp))
            .map(t => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-description">${t.description}</div>
                        <div class="transaction-details">${t.category} • ${this.formatDate(t.date)}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${this.formatCurrency(parseFloat(t.amount))}</div>
                        <button class="btn-delete" onclick="financeApp.deleteTransaction('${t.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
    }

    setupChart() {
        const canvas = document.getElementById("expenseChart");
        if (!canvas) {
            console.error("Chart canvas not found");
            return;
        }
        // Chart will be created/updated by updateChart; initialize empty instance placeholder
        if (chartInstance) {
            try { chartInstance.destroy(); } catch(e){}
            chartInstance = null;
        }
    }

    updateChart(transactions) {
        const ctx = document.getElementById("expenseChart");
        const chartMessage = document.getElementById("chartMessage");
        if (!ctx) return;

        // get expense totals by category
        const expenses = (transactions || []).filter(t => t.type === 'expense');
        const totals = {};
        expenses.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (!totals[t.category]) totals[t.category] = 0;
            totals[t.category] += amt;
        });

        const labels = Object.keys(totals);
        const data = Object.values(totals);

        if (!labels.length || data.every(v => v === 0)) {
            if (chartMessage) chartMessage.style.display = 'block';
            if (chartInstance) { try { chartInstance.destroy(); } catch(e){} chartInstance = null; }
            return;
        } else {
            if (chartMessage) chartMessage.style.display = 'none';
        }

        // destroy existing chart
        if (chartInstance) {
            try { chartInstance.destroy(); } catch (e) { console.warn(e); }
            chartInstance = null;
        }

        const ctx2d = ctx.getContext('2d');
        chartInstance = new Chart(ctx2d, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    label: 'Expenses',
                    data,
                    // nice default colors
                    backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
                        "#9966FF", "#FF9F40", "#FF8C00", "#32CD32",
                        "#FFB6C1", "#87CEEB"
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a,b) => a + b, 0);
                                const percent = total > 0 ? ((value/total)*100).toFixed(1) : 0;
                                return `${label}: ${formatCurrency(value)} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(amount || 0);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString("en-US", { year:'numeric', month:'short', day:'numeric' });
        } catch (e) {
            return dateString;
        }
    }

    showNotification(message, type = "info") {
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    }
}

/* ---------------------------
   Connect UI to app
   --------------------------- */
function showMainApp() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("userWelcome").textContent = `Welcome, ${currentUser.name}!`;

    if (financeApp) {
        financeApp.updateDisplay();
    } else {
        financeApp = new FinanceApp(currentUser);
        // attach to window for use in inline onclick handlers
        window.financeApp = financeApp;
    }
}

/* Clear filters */
function clearFilters() {
    document.getElementById("filterType").value = "";
    document.getElementById("filterCategory").value = "";
    document.getElementById("filterDateFrom").value = "";
    document.getElementById("filterDateTo").value = "";
    if (financeApp) financeApp.updateDisplay();
}

/* Expose global functions */
window.switchTab = switchTab;
window.logout = logout;
window.clearFilters = clearFilters;
window.financeApp = financeApp;

// If a user was saved in localStorage, auto-sign-in (demo behavior)
(function tryAutoSignIn() {
    const saved = localStorage.getItem('ft_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            // small delay to allow connection check to run
            setTimeout(() => {
                showMainApp();
            }, 300);
        } catch (e) { /* ignore */ }
    }
})();
