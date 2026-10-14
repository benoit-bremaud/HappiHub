import { loginValidation, signupValidation, profileValidation } from '../validation/userValidation.js';
import { User } from '../models/userModel.js';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sessionOperation, clearSessionCookie } from '../config/session.js';
import { trustedOrigin } from '../middleware/csrf.js';
import { IDLE_MS } from '../utils/sessionPolicy.js';

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

/** Verify credentials and persist a regenerated server session with projected user data. Invalid credentials return 401; never returns a password hash. */
export const login = async (req, res) => {
  const { error, value } = loginValidation(req.body);
  if (error) return res.status(400).json({ message: 'Invalid login data' });
  try {
    const user = await User.findOne({ email: value.email }).select('+password');
    if (!user || !(await user.isValidPassword(value.password))) return res.status(401).json({ message: 'Invalid credentials' });
    await sessionOperation(req.session, 'regenerate');
    const now = req.app.locals.now();
    Object.assign(req.session, { userId: String(user._id), authVersion: user.authVersion || 0,
      startedAt: now, csrfToken: randomBytes(32).toString('hex') });
    req.session.cookie.maxAge = IDLE_MS;
    await sessionOperation(req.session, 'save');
    return res.status(200).json({ user: profile(user), csrfToken: req.session.csrfToken });
  } catch {
    req.session = null; clearSessionCookie(req, res);
    return res.status(503).json({ message: 'Unable to log in' });
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
    const { password, currentPassword, ...changes } = value;
    if (password) {
      const credential = await User.findById(req.user._id).select('+password');
      if (!credential || !(await credential.isValidPassword(currentPassword)))
        return res.status(401).json({ message: 'Invalid credentials' });
      const hash = await bcrypt.hash(password, 12);
      // Match the verified hash to prevent concurrent password changes from racing.
      const updated = await User.findOneAndUpdate({ _id: user._id, password: credential.password },
        { $set: { ...changes, password: hash }, $inc: { authVersion: 1 } }, { new: true });
      if (!updated) return res.status(409).json({ message: 'Account changed. Sign in again.' });
      await sessionOperation(req.session, 'destroy'); clearSessionCookie(req, res);
      return res.json(profile(updated));
    }
    Object.assign(user, changes);
    await user.save();
    return res.json(profile(user));
  } catch {
    return res.status(500).json({ message: 'Unable to update profile' });
  }
};

/** Return the current account role established by authentication middleware. */
export const getUserRole = async (req, res) => res.json({ role: req.user.role });

/** Bootstrap a CSRF-protected visit without issuing a browser-readable credential. */
export const getSession = async (req, res) => {
  if (!trustedOrigin(req)) return res.status(403).json({ message: 'Request origin rejected' });
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && (user.authVersion || 0) === req.session.authVersion) {
        return res.json({ user: profile(user), csrfToken: req.session.csrfToken });
      }
      await sessionOperation(req.session, 'regenerate');
    }
    if (!req.session.csrfToken) {
      const now = req.app.locals.now();
      Object.assign(req.session, { startedAt: now, csrfToken: randomBytes(32).toString('hex') });
      req.session.cookie.maxAge = IDLE_MS;
      await sessionOperation(req.session, 'save');
    }
    return res.json({ user: null, csrfToken: req.session.csrfToken });
  } catch { return res.status(503).json({ message: 'Session unavailable' }); }
};
export const logout = async (req, res) => {
  try { await sessionOperation(req.session, 'destroy'); clearSessionCookie(req, res); return res.status(204).end(); }
  catch { return res.status(503).json({ message: 'Unable to revoke session' }); }
};
