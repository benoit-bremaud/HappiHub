import request from 'supertest';
import { config, makeStore, seedSession, browserWrite } from './sessionFixture.js';
import { createApp } from '../app.js';
import { User } from '../models/userModel.js';
import Event from '../models/eventModel.js';
import Comment from '../models/commentModel.js';

const owner = '000000000000000000000001';
const other = '000000000000000000000002';
const eventId = '000000000000000000000003';
let app;

const auth = (query) => browserWrite(query);
beforeEach(async () => {
  const store = makeStore();
  await seedSession(store, owner);
  app = createApp(config, { store });
  jest.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: owner, role: 'user' }) });
});
afterEach(() => jest.restoreAllMocks());

test('incorrect passwords cannot issue a token', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => ({ isValidPassword: async () => false }) });
  const res = await browserWrite(request(app).post('/api/users/login')).send({ email: 'audit@example.com', password: 'incorrect' });
  expect(res.status).toBe(401); expect(res.body.token).toBeUndefined();
});
test('valid password issues a session without exposing the hash', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => ({ _id: owner, role: 'user', password: 'hash', isValidPassword: async () => true }) });
  const res = await browserWrite(request(app).post('/api/users/login')).send({ email: 'audit@example.com', password: 'correct-password' });
  expect(res.status).toBe(200); expect(res.body.user._id).toBe(owner); expect(res.body.user.password).toBeUndefined();
});
test('signup rejects administrator privileges before database access', async () => {
  const spy = jest.spyOn(User, 'findOne');
  const res = await browserWrite(request(app).post('/api/users/signup')).send({ name: 'Audit', email: 'audit@example.com', password: 'password', role: 'admin' });
  expect(res.status).toBe(400); expect(spy).not.toHaveBeenCalled();
});
test.each([undefined, 'Bearer invalid', 'Basic abc'])('invalid credentials fail safely: %s', async (header) => {
  let query = request(app).get('/api/users/profile'); if (header) query = query.set('Authorization', header);
  expect((await query).status).toBe(401);
});
test('legacy bearer credentials are rejected', async () => {
  expect((await request(app).get('/api/users/profile').set('Authorization', 'Bearer legacy')).status).toBe(401);
});
test('private event cannot be read by another account', async () => {
  jest.spyOn(Event, 'findById').mockResolvedValue({ creator: other, isPrivate: true, status: 'approved' });
  expect((await auth(request(app).get(`/api/events/${eventId}`))).status).toBe(404);
});
test('owner can read their pending private event without participant identifiers', async () => {
  jest.spyOn(Event, 'findById').mockResolvedValue({ _id: eventId, creator: owner, isPrivate: true, status: 'pending', attendees: [other] });
  const res = await auth(request(app).get(`/api/events/${eventId}`));
  expect(res.status).toBe(200); expect(res.body.attendees).toBeUndefined(); expect(res.body.creator).toBeUndefined();
});
test('anonymous public route filters approval and privacy', async () => {
  const spy = jest.spyOn(Event, 'find').mockResolvedValue([]);
  expect((await request(app).get('/api/events/public')).status).toBe(200);
  expect(spy).toHaveBeenCalledWith({ isPrivate: false, status: 'approved' });
});
test('anonymous pending event is hidden', async () => {
  jest.spyOn(Event, 'findById').mockResolvedValue({ creator: owner, isPrivate: false, status: 'pending' });
  expect((await request(app).get(`/api/events/${eventId}`)).status).toBe(404);
});
test('private comments are hidden before querying comments', async () => {
  jest.spyOn(Event, 'findById').mockResolvedValue({ creator: other, isPrivate: true });
  const spy = jest.spyOn(Comment, 'find');
  expect((await request(app).get(`/api/comments/events/${eventId}/comments`)).status).toBe(404);
  expect(spy).not.toHaveBeenCalled();
});
test.each(['/api/events', '/api/comments/add'])('forged authorship rejected: %s', async (path) => {
  const res = await auth(browserWrite(request(app).post(path))).send({ creator: other, user_id: other }); expect(res.status).toBe(403);
});
test('profile mutations reject privilege changes', async () => {
  expect((await auth(request(app).put('/api/users/profile')).send({ role: 'admin' })).status).toBe(400);
});
test('profile response excludes passwords and permissions', async () => {
  User.findById.mockReturnValueOnce({ select: async () => ({ _id: owner, role: 'user' }) }).mockResolvedValueOnce({ _id: owner, name: 'Audit', password: 'hash', permissions: ['secret'] });
  const res = await auth(request(app).get('/api/users/profile')); expect(res.status).toBe(200); expect(res.body.user.password).toBeUndefined(); expect(res.body.user.permissions).toBeUndefined();
});
test('database errors do not disclose internals', async () => {
  jest.spyOn(Event, 'find').mockRejectedValue(new Error('sensitive database detail'));
  const res = await request(app).get('/api/events/public'); expect(res.status).toBe(500); expect(JSON.stringify(res.body)).not.toContain('sensitive');
});
test('malformed JSON returns a generic client error', async () => {
  const res = await browserWrite(request(app).post('/api/users/login').set('Content-Type', 'application/json')).send('{broken'); expect(res.status).toBe(400); expect(res.body).toEqual({ message: 'Invalid request' });
});
test('event creation persists authenticated author and pending status', async () => {
  let saved;
  jest.spyOn(Event.prototype, 'save').mockImplementation(async function () { saved = this; return this; });
  const res = await auth(browserWrite(request(app).post('/api/events'))).send({ title: 'Event title', description: 'Event description', date: '2030-01-01', location: 'Paris' });
  expect(res.status).toBe(201); expect(String(saved.creator)).toBe(owner); expect(saved.status).toBe('pending');
});
test('invalid image payload fails before persistence', async () => {
  const spy = jest.spyOn(Event.prototype, 'save');
  const res = await auth(browserWrite(request(app).post('/api/events'))).send({ title: 'Event title', description: 'Event description', date: '2030-01-01', location: 'Paris', image: 'data:image/png;base64,YWJjZA==' });
  expect(res.status).toBe(400); expect(spy).not.toHaveBeenCalled();
});
test('comment creation persists authenticated author', async () => {
  jest.spyOn(Event, 'findById').mockResolvedValue({ creator: owner, isPrivate: true });
  let saved;
  jest.spyOn(Comment.prototype, 'save').mockImplementation(async function () { saved = this; return this; });
  const res = await auth(browserWrite(request(app).post('/api/comments/add'))).send({ content: 'Hello', event_id: eventId });
  expect(res.status).toBe(201); expect(String(saved.user_id)).toBe(owner);
});
test('participation uses authenticated account and atomic duplicate prevention', async () => {
  const spy = jest.spyOn(Event, 'findOneAndUpdate').mockResolvedValue({ _id: eventId });
  expect((await auth(request(app).patch(`/api/events/${eventId}`)).send({})).status).toBe(200);
  expect(spy.mock.calls[0][1]).toEqual({ $addToSet: { attendees: owner } });
});
test('password verification uses actual hashing rather than a controller stub', async () => {
  const bcrypt = require('bcryptjs');
  const user = new User({ password: await bcrypt.hash('valid-password', 4) });
  expect(await user.isValidPassword('valid-password')).toBe(true);
  expect(await user.isValidPassword('wrong-password')).toBe(false);
});

test('ordinary signup saves only ordinary privileges and does not log passwords', async () => {
  jest.spyOn(User, 'findOne').mockResolvedValue(null);
  let saved;
  jest.spyOn(User.prototype, 'save').mockImplementation(async function () { saved = this; return this; });
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const res = await browserWrite(request(app).post('/api/users/signup')).send({ name: 'Audit', email: 'audit@example.com', password: 'password' });
  expect(res.status).toBe(201); expect(saved.role).toBe('user'); expect(log).not.toHaveBeenCalled();
});
test('validated profile mutation saves only allowed data', async () => {
  const user = { _id: owner, role: 'user', password: 'hash', save: jest.fn().mockResolvedValue(undefined) };
  User.findById.mockReturnValueOnce({ select: async () => ({ _id: owner, role: 'user' }) }).mockResolvedValueOnce(user);
  const res = await auth(request(app).put('/api/users/profile')).send({ name: 'Updated' });
  expect(res.status).toBe(200); expect(user.name).toBe('Updated'); expect(user.save).toHaveBeenCalled(); expect(res.body.password).toBeUndefined();
});

test('readiness fails when database is disconnected', async () => {
  const res = await request(app).get('/ready'); expect(res.status).toBe(503); expect(res.body).toEqual({ ready: false });
});
