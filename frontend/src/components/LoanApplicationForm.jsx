import React, { useState } from "react";

/**
 * LoanApplicationForm – simple UI for a customer to request a new loan.
 * Props:
 *   branches: array of branch objects (each with b_name).
 *   onSubmit: function that receives the loan payload when the form is submitted.
 *   onCancel: function called when the user clicks the Cancel button.
 */
export default function LoanApplicationForm({ branches, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    amt: "",
    aadharNumber: "",
    panCard: "",
    b_name: branches.length > 0 ? branches[0].b_name : ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { amt, aadharNumber, panCard, b_name } = form;
    if (!amt || !aadharNumber || !panCard || !b_name) {
      setError("All fields are required.");
      return;
    }
    // Build loan payload expected by the backend.
    const loanPayload = {
      amt: Number(amt),
      aadharNumber: aadharNumber.trim(),
      panCard: panCard.trim(),
      b_name: b_name.trim()
    };
    try {
      await onSubmit(loanPayload);
    } catch (err) {
      setError(err.message || "Failed to submit loan.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {error && (
        <div className="rounded bg-red-100 text-red-800 p-2 text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Loan Amount</label>
        <input
          type="number"
          name="amt"
          value={form.amt}
          onChange={handleChange}
          className="w-full rounded border p-2"
          placeholder="Enter amount"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Aadhar Number</label>
        <input
          type="text"
          name="aadharNumber"
          value={form.aadharNumber}
          onChange={handleChange}
          className="w-full rounded border p-2"
          placeholder="Enter Aadhar"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">PAN Card</label>
        <input
          type="text"
          name="panCard"
          value={form.panCard}
          onChange={handleChange}
          className="w-full rounded border p-2"
          placeholder="Enter PAN Card"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Branch</label>
        <select
          name="b_name"
          value={form.b_name}
          onChange={handleChange}
          className="w-full rounded border p-2"
          required
        >
          {branches.map((b) => (
            <option key={b.b_name} value={b.b_name}>
              {b.b_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex space-x-2">
        <button
          type="submit"
          className="flex-1 bg-emerald-600 text-white rounded py-2 hover:bg-emerald-500"
        >
          Submit Application
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-800 rounded py-2 hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
