import Joi from 'joi';
import { eventError } from '../domain/event.js';
import {
  cancelEvent, createEvent, deleteEvent, editEvent, listEvents, publishEvent, readEvent, readPublicEvent,
} from '../services/events.js';
import { handle } from './handle.js';

// Brick B endpoints (spec § 5). Field-level rules and the allow-list live in domain/event.js;
// this layer only shapes the request envelopes.

const STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'];
const baseVersion = Joi.number().integer().min(1).required();
const confirm = Joi.valid(true).required();
const fieldMap = Joi.object().unknown(true);
const SCHEMAS = {
  create: fieldMap.required(),
  edit: Joi.object({ baseVersion, changes: fieldMap.min(1).required(), base: fieldMap.default({}) }),
  publish: Joi.object({ baseVersion }),
  cancel: Joi.object({ baseVersion, confirm,
    reason: Joi.string().trim().max(500).pattern(/^\P{Cc}*$/u).allow(null).empty('').default(null) }),
  delete: Joi.object({ baseVersion, confirm }),
  list: Joi.object({ status: Joi.string().valid(...STATUSES) }),
};

const envelope = (schema, input) => {
  const { error, value } = schema.validate(input ?? {});
  if (error) throw eventError(400, 'INVALID_REQUEST', 'Invalid request', { field: error.details[0].path.join('.') });
  return value;
};

/** A malformed id is answered like an unknown one (BC12, BC19). */
const eventId = (req) => {
  if (Joi.string().guid().validate(req.params.id).error) throw eventError(404, 'EVENT_NOT_FOUND', 'Event not found');
  return req.params.id;
};

const ctxOf = (req) => req.app.locals.ctx;

export const createEventHandler = handle(async (req, res) =>
  res.status(201).json(await createEvent(ctxOf(req), req.account.id, req.association, envelope(SCHEMAS.create, req.body))));

export const listEventsHandler = handle(async (req, res) => {
  const { status } = envelope(SCHEMAS.list, req.query);
  return res.json({ events: await listEvents(ctxOf(req), req.association, status) });
});

export const readEventHandler = handle(async (req, res) =>
  res.json(await readEvent(ctxOf(req), req.association, eventId(req))));

export const editEventHandler = handle(async (req, res) => {
  const id = eventId(req);
  return res.json(await editEvent(ctxOf(req), req.account.id, req.association, id, envelope(SCHEMAS.edit, req.body)));
});

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

export const readPublicEventHandler = handle(async (req, res) => res.json(await readPublicEvent(ctxOf(req), eventId(req))));
