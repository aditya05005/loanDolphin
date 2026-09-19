// LoginScreen renders the pre-dashboard authentication form for users and administrators.
import { useState } from "react";
import logo from "../assets/loanDolphin-Shield.png";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

export default function LoginScreen({ onBack }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userid: "",
    password: "",
    c_name: "",
    c_street: "",
    c_city: "",
    type: "customer",
  });

  const isRegister = mode === "register";

  function onToggleMode(newMode) {
    setMode(newMode);
    setError("");
  }

  function onFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    const normalizedUserId = form.userid.trim();
    if (!normalizedUserId) {
      setError("User ID is required.");
      return;
    }

    if (mode === "login") {
      try {
        await login(normalizedUserId, form.password);
      } catch (err) {
        setError(err.message || "Login failed.");
      }
    } else {
      try {
        await register(normalizedUserId, form.password, form.type, {
          c_name: form.c_name,
          c_street: form.c_street,
          c_city: form.c_city
        });
      } catch (err) {
        setError(err.message || "Account creation failed.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        )}

        <div className="mb-6 text-center">
          <img
            src={logo}
            alt="LoanDolphin"
            className="mx-auto mb-3 h-10 w-10 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LoanDolphin</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? "Create a new access account" : "Sign in to the dashboard"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
          <button
            type="button"
            onClick={() => onToggleMode("login")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              !isRegister
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onToggleMode("register")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isRegister
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              User ID
            </label>
            <input
              type="text"
              name="userid"
              value={form.userid}
              onChange={onFormChange}
              placeholder="Enter user ID"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onFormChange}
              placeholder="Enter password"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              required
            />
          </div>

            {/* Self-registration only ever creates a customer account —
                the backend rejects any other type, so there's no role
                picker here; staff accounts are provisioned separately
                when an administrator creates a branch. */}
            {isRegister && (
              <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Name
                      </label>
                      <input
                        type="text"
                        name="c_name"
                        value={form.c_name || ""}
                        onChange={onFormChange}
                        placeholder="Enter name"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Street
                      </label>
                      <input
                        type="text"
                        name="c_street"
                        value={form.c_street || ""}
                        onChange={onFormChange}
                        placeholder="Enter street"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        City
                      </label>
                      <input
                        type="text"
                        name="c_city"
                        value={form.c_city || ""}
                        onChange={onFormChange}
                        placeholder="Enter city"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        required
                      />
                    </div>
              </>
            )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500"
          >
            {isRegister ? "Create Account" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
