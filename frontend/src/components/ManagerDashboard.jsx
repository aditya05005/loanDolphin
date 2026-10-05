import React from "react";
import ActiveLoansTable from "./ActiveLoansTable";
import BranchCards from "./BranchCards";
import LoanForm from "./LoanForm";
import MetricsOverview from "./MetricsOverview";

export default function ManagerDashboard({
  currentUser,
  loans,
  branches,
  customers,
  managers,
  managerBranch,
  updateLoanStatus,
  handleCreateBranch,
  addLoan,
  addCustomer
}) {
  return (
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
          <ActiveLoansTable
            loans={loans}
            customers={customers}
            currentUser={currentUser}
            managerBranch={managerBranch}
            onUpdateLoanStatus={updateLoanStatus}
          />
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
  );
}
