from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import json
from flask import Flask, jsonify, request

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model.joblib"
METRICS_PATH = ROOT / "metrics.json"
app = Flask(__name__)

if not MODEL_PATH.exists():
    raise RuntimeError(f"Trained model not found at {MODEL_PATH}; execute analysis.ipynb first")
model = joblib.load(MODEL_PATH)
try:
    with METRICS_PATH.open(encoding="utf-8") as metrics_file:
        model_version = json.load(metrics_file).get("model_version", "rf-v1")
except (OSError, ValueError):
    model_version = "rf-v1"

REQUIRED_FIELDS = [
    "Married", "Dependents", "Education", "Self_Employed", "ApplicantIncome",
    "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History", "Property_Area"
]
CATEGORY_VALUES = {
    "Married": {"Yes", "No"},
    "Dependents": {"0", "1", "2", "3+"},
    "Education": {"Graduate", "Not Graduate"},
    "Self_Employed": {"Yes", "No"},
    "Property_Area": {"Urban", "Semiurban", "Rural"},
}


@app.get("/health")
def health():
    return jsonify({"status": "ok", "modelVersion": model_version})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or any(key not in payload for key in REQUIRED_FIELDS):
        return jsonify({"message": "All applicant features are required."}), 400
    for field, allowed in CATEGORY_VALUES.items():
        if payload[field] not in allowed:
            return jsonify({"message": f"Invalid value for {field}."}), 400
    numeric_fields = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History"]
    try:
        values = {field: float(payload[field]) for field in numeric_fields}
    except (TypeError, ValueError):
        return jsonify({"message": "Numeric applicant features must be numbers."}), 400
    if (not all(np.isfinite(value) for value in values.values()) or
            values["ApplicantIncome"] < 0 or values["CoapplicantIncome"] < 0 or
            values["LoanAmount"] <= 0 or values["Loan_Amount_Term"] <= 0 or
            values["Credit_History"] not in (0, 1)):
        return jsonify({"message": "Numeric applicant features are out of range."}), 400

    row = {field: payload[field] for field in REQUIRED_FIELDS}
    row.update(values)
    probability = float(model.predict_proba(pd.DataFrame([row]))[0][1])
    classifier = model.named_steps["classifier"]
    feature_names = model.named_steps["preprocessor"].get_feature_names_out()
    importances = {}
    for name, importance in zip(feature_names, classifier.feature_importances_):
        field = name.split("__", 1)[-1].split("_", 1)[0]
        if field in {"Married", "Dependents", "Education", "Self", "ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan", "Credit", "Property"}:
            importances[field] = importances.get(field, 0.0) + float(importance)
    display = {
        "Credit": "Credit history", "Property": "Property area", "ApplicantIncome": "Applicant income",
        "CoapplicantIncome": "Co-applicant income", "LoanAmount": "Loan amount", "Married": "Marital status",
        "Dependents": "Dependents", "Education": "Education", "Self": "Self employment", "Loan": "Loan term"
    }
    top_factors = [
        f"{display[name]} (importance {score:.2f})"
        for name, score in sorted(importances.items(), key=lambda item: item[1], reverse=True)[:3]
    ]
    return jsonify({
        "probability": probability,
        "label": "Approved" if probability >= 0.5 else "Rejected",
        "topFactors": top_factors,
        "modelVersion": model_version
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
