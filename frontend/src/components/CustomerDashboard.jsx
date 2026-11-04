import { useState } from "react";

const BADGE = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  Disbursed: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  Repaid: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400"
};

const money = (amount) => `$${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loanAmounts(loan) {
  if (!['Disbursed', 'Repaid'].includes(loan.status)) return { interest: 0, total: Number(loan.amt || 0) };
  if (loan.status === 'Repaid' && loan.payments?.length) {
    const total = Number(loan.payments[loan.payments.length - 1].amount || 0);
    return { interest: Math.max(0, total - Number(loan.amt || 0)), total };
  }
  const start = new Date(loan.disbursedAt || loan.loan_date || Date.now());
  const elapsedYears = Math.max(0, Date.now() - start.getTime()) / (365 * 24 * 60 * 60 * 1000);
  const interest = Math.round(Number(loan.amt || 0) * 0.12 * elapsedYears * 100) / 100;
  return { interest, total: Math.round((Number(loan.amt || 0) + interest) * 100) / 100 };
}

export default function CustomerDashboard({ loans, onApply, onRepay, balance = 0, branchName = "-", hasPendingLoan = false }) {
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [payingLoan, setPayingLoan] = useState(null);
  const [payError, setPayError] = useState("");
  const [thankYou, setThankYou] = useState(false);

  async function payLoan(loan) {
    setPayingLoan(loan.l_no);
    setPayError("");
    try {
      await onRepay(loan.l_no);
      setThankYou(true);
    } catch (error) {
      setPayError(error.message || "Unable to record repayment. Please try again.");
    } finally {
      setPayingLoan(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">My Loans</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="flex flex-col"><span className="text-xs text-slate-500 dark:text-slate-400">Wallet Balance</span><span className="font-semibold text-slate-800 dark:text-slate-200">${balance}</span></div>
            <div className="w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col"><span className="text-xs text-slate-500 dark:text-slate-400">Branch</span><span className="font-semibold text-slate-800 dark:text-slate-200">{branchName}</span></div>
          </div>
          <button type="button" onClick={onApply} disabled={hasPendingLoan} title={hasPendingLoan ? "You already have an application awaiting a decision." : undefined} className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap">
            {hasPendingLoan ? "Application Pending" : "Apply for Loan"}
          </button>
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded"><p className="text-slate-700 dark:text-slate-300">No loans found. Apply for a loan to get started.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => {
            const expanded = expandedLoan === loan.l_no;
            const amounts = loanAmounts(loan);
            return (
              <article key={loan.l_no} className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <button type="button" onClick={() => { setExpandedLoan(expanded ? null : loan.l_no); setPayError(""); }} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">{loan.l_no}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[loan.status] || BADGE.Pending}`}>{loan.status || "Pending"}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Principal: {money(loan.amt)}</p>
                  <span className="mt-2 inline-block text-xs font-medium text-emerald-700 dark:text-emerald-400">{expanded ? "Hide loan details" : "View loan details"}</span>
                </button>
                {expanded && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <dl className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between gap-2"><dt>Loan ID</dt><dd className="break-all text-right">{loan.l_no}</dd></div>
                      <div className="flex justify-between gap-2"><dt>Loan date</dt><dd>{loan.loan_date ? new Date(loan.loan_date).toLocaleDateString() : "—"}</dd></div>
                      <div className="flex justify-between gap-2"><dt>Interest rate</dt><dd>12% per annum</dd></div>
                      <div className="flex justify-between gap-2"><dt>Current interest</dt><dd>{money(amounts.interest)}</dd></div>
                      <div className="flex justify-between gap-2 font-semibold text-slate-900 dark:text-white"><dt>Full amount</dt><dd>{money(amounts.total)}</dd></div>
                    </dl>
                    {loan.status === "Disbursed" && <button type="button" onClick={() => payLoan(loan)} disabled={payingLoan === loan.l_no} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{payingLoan === loan.l_no ? "Processing…" : `Pay now · ${money(amounts.total)}`}</button>}
                    {loan.status === "Repaid" && <p className="mt-3 text-sm font-medium text-violet-700 dark:text-violet-300">This loan has been repaid.</p>}
                    {payError && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{payError}</p>}
                  </div>
                )}
                {loan.payments?.length > 0 && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Payment recorded: {money(loan.payments[loan.payments.length - 1].amount)} on {new Date(loan.payments[loan.payments.length - 1].date).toLocaleDateString()}</p>}
              </article>
            );
          })}
        </div>
      )}

      {thankYou && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setThankYou(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="repayment-thanks" className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl dark:bg-slate-800">
          <h2 id="repayment-thanks" className="text-2xl font-semibold text-slate-900 dark:text-white">Thank you</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Real payment gateway integration is under development.</p>
          <button type="button" onClick={() => setThankYou(false)} className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Close</button>
        </section>
      </div>}
    </div>
  );
}
