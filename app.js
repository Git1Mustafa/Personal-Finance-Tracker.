const API_BASE = window.location.origin;

let currentUser = null;
let financeApp = null;
let connectionStatus = 'checking';
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').style.display = 'none';
    checkBackendConnection();
    setupFormListeners();
});

async function checkBackendConnection() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        connectionStatus = res.ok ? 'connected' : 'disconnected';
    } catch {
        connectionStatus = 'disconnected';
    }
    hideLoading();
}

function hideLoading() {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');
    const badge = document.createElement('div');
    badge.className = `connection-status ${connectionStatus}`;
    badge.textContent = connectionStatus === 'connected' ? 'Backend Connected' : 'Offline Mode';
    document.body.appendChild(badge);

    const saved = localStorage.getItem('ft_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            showMainApp();
        } catch { localStorage.removeItem('ft_user'); }
    }
}

async function apiRequest(url, method = 'GET', body = null) {
    if (connectionStatus === 'connected') {
        try {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(API_BASE + url, options);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
        } catch (err) {
            connectionStatus = 'disconnected';
            return handleMockRequest(url, method, body);
        }
    }
    return handleMockRequest(url, method, body);
}

function handleMockRequest(url, method, body) {
    const mock = getMockData();
    if (url === '/login' && method === 'POST') {
        const { email, password } = body || {};
        if (email === 'demo@financetracker.com' && password === 'demo123')
            return { id: '1', name: 'Demo User', email };
        throw new Error('Invalid credentials');
    }
    if (url === '/register' && method === 'POST') return { message: 'Registered (offline mode)' };
    if (url.startsWith('/transactions/') && method === 'GET') return mock.transactions;
    if (url.startsWith('/transactions/') && method === 'POST') {
        const t = { id: Date.now().toString(), user_id: '1', ...body, timestamp: new Date().toISOString() };
        mock.transactions.unshift(t);
        return t;
    }
    if (url.startsWith('/transactions/') && method === 'DELETE') {
        const id = new URLSearchParams(url.split('?')[1] || '').get('id');
        const i = mock.transactions.findIndex(t => t.id === id);
        if (i >= 0) { mock.transactions.splice(i, 1); return { message: 'Deleted' }; }
        throw new Error('Not found');
    }
    if (url === '/categories') return {
        income: ['Salary','Freelance','Investment','Gift','Business','Other Income'],
        expense: ['Food','Transportation','Utilities','Entertainment','Healthcare','Shopping','Rent','Education','Other']
    };
    throw new Error('Mock endpoint not found');
}

function getMockData() {
    if (!window.mockData) {
        window.mockData = {
            transactions: [
                { id:'1', user_id:'1', description:'Monthly Salary', amount:50000, type:'income', category:'Salary', date:'2025-09-01', timestamp: new Date().toISOString() },
                { id:'2', user_id:'1', description:'Grocery Shopping', amount:2500, type:'expense', category:'Food', date:'2025-09-02', timestamp: new Date().toISOString() },
                { id:'3', user_id:'1', description:'Electricity Bill', amount:1200, type:'expense', category:'Utilities', date:'2025-09-01', timestamp: new Date().toISOString() },
                { id:'4', user_id:'1', description:'Coffee Shop', amount:350, type:'expense', category:'Food', date:'2025-09-02', timestamp: new Date().toISOString() },
                { id:'5', user_id:'1', description:'Freelance Project', amount:15000, type:'income', category:'Freelance', date:'2025-08-30', timestamp: new Date().toISOString() }
            ]
        };
    }
    return window.mockData;
}

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

function setupFormListeners() {
    document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
    document.getElementById('registerForm').addEventListener('submit', e => { e.preventDefault(); handleRegister(); });
    document.getElementById('transactionForm').addEventListener('submit', e => { e.preventDefault(); if (financeApp) financeApp.addTransaction(); });
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showError('Please enter both email and password'); return; }
    try {
        const user = await apiRequest('/login', 'POST', { email, password });
        currentUser = user;
        localStorage.setItem('ft_user', JSON.stringify(user));
        showMainApp();
    } catch (err) { showError(err.message || 'Login failed'); }
}

async function handleRegister() {
    const userData = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };
    if (!userData.name || !userData.email || !userData.password) { showError('Please fill in all fields'); return; }
    if (userData.password !== userData.confirmPassword) { showError('Passwords do not match'); return; }
    if (userData.password.length < 6) { showError('Password must be at least 6 characters'); return; }
    try {
        await apiRequest('/register', 'POST', userData);
        showSuccess('Account created! Please sign in.');
        switchTab('login');
        document.getElementById('loginEmail').value = userData.email;
    } catch (err) { showError(err.message || 'Registration failed'); }
}

function switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.querySelectorAll('.auth-tab').forEach((btn, i) =>
        btn.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'))
    );
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function showTab(name) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelectorAll('.tab-btn')[['dashboard','add','history'].indexOf(name)].classList.add('active');
    if (financeApp) financeApp.updateDisplay();
}

function logout() {
    currentUser = null; financeApp = null;
    localStorage.removeItem('ft_user');
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    switchTab('login');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    const welcomeEl = document.getElementById('userWelcome');
    welcomeEl.textContent = `Welcome, ${currentUser.name}!`;
    if (!financeApp) {
        financeApp = new FinanceApp(currentUser);
        window.financeApp = financeApp;
    } else {
        financeApp.updateDisplay();
    }
}

function clearFilters() {
    ['filterType','filterCategory','filterDateFrom','filterDateTo'].forEach(id => {
        document.getElementById(id).value = '';
    });
    if (financeApp) financeApp.updateDisplay();
}

class FinanceApp {
    constructor(user) {
        this.user = user;
        this.allTransactions = [];
        this.categories = {
            income: ['Salary','Freelance','Investment','Gift','Business','Other Income'],
            expense: ['Food','Transportation','Utilities','Entertainment','Healthcare','Shopping','Rent','Education','Other']
        };
        this.initializeApp();
    }

    async initializeApp() {
        this.populateCategories();
        this.setDefaultDate();
        await this.loadTransactions();
        this.updateDisplay();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const el = document.getElementById('date');
        if (el) el.value = today;
    }

    async loadTransactions() {
        try {
            const tx = await apiRequest(`/transactions/${this.user.id}`, 'GET');
            this.allTransactions = Array.isArray(tx) ? tx : [];
        } catch {
            this.allTransactions = [];
            this.showNotification('Failed to load transactions', 'error');
        }
    }

    async addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amountStr = document.getElementById('amount').value;
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amountStr || !type || !category || !date) {
            this.showNotification('Please fill in all fields', 'error'); return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Amount must be a positive number', 'error'); return;
        }
        if (amount > 10000000) {
            this.showNotification('Amount cannot exceed ₹1,00,00,000', 'error'); return;
        }

        try {
            const newTx = await apiRequest(`/transactions/${this.user.id}`, 'POST', { description, amount, type, category, date });
            this.allTransactions.unshift(newTx);
            this.clearForm();
            this.updateDisplay();
            this.showNotification('Transaction added!', 'success');
            showTab('dashboard');
        } catch (err) { this.showNotification(err.message || 'Failed', 'error'); }
    }

    clearForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
        this.populateCategories();
    }

    async deleteTransaction(id) {
        if (!confirm('Delete this transaction?')) return;
        try {
            await apiRequest(`/transactions/${this.user.id}?id=${id}`, 'DELETE');
            this.allTransactions = this.allTransactions.filter(t => t.id !== id);
            this.updateDisplay();
            this.showNotification('Transaction deleted', 'success');
        } catch (err) { this.showNotification(err.message || 'Failed to delete', 'error'); }
    }

    populateCategories(type = null) {
        const catSelect = document.getElementById('category');
        const filterCat = document.getElementById('filterCategory');
        if (!catSelect) return;

        catSelect.innerHTML = '<option value="">Select Category</option>';
        const list = type && this.categories[type] ? this.categories[type] :
            [...this.categories.income, ...this.categories.expense];
        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.textContent = cat;
            catSelect.appendChild(opt);
        });

        if (filterCat) {
            filterCat.innerHTML = '<option value="">All Categories</option>';
            [...new Set([...this.categories.income, ...this.categories.expense])].forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat; opt.textContent = cat;
                filterCat.appendChild(opt);
            });
        }
    }

    getFilteredTransactions() {
        const typeF = document.getElementById('filterType')?.value || '';
        const catF = document.getElementById('filterCategory')?.value || '';
        const fromF = document.getElementById('filterDateFrom')?.value || '';
        const toF = document.getElementById('filterDateTo')?.value || '';

        return this.allTransactions.filter(t =>
            (!typeF || t.type === typeF) &&
            (!catF || t.category === catF) &&
            (!fromF || t.date >= fromF) &&
            (!toF || t.date <= toF)
        );
    }

    updateDisplay() {
        const filtered = this.getFilteredTransactions();
        this.renderStats(filtered);
        this.renderRecentTransactions();
        this.renderTransactions(filtered);
        this.updateChart(filtered);
    }

    renderStats(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
        const balance = income - expenses;
        const savingsRate = income > 0 ? (balance / income) * 100 : 0;

        document.getElementById('totalIncome').textContent = this.formatINR(income);
        document.getElementById('totalExpenses').textContent = this.formatINR(expenses);
        const balEl = document.getElementById('netBalance');
        balEl.textContent = this.formatINR(balance);
        balEl.className = `stat-value ${balance >= 0 ? 'positive' : 'negative'}`;
        document.getElementById('savingsRate').textContent = `${Math.max(-999, Math.min(999, savingsRate)).toFixed(1)}%`;
    }

    renderRecentTransactions() {
        const list = document.getElementById('recentTransactionList');
        if (!list) return;
        const recent = this.allTransactions.slice(0, 5);
        this.renderToList(list, recent);
    }

    renderTransactions(transactions) {
        const list = document.getElementById('transactionList');
        if (!list) return;
        this.renderToList(list, transactions);
    }

    renderToList(container, transactions) {
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions">No transactions found.</div>';
            return;
        }
        container.innerHTML = '';
        [...transactions]
            .sort((a,b) => new Date(b.date) - new Date(a.date))
            .forEach(t => {
                const item = document.createElement('div');
                item.className = 'transaction-item';

                const info = document.createElement('div');

                const desc = document.createElement('div');
                desc.className = 'transaction-description';
                desc.textContent = t.description; // XSS safe: textContent not innerHTML

                const details = document.createElement('div');
                details.className = 'transaction-details';
                details.textContent = `${t.category} • ${this.formatDate(t.date)}`;

                info.appendChild(desc);
                info.appendChild(details);

                const right = document.createElement('div');
                right.className = 'transaction-right';

                const amount = document.createElement('div');
                amount.className = `transaction-amount ${t.type === 'income' ? 'income' : 'expenses'}`;
                amount.textContent = `${t.type === 'income' ? '+' : '-'}${this.formatINR(t.amount)}`;

                const delBtn = document.createElement('button');
                delBtn.className = 'btn-delete';
                delBtn.textContent = 'Delete';
                delBtn.onclick = () => this.deleteTransaction(t.id);

                right.appendChild(amount);
                right.appendChild(delBtn);
                item.appendChild(info);
                item.appendChild(right);
                container.appendChild(item);
            });
    }

    updateChart(transactions) {
        const ctx = document.getElementById('expenseChart');
        const msg = document.getElementById('chartMessage');
        if (!ctx) return;

        const expenses = transactions.filter(t => t.type === 'expense');
        const totals = {};
        expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
        const labels = Object.keys(totals);
        const data = Object.values(totals);

        if (!labels.length) {
            if (msg) msg.style.display = 'flex';
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            return;
        }
        if (msg) msg.style.display = 'none';
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#4CAF50','#2196F3','#FF9800','#f44336','#9C27B0','#00BCD4','#FF5722','#607D8B','#8BC34A'],
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
                                const pct = total > 0 ? ((val/total)*100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${this.formatINR(val)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    formatINR(amount) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try { return new Date(dateStr).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }); }
        catch { return dateStr; }
    }

    showNotification(message, type = 'info') {
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    }
}

window.switchTab = switchTab;
window.showTab = showTab;
window.logout = logout;
window.clearFilters = clearFilters;
