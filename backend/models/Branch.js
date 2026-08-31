import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  b_name: { type: String, required: true, unique: true },
  b_city: { type: String, required: true },
  assets: { type: Number, required: true, default: 0.00 }
});

export default mongoose.model('Branch', branchSchema);
