import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MetricsOverview from "./components/MetricsOverview";
import ActiveLoansTable from "./components/ActiveLoansTable";
import BranchCards from "./components/BranchCards";
import LoanForm from "./components/LoanForm";
import LandingPage from "./components/LandingPage";
import LoginScreen from "./components/LoginScreen";
import { apiRequest } from "./services/api";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import CustomerDashboard from "./components/CustomerDashboard";
import LoanApplicationForm from "./components/LoanApplicationForm";

const BRANCHES_STORAGE_KEY = "loanDolphinBranches";
const CUSTOMERS_STORAGE_KEY = "loanDolphinCustomers";
const LOANS_STORAGE_KEY = "loanDolphinLoans";
const MANAGERS_STORAGE_KEY = "loanDolphinManagers";

function getStoredValue(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
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

export default function App() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // State declarations
  const [branches, setBranches] = useState(getBranches);
  const [customers, setCustomers] = useState(getCustomers);
  const [loans, setLoans] = useState(getLoans);
  const [managers, setManagers] = useState(getManagers);
  const [currentView, setCurrentView] = useState("landing");
  const [customerView, setCustomerView] = useState("dashboard"); // "dashboard" or "apply"

  async function addCustomerLoan(newLoan) {
    // The backend identifies the applicant from the x-user-id header
    // (attached automatically by apiRequest) rather than a body field, so
    // there's nothing identity-related to add to the payload here.
    const savedLoan = await apiRequest('/customer/loans', {
      method: 'POST',
      body: JSON.stringify(newLoan)
    });
    setLoans((prev) => [...prev, savedLoan]);
    setCustomerView("dashboard");
  }

  useEffect(() => {
    if (!currentUser) {
      setCurrentView("landing");
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

  async function addLoan(newLoan) {
    const savedLoan = await apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify(newLoan)
    });
    setLoans((prev) => [...prev, savedLoan]);
  }

  // Every customer needs a real login now, so "adding a customer" from the
  // staff-side loan form actually registers a User (type: customer) and its
  // linked Customer record together. We call /api/users/register directly
  // rather than AuthContext's register() — that helper also switches the
  // active session to the newly created account, which would log the staff
  // member out of their own session.
  async function addCustomer(newCustomer) {
    const { userid, password, c_name, c_street, c_city } = newCustomer;
    const response = await apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({ userid, password, type: 'customer', c_name, c_street, c_city })
    });
    const savedCustomer = {
      c_id: response.c_id,
      userid: response.userid,
      c_name,
      c_street,
      c_city
    };
    setCustomers((prev) => [...prev, savedCustomer]);
    return savedCustomer;
  }

  // Update loan status (approve/reject/reset)
  async function updateLoanStatus(id, newStatus) {
    try {
      const updatedLoan = await apiRequest(`/loans/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setLoans((prev) =>
        prev.map((loan) =>
          loan.l_no === updatedLoan.l_no || loan._id === updatedLoan._id ? updatedLoan : loan
        )
      );
    } catch (err) {
      console.error('Failed to update loan status', err);
      throw err;
    }
  }

  async function handleCreateBranch(branchForm) {
    if (currentUser?.type !== "administrator") {
      return { ok: false, message: "Only administrators can create a new branch." };
    }

    try {
      const response = await apiRequest('/branches', {
        method: 'POST',
        body: JSON.stringify(branchForm)
      });

      if (response.branch) {
        setBranches((prev) => [...prev, response.branch]);
      }
      const newManagerRecord = response.manager || {
        userid: branchForm.managerUserid.trim(),
        b_name: branchForm.b_name.trim()
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
        const [branchData, customerData, loanData, managerData] = await Promise.all([
          apiRequest('/branches'),
          apiRequest('/customers'),
          apiRequest('/loans'),
          apiRequest('/managers').catch(() => [])
        ]);

        if (branchData) setBranches(branchData);
        if (customerData) setCustomers(customerData);
        if (loanData) setLoans(loanData);
        if (managerData && Array.isArray(managerData)) {
          setManagers(managerData);
        }
      } catch (error) {
        console.error('Failed to load app data:', error);
      }
    }

    loadData();
  }, [currentUser]);

  // Render customer sections
  if (currentUser?.type === "customer") {
    if (customerView === "apply") {
      return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
          <Navbar />
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <LoanApplicationForm
              branches={branches}
              onSubmit={addCustomerLoan}
              onCancel={() => setCustomerView("dashboard")}
            />
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <CustomerDashboard
            loans={loans.filter(l => l.customerUserId === currentUser.userid)}
            onApply={() => setCustomerView("apply")}
          />
        </main>
      </div>
    );
  }

  if (!currentUser) {
    if (currentView === "landing") {
      return <LandingPage onGetStarted={() => setCurrentView("login")} />;
    }
    return <LoginScreen onBack={() => setCurrentView("landing")} />;
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
            <BranchSetupForm onCreateBranch={handleCreateBranch} onBackToLogin={logout} />
          )}
        </div>
      </div>
    );
  }

  const managerBranch = managers.find((m) => m.userid === currentUser?.userid)?.b_name || null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navbar />

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
            <ActiveLoansTable loans={loans} customers={customers} currentUser={currentUser} managerBranch={managerBranch} onUpdateLoanStatus={updateLoanStatus} />
            <BranchCards
              branches={branches}
              managers={managers}
              currentUser={currentUser}
              onCreateBranch={handleCreateBranch}
            />
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

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await onCreateBranch(form);
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