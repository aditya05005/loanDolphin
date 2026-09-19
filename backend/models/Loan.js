import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  l_no:           { type: String, required: true, unique: true },
  amt:            { type: Number, required: true },
  b_name:         { type: String, required: true },            // FK → Branch.b_name
  borrowers:      [{ type: String }],                          // array of c_id strings
  c_id:           { type: String },
  customerUserId: { type: String },
  aadharNumber:   { type: String },
  loan_date:      { type: Date, default: Date.now },
  payments:       [{ amount: { type: Number }, date: { type: Date, default: Date.now } }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
});

export default mongoose.model('Loan', loanSchema);
