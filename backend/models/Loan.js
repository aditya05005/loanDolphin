import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  l_no:           { type: String, required: true, unique: true },
  amt:            { type: Number, required: true },
  b_name:         { type: String, required: true },            // FK → Branch.b_name
  borrowers:      [{ type: String }],                          // array of c_id strings
  c_id:           { type: String },
  customerUserId: { type: String },
  applicant: {
    married: { type: String, enum: ['Yes', 'No'] },
    dependents: { type: String, enum: ['0', '1', '2', '3+'] },
    education: { type: String, enum: ['Graduate', 'Not Graduate'] },
    selfEmployed: { type: String, enum: ['Yes', 'No'] },
    applicantIncome: { type: Number, min: 0 },
    coapplicantIncome: { type: Number, min: 0 },
    termMonths: { type: Number, min: 1 },
    creditHistory: { type: Number, enum: [0, 1] },
    propertyArea: { type: String, enum: ['Urban', 'Semiurban', 'Rural'] }
  },
  mlPrediction: {
    probability: { type: Number, min: 0, max: 1 },
    label: { type: String, enum: ['Approved', 'Rejected'] },
    topFactors: [{ type: String }],
    modelVersion: { type: String },
    scoredAt: { type: Date }
  },
  loan_date:      { type: Date, default: Date.now },
  disbursedAt:    { type: Date },
  repaidAt:       { type: Date },
  payments:       [{ amount: { type: Number }, date: { type: Date, default: Date.now } }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Disbursed', 'Repaid'],
    default: 'Pending'
  }
});

// This index closes the concurrent-request gap in the application route.
loanSchema.index(
  { customerUserId: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending', customerUserId: { $type: 'string' } } }
);

export default mongoose.model('Loan', loanSchema);
