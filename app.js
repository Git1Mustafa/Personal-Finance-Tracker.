const API_BASE = window.location.origin;

let currentUser = null;
let financeApp = null;
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').style.display = 'none';
    initApp();
});

async function initApp() {
    const saved = localStorage.getItem('ft_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            // Verify the session is still valid by pinging the backend
            await verifyBackend();
            showMainApp();
        } catch {
            localStorage.removeItem('ft_user');
            hideLoading();
        }
    } else {
        await verifyBackend();
        hideLoading();
    }
    setupFormListeners();
}

async function verifyBackend() {
    const loading = document.getElementById('loadingScreen');
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Backend unhealthy');
    } catch {
        // Backend is unreachable — show a non-blocking warning after load
        scheduleOfflineWarning();
    }
}

function scheduleOfflineWarning() {
    // Show warning after UI is visible
    setTimeout(() => {
        showBanner('Unable to reach the backend server. Please try again later.', 'error');
    }, 600);
}

function hideLoading() {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');
}

// ─── Core API ────────────────────────────────────────────────────────────────

async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    let res;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        res = await fetch(API_BASE + url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection.');
        }
        throw new Error('Backend is offline. Please try again later.');
    }

    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Unexpected server response (HTTP ${res.status}).`);
    }

    if (!res.ok) {
        throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    }

    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function setupFormListeners() {
    document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
    document.getElementById('registerForm').addEventListener('submit', e => { e.preventDefault(); handleRegister(); });
    document.getElementById('transactionForm').addEventListener('submit', e => { e.preventDefault(); if (financeApp) financeApp.addTransaction(); });
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showError('Please enter both email and password.'); return; }

    const btn = document.querySelector('#loginForm .btn-login');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
        const user = await apiRequest('/login', 'POST', { email, password });
        currentUser = user;
        localStorage.setItem('ft_user', JSON.stringify(user));
        hideLoading();
        showMainApp();
    } catch (err) {
        showError(err.message || 'Login failed. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

async function handleRegister() {
    const userData = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };

    if (!userData.name || !userData.email || !userData.password) {
        showError('Please fill in all fields.');
        return;
    }
    if (userData.password !== userData.confirmPassword) {
        showError('Passwords do not match.');
        return;
    }
    if (userData.password.length < 6) {
        showError('Password must be at least 6 characters.');
        return;
    }

    const btn = document.querySelector('#registerForm .btn-login');
    btn.disabled = true;
    btn.textContent = 'Creating account…';

    try {
        await apiRequest('/register', 'POST', userData);
        showSuccess('Account created! Please sign in.');
        switchTab('login');
        document.getElementById('loginEmail').value = userData.email;
        document.getElementById('registerForm').reset();
    } catch (err) {
        showError(err.message || 'Registration failed. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
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
    document.querySelectorAll('.tab-btn')[['dashboard', 'add', 'history'].indexOf(name)].classList.add('active');
    if (financeApp) financeApp.updateDisplay();
}

function logout() {
    currentUser = null;
    financeApp = null;
    localStorage.removeItem('ft_user');
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    switchTab('login');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function showMainApp() {
    hideLoading();
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.name}!`;

    if (!financeApp) {
        financeApp = new FinanceApp(currentUser);
        window.financeApp = financeApp;
    } else {
        financeApp.updateDisplay();
    }
}

function clearFilters() {
    ['filterType', 'filterCategory', 'filterDateFrom', 'filterDateTo'].forEach(id => {
        document.getElementById(id).value = '';
    });
    if (financeApp) financeApp.updateDisplay();
}

// ─── Banner notification (top of screen) ─────────────────────────────────────

function showBanner(message, type = 'info') {
    // Remove any existing banner
    document.querySelectorAll('.banner-notification').forEach(el => el.remove());

    const banner = document.createElement('div');
    banner.className = `banner-notification ${type}`;
    banner.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" aria-label="Dismiss">✕</button>`;
    document.body.prepend(banner);

    setTimeout(() => banner.remove(), 8000);
}

// ─── FinanceApp class ─────────────────────────────────────────────────────────

class FinanceApp {
    constructor(user) {
        this.user = user;
        this.allTransactions = [];
        this.categories = {
            income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Business', 'Other Income'],
            expense: ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Rent', 'Education', 'Other']
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
        } catch (err) {
            this.allTransactions = [];
            this.showNotification(err.message || 'Failed to load transactions.', 'error');
        }
    }

    async addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amountStr = document.getElementById('amount').value;
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amountStr || !type || !category || !date) {
            this.showNotification('Please fill in all fields.', 'error');
            return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Amount must be a positive number.', 'error');
            return;
        }
        if (amount > 10000000) {
            this.showNotification('Amount cannot exceed ₹1,00,00,000.', 'error');
            return;
        }

        const btn = document.querySelector('#transactionForm .btn-primary');
        btn.disabled = true;
        btn.textContent = 'Saving…';

        try {
            const newTx = await apiRequest(`/transactions/${this.user.id}`, 'POST', { description, amount, type, category, date });
            this.allTransactions.unshift(newTx);
            this.clearForm();
            this.updateDisplay();
            this.showNotification('Transaction added!', 'success');
            showTab('dashboard');
        } catch (err) {
            this.showNotification(err.message || 'Failed to add transaction.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add Transaction';
        }
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
            this.showNotification('Transaction deleted.', 'success');
        } catch (err) {
            this.showNotification(err.message || 'Failed to delete transaction.', 'error');
        }
    }

    populateCategories(type = null) {
        const catSelect = document.getElementById('category');
        const filterCat = document.getElementById('filterCategory');
        if (!catSelect) return;

        catSelect.innerHTML = '<option value="">Select Category</option>';
        const list = type && this.categories[type]
            ? this.categories[type]
            : [...this.categories.income, ...this.categories.expense];
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
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
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
        this.renderToList(list, this.allTransactions.slice(0, 5));
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
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(t => {
                const item = document.createElement('div');
                item.className = 'transaction-item';

                const info = document.createElement('div');

                const desc = document.createElement('div');
                desc.className = 'transaction-description';
                desc.textContent = t.description; // XSS-safe

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
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#8BC34A'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
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
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    }

    showNotification(message, type = 'info') {
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3500);
    }
}

// ─── Globals ──────────────────────────────────────────────────────────────────
window.switchTab = switchTab;
window.showTab = showTab;
window.logout = logout;
window.clearFilters = clearFilters;
