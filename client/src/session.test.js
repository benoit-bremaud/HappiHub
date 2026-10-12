import { decodeSession } from './session';
const token = (value) => `e30.${btoa(JSON.stringify(value))}.signature`;
test('malformed, absent and expired credentials are rejected', () => {
  expect(decodeSession(null)).toBeNull(); expect(decodeSession('bad')).toBeNull();
  expect(decodeSession(token({ _id: 'user', exp: 1 }))).toBeNull();
});
test('valid unexpired credential can restore browser state', () => {
  const value = { _id: 'user', exp: Math.floor(Date.now() / 1000) + 60 };
  expect(decodeSession(token(value))).toEqual(value);
});
