// signupValidation.test.js
import { signupValidation } from '../../validation/userValidation.js';

describe('signupValidation', () => {
  test('should validate a valid signup data', () => {
    const data = {
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
      role: 'user',
      rank: 'Visitor',
    };

    const { error, value } = signupValidation(data);

    expect(error).toBeUndefined();
    expect(value).toEqual(data);
  });

  test('should return an error if name is missing', () => {
    const data = {
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
      role: 'user',
      rank: 'Visitor',
    };

    const { error } = signupValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"name" is required');
  });

  test('should return an error if email is invalid', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'StrongPassword123',
      role: 'user',
      rank: 'Visitor',
    };

    const { error } = signupValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"email" must be a valid email');
  });

  test('should return an error if password is too short', () => {
    const data = {
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: '123',
      role: 'user',
      rank: 'Visitor',
    };

    const { error } = signupValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"password" length must be at least 6 characters long');
  });

  test('should return an error if role is invalid', () => {
    const data = {
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
      role: 'superuser', // Invalid role
      rank: 'Visitor',
    };

    const { error } = signupValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"role" must be one of [user, admin]');
  });

  test('should return an error if rank is invalid', () => {
    const data = {
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
      role: 'user',
      rank: 'UnknownRank', // Invalid rank
    };

    const { error } = signupValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"rank" must be one of [Visitor, Friend, Companion, Organizer, Unifier, Ambassador, Guardian]');
  });

  test('should allow valid roles and ranks', () => {
    const data = {
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'StrongPassword123',
      role: 'admin', // Valid role
      rank: 'Guardian', // Valid rank
    };

    const { error, value } = signupValidation(data);

    expect(error).toBeUndefined();
    expect(value.role).toBe('admin');
    expect(value.rank).toBe('Guardian');
  });
});
