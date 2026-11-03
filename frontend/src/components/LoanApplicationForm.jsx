import React, { useState } from "react";

const initialForm = (branches) => ({
  amt: "",
  b_name: branches.length > 0 ? branches[0].b_name : "",
  married: "No",
  dependents: "0",
  education: "Graduate",
  selfEmployed: "No",
  applicantIncome: "",
  coapplicantIncome: "0",
  termMonths: "360",
  creditHistory: "1",
  propertyArea: "Urban"
});

const selectClass = "w-full rounded border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
const inputClass = selectClass;

export default function LoanApplicationForm({ branches, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialForm(branches));
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amt);
    const applicantIncome = Number(form.applicantIncome);
    const coapplicantIncome = Number(form.coapplicantIncome);
    if (!form.b_name || !Number.isFinite(amount) || amount <= 0 ||
        !Number.isFinite(applicantIncome) || applicantIncome < 0 ||
        !Number.isFinite(coapplicantIncome) || coapplicantIncome < 0) {
      setError("Enter a positive loan amount and valid non-negative income amounts.");
      return;
    }
    try {
      await onSubmit({
        amt: amount,
        b_name: form.b_name.trim(),
        applicant: {
          married: form.married,
          dependents: form.dependents,
          education: form.education,
          selfEmployed: form.selfEmployed,
          applicantIncome,
          coapplicantIncome,
          termMonths: Number(form.termMonths),
          creditHistory: Number(form.creditHistory),
          propertyArea: form.propertyArea
        }
      });
    } catch (err) {
      setError(err.message || "Failed to submit loan.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Loan Application</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Provide your application details for staff review.</p>
      </div>
      {error && <div className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Loan Amount
          <input type="number" name="amt" value={form.amt} onChange={handleChange} min="0.01" step="0.01" placeholder="Enter amount" className={`${inputClass} mt-1`} required />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Branch
          <select name="b_name" value={form.b_name} onChange={handleChange} className={`${selectClass} mt-1`} required>
            {branches.map((branch) => <option key={branch.b_name} value={branch.b_name}>{branch.b_name}</option>)}
          </select>
        </label>
        <Field label="Married" name="married" value={form.married} onChange={handleChange} options={[["Yes", "Yes"], ["No", "No"]]} />
        <Field label="Dependents" name="dependents" value={form.dependents} onChange={handleChange} options={[["0", "0"], ["1", "1"], ["2", "2"], ["3+", "3+"]]} />
        <Field label="Education" name="education" value={form.education} onChange={handleChange} options={[["Graduate", "Graduate"], ["Not Graduate", "Not Graduate"]]} />
        <Field label="Self employed" name="selfEmployed" value={form.selfEmployed} onChange={handleChange} options={[["Yes", "Yes"], ["No", "No"]]} />
        <NumberField label="Applicant income (monthly)" name="applicantIncome" value={form.applicantIncome} onChange={handleChange} required />
        <NumberField label="Co-applicant income (monthly)" name="coapplicantIncome" value={form.coapplicantIncome} onChange={handleChange} />
        <Field label="Loan term (months)" name="termMonths" value={form.termMonths} onChange={handleChange} options={[[120, 120], [180, 180], [240, 240], [300, 300], [360, 360], [480, 480]]} />
        <Field label="Credit history" name="creditHistory" value={form.creditHistory} onChange={handleChange} options={[[1, "Meets guidelines"], [0, "Does not meet guidelines"]]} />
        <Field label="Property area" name="propertyArea" value={form.propertyArea} onChange={handleChange} options={[["Urban", "Urban"], ["Semiurban", "Semiurban"], ["Rural", "Rural"]]} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded bg-emerald-600 py-2 text-white hover:bg-emerald-500">Submit Application</button>
        <button type="button" onClick={onCancel} className="flex-1 rounded bg-slate-200 py-2 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white">Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, name, value, onChange, options }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <select name={name} value={value} onChange={onChange} className={`${selectClass} mt-1`} required>
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, name, value, onChange, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input type="number" name={name} value={value} onChange={onChange} min="0" step="any" className={`${inputClass} mt-1`} required={required} />
    </label>
  );
}
