import { loginValidation, signupValidation, profileValidation } from '../validation/userValidation.js';
import { User } from '../models/userModel.js';
import { generateToken } from '../utils/jwt.js';

const profile = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role });

/** Register an ordinary account after allowlist validation; hash on save. Returns 201, 400 for invalid/duplicate input, or generic 500. */
export const signup = async (req, res) => {
  const { error, value } = signupValidation(req.body);
  if (error) return res.status(400).json({ message: 'Invalid registration data' });
  try {
    if (await User.findOne({ email: value.email })) return res.status(400).json({ message: 'Unable to register' });
    await new User({ name: value.name, email: value.email, password: value.password, role: 'user' }).save();
    return res.status(201).json({ message: 'User registered successfully' });
  } catch {
    return res.status(500).json({ message: 'Unable to register' });
  }
};

/** Verify credentials and issue an expiring configured token with projected user data. Invalid credentials return 401; never returns a password hash. */
export const login = async (req, res) => {
  const { error, value } = loginValidation(req.body);
  if (error) return res.status(400).json({ message: 'Invalid login data' });
  try {
    const user = await User.findOne({ email: value.email }).select('+password');
    if (!user || !(await user.isValidPassword(value.password))) return res.status(401).json({ message: 'Invalid credentials' });
    return res.status(200).json({ message: 'Logged in successfully', token: generateToken(user, req.app.locals.config), user: profile(user) });
  } catch {
    return res.status(500).json({ message: 'Unable to log in' });
  }
};

/** Read only the authenticated account and return its projected profile inside a user wrapper. */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: profile(user) });
  } catch {
    return res.status(500).json({ message: 'Unable to retrieve profile' });
  }
};

/** Persist allowlisted changes for the authenticated account; omitted password is unchanged. Returns a projected profile without the wrapper. */
export const updateUserProfile = async (req, res) => {
  const { error, value } = profileValidation(req.body);
  if (error) return res.status(400).json({ message: 'Invalid profile data' });
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    Object.assign(user, value);
    await user.save();
    return res.json(profile(user));
  } catch {
    return res.status(500).json({ message: 'Unable to update profile' });
  }
};

/** Return the current account role established by authentication middleware. */
export const getUserRole = async (req, res) => res.json({ role: req.user.role });
