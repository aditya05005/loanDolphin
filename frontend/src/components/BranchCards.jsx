// BranchCards.jsx
// Shows each row of the `branch` table (b_name, b_city, assets) as a card,
// styled for both light and dark mode.

function formatAssets(amount) {
  return `$${(amount / 1_000_000).toFixed(1)}M`;
}

export default function BranchCards({ branches }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bank Branch Network</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Branches from the <code className="text-slate-400 dark:text-slate-500">branch</code> table
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div
            key={b.b_name}
            className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{b.b_name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              b_city: <span className="text-slate-700 dark:text-slate-200">{b.b_city}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              assets:{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {formatAssets(b.assets)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
