// LoginScreen renders the pre-dashboard authentication form for users and administrators.
export default function LoginScreen({
  form,
  mode,
  error,
  onFormChange,
  onSubmit,
  onToggleMode
}) {
  const isRegister = mode === "register";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">LoanDolphin</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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

          {isRegister && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Account Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={onFormChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="branch_manager">Branch Manager</option>
                <option value="senior_manager">Senior Manager</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
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

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
          Default admin login: <span className="font-semibold">admin</span> / <span className="font-semibold">admin123</span>
        </p>
      </div>
    </div>
  );
}
