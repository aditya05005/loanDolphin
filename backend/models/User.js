import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['branch_manager', 'senior_manager', 'administrator'],
    default: 'branch_manager'
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
