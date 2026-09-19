import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  userid:   { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['branch_manager', 'senior_manager', 'administrator', 'customer'],
    default: 'customer'
  }
}, { timestamps: true });

// Hash password before saving (only when it has been modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// Convenience method for login comparison
userSchema.methods.comparePassword = function (plaintext) {
  return bcrypt.compare(plaintext, this.password);
};

export default mongoose.model('User', userSchema);
