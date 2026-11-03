const FEATURE_NAMES = [
  'Married', 'Dependents', 'Education', 'Self_Employed', 'ApplicantIncome',
  'CoapplicantIncome', 'LoanAmount', 'Loan_Amount_Term', 'Credit_History', 'Property_Area'
];

export class MlPredictionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MlPredictionError';
    this.code = code;
  }
}

export function applicantToModelInput(amt, applicant) {
  return {
    Married: applicant.married,
    Dependents: applicant.dependents,
    Education: applicant.education,
    Self_Employed: applicant.selfEmployed,
    ApplicantIncome: applicant.applicantIncome,
    CoapplicantIncome: applicant.coapplicantIncome,
    LoanAmount: amt / 1000,
    Loan_Amount_Term: applicant.termMonths,
    Credit_History: applicant.creditHistory,
    Property_Area: applicant.propertyArea
  };
}

export async function requestMlPrediction(amt, applicant) {
  const baseUrl = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantToModelInput(amt, applicant)),
      signal: AbortSignal.timeout(1800)
    });
  } catch (error) {
    throw new MlPredictionError('ML_SERVICE_UNREACHABLE', error.message);
  }
  if (!response.ok) {
    const code = response.status >= 500 ? 'ML_MODEL_INFERENCE_ERROR' : 'ML_INPUT_PIPELINE_ERROR';
    throw new MlPredictionError(code, `ML service returned HTTP ${response.status}`);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new MlPredictionError('ML_INVALID_RESPONSE', 'ML service did not return valid JSON');
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new MlPredictionError('ML_INVALID_RESPONSE', 'ML service returned an invalid prediction payload');
  }
  if (typeof result.probability !== 'number' || !Number.isFinite(result.probability) ||
      result.probability < 0 || result.probability > 1 ||
      !['Approved', 'Rejected'].includes(result.label) ||
      !Array.isArray(result.topFactors) || typeof result.modelVersion !== 'string') {
    throw new MlPredictionError('ML_INVALID_RESPONSE', 'ML service returned an invalid prediction payload');
  }
  return {
    probability: result.probability,
    label: result.label,
    topFactors: result.topFactors.filter((factor) => typeof factor === 'string').slice(0, 5),
    modelVersion: result.modelVersion,
    scoredAt: new Date()
  };
}

export const APPLICANT_FEATURE_NAMES = FEATURE_NAMES;
