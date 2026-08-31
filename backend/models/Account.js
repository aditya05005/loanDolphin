import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  ac_no: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 0.00 },
  b_name: { type: String, ref: 'Branch', required: true }
});

export default mongoose.model('Account', accountSchema);
