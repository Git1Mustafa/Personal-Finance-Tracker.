const API_BASE = "http://127.0.0.1:5000";

let currentUser = null; // Will hold logged in user info
let financeApp = null;

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

// API call helper function
async function apiRequest(url, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(API_BASE + url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "API request failed");
  return data;
}

// Handle user login
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
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
}

// Class to manage finance data via API
class FinanceApp {
  constructor(user) {
    this.user = user;
    this.chart = null;
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

  initializeApp() {
    this.setupEventListeners();
    this.populateCategories();
    this.setDefaultDate();
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
        this.updateTransactionList();
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
    // Populate filter categories with all categories
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

  async addTransaction() {
    const formData = {
      description: document.getElementById("description").value.trim(),
      amount: parseFloat(document.getElementById("amount").value),
      type: document.getElementById("type").value,
      category: document.getElementById("category").value,
      date: document.getElementById("date").value,
    };
    try {
      await apiRequest(`/transactions/${this.user.id}`, "POST", formData);
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

  async fetchTransactions() {
    return apiRequest(`/transactions/${this.user.id}`, "GET");
  }

  async deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    await apiRequest(`/transactions/${this.user.id}?id=${id}`, "DELETE");
    this.updateDisplay();
    this.showNotification("Transaction deleted successfully!", "success");
  }

  async updateDisplay() {
    const transactions = await this.fetchTransactions();

    // Apply filters
    const typeFilter = document.getElementById("filterType").value;
    const categoryFilter = document.getElementById("filterCategory").value;
    const monthFilter = document.getElementById("filterDate").value;

    let filtered = transactions;
    if (typeFilter) filtered = filtered.filter((t) => t.type === typeFilter);
    if (categoryFilter) filtered = filtered.filter((t) => t.category === categoryFilter);
    if (monthFilter) filtered = filtered.filter((t) => t.date.startsWith(monthFilter));

    this.renderStats(filtered);
    this.renderTransactions(filtered);
    this.updateChart(filtered);
  }

  renderStats(transactions) {
    const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
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
      listElement.innerHTML =
        '<div class="no-transactions">No transactions found matching your filters.</div>';
      return;
    }
    listElement.innerHTML = transactions
      .map(
        (transaction) => `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-description">${transaction.description}</div>
          <div class="transaction-details">
            ${transaction.category} • ${this.formatDate(transaction.date)}
          </div>
        </div>
        <div class="transaction-amount ${transaction.type}">
          ${transaction.type === "income" ? "+" : "-"}${this.formatCurrency(transaction.amount)}
        </div>
        <button class="btn btn-delete" onclick="financeApp.deleteTransaction('${transaction.id}')">
          🗑️
        </button>
      </div>
      `
      )
      .join("");
  }

  setupChart() {
    const ctx = document.getElementById("expenseChart").getContext("2d");
    this.chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#FF6384",
              "#C9CBCF",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 10,
              usePointStyle: true,
            },
          },
        },
      },
    });
  }

  updateChart(transactions) {
    const expensesByCategory = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.update();
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
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === "success" ? "#4CAF50" : "#f44336"};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Event Listeners to wire login and registration forms
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  handleLogin();
});

document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  handleRegister();
});

// Expose logout globally
window.logout = logout;

// Expose deleteTransaction as financeApp may call it before initialization
window.financeApp = null;
window.deleteTransaction = function (id) {
  if (window.financeApp) window.financeApp.deleteTransaction(id);
};
