// ActiveLoansTable.jsx
// A table of active loans with working status filter and approval workflow
// for senior managers and administrators.

import { useState } from "react";

function statusColor(status) {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
  }
  if (status === "Rejected") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
}

export default function ActiveLoansTable({
  loans = [],
  customers = [],
  currentUser = null,
  onUpdateLoanStatus = null,
  managerBranch = null
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const canManageGlobal =
    currentUser?.type === "administrator" || currentUser?.type === "senior_manager";

  function canManageLoan(loan) {
    if (canManageGlobal) return true;
    return (
      currentUser?.type === "branch_manager" &&
      managerBranch &&
      loan.b_name === managerBranch
    );
  }

  function customerName(c_id) {
    return customers.find((c) => c.c_id === c_id)?.c_name ?? "Unknown";
  }

  const visibleLoans =
    statusFilter === "All"
      ? loans
      : loans.filter((loan) => (loan.status || "Pending") === statusFilter);

  async function handleStatusChange(loan, nextStatus) {
    const id = loan.l_no || loan._id;
    setUpdatingId(id);
    setActionError("");

    try {
      if (typeof onUpdateLoanStatus === "function") {
        await onUpdateLoanStatus(id, nextStatus);
      }
    } catch (err) {
      setActionError(err.message || "Failed to update loan status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            All Loans
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {visibleLoans.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loans currently on record across all branches
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {actionError && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-rose-500 hover:text-rose-700 text-xs font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
                <th className="py-2 pr-4">LOAN_DATE</th>
                <th className="py-2 pr-4">status</th>
                {loans.some(canManageLoan) && <th className="py-2 pr-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleLoans.map((loan) => {
                const isUpdating = updatingId === (loan.l_no || loan._id);
                const currentLoanStatus = loan.status || "Pending";

                return (
                  <tr
                    key={loan.l_no}
                    className="border-b border-slate-200 dark:border-slate-800 last:border-0"
                  >
                    <td className="py-3 pr-4 text-slate-900 dark:text-slate-200 font-medium">
                      {loan.l_no}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{loan.b_name}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {customerName(loan.c_id)}
                    </td>
                    <td className="py-3 pr-4 text-slate-900 dark:text-slate-100 font-medium">
                      ${Number(loan.amt || 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {loan.loan_date
                        ? typeof loan.loan_date === "string" && loan.loan_date.includes("T")
                          ? loan.loan_date.split("T")[0]
                          : String(loan.loan_date)
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColor(
                          currentLoanStatus
                        )}`}
                      >
                        {currentLoanStatus}
                      </span>
                    </td>
                    {canManageLoan(loan) && (
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          {currentLoanStatus !== "Approved" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(loan, "Approved")}
                              disabled={isUpdating}
                              className="rounded bg-emerald-100 hover:bg-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 transition cursor-pointer disabled:opacity-50"
                              title="Approve Loan"
                            >
                              Approve
                            </button>
                          )}
                          {currentLoanStatus !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(loan, "Rejected")}
                              disabled={isUpdating}
                              className="rounded bg-rose-100 hover:bg-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 transition cursor-pointer disabled:opacity-50"
                              title="Reject Loan"
                            >
                              Reject
                            </button>
                          )}
                          {currentLoanStatus !== "Pending" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(loan, "Pending")}
                              disabled={isUpdating}
                              className="rounded bg-slate-200 hover:bg-slate-300 px-2 py-1 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                              title="Reset to Pending"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
