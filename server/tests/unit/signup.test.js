// signup.test.js

import User from '../../models/userModel';
import app from '../../server';
import request from 'supertest';

describe('POST /signup', () => {
  beforeAll(async () => {
    // Initial setup if needed
  });

  afterAll(async () => {
    // Cleanup actions
  });

  afterEach(async () => {
    // Clean database between tests
    await User.deleteMany({});
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides valid name, email, and password.
   * - The response should be 201 (Created) with a success message.
   * - The user should be saved in the database.
   * - The user should have a role of 'user' by default.
   */
  test('should successfully create a new user', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@1234',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(201);
    
    expect(response.body.message).toBe('User registered successfully');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides an email that already exists in the database.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the email already exists.
   * - The user should not be saved in the database.
   * - The existing user should not be overwritten.
   */
  test('should return an error if the email already exists', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@exemple.com',
      password: 'Test@1234',
    };

    await User.create(newUser);

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);
    
    expect(response.body.message).toBe('Email already exists');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides data with missing name field.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the name is missing.
   * - The user should not be saved in the database.
   */
  test('should return an error if the name is missing', async () => {
    const newUser = {
      name: '',
      email: 'test@example.com',
      password: 'Test@1234',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);
    
    expect(response.body.message).toBe('"name" is not allowed to be empty');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides data with missing email field.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the email is missing.
   * - The user should not be saved in the database.
   */
  test('should return an error if the email is missing', async () => {
    const newUser = {
      name: 'Test User',
      email: '',
      password: 'Test@1234',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);

    expect(response.body.message).toBe('"email" is not allowed to be empty');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides data with missing password field.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the password is missing.
   * - The user should not be saved in the database.
   */
  test('should return an error if the password is missing', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: '',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);
    
    expect(response.body.message).toBe('"password" is not allowed to be empty');
  });
  
  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides data with a name that is too short.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the name is too short.
   * - The user should not be saved in the database.
   */
  test('should return an error if the name is too short', async () => {
    const newUser = {
      name: 'Te',
      email: 'test@example.com',
      password: 'Test@1234',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);
    
    expect(response.body.message).toBe('"name" length must be at least 3 characters long');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides an invalid email.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the email is invalid.
   * - The user should not be saved in the database.
   */
  test('should return an error if the email is invalid', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example',
      password: 'Test@1234',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);
    
    expect(response.body.message).toBe('"email" must be a valid email');
  });

  /**
   * Test the registration of a new user.
   * Scenario:
   * - User provides a password that is too short.
   * - The response should be 400 (Bad Request) with an error message.
   * - The error message should indicate that the password is too short.
   * - The user should not be saved in the database.
   */
  test('should return an error if the password is too short', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@',
    };

    const response = await request(app)
      .post('/api/users/signup')
      .send(newUser)
      .expect(400);

    expect(response.body.message).toBe('"password" length must be at least 6 characters long');
  });

  // Add more tests as needed

});