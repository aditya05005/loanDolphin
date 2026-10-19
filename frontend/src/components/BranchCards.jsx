// BranchCards.jsx
import { useState } from "react";

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString()}`;
}

export default function BranchCards({
  branches = [],
  managers = [],
  currentUser = null,
  onCreateBranch = null,
  onUpdateBranch = null
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState(null);
  const [editData, setEditData] = useState({ b_city: "", lendingBudget: "" });
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formData, setFormData] = useState({
    b_name: "",
    b_city: "",
    lendingBudget: "",
    managerUserid: "",
    managerPassword: ""
  });

  const isAdmin = currentUser?.type === "administrator";

  function handleOpenModal() {
    // Verification check: only administrators are allowed to perform this action
    if (!isAdmin) {
      setPermissionError(
        `Action Restricted: Only administrators can add a new branch and create manager credentials. You are currently signed in as "${currentUser?.userid || 'user'}" with role "${currentUser?.type ? currentUser.type.replace('_', ' ') : 'Standard User'}".`
      );
      return;
    }

    setPermissionError("");
    setFormError("");
    setFormSuccess("");
    setFormData({
      b_name: "",
      b_city: "",
      lendingBudget: "",
      managerUserid: "",
      managerPassword: ""
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormError("");
    setFormSuccess("");
  }

  function openEditBranch(branch) {
    if (!isAdmin) return;
    setEditData({ b_city: branch.b_city || "", lendingBudget: String(branch.lendingBudget ?? 0) });
    setEditError("");
    setBranchToEdit(branch);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const lendingBudget = Number(editData.lendingBudget);
    if (!editData.b_city.trim() || !Number.isFinite(lendingBudget) || lendingBudget < 0) {
      setEditError("Enter a branch city and a non-negative lending budget.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    try {
      const result = await onUpdateBranch?.(branchToEdit.b_name, {
        b_city: editData.b_city.trim(),
        lendingBudget
      });
      if (!result?.ok) {
        setEditError(result?.message || "Branch update failed.");
        return;
      }
      setBranchToEdit(null);
    } catch (error) {
      setEditError(error.message || "Branch update failed.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Redundant client-side check if user is administrator
    if (!isAdmin) {
      setFormError("Only administrators are permitted to perform this action.");
      return;
    }

    const trimmedBranchName = formData.b_name.trim();
    const trimmedBranchCity = formData.b_city.trim();
    const trimmedManagerId = formData.managerUserid.trim();
    const trimmedPassword = formData.managerPassword.trim();
    const lendingBudgetNumber = Number(formData.lendingBudget);

    if (!trimmedBranchName) {
      setFormError("Branch name is required.");
      return;
    }
    if (!trimmedBranchCity) {
      setFormError("Branch city is required.");
      return;
    }
    if (isNaN(lendingBudgetNumber) || lendingBudgetNumber < 0) {
      setFormError("Lending budget must be a valid non-negative number.");
      return;
    }
    if (!trimmedManagerId) {
      setFormError("Manager User ID is required.");
      return;
    }
    if (!trimmedPassword) {
      setFormError("Manager password is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (typeof onCreateBranch === "function") {
        const result = await onCreateBranch({
          b_name: trimmedBranchName,
          b_city: trimmedBranchCity,
          lendingBudget: lendingBudgetNumber,
          managerUserid: trimmedManagerId,
          managerPassword: trimmedPassword
        });

        if (!result.ok) {
          setFormError(result.message || "Failed to create branch.");
          setIsSubmitting(false);
          return;
        }

        setFormSuccess(result.message || "Branch and manager account created successfully!");
        setFormData({
          b_name: "",
          b_city: "",
          lendingBudget: "",
          managerUserid: "",
          managerPassword: ""
        });

        // Close modal after a brief display of success
        setTimeout(() => {
          handleCloseModal();
        }, 1200);
      } else {
        setFormError("Branch creation handler is not configured.");
      }
    } catch (err) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Bank Branch Network
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real branch records loaded from storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title={isAdmin ? "Add a new bank branch" : "Administrator access required to add branch"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Branch
            {!isAdmin && (
              <span className="ml-1 text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded text-emerald-100 font-normal">
                Admin
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Permission Check Alert Banner if unauthorized user attempts action */}
      {permissionError && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200 flex items-start justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Administrator Permission Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">{permissionError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPermissionError("")}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-xs font-semibold p-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {branches.map((b) => {
          const manager = managers.find((entry) => entry.b_name === b.b_name);

          return (
            <div
              key={b.b_name}
              onClick={() => openEditBranch(b)}
              onKeyDown={(event) => {
                if (isAdmin && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  openEditBranch(b);
                }
              }}
              role={isAdmin ? "button" : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              title={isAdmin ? "Click to edit branch details" : undefined}
              className={`bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm ${isAdmin ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{b.b_name}</h3>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                City: <span className="text-slate-700 dark:text-slate-200 font-medium">{b.b_city}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Available Lending Budget: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(b.lendingBudget)}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                Manager:{" "}
                <span className={`font-medium ${manager?.userid ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {manager?.userid || "Unassigned"}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {branchToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={handleEditSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Branch</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{branchToEdit.b_name}</p>
            </div>
            {editError && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{editError}</p>}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              City
              <input
                value={editData.b_city}
                onChange={(event) => setEditData((prev) => ({ ...prev, b_city: event.target.value }))}
                disabled={isSavingEdit}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Available Lending Budget ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={editData.lendingBudget}
                onChange={(event) => setEditData((prev) => ({ ...prev, lendingBudget: event.target.value }))}
                disabled={isSavingEdit}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </label>
            <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">This amount decreases when a loan is disbursed. Increase it here to add budget.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Branch name stays fixed so existing loans and accounts remain connected.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBranchToEdit(null)} disabled={isSavingEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">Cancel</button>
              <button type="submit" disabled={isSavingEdit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSavingEdit ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Branch & Manager Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Add New Bank Branch</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium">
                    Admin Action
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter branch details and assign branch manager credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error / Success Feedback */}
            {formError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                {formSuccess}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section: Branch Details */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Branch Information
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="b_name"
                    value={formData.b_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Downtown Central"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="b_city"
                      value={formData.b_city}
                      onChange={handleInputChange}
                      placeholder="e.g. San Francisco"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Initial Lending Budget ($) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="lendingBudget"
                      min="0"
                      step="0.01"
                      value={formData.lendingBudget}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Manager Credentials */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Branch Manager Credentials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Manager User ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="managerUserid"
                      value={formData.managerUserid}
                      onChange={handleInputChange}
                      placeholder="e.g. manager.john"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Manager Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="managerPassword"
                      value={formData.managerPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This manager account will be created with <span className="font-semibold text-slate-700 dark:text-slate-300">branch_manager</span> permissions and assigned directly to this branch.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Branch...
                    </>
                  ) : (
                    "Create Branch & Manager"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
