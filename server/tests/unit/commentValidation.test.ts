import { commentValidation } from '../../validation/commentValidation.js';
describe('shared runtime comment validation', () => {
  const valid = { content: 'Comment', event_id: '000000000000000000000001' };
  test('author identity is not required from the client', () => expect(commentValidation(valid).error).toBeUndefined());
  test.each([{ ...valid, content: '' }, { ...valid, content: 'x'.repeat(5001) }, { ...valid, event_id: 'invalid' }, { ...valid, role: 'admin' }])('rejects invalid input: %p', (input) => expect(commentValidation(input).error).toBeDefined());
});
