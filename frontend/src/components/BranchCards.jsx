// BranchCards.jsx
function formatAssets(amount) {
  return `$${Number(amount || 0).toLocaleString()}`;
}

export default function BranchCards({ branches, managers = [] }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bank Branch Network</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Real branch records loaded from storage.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {branches.map((b) => {
          const manager = managers.find((entry) => entry.b_name === b.b_name);

          return (
            <div
              key={b.b_name}
              className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4"
            >
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{b.b_name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                City: <span className="text-slate-700 dark:text-slate-200">{b.b_city}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Assets: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatAssets(b.assets)}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manager: <span className="text-slate-700 dark:text-slate-200">{manager?.userid || "Unassigned"}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
