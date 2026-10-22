import { useCallback, useEffect, useReducer, useRef } from 'react';
import { send } from '../accounts/request';
import { emptyValues, fieldProblem, fromServer } from './eventFields';

export const AUTOSAVE_DELAY_MS = 1500;
const READ_ONLY = new Set(['CANCELLED', 'ARCHIVED']);
const NETWORK = 'Not saved. Your input is kept in the page.';

/**
 * Event editor state (client spec § 3–4, diagram 05-state-editor). The working copy lives in a
 * ref so the save queue never reads stale values: one request in flight, changes made meanwhile
 * are sent by the next save, and `base` keeps the server value of each field changed since the
 * last successful save so the server can merge (02a).
 */
export const useEventEditor = ({ slug, id, onCreated, refreshSession }) => {
  const [, render] = useReducer((tick) => tick + 1, 0);
  const store = useRef(null);
  if (!store.current) store.current = {
    status: id ? 'loading' : 'idle', event: null, values: emptyValues(), base: {}, dirty: new Set(),
    inFlight: false, conflict: null, problem: null, message: null, timer: null,
  };
  const path = (eventId, action = '') => `/associations/${slug}/events/${eventId}${action}`;
  const set = (changes) => { Object.assign(store.current, changes); render(); };

  /** Adopt a server copy; fields still being edited keep the user's value. */
  const adopt = useCallback((event) => {
    const { values, dirty } = store.current;
    const server = fromServer(event);
    for (const field of dirty) server[field] = values[field];
    set({ event, values: server, status: READ_ONLY.has(event.status) ? 'readOnly' : dirty.size ? 'dirty' : 'saved' });
    // set is stable in behavior (writes the ref and re-renders); listing it would recreate adopt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (eventId = store.current.event?.id ?? id) => {
    const { ok, status, data } = await send(path(eventId));
    if (ok) { store.current.dirty.clear(); store.current.base = {}; set({ conflict: null, problem: null }); adopt(data); }
    else set({ status: status === 404 ? 'notFound' : 'failed', message: data.message ?? NETWORK });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, id, adopt]);

  // After the first save the route gains the new id: the editor already holds that event.
  useEffect(() => { if (id && id !== store.current.event?.id) load(id); }, [id, load]);
  useEffect(() => () => clearTimeout(store.current.timer), []);

  /** Map a refused write to the editor state (spec § 4 table). */
  const refuse = async ({ status, data, retryAfter }) => {
    const code = data.code;
    if (status === 401) return set({ status: 'unauthenticated', message: 'Your session has expired. Sign in again; your input is kept.' });
    if (status === 404) return set({ status: 'notFound', message: data.message });
    if (code === 'EDIT_CONFLICT') return set({ status: 'conflict', conflict: data.details });
    if (code === 'EVENT_READ_ONLY') { await load(); return set({ message: 'This event is cancelled or archived and can no longer be edited.' }); }
    if (['INVALID_FIELD', 'UNKNOWN_FIELD', 'INVALID_REQUEST'].includes(code) && data.details?.field)
      return set({ status: 'failed', problem: { field: data.details.field, text: data.message } });
    if (code === 'PUBLISHED_FIELD_REQUIRED')
      return set({ status: 'failed', problem: { field: data.details.fields[0], text: 'Required while the event is published.' } });
    if (status === 403) await refreshSession?.();
    if (status === 429) return set({ status: 'failed', message: code === 'EVENT_QUOTA'
      ? `Your association created 20 events in 24 hours. Creation is possible again at ${
        new Date(Date.now() + retryAfter * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`
      : `Too many requests. Wait ${retryAfter ?? 60} seconds, then retry.` });
    return set({ status: 'failed', message: status === 0 ? data.message : NETWORK });
  };

  const save = useCallback(async () => {
    const s = store.current;
    clearTimeout(s.timer);
    if (s.inFlight || !s.dirty.size || ['readOnly', 'conflict', 'unauthenticated', 'notFound', 'loading'].includes(s.status)) return;
    const invalid = [...s.dirty].find((field) => fieldProblem(field, s.values));
    if (invalid) return set({ status: 'dirty', problem: { field: invalid, text: fieldProblem(invalid, s.values) } });
    // UC15 4: the draft is created on the first save that has a title and a type.
    if (!s.event && (!s.values.title || !s.values.type))
      return set({ status: 'dirty', message: 'Enter a title and pick a type to save the draft.' });
    const sent = Object.fromEntries([...s.dirty].map((field) => [field, s.values[field]]));
    set({ inFlight: true, status: 'saving', problem: null, message: null });
    const response = s.event
      ? await send(path(s.event.id), 'PATCH', { baseVersion: s.event.version, changes: sent,
        base: Object.fromEntries(Object.keys(sent).map((field) => [field, s.base[field] ?? null])) })
      : await send(`/associations/${slug}/events`, 'POST', sent);
    s.inFlight = false;
    if (!response.ok) return refuse(response);
    for (const [field, value] of Object.entries(sent)) {
      if (s.values[field] === value) { s.dirty.delete(field); delete s.base[field]; } else s.base[field] = value;
    }
    const created = !s.event;
    adopt(response.data);
    if (created) onCreated?.(response.data.id);
    if (s.dirty.size) save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, adopt, onCreated]);

  /** A field edit: remember its server value once, then autosave after a pause (decision AS-A). */
  const change = (field, value) => {
    const s = store.current;
    if (s.status === 'readOnly') return;
    if (!s.dirty.has(field) && !(field in s.base)) s.base[field] = s.event ? fromServer(s.event)[field] : null;
    s.values = { ...s.values, [field]: value };
    s.dirty.add(field);
    clearTimeout(s.timer);
    s.timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    const held = ['saving', 'conflict', 'unauthenticated'].includes(s.status);
    set({ status: held ? s.status : 'dirty', problem: null, message: held ? s.message : null });
  };

  /** UC17: per field, keep "yours" (resent against the current version) or take "theirs". */
  const resolve = (choices) => {
    const s = store.current;
    const { conflicts, version } = s.conflict;
    for (const { field, theirs } of conflicts) {
      s.base[field] = theirs;
      if (choices[field] === 'theirs') { s.values = { ...s.values, [field]: theirs }; s.dirty.delete(field); delete s.base[field]; }
    }
    s.event = { ...s.event, version };
    set({ conflict: null, status: s.dirty.size ? 'dirty' : 'saved' });
    if (s.dirty.size) save(); else load();
  };

  /** After an in-place sign-in the member saves explicitly (UC15 *b: no automatic retry). */
  const saveNow = () => { set({ status: 'dirty', message: null }); return save(); };

  /** Publish, cancel or delete with the loaded version; resolves to the server answer. */
  const lifecycle = async (action, payload = {}) => {
    const s = store.current;
    const response = await send(path(s.event.id, `/${action}`), 'POST', { baseVersion: s.event.version, ...payload });
    if (response.ok) { if (action !== 'delete') adopt(response.data); return response; }
    const { code } = response.data;
    if (['STALE_VERSION', 'INVALID_TRANSITION', 'EVENT_ENDED', 'ASSOCIATION_CLOSED', 'EVENT_READ_ONLY'].includes(code)) await load();
    if (response.status === 401) set({ status: 'unauthenticated', message: 'Your session has expired. Sign in again.' });
    if (response.status === 403) await refreshSession?.();
    return response;
  };

  const s = store.current;
  return {
    status: s.status, event: s.event, values: s.values, conflict: s.conflict, problem: s.problem, message: s.message,
    pending: s.dirty.size > 0 || s.inFlight, change, save, saveNow, resolve, lifecycle, reload: load,
  };
};
