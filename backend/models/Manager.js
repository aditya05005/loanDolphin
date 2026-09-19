import mongoose from 'mongoose';

const managerSchema = new mongoose.Schema({
  // String FKs (not ObjectId refs — populate() won't work, queries use string matching)
  userid: { type: String, required: true, unique: true, trim: true },
  b_name: { type: String, required: true, trim: true }
}, { timestamps: true });

managerSchema.index({ userid: 1, b_name: 1 }, { unique: true });

export default mongoose.model('Manager', managerSchema);
