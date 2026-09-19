import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  c_id:     { type: String, required: true, unique: true, trim: true },
  userid:   { type: String, required: true, unique: true, trim: true },
  c_name:   { type: String, required: true, trim: true },
  c_street: { type: String, required: true, trim: true },
  c_city:   { type: String, required: true, trim: true }
});

export default mongoose.model('Customer', customerSchema);