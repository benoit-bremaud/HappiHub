import User from '../models/userModel.js';
import { signupValidation } from '../validation/userValidation.js';
// import jwt from 'jsonwebtoken';

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
  });

  try {
    // Save the user to the database
    const savedUser = await user.save();

    // Create and assign a token

    // Send the user data in the response
    res.status(201).json({ message: 'User registered successfully', user: savedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};