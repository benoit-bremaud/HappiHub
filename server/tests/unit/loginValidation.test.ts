// loginValidation.test.js
import { loginValidation } from '../../validation/userValidation.js';

describe('loginValidation', () => {
  test('should validate a valid login data', () => {
    const data = {
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
    };

    const { error, value } = loginValidation(data);

    expect(error).toBeUndefined();
    expect(value).toEqual(data);
  });

  test('should return an error if email is missing', () => {
    const data = {
      password: 'StrongPassword123',
    };

    const { error } = loginValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"email" is required');
  });

  test('should return an error if email is invalid', () => {
    const data = {
      email: 'invalid-email',
      password: 'StrongPassword123',
    };

    const { error } = loginValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"email" must be a valid email');
  });

  test('should return an error if password is missing', () => {
    const data = {
      email: 'johndoe@example.com',
    };

    const { error } = loginValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"password" is required');
  });

  test('should return an error if password is too short', () => {
    const data = {
      email: 'johndoe@example.com',
      password: '123',
    };

    const { error } = loginValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"password" length must be at least 6 characters long');
  });
});
