import { useCallback, useEffect, useReducer, useRef } from 'react';
import { send } from '../accounts/request';
import { describeFailure, emptyValues, fieldProblem, fromServer } from './eventFields';

export const AUTOSAVE_DELAY_MS = 1500;
const READ_ONLY = new Set(['CANCELLED', 'ARCHIVED']);
/** Statuses in which the queue waits for the member instead of saving (conflict choice, sign-in, …). */
const HELD = new Set(['readOnly', 'conflict', 'unauthenticated', 'notFound', 'loading']);
const NETWORK = 'Not saved. Your input is kept in the page.';
const EXPIRED = 'Your session has expired. Sign in again; your input is kept.';
const RELOAD_CODES = new Set(['STALE_VERSION', 'INVALID_TRANSITION', 'EVENT_ENDED', 'ASSOCIATION_CLOSED', 'EVENT_READ_ONLY']);
const DONE = { publish: 'Published. It can be edited or cancelled at any time.', cancel: 'Event cancelled.' };

const clockTime = (seconds) =>
  new Date(Date.now() + seconds * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * Event editor state (client spec § 3–4, diagram 05-state-editor). The working copy lives in a
 * ref so the save queue never reads stale values: one request in flight, changes made meanwhile
 * are sent by the next save, and `base` keeps the server value of each field changed since the
 * last successful save so the server can merge (02a). Callbacks are read from a ref too, so the
 * autosave timer always runs the latest ones.
 *
 * `onCreated(id)` is called after the first save creates the draft; `refreshSession()` renews the
 * CSRF token after a 403. Returns the view state (`status`, `event`, `values`, `problem`,
 * `conflict`, `message`, `pending`) and the actions `change`, `save`, `saveNow`, `resolve`,
 * `reload` and `lifecycle(action, payload)`, which resolves to `{ok, failures?, notice?}`.
 */
export const useEventEditor = ({ slug, id, onCreated, refreshSession }) => {
  const [, render] = useReducer((tick) => tick + 1, 0);
  const store = useRef(null);
  if (!store.current) store.current = {
    status: id ? 'loading' : 'idle', event: null, values: emptyValues(), base: {}, dirty: new Set(),
    inFlight: false, conflict: null, problem: null, message: null, timer: null,
  };
  const latest = useRef({});
  latest.current = { slug, onCreated, refreshSession };
  const s = store.current;
  const set = (changes) => { Object.assign(store.current, changes); render(); };
  const path = (eventId, action = '') =>
    `/associations/${encodeURIComponent(latest.current.slug)}/events/${encodeURIComponent(eventId)}${action}`;

  /** Adopt a server copy; fields still being edited keep the user's value. */
  const adopt = (event, extra = {}) => {
    const server = fromServer(event);
    for (const field of s.dirty) server[field] = s.values[field];
    let status = s.dirty.size ? 'dirty' : 'saved';
    if (READ_ONLY.has(event.status)) status = 'readOnly';
    set({ event, values: server, status, ...extra });
  };

  const load = async (eventId = s.event?.id ?? id) => {
    const { ok, status, data } = await send(path(eventId));
    if (!ok) return set({ status: status === 404 ? 'notFound' : 'failed', message: data.message ?? NETWORK });
    s.dirty.clear(); s.base = {};
    return adopt(data, { conflict: null, problem: null });
  };

  /** Map a refused write to the editor state (spec § 4 table). */
  const refuse = async ({ status, data, retryAfter }) => {
    const { code, details } = data;
    if (status === 401) return set({ status: 'unauthenticated', message: EXPIRED });
    if (status === 404) return set({ status: 'notFound', message: data.message });
    if (code === 'EDIT_CONFLICT') return set({ status: 'conflict', conflict: details });
    if (code === 'EVENT_READ_ONLY') return load().then(() => set({ message: 'This event is cancelled or archived and can no longer be edited.' }));
    if (['INVALID_FIELD', 'UNKNOWN_FIELD', 'INVALID_REQUEST'].includes(code) && details?.field)
      return set({ status: 'failed', problem: { field: details.field, text: data.message } });
    if (code === 'PUBLISHED_FIELD_REQUIRED')
      return set({ status: 'failed', problem: { field: details.fields[0], text: 'Required while the event is published.' } });
    if (status === 403) await latest.current.refreshSession?.();
    if (status === 429) return set({ status: 'failed', message: code === 'EVENT_QUOTA'
      ? `${data.message} Creation is possible again at ${clockTime(retryAfter ?? 0)}.`
      : `Too many requests. Wait ${retryAfter ?? 60} seconds, then retry.` });
    return set({ status: 'failed', message: status === 0 ? data.message : NETWORK });
  };

  const save = async () => {
    clearTimeout(s.timer);
    if (s.inFlight || !s.dirty.size || HELD.has(s.status)) return;
    const invalid = [...s.dirty].find((field) => fieldProblem(field, s.values));
    if (invalid) return set({ status: 'dirty', problem: { field: invalid, text: fieldProblem(invalid, s.values) } });
    // UC15 4: the draft is created by the first save that has a title and a type.
    if (!s.event && (!s.values.title || !s.values.type)) return set({ status: 'dirty' });
    const sent = Object.fromEntries([...s.dirty].map((field) => [field, s.values[field]]));
    set({ inFlight: true, status: 'saving', problem: null, message: null });
    const response = s.event
      ? await send(path(s.event.id), 'PATCH', { baseVersion: s.event.version, changes: sent,
        base: Object.fromEntries(Object.keys(sent).map((field) => [field, s.base[field] ?? null])) })
      : await send(`/associations/${encodeURIComponent(latest.current.slug)}/events`, 'POST', sent);
    s.inFlight = false;
    if (!response.ok) return refuse(response);
    for (const [field, value] of Object.entries(sent)) {
      if (s.values[field] === value) { s.dirty.delete(field); delete s.base[field]; } else s.base[field] = value;
    }
    const created = !s.event;
    adopt(response.data);
    if (created) latest.current.onCreated?.(response.data.id);
    if (s.dirty.size) save();
  };
  s.save = save;

  const stableLoad = useCallback((eventId) => store.current.load(eventId), []);
  s.load = load;
  // After the first save the route gains the new id: the editor already holds that event.
  useEffect(() => { if (id && id !== store.current.event?.id) stableLoad(id); }, [id, stableLoad]);
  // Leaving the page within the autosave pause still sends the pending changes.
  useEffect(() => () => { clearTimeout(store.current.timer); store.current.save(); }, []);

  /** A field edit: remember its server value once, then autosave after a pause (decision AS-A). */
  const change = (field, value) => {
    if (s.status === 'readOnly') return;
    const updates = { [field]: value };
    // A price other than a fixed amount carries no amount (API rule).
    if (field === 'priceKind' && value !== 'AMOUNT' && s.values.priceAmountCents !== null) updates.priceAmountCents = null;
    for (const key of Object.keys(updates)) {
      if (!s.dirty.has(key) && !(key in s.base)) s.base[key] = (s.event ? fromServer(s.event) : emptyValues())[key];
      s.dirty.add(key);
    }
    s.values = { ...s.values, ...updates };
    clearTimeout(s.timer);
    s.timer = setTimeout(() => store.current.save(), AUTOSAVE_DELAY_MS);
    const held = ['saving', 'conflict', 'unauthenticated'].includes(s.status);
    set({ status: held ? s.status : 'dirty', problem: null, message: held ? s.message : null });
  };

  /** UC17: per field, keep "yours" (resent against the current version) or take "theirs". */
  const resolve = (choices) => {
    const { conflicts, version } = s.conflict;
    for (const { field, theirs } of conflicts) {
      s.base[field] = theirs;
      if (choices[field] === 'theirs') { s.values = { ...s.values, [field]: theirs }; s.dirty.delete(field); delete s.base[field]; }
    }
    s.event = { ...s.event, version };
    set({ conflict: null, status: s.dirty.size ? 'dirty' : 'saved' });
    return s.dirty.size ? save() : load();
  };

  /** After an in-place sign-in the member saves explicitly (UC15 *b: no automatic retry). */
  const saveNow = () => {
    if (!s.dirty.size) return set({ status: 'saved', message: 'Signed in again. Repeat your last action.' });
    set({ status: 'dirty', message: null });
    return save();
  };

  /** Publish, cancel or delete with the loaded version, mapped for the preview step (spec § 4). */
  const lifecycle = async (action, payload = {}) => {
    const response = await send(path(s.event.id, `/${action}`), 'POST', { baseVersion: s.event.version, ...payload });
    if (response.ok) {
      if (action !== 'delete') adopt(response.data, { message: DONE[action] });
      return { ok: true };
    }
    const { status, data } = response;
    if (status === 401) { set({ status: 'unauthenticated', message: EXPIRED }); return { ok: false }; }
    if (status === 422 && data.details?.failures) return { ok: false, failures: data.details.failures.map(describeFailure) };
    if (status === 403) await latest.current.refreshSession?.();
    if (RELOAD_CODES.has(data.code)) await load();
    return { ok: false, notice: data.code === 'STALE_VERSION' ? 'The event changed meanwhile. Check it and confirm again.' : data.message ?? 'Action failed.' };
  };

  // Changes still to send, excluding a refused value that waits for the member's correction.
  const pending = s.inFlight || (s.dirty.size > 0 && !s.problem && !HELD.has(s.status));
  return {
    status: s.status, event: s.event, values: s.values, conflict: s.conflict, problem: s.problem, message: s.message,
    pending, change, save, saveNow, resolve, lifecycle, reload: load,
  };
};
