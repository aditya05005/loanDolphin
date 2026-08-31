import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  c_name: { type: String, required: true, unique: true },
  c_street: { type: String, required: true },
  c_city: { type: String, required: true }
});

export default mongoose.model('Customer', customerSchema);
