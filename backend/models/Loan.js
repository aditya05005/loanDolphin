import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  l_no: { type: String, required: true, unique: true },
  amt: { type: Number, required: true, default: 0.00 },
  b_name: { type: String, ref: 'Branch', required: true },
  borrowers: [{ type: String, ref: 'Customer' }],
  loan_date: {
    type: String,
    required: true,
    default: () => new Date().toISOString().slice(0, 10)
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
});

export default mongoose.model('Loan', loanSchema);
