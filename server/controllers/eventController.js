import { publicEventFilter, readableEventFilter } from '../queries/eventAccess.js';
import Event from '../models/eventModel.js';
import { eventValidation, isValidEventId } from '../validation/eventValidation.js';
import { canReadEvent, eventSummary } from '../utils/access.js';

/** Persist a pending event owned by the authenticated account; never accepts another creator. Returns a projected event without relationship IDs. */
export const createEvent = async (req, res) => {
  if (req.body.creator && req.body.creator !== req.user._id) return res.status(403).json({ message: 'Invalid author' });
  const { error, value } = eventValidation({ ...req.body, creator: req.user._id });
  if (error) return res.status(400).json({ message: 'Invalid event data' });
  try {
    const event = await new Event({ title: value.title, description: value.description, date: value.date,
      location: value.location, image: value.image, isPrivate: value.isPrivate, creator: req.user._id }).save();
    return res.status(201).json(eventSummary(event));
  } catch {
    return res.status(500).json({ message: 'Unable to create event' });
  }
};

/** List owned events and approved public events; exclude relationship identifiers from responses. */
export const getEvents = async (req, res) => {
  try {
    const events = await Event.find(readableEventFilter(req.user._id));
    return res.json(events.map(eventSummary));
  } catch {
    return res.status(500).json({ message: 'Unable to retrieve events' });
  }
};

/** List approved non-private events anonymously; no implicit approval or migration. */
export const getPublicEvents = async (_req, res) => {
  try {
    const events = await Event.find(publicEventFilter());
    return res.json(events.map(eventSummary));
  } catch {
    return res.status(500).json({ message: 'Unable to retrieve events' });
  }
};

/** Read a permitted event by hexadecimal ID; missing and forbidden resources share a 404 response. */
export const getEventsId = async (req, res) => {
  if (!isValidEventId(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
  try {
    const event = await Event.findById(req.params.id);
    if (!canReadEvent(event, req.user)) return res.status(404).json({ message: 'Event not found' });
    return res.json(eventSummary(event));
  } catch {
    return res.status(500).json({ message: 'Unable to retrieve event' });
  }
};

/** Join the authenticated account to a readable event atomically and idempotently; does not edit event content. */
export const addAttendee = async (req, res) => {
  if (!isValidEventId(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
  if (req.body.userId && req.body.userId !== req.user._id) return res.status(403).json({ message: 'Invalid attendee' });
  try {
    const event = await Event.findOneAndUpdate({ _id: req.params.id, ...readableEventFilter(req.user._id) }, { $addToSet: { attendees: req.user._id } }, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.json({ message: 'Participation saved' });
  } catch {
    return res.status(500).json({ message: 'Unable to save participation' });
  }
};
