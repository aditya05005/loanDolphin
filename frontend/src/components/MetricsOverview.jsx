// MetricsOverview.jsx
// A row of summary cards, computed live from the `loans`/`branches` props.
// Each color has a light-mode and dark-mode variant so it stays readable
// in both themes.

export default function MetricsOverview({ loans, branches }) {
  const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.amt, 0);
  const pendingCount = loans.filter((loan) => loan.status === "Pending").length;

  const metrics = [
    { label: "Total Loans Issued", value: loans.length, accent: "text-indigo-600 dark:text-indigo-400" },
    { label: "Total Loan Amount", value: `$${totalLoanAmount.toLocaleString()}`, accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "Active Branches", value: branches.length, accent: "text-amber-600 dark:text-amber-400" },
    { label: "Pending Approvals", value: pendingCount, accent: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{m.label}</p>
          <p className={`text-2xl font-bold ${m.accent}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}
