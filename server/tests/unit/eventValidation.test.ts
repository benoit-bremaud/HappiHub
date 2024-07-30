// eventValidation.test.js
import { eventValidation } from '../../validation/eventValidation.js';

describe('eventValidation', () => {
  test('should validate a valid event data', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      location: 'Event Location',
      image: 'http://example.com/image.jpg',
      creator: 'user123',
      attendees: ['user1', 'user2'],
      comments: [
        { user: 'user1', comment: 'Looks great!', date: new Date().toISOString() }
      ],
      likes: ['user1', 'user2'],
      dislikes: ['user3'],
      report: ['user4'],
    };

    const { error, value } = eventValidation(data);

    expect(error).toBeUndefined();
    expect(JSON.stringify(value)).toEqual(JSON.stringify(data));
  });

  test('should return an error if title is missing', () => {
    const data = {
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      location: 'Event Location',
      creator: 'user123',
    };

    const { error } = eventValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"title" is required');
  });

  test('should return an error if date is missing', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      location: 'Event Location',
      creator: 'user123',
    };

    const { error } = eventValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"date" is required');
  });

  test('should return an error if location is missing', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      creator: 'user123',
    };

    const { error } = eventValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"location" is required');
  });

  test('should return an error if creator is missing', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      location: 'Event Location',
    };

    const { error } = eventValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"creator" is required');
  });

  test('should allow optional fields to be null or empty', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      location: 'Event Location',
      creator: 'user123',
      image: '', // allowed to be empty
      attendees: [], // allowed to be empty
      comments: [], // allowed to be empty
      likes: [], // allowed to be empty
      dislikes: [], // allowed to be empty
      report: [], // allowed to be empty
    };

    const { error, value } = eventValidation(data);

    expect(error).toBeUndefined();
    expect(JSON.stringify(value)).toEqual(JSON.stringify(data));
  });

  test('should return an error if comments have invalid structure', () => {
    const data = {
      title: 'Event Title',
      description: 'This is a description of the event.',
      date: new Date().toISOString(),
      location: 'Event Location',
      creator: 'user123',
      comments: [
        { user: 'user1', comment: 'Looks great!' } // missing date
      ],
    };

    const { error } = eventValidation(data);

    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"comments[0].date" is required');
  });

  // Ajoutez d'autres tests si nécessaire pour couvrir tous les cas
});
