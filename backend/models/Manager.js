import mongoose from 'mongoose';

const managerSchema = new mongoose.Schema({
  userid: { type: String, ref: 'User', required: true },
  b_name: { type: String, ref: 'Branch', required: true }
}, { timestamps: true });

managerSchema.index({ userid: 1, b_name: 1 }, { unique: true });

export default mongoose.model('Manager', managerSchema);
