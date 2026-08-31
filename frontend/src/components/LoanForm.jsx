// LoanForm.jsx
import { useState } from "react";

export default function LoanForm({ branches, customers, loans, onAddLoan, onAddCustomer }) {
  const [formData, setFormData] = useState({
    c_id: "",
    b_name: branches[0]?.b_name || "",
    amt: "",
    loan_date: new Date().toISOString().slice(0, 10),
  });

  const [customerForm, setCustomerForm] = useState({
    c_name: "",
    c_street: "",
    c_city: ""
  });

  const [feedback, setFeedback] = useState(null);

  const nextLoanNumber = `L-${loans.length + 1}`;

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFeedback(null);
  }

  function handleCustomerFormChange(e) {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
    setFeedback(null);
  }

  function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = customerForm.c_name.trim();
    const street = customerForm.c_street.trim();
    const city = customerForm.c_city.trim();

    if (!name || !street || !city) {
      setFeedback({ type: "error", text: "Customer name, street, and city are required." });
      return;
    }

    const newCustomer = {
      c_id: Date.now(),
      c_name: name,
      c_street: street,
      c_city: city
    };

    onAddCustomer(newCustomer);
    setCustomerForm({ c_name: "", c_street: "", c_city: "" });
    setFormData((prev) => ({ ...prev, c_id: String(newCustomer.c_id) }));
    setFeedback({ type: "success", text: `${name} was added successfully.` });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!formData.c_id) {
      setFeedback({ type: "error", text: "Please select a customer." });
      return;
    }
    if (!formData.b_name) {
      setFeedback({ type: "error", text: "Please select a branch." });
      return;
    }
    const amountNumber = Number(formData.amt);
    if (!amountNumber || amountNumber <= 0) {
      setFeedback({ type: "error", text: "Loan amount must be greater than 0." });
      return;
    }

    onAddLoan({
      l_no: nextLoanNumber,
      c_id: Number(formData.c_id),
      b_name: formData.b_name,
      amt: amountNumber,
      loan_date: formData.loan_date,
      status: "Pending",
    });

    setFeedback({ type: "success", text: `Loan ${nextLoanNumber} submitted and added to All Loans.` });

    setFormData({
      c_id: "",
      b_name: branches[0]?.b_name || "",
      amt: "",
      loan_date: new Date().toISOString().slice(0, 10),
    });
  }

  const inputClasses =
    "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100";
  const labelClasses = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Apply for a New Loan</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        Select a real customer and branch from the current records.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClasses}>Loan Number (l_no)</label>
          <input
            type="text"
            value={nextLoanNumber}
            disabled
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
          />
        </div>

        <div>
          <label className={labelClasses}>Customer</label>
          {customers.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">No customers available yet.</p>
              <div className="grid gap-2">
                <input
                  type="text"
                  name="c_name"
                  value={customerForm.c_name}
                  onChange={handleCustomerFormChange}
                  placeholder="Customer name"
                  className={inputClasses}
                />
                <input
                  type="text"
                  name="c_street"
                  value={customerForm.c_street}
                  onChange={handleCustomerFormChange}
                  placeholder="Street"
                  className={inputClasses}
                />
                <input
                  type="text"
                  name="c_city"
                  value={customerForm.c_city}
                  onChange={handleCustomerFormChange}
                  placeholder="City"
                  className={inputClasses}
                />
                <button type="button" onClick={handleCustomerSubmit} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white dark:bg-slate-700">
                  Add Customer
                </button>
              </div>
            </div>
          ) : (
            <select name="c_id" value={formData.c_id} onChange={handleChange} className={inputClasses}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.c_id} value={c.c_id}>
                  {c.c_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={labelClasses}>Branch</label>
          <select name="b_name" value={formData.b_name} onChange={handleChange} className={inputClasses}>
            <option value="">Select a branch…</option>
            {branches.map((b) => (
              <option key={b.b_name} value={b.b_name}>
                {b.b_name} ({b.b_city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClasses}>Loan Amount ($)</label>
          <input
            type="number"
            name="amt"
            min="0"
            step="0.01"
            value={formData.amt}
            onChange={handleChange}
            placeholder="e.g. 2500.00"
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>Loan Date</label>
          <input
            type="date"
            name="loan_date"
            value={formData.loan_date}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition"
        >
          Submit Loan Application
        </button>

        {feedback && (
          <p
            className={`text-xs rounded-lg px-3 py-2 ${
              feedback.type === "success"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            {feedback.text}
          </p>
        )}
      </form>
    </div>
  );
}
