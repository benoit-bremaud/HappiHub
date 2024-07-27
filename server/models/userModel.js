import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true,
  },
  rank: {
    type: String,
    enum: ['visitor', 'friend', 'companion', 'organizer', 'unifier', 'ambassador', 'guardian'],
    default: 'visitor',
    required: function() {
      return this.role === 'user';
    },
  },
  permissions: {
    type: [String],
    required: function() {
      return this.role === 'admin';
    },
  },
},
{
  timestamps: true,
});

// Encrypt password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;
  next();
});

// Password verification
userSchema.methods.isValidPassword = async function (password) {
  const compare = await bcrypt.compare(password, this.password);
  return compare;
};

const User = mongoose.model('User', userSchema);

export default User;