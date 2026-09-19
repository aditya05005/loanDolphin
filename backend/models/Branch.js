import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  b_name:  { type: String, required: true, unique: true, trim: true },
  b_city:  { type: String, required: true, trim: true },
  assets:  { type: Number, required: true, default: 0 }
});

export default mongoose.model('Branch', branchSchema);
