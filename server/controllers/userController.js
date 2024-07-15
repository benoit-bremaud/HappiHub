import { loginValidation, logoutValidation, signupValidation, updateProfileValidation } from '../validation/userValidation.js';

import Event from '../models/eventModel.js';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import generateToken from '../utils/jwt.js';

// Load environment variables
dotenv.config();

export const signup = async (req, res) => {
  // Validate the user input
  const { error } = signupValidation(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // Check if the user already exists
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) return res.status(400).json({ message: 'Email already exists' });

  // Create a new user
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });

  try {
    // Save the user to the database
    const savedUser = await user.save();

    // Send the user data in the response
    res.status(201).json({ message: 'User registered successfully', user: savedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {

  try {
  // Validate the user input
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check if the user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: 'Email is not found ' });

// Check if the password is correct
if (req.body.password !== user.password) {
  return res.status(400).json({ message: 'Invalid password' });
}
    
    // Create and assign a token
    const token = generateToken(user);
 
    // Send the user data in the response
    res.status(200).json({ 
      message: 'Logged in successfully', 
      token: token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        rank: user.rank,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

export const logout = async (req, res) => {
  // Validate the user token
  const { error } = logoutValidation(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  
  // Send the user data in the response
  res.status(200).json({ message: 'Logged out successfully' });
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  // Validate the new profile data
  const { error } = updateProfileValidation(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// View public events
export const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({ isPrivate: false });
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
