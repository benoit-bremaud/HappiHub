import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../app.js';
import { User } from '../../models/userModel.js';
import Event from '../../models/eventModel.js';
import Comment from '../../models/commentModel.js';

let database;
const app = createApp({ jwtSecret: 'synthetic-integration-key', jwtExpiration: '5m', origin: 'http://localhost:3000' });
const password = 'Synthetic-password-123';
let owner, outsider, token, outsiderToken;
const login = (email, input = password) => request(app).post('/api/users/login').send({ email, password: input });
const authenticated = (query, credential = token) => query.set('Authorization', `Bearer ${credential}`);
const eventData = { title: 'Synthetic event', description: 'Synthetic description', date: '2030-01-01', location: 'Test venue' };

beforeAll(async () => {
  // Never consult an existing connection URI: only connect to this loopback process.
  database = await MongoMemoryServer.create({ binary: { version: '7.0.40', checkMD5: true }, instance: { ip: '127.0.0.1', dbName: 'happihub_integration' } });
  await mongoose.connect(database.getUri(), { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Event.init(), Comment.init()]);
}, 120000);
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Comment.deleteMany({})]);
  owner = await User.create({ name: 'Synthetic owner', email: 'owner@example.com', password });
  outsider = await User.create({ name: 'Synthetic outsider', email: 'outsider@example.com', password });
  token = (await login(owner.email)).body.token;
  outsiderToken = (await login(outsider.email)).body.token;
  expect(token).toEqual(expect.any(String)); expect(outsiderToken).toEqual(expect.any(String));
});
afterAll(async () => {
  try { await mongoose.disconnect(); } finally { if (database) await database.stop(); }
});

test('HTTP signup stores a hash and ordinary role; normal queries exclude password', async () => {
  const res = await request(app).post('/api/users/signup').send({ name: 'Synthetic new', email: 'new@example.com', password });
  expect(res.status).toBe(201);
  const stored = await User.findOne({ email: 'new@example.com' }).select('+password');
  expect(stored.password).not.toBe(password); expect(await stored.isValidPassword(password)).toBe(true); expect(stored.role).toBe('user');
  expect((await User.findById(stored._id)).password).toBeUndefined();
});
test('real login rejects incorrect password and profile response excludes hash', async () => {
  expect((await login(owner.email, 'incorrect-password')).status).toBe(401);
  const profile = await authenticated(request(app).get('/api/users/profile'));
  expect(profile.status).toBe(200); expect(profile.body.user.email).toBe(owner.email); expect(profile.body.user.password).toBeUndefined();
});
test('profile changes preserve password unless explicitly changed, then rehash it', async () => {
  expect((await authenticated(request(app).put('/api/users/profile')).send({ name: 'Updated owner' })).status).toBe(200);
  expect((await login(owner.email)).status).toBe(200);
  expect((await authenticated(request(app).put('/api/users/profile')).send({ password: 'New-synthetic-password' })).status).toBe(200);
  expect((await login(owner.email)).status).toBe(401);
  expect((await login(owner.email, 'New-synthetic-password')).status).toBe(200);
});
test('signup cannot create an administrator and unique email index is enforced', async () => {
  const res = await request(app).post('/api/users/signup').send({ name: 'Synthetic admin', email: 'admin@example.com', password, role: 'admin' });
  expect(res.status).toBe(400); expect(await User.countDocuments({ email: 'admin@example.com' })).toBe(0);
  await expect(User.create({ name: 'Duplicate', email: owner.email, password })).rejects.toMatchObject({ code: 11000 });
});
test('event creation assigns authenticated owner and remains pending', async () => {
  const res = await authenticated(request(app).post('/api/events')).send(eventData);
  expect(res.status).toBe(201); const stored = await Event.findById(res.body._id);
  expect(String(stored.creator)).toBe(String(owner._id)); expect(stored.status).toBe('pending');
  expect((await request(app).get(`/api/events/${stored._id}`)).status).toBe(404);
  expect((await authenticated(request(app).get(`/api/events/${stored._id}`))).status).toBe(200);
});
test('Mongo filters return only owned or approved public events', async () => {
  const documents = await Event.create([
    { ...eventData, title: 'Owned pending', creator: owner._id, isPrivate: true },
    { ...eventData, title: 'Other private', creator: outsider._id, isPrivate: true, status: 'approved' },
    { ...eventData, title: 'Other pending', creator: outsider._id },
    { ...eventData, title: 'Other public', creator: outsider._id, status: 'approved' },
  ]);
  const publicRes = await request(app).get('/api/events/public');
  expect(publicRes.body.map(x => x.title)).toEqual(['Other public']);
  const owned = await authenticated(request(app).get('/api/events'));
  expect(owned.body.map(x => x.title).sort()).toEqual(['Other public', 'Owned pending']);
  expect((await authenticated(request(app).get(`/api/events/${documents[1]._id}`))).status).toBe(404);
  expect(publicRes.body[0].attendees).toBeUndefined(); expect(publicRes.body[0].creator).toBeUndefined();
});
test('comment writes persist authenticated author and private reads deny outsiders', async () => {
  const event = await Event.create({ ...eventData, creator: owner._id, isPrivate: true });
  const created = await authenticated(request(app).post('/api/comments/add')).send({ content: 'Synthetic comment', event_id: String(event._id) });
  expect(created.status).toBe(201); expect(String((await Comment.findById(created.body._id)).user_id)).toBe(String(owner._id));
  const path = `/api/comments/events/${event._id}/comments`;
  expect((await request(app).get(path)).status).toBe(404);
  expect((await authenticated(request(app).get(path), outsiderToken)).status).toBe(404);
  const read = await authenticated(request(app).get(path)); expect(read.status).toBe(200); expect(read.body[0].content).toBe('Synthetic comment'); expect(read.body[0].user_id).toBeUndefined();
});
test('forged event and comment authors cannot write documents', async () => {
  expect((await authenticated(request(app).post('/api/events')).send({ ...eventData, creator: String(outsider._id) })).status).toBe(403);
  const event = await Event.create({ ...eventData, creator: owner._id });
  expect((await authenticated(request(app).post('/api/comments/add')).send({ content: 'Forged', event_id: String(event._id), user_id: String(outsider._id) })).status).toBe(403);
  expect(await Comment.countDocuments({})).toBe(0);
});
test('concurrent participation stores one account entry and denies private outsiders', async () => {
  const event = await Event.create({ ...eventData, creator: owner._id, status: 'approved' });
  const path = `/api/events/${event._id}`;
  const results = await Promise.all([authenticated(request(app).patch(path), outsiderToken).send({}), authenticated(request(app).patch(path), outsiderToken).send({})]);
  expect(results.map(x => x.status)).toEqual([200,200]);
  expect((await Event.findById(event._id)).attendees.map(String)).toEqual([String(outsider._id)]);
  await Event.updateOne({ _id: event._id }, { isPrivate: true });
  expect((await authenticated(request(app).patch(path), outsiderToken).send({})).status).toBe(404);
});
test('deleted accounts cannot continue using a signed token', async () => {
  await User.deleteOne({ _id: owner._id });
  expect((await authenticated(request(app).get('/api/users/profile'))).status).toBe(401);
});

test('readiness succeeds for an established database connection', async () => {
  const res = await request(app).get('/ready'); expect(res.status).toBe(200); expect(res.body).toEqual({ ready: true });
});
