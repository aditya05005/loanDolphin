import React, { useState } from "react";
import ActiveLoansTable from "./ActiveLoansTable";
import BranchCards from "./BranchCards";
import MetricsOverview from "./MetricsOverview";
import ModelInsights from "./ModelInsights";

export default function ManagerDashboard({
  currentUser,
  loans,
  branches,
  customers,
  managers,
  managerBranch,
  updateLoanStatus,
  predictLoanProbability,
  handleCreateBranch,
  handleUpdateBranch
}) {
  const [showModelInfo, setShowModelInfo] = useState(false);
  const canViewModelInfo = currentUser.type === "administrator" || currentUser.type === "branch_manager";

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Loan Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overview of loans, branches, and applications
          </p>
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            Logged in as <span className="font-semibold">{currentUser.userid}</span> ({currentUser.type.replace("_", " ")})
          </p>
        </div>
        {canViewModelInfo && (
          <button
            type="button"
            onClick={() => setShowModelInfo((visible) => !visible)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-pressed={showModelInfo}
          >
            {showModelInfo ? "Back to dashboard" : "Model Info"}
          </button>
        )}
      </div>

      {showModelInfo && canViewModelInfo ? <ModelInsights /> : (
        <>
          <MetricsOverview loans={loans} branches={branches} />

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              <ActiveLoansTable
                loans={loans}
                customers={customers}
                currentUser={currentUser}
                managerBranch={managerBranch}
                onUpdateLoanStatus={updateLoanStatus}
                onPredictLoan={predictLoanProbability}
              />
              <BranchCards
                branches={branches}
                managers={managers}
                currentUser={currentUser}
                onCreateBranch={handleCreateBranch}
                onUpdateBranch={handleUpdateBranch}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
