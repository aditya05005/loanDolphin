import { Fragment, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

const panel = "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40";
const pct = (value) => Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : "—";

export default function ModelInsights() {
  const [metrics, setMetrics] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest('/analytics/model').then((modelData) => {
      if (active) setMetrics(modelData);
    }).catch(() => {
      if (active) setUnavailable(true);
    });
    return () => { active = false; };
  }, []);

  if (unavailable) return <section className={panel}><h2 className="font-semibold text-slate-900 dark:text-white">Loan approval model</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Model insights are not available yet. Generate the notebook metrics and refresh this page.</p></section>;
  if (!metrics) return <section className={panel}><p className="text-sm text-slate-500 dark:text-slate-400">Loading model insights…</p></section>;

  const comparison = metrics.model_comparison || [];
  const importance = Object.entries(metrics.feature_importances || {}).sort((a, b) => b[1] - a[1]);
  const eda = metrics.eda || {};
  const creditRates = eda.approval_rate_by_credit_history || {};
  const highCreditRate = creditRates["1"] ?? creditRates["1.0"];
  const lowCreditRate = creditRates["0"] ?? creditRates["0.0"];
  const insights = [
    `${metrics.n_train} training applications were used; the held-out accuracy is ${pct(metrics.accuracy)} and ROC-AUC is ${Number(metrics.roc_auc).toFixed(3)}.`,
    highCreditRate !== undefined && lowCreditRate !== undefined
      ? `Historical approval rate was ${pct(highCreditRate)} with credit history meeting guidelines and ${pct(lowCreditRate)} without.`
      : `Historical approval rate overall was ${pct(eda.overall_approval_rate)}.`,
    `The strongest model feature groups are ${importance.slice(0, 3).map(([name]) => name.replaceAll("_", " ")).join(", ") || "not available"}; these are associations, not causes.`,
  ];

  return (
    <section className="space-y-4" aria-label="Staff model insights">
      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Advisory model · staff only</p><h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{metrics.model_name}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{metrics.dataset} · {metrics.n_rows} rows · version {metrics.model_version}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Training rows" value={metrics.n_train} />
          <Metric label="Accuracy" value={pct(metrics.accuracy)} />
          <Metric label="Precision" value={pct(metrics.precision)} />
          <Metric label="Recall" value={pct(metrics.recall)} />
          <Metric label="F1" value={pct(metrics.f1)} />
          <Metric label="ROC-AUC" value={Number(metrics.roc_auc).toFixed(3)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={panel}>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Model comparison</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-slate-500"><tr>{["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "5-fold F1"].map((title) => <th key={title} className="pb-2 pr-3">{title}</th>)}</tr></thead><tbody>{comparison.map((row) => <tr key={row.model} className="border-t border-slate-200 dark:border-slate-700"><td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200">{row.model}</td><td>{pct(row.accuracy)}</td><td>{pct(row.precision)}</td><td>{pct(row.recall)}</td><td>{pct(row.f1)}</td><td>{Number(row.roc_auc).toFixed(3)}</td><td>{pct(row.cv_f1_mean)}</td></tr>)}</tbody></table></div>
        </div>
        <div className={panel}>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Confusion matrix <span className="text-xs font-normal text-slate-500">actual rows · predicted columns</span></h3>
          <div className="grid max-w-sm grid-cols-3 gap-1 text-center text-xs"><div /><div className="p-2 text-slate-500">Not approved</div><div className="p-2 text-slate-500">Approved</div>{(metrics.confusion_matrix || []).map((row, index) => <Fragment key={index}><div className="p-3 text-left text-slate-500">{index === 0 ? "Not approved" : "Approved"}</div>{row.map((value, col) => <div key={`${index}-${col}`} className="rounded bg-emerald-100 p-3 text-lg font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">{value}</div>)}</Fragment>)}</div>
        </div>
        <div className={panel}>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Random Forest feature importance</h3>
          <Bars entries={importance} />
        </div>
        <div className={panel}>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Historical approval rates</h3>
          <RateGroup title="Credit history" values={eda.approval_rate_by_credit_history} labels={{ "1": "Meets guidelines", "0": "Does not meet guidelines", "1.0": "Meets guidelines", "0.0": "Does not meet guidelines" }} />
          <RateGroup title="Property area" values={eda.approval_rate_by_property_area} />
          <RateGroup title="Education" values={eda.approval_rate_by_education} />
        </div>
        {metrics.cluster?.profiles && <div className={panel}><h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Applicant segments · silhouette {Number(metrics.cluster.silhouette_score).toFixed(3)}</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="pb-2">Segment</th><th>Applicants</th><th>Approval rate</th><th>Median income</th><th>Median loan</th></tr></thead><tbody>{metrics.cluster.profiles.map((row) => <tr key={row.cluster} className="border-t border-slate-200 dark:border-slate-700"><td className="py-2">{row.cluster}</td><td>{row.applicants}</td><td>{pct(row.approval_rate)}</td><td>{Number(row.median_income).toLocaleString()}</td><td>{Number(row.median_loan).toLocaleString()}</td></tr>)}</tbody></table></div></div>}
        <div className={`${panel} lg:col-span-2`}><h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Insights</h3><ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{insights.map((sentence) => <li key={sentence}>{sentence}</li>)}</ul><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Historical associations on a small dataset; staff review every application and make the decision.</p></div>
      </div>
    </section>
  );
}

function Metric({ label, value }) { return <div className="rounded-lg bg-white p-3 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p></div>; }

function Bars({ entries }) {
  const max = Math.max(0.0001, ...entries.map(([, value]) => Number(value)));
  return <div className="space-y-2">{entries.slice(0, 8).map(([name, value]) => <div key={name}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="text-slate-600 dark:text-slate-300">{name.replaceAll("_", " ")}</span><span className="text-slate-500">{Number(value).toFixed(3)}</span></div><div className="h-2 rounded bg-slate-200 dark:bg-slate-700"><div className="h-2 rounded bg-emerald-600" style={{ width: `${Math.max(2, Number(value) / max * 100)}%` }} /></div></div>)}</div>;
}

function RateGroup({ title, values = {}, labels = {} }) {
  return <div className="mb-3"><p className="text-xs font-medium text-slate-600 dark:text-slate-300">{title}</p><div className="mt-1 flex flex-wrap gap-2">{Object.entries(values).map(([label, rate]) => <span key={label} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{labels[label] || label}: {pct(rate)}</span>)}</div></div>;
}
