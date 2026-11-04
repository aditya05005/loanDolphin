// ActiveLoansTable.jsx
// A table of active loans with working status filter and approval workflow
// for senior managers and administrators.

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function statusColor(status) {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
  }
  if (status === "Rejected") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
  }
  if (status === "Disbursed") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
  }
  if (status === "Repaid") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
}

export default function ActiveLoansTable({
  loans = [],
  customers = [],
  onUpdateLoanStatus = null,
  onPredictLoan = null,
  managerBranch = null
}) {
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [predictingId, setPredictingId] = useState(null);
  const [shownPredictions, setShownPredictions] = useState({});
  const [predictionErrors, setPredictionErrors] = useState({});

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

  function canScoreLoan(loan) {
    if (currentUser?.type === "administrator") return true;
    return currentUser?.type === "branch_manager" && managerBranch && loan.b_name === managerBranch;
  }

  function customerName(c_id) {
  // 1. Immediately return fallback if no c_id was passed for the loan
  if (!c_id) return "Unknown";

  // 2. Safely match only when the customer record actually possesses a valid c_id (or _id)
  const customer = customers.find(
    (c) => (c.c_id && c.c_id === c_id) || (c._id && String(c._id) === String(c_id))
  );

  return customer?.c_name ?? "Unknown";
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

  async function handlePredictLoan(loan) {
    const id = loan.l_no || loan._id;
    setPredictingId(id);
    setShownPredictions((previous) => ({ ...previous, [id]: false }));
    setPredictionErrors((previous) => ({ ...previous, [id]: "" }));
    try {
      if (typeof onPredictLoan !== "function") throw new Error("Prediction action is unavailable.");
      await onPredictLoan(id);
      setShownPredictions((previous) => ({ ...previous, [id]: true }));
    } catch (error) {
      const messages = {
        APPLICANT_DATA_MISSING: "Applicant details are missing; this older loan cannot be scored.",
        APPLICANT_DATA_INVALID: "Applicant details are incomplete; check the data pipeline.",
        ML_SERVICE_UNREACHABLE: "ML service is unreachable; check ML_SERVICE_URL and the service deployment.",
        ML_INPUT_PIPELINE_ERROR: "ML service rejected the input; check the backend feature mapping and ML input validation.",
        ML_MODEL_INFERENCE_ERROR: "ML service failed during inference; check its model loading and runtime logs.",
        ML_INVALID_RESPONSE: "ML service responded, but its output did not match the expected prediction format."
      };
      setPredictionErrors((previous) => ({
        ...previous,
        [id]: messages[error.code] || error.message || "Prediction failed."
      }));
    } finally {
      setPredictingId(null);
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
          <option value="Disbursed">Disbursed</option>
          <option value="Repaid">Repaid</option>
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
                <th className="py-2 pr-4">Approval probability</th>
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
                    <td className="py-3 pr-4">
                      {currentLoanStatus === "Pending" && canScoreLoan(loan) ? (() => {
                        const loanId = loan.l_no || loan._id;
                        const prediction = loan.mlPrediction;
                        const probability = prediction?.probability;
                        const hasValidProbability = typeof probability === "number" &&
                          Number.isFinite(probability) && probability >= 0 && probability <= 1;
                        const isPredicting = predictingId === loanId;
                        return (
                          <div className="min-w-40 space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handlePredictLoan(loan)}
                              disabled={isPredicting}
                              className="rounded bg-indigo-100 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-200 disabled:cursor-wait disabled:opacity-60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900"
                            >
                              {isPredicting ? "Predicting…" : "Predict Probability"}
                            </button>
                            {shownPredictions[loanId] && hasValidProbability && (
                              <div>
                                <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${prediction.label === "Approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                                  {Math.round(probability * 100)}% approval probability · {prediction.label}
                                </span>
                                <p className="mt-1 max-w-48 text-[10px] text-slate-500 dark:text-slate-400">{(prediction.topFactors || []).slice(0, 2).join(" · ")}</p>
                                <p className="text-[9px] text-slate-400">Model {prediction.modelVersion}</p>
                              </div>
                            )}
                            {predictionErrors[loanId] && <p role="status" className="max-w-56 text-[10px] text-rose-700 dark:text-rose-300">{predictionErrors[loanId]}</p>}
                          </div>
                        );
                      })() : currentLoanStatus === "Pending" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    {canManageLoan(loan) && (
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          {currentLoanStatus !== "Approved" && currentLoanStatus !== "Disbursed" && currentLoanStatus !== "Repaid" && (
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
                          {currentLoanStatus === "Approved" && (currentUser?.type === "branch_manager" || currentUser?.type === "senior_manager") && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(loan, "Disbursed")}
                              disabled={isUpdating}
                              className="rounded bg-blue-100 hover:bg-blue-200 px-2 py-1 text-[10px] font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 transition cursor-pointer disabled:opacity-50"
                              title="Disburse Loan"
                            >
                              Disburse
                            </button>
                          )}
                          {currentLoanStatus !== "Rejected" && currentLoanStatus !== "Disbursed" && currentLoanStatus !== "Repaid" && (
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
                          {currentLoanStatus !== "Pending" && currentLoanStatus !== "Disbursed" && currentLoanStatus !== "Repaid" && (
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
