// App.jsx
// This is the layout manager AND the "database" for the demo — since we
// don't have the Express/MongoDB backend yet (that's Experiment 4/5), the
// loans list lives here as React state (useState) and is passed down to
// the components that need it. This is what makes the form and table
// actually talk to each other.

import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MetricsOverview from "./components/MetricsOverview";
import ActiveLoansTable from "./components/ActiveLoansTable";
import BranchCards from "./components/BranchCards";
import LoanForm from "./components/LoanForm";

// --- Hardcoded reference data, matching the `branch` and `customer` tables ---
const BRANCHES = [
  { b_name: "Downtown", b_city: "New York", assets: 9000000 },
  { b_name: "Redwood", b_city: "Palo Alto", assets: 2100000 },
  { b_name: "Perryridge", b_city: "Horseneck", assets: 1700000 },
];

const CUSTOMERS = [
  { c_id: 1, c_name: "Alice Smith" },
  { c_id: 2, c_name: "John Doe" },
  { c_id: 3, c_name: "Maria Lopez" },
  { c_id: 4, c_name: "Sam Patel" },
  { c_id: 5, c_name: "Priya Nair" },
];

// --- Starting loans, matching a join of `loan` + `borrower` + `customer` ---
const INITIAL_LOANS = [
  { l_no: "L-14", b_name: "Downtown", c_id: 1, amt: 2500, loan_date: "2026-06-02", status: "Approved" },
  { l_no: "L-15", b_name: "Redwood", c_id: 2, amt: 1200, loan_date: "2026-06-10", status: "Pending" },
  { l_no: "L-16", b_name: "Perryridge", c_id: 3, amt: 3800, loan_date: "2026-06-14", status: "Approved" },
  { l_no: "L-17", b_name: "Downtown", c_id: 4, amt: 900, loan_date: "2026-06-18", status: "Pending" },
];

// Figure out the starting theme: prefer whatever the user picked last time
// (saved in localStorage), otherwise fall back to their OS-level preference.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage can be unavailable (e.g. private browsing) — ignore and fall through.
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export default function App() {
  // useState holds the "live" list of loans. Every time it changes, React
  // re-renders anything that reads it (the table AND the metrics cards).
  const [loans, setLoans] = useState(INITIAL_LOANS);

  // Theme state: either "light" or "dark".
  const [theme, setTheme] = useState(getInitialTheme);

  // Whenever `theme` changes, add/remove the `dark` class on <html>.
  // Tailwind's `dark:` variants only activate when that class is present —
  // this is the one line that actually makes the whole app switch themes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Ignore if localStorage isn't available — the toggle still works
      // for the rest of the session, it just won't be remembered.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  // Called by LoanForm when a new application is submitted.
  function addLoan(newLoan) {
    setLoans((prev) => [...prev, newLoan]);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Loan Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overview of loans, branches, and applications
          </p>
        </div>

        {/* Metrics are computed live from the loans/branches state, not hardcoded */}
        <MetricsOverview loans={loans} branches={BRANCHES} />

        {/* Two-column layout on large screens: table + branches on the left, form on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActiveLoansTable loans={loans} customers={CUSTOMERS} />
            <BranchCards branches={BRANCHES} />
          </div>
          <div>
            <LoanForm
              branches={BRANCHES}
              customers={CUSTOMERS}
              loans={loans}
              onAddLoan={addLoan}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
