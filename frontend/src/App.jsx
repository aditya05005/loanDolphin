// App.jsx
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MetricsOverview from "./components/MetricsOverview";
import ActiveLoansTable from "./components/ActiveLoansTable";
import BranchCards from "./components/BranchCards";
import LoanForm from "./components/LoanForm";
import LoginScreen from "./components/LoginScreen";
import { apiRequest } from "./services/api";

const DEFAULT_USERS = [
  { userid: "admin", password: "admin123", type: "administrator" },
  { userid: "branch01", password: "branch123", type: "branch_manager" },
  { userid: "senior01", password: "senior123", type: "senior_manager" },
];

const USERS_STORAGE_KEY = "loanDolphinUsers";
const BRANCHES_STORAGE_KEY = "loanDolphinBranches";
const CUSTOMERS_STORAGE_KEY = "loanDolphinCustomers";
const LOANS_STORAGE_KEY = "loanDolphinLoans";
const MANAGERS_STORAGE_KEY = "loanDolphinManagers";
const SESSION_STORAGE_KEY = "loanDolphinSession";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Ignore unavailable localStorage access.
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function getStoredValue(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function getUsers() {
  const storedUsers = getStoredValue(USERS_STORAGE_KEY, []);
  if (storedUsers.length === 0) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return storedUsers;
}

function getBranches() {
  return getStoredValue(BRANCHES_STORAGE_KEY, []);
}

function getCustomers() {
  return getStoredValue(CUSTOMERS_STORAGE_KEY, []);
}

function getLoans() {
  return getStoredValue(LOANS_STORAGE_KEY, []);
}

function getManagers() {
  return getStoredValue(MANAGERS_STORAGE_KEY, []);
}

function getCurrentSessionUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
    return user || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [branches, setBranches] = useState(getBranches);
  const [customers, setCustomers] = useState(getCustomers);
  const [loans, setLoans] = useState(getLoans);
  const [managers, setManagers] = useState(getManagers);
  const [theme, setTheme] = useState(getInitialTheme);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(getCurrentSessionUser);
  const [loginForm, setLoginForm] = useState({
    userid: "",
    password: "",
    type: "branch_manager"
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Ignore localStorage errors.
    }
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem(MANAGERS_STORAGE_KEY, JSON.stringify(managers));
  }, [managers]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleLoginFormChange(event) {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    setAuthError("");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (authMode === "login") {
      try {
        const user = await apiRequest('/users/login', {
          method: 'POST',
          body: JSON.stringify({
            userid: loginForm.userid,
            password: loginForm.password
          })
        });

        setCurrentUser({ userid: user.userid, type: user.type });
        setAuthError("");
        setLoginForm({ userid: "", password: "", type: "branch_manager" });
      } catch (error) {
        setAuthError(error.message || 'Login failed.');
      }
      return;
    }

    const normalizedUserId = loginForm.userid.trim();
    if (!normalizedUserId) {
      setAuthError("User ID is required.");
      return;
    }

    try {
      const user = await apiRequest('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          userid: normalizedUserId,
          password: loginForm.password,
          type: loginForm.type
        })
      });

      setCurrentUser({ userid: user.userid, type: user.type });
      setAuthError("");
      setLoginForm({ userid: "", password: "", type: "branch_manager" });
    } catch (error) {
      setAuthError(error.message || 'Account creation failed.');
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setAuthMode("login");
    setAuthError("");
    setLoginForm({ userid: "", password: "", type: "branch_manager" });
  }

  async function addLoan(newLoan) {
    const savedLoan = await apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify(newLoan)
    });
    setLoans((prev) => [...prev, savedLoan]);
  }

  async function addCustomer(newCustomer) {
    const savedCustomer = await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(newCustomer)
    });
    setCustomers((prev) => [...prev, savedCustomer]);
  }

  async function handleCreateBranch(branchForm) {
    if (currentUser?.type !== "administrator") {
      return { ok: false, message: "Only administrators can create a new branch." };
    }

    try {
      const response = await apiRequest('/branches', {
        method: 'POST',
        body: JSON.stringify({
          ...branchForm,
          currentUserId: currentUser.userid
        })
      });

      setBranches((prev) => [...prev, response.branch]);
      const newManagerRecord = {
        userid: branchForm.managerUserid.trim(),
        b_name: response.branch.b_name
      };
      setManagers((prev) => [...prev, newManagerRecord]);

      return { ok: true, message: response.message || 'Branch created successfully.' };
    } catch (error) {
      return { ok: false, message: error.message || 'Branch creation failed.' };
    }
  }

  useEffect(() => {
    if (!currentUser) return;

    async function loadData() {
      try {
        const [branchData, customerData, loanData] = await Promise.all([
          apiRequest('/branches'),
          apiRequest('/customers'),
          apiRequest('/loans')
        ]);

        setBranches(branchData);
        setCustomers(customerData);
        setLoans(loanData);
      } catch (error) {
        console.error('Failed to load app data:', error);
      }
    }

    loadData();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <LoginScreen
        form={loginForm}
        mode={authMode}
        error={authError}
        onFormChange={handleLoginFormChange}
        onSubmit={handleAuthSubmit}
        onToggleMode={setAuthMode}
      />
    );
  }

  if (branches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Branch Network</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No branch data is available yet.
            </p>
          </div>

          {currentUser.type !== "administrator" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Only an administrator can create a new branch and assign manager credentials.
            </div>
          ) : (
            <BranchSetupForm onCreateBranch={handleCreateBranch} onBackToLogin={handleLogout} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Loan Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overview of loans, branches, and applications
          </p>
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            Logged in as <span className="font-semibold">{currentUser.userid}</span> ({currentUser.type.replace("_", " ")})
          </p>
        </div>

        <MetricsOverview loans={loans} branches={branches} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActiveLoansTable loans={loans} customers={customers} />
            <BranchCards branches={branches} managers={managers} />
          </div>
          <div>
            <LoanForm
              branches={branches}
              customers={customers}
              loans={loans}
              onAddLoan={addLoan}
              onAddCustomer={addCustomer}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function BranchSetupForm({ onCreateBranch, onBackToLogin }) {
  const [form, setForm] = useState({
    b_name: "",
    b_city: "",
    assets: "0",
    managerUserid: "",
    managerPassword: ""
  });
  const [feedback, setFeedback] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFeedback("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = onCreateBranch(form);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    setForm({ b_name: "", b_city: "", assets: "0", managerUserid: "", managerPassword: "" });
    setFeedback("Branch created successfully.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch Name</label>
        <input name="b_name" value={form.b_name} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch City</label>
        <input name="b_city" value={form.b_city} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Assets</label>
        <input type="number" name="assets" min="0" step="0.01" value={form.assets} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Manager User ID</label>
        <input name="managerUserid" value={form.managerUserid} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Manager Password</label>
        <input type="password" name="managerPassword" value={form.managerPassword} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-500">
          Create Branch
        </button>
        <button type="button" onClick={onBackToLogin} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
          Logout
        </button>
      </div>
    </form>
  );
}
