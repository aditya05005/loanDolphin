import React from "react";

/**
 * CustomerDashboard – shows a summary of the logged‑in customer's loans.
 * Props:
 *   loans: Array of loan objects belonging to the current user.
 *   onApply: Callback to switch to the loan‑application view.
 */
export default function CustomerDashboard({ loans, onApply, balance = 0, branchName = "-" }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
          My Loans
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400">Account Balance</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">${balance}</span>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400">Branch</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{branchName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 whitespace-nowrap"
          >
            Apply for Loan
          </button>
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded">
          <p className="text-slate-700 dark:text-slate-300">
            No loans found. Click "Apply for Loan" to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <div
              key={loan.l_no}
              className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
            >
              <h3 className="font-medium text-slate-800 dark:text-slate-200">{loan.l_no}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Amount: ${loan.amt}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Status: {loan.status}</p>
              {loan.payments && loan.payments.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Payment History</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400">
                    {loan.payments.map((p, i) => (
                      <li key={i}>${p.amount} on {p.date}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No payments yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
