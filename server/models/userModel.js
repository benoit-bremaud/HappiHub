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
  // add more fields here
  // events: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  // comments: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  // followers: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // following: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // friends: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
