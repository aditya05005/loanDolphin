// ActiveLoansTable.jsx
// A table of active loans (a join of `loan` + `borrower` + `customer`),
// styled for both light and dark mode, with a working status filter.

import { useState } from "react";

function statusColor(status) {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
}

export default function ActiveLoansTable({ loans, customers }) {
  const [statusFilter, setStatusFilter] = useState("All");

  function customerName(c_id) {
    return customers.find((c) => c.c_id === c_id)?.c_name ?? "Unknown";
  }

  const visibleLoans =
    statusFilter === "All" ? loans : loans.filter((loan) => loan.status === statusFilter);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Loans</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loans currently on record across all branches
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
        >
          <option value="All">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {visibleLoans.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          No loans match this filter yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4">l_no</th>
                <th className="py-2 pr-4">b_name</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">amt</th>
                <th className="py-2 pr-4">loan_date</th>
                <th className="py-2 pr-4">status</th>
              </tr>
            </thead>
            <tbody>
              {visibleLoans.map((loan) => (
                <tr key={loan.l_no} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                  <td className="py-3 pr-4 text-slate-900 dark:text-slate-200 font-medium">{loan.l_no}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{loan.b_name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{customerName(loan.c_id)}</td>
                  <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">${loan.amt.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{loan.loan_date}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColor(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
