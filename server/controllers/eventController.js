import Joi from 'joi';
import { searchCommunes } from '../domain/communes.js';
import { cancellationReasonSchema, commune, EVENT_STATUSES, EVENT_TYPES, eventError } from '../domain/event.js';
import {
  AGENDA_MAX_PAGE, cancelEvent, createEvent, deleteEvent, editEvent, listEvents, listPublicCities, listPublicEvents, publishEvent, readEvent,
  readPublicEvent,
} from '../services/events.js';
import { handle } from './handle.js';

// Brick B endpoints (spec § 5). Field-level rules and the allow-list live in domain/event.js;
// this layer only shapes the request envelopes.

// Canonical lowercase/uppercase hex uuid only (Joi guid also accepts braces and urn prefixes).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const baseVersion = Joi.number().integer().min(1).required();
const confirm = Joi.valid(true).required();
const fieldMap = Joi.object().unknown(true);
const SCHEMAS = {
  create: fieldMap.required(),
  edit: Joi.object({ baseVersion, changes: fieldMap.min(1).required(), base: fieldMap.default({}) }),
  publish: Joi.object({ baseVersion }),
  cancel: Joi.object({ baseVersion, confirm,
    reason: cancellationReasonSchema.default(null) }),
  delete: Joi.object({ baseVersion, confirm }),
  list: Joi.object({ status: Joi.string().valid(...EVENT_STATUSES) }),
  communes: Joi.object({ q: Joi.string().trim().min(2).max(60).required() }),
  // public-agenda AC4/AC5: page capped at 50 so the agenda cannot be paged without bound.
  agenda: Joi.object({ page: Joi.number().integer().min(1).max(AGENDA_MAX_PAGE).default(1),
    type: Joi.string().valid(...EVENT_TYPES).default(null), city: commune.default(null) }),
};

const envelope = (schema, input) => {
  const { error, value } = schema.validate(input ?? {});
  if (error) throw eventError(400, 'INVALID_REQUEST', 'Invalid request', { field: error.details[0].path.join('.') });
  return value;
};

/** A malformed id is answered like an unknown one (BC12, BC19). */
const eventId = (req) => {
  if (!UUID.test(req.params.id)) throw eventError(404, 'EVENT_NOT_FOUND', 'Event not found');
  return req.params.id;
};

const ctxOf = (req) => req.app.locals.ctx;

/** UC15: 201 with the new draft. */
export const createEventHandler = handle(async (req, res) =>
  res.status(201).json(await createEvent(ctxOf(req), req.account.id, req.association, envelope(SCHEMAS.create, req.body))));

/** UC16 step 1: member list, optional `?status=` filter. */
export const listEventsHandler = handle(async (req, res) => {
  const { status } = envelope(SCHEMAS.list, req.query);
  return res.json({ events: await listEvents(ctxOf(req), req.association, status) });
});

/** UC16: editor view with `version` for the next save. */
export const readEventHandler = handle(async (req, res) =>
  res.json(await readEvent(ctxOf(req), req.association, eventId(req))));

/** UC16/UC17: `{baseVersion, changes, base?}` merged under lock. */
export const editEventHandler = handle(async (req, res) => {
  const id = eventId(req);
  return res.json(await editEvent(ctxOf(req), req.account.id, req.association, id, envelope(SCHEMAS.edit, req.body)));
});

/** UC18: `{baseVersion}`; guard failures answer 422. */
export const publishEventHandler = handle(async (req, res) => {
  const id = eventId(req);
  const body = envelope(SCHEMAS.publish, req.body);
  return res.json(await publishEvent(ctxOf(req), req.account.id, req.association, id, body.baseVersion));
});

/** UC19: `confirm: true` so a single misfired request cannot cancel. */
export const cancelEventHandler = handle(async (req, res) => {
  const id = eventId(req);
  return res.json(await cancelEvent(ctxOf(req), req.account.id, req.association, id, envelope(SCHEMAS.cancel, req.body)));
});

/** UC20: drafts only, with `confirm: true` and the current version. */
export const deleteEventHandler = handle(async (req, res) => {
  const id = eventId(req);
  const body = envelope(SCHEMAS.delete, req.body);
  await deleteEvent(ctxOf(req), req.account.id, req.association, id, body.baseVersion);
  return res.status(204).end();
});

/** Public read without a session; every hidden case is the same 404. */
export const readPublicEventHandler = handle(async (req, res) => res.json(await readPublicEvent(ctxOf(req), eventId(req))));

/** UC21 public agenda, no session (public-agenda § 4). */
export const listPublicEventsHandler = handle(async (req, res) =>
  res.json(await listPublicEvents(ctxOf(req), envelope(SCHEMAS.agenda, req.query))));

/** UC21a: cities that have agenda events, no session. */
export const listPublicCitiesHandler = handle(async (req, res) => res.json(await listPublicCities(ctxOf(req))));

/** A-B5: city picker reference search, no session (public reference data). */
export const searchCommunesHandler = handle(async (req, res) =>
  res.json({ communes: searchCommunes(envelope(SCHEMAS.communes, req.query).q) }));
