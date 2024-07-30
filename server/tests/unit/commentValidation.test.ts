// commentValidation.test.js
import { CommentData, commentValidation } from '../../validation/commentValidation.ts';

describe('commentValidation', () => {
  test('should validate a valid comment data', () => {
    const data: CommentData = {
      content: 'This is a valid comment.',
      user_id: 'user123',
      event_id: 'event123',
    };

    const { error, value } = commentValidation(data);

    expect(error).toBeUndefined();
    expect(value).toEqual(data);
  });

  test('should return an error if content is missing', () => {
    const data: Partial<CommentData> = {
      user_id: 'user123',
      event_id: 'event123',
    };

    const { error } = commentValidation(data as CommentData);

    if (error) {
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"content" is required');
    }
  });

  test('should return an error if user_id is missing', () => {
    const data: Partial<CommentData> = {
      content: 'This is a valid comment.',
      event_id: 'event123',
    };

    const { error } = commentValidation(data as CommentData);

    if (error) {
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"user_id" is required');
    }
  });

  test('should return an error if event_id is missing', () => {
    const data: Partial<CommentData> = {
      content: 'This is a valid comment.',
      user_id: 'user123',
    };

    const { error } = commentValidation(data as CommentData);

    if (error) {
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"event_id" is required');
    }
  });

  test('should return an error if content is too short', () => {
    const data: CommentData = {
      content: '',
      user_id: 'user123',
      event_id: 'event123',
    };

    const { error } = commentValidation(data);

    if (error) {
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"content" is not allowed to be empty');
    }
  });

  test('should return an error if content is too long', () => {
    const data: CommentData = {
      content: 'A'.repeat(256), // 256 characters, exceeding the max length of 255
      user_id: 'user123',
      event_id: 'event123',
    };

    const { error } = commentValidation(data);

    if (error) {
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"content" length must be less than or equal to 255 characters long');
    }
  });

  // Add more tests if necessary to cover additional edge cases
});
