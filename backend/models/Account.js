import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  ac_no:   { type: String, required: true, unique: true, trim: true },
  balance: { type: Number, required: true, default: 0 },
  // String FKs (not ObjectId refs — populate() won't work, queries use string matching)
  userid:  { type: String, required: true, trim: true },   // FK → User.userid
  b_name:  { type: String, required: true, trim: true }    // FK → Branch.b_name
});

export default mongoose.model('Account', accountSchema);
