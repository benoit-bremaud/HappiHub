import { commentValidation } from '../validation/commentValidation.js';
import Comment from '../models/commentModel.js';
import Event from '../models/eventModel.js';
import { isValidEventId } from '../validation/eventValidation.js';
import { canReadEvent } from '../utils/access.js';

/** Create content under authenticated authorship only when the associated event is readable. Returns a projection without author information. */
export const createComment = async (req, res) => {
  if (req.body.user_id && req.body.user_id !== req.user._id) return res.status(403).json({ message: 'Invalid author' });
  const { error, value } = commentValidation(req.body);
  if (error) return res.status(400).json({ message: 'Invalid comment data' });
  try {
    const event = await Event.findById(value.event_id);
    if (!canReadEvent(event, req.user)) return res.status(404).json({ message: 'Event not found' });
    const comment = await new Comment({ content: value.content, event_id: value.event_id, user_id: req.user._id }).save();
    return res.status(201).json({ _id: comment._id, content: comment.content, event_id: comment.event_id });
  } catch {
    return res.status(500).json({ message: 'Unable to create comment' });
  }
};

/** Read comments only after checking event visibility; returns content/timestamps without author information. */
export const getEventComments = async (req, res) => {
  if (!isValidEventId(req.params.event_id)) return res.status(400).json({ message: 'Invalid event ID' });
  try {
    const event = await Event.findById(req.params.event_id);
    if (!canReadEvent(event, req.user)) return res.status(404).json({ message: 'Event not found' });
    const comments = await Comment.find({ event_id: req.params.event_id }).select('_id content createdAt updatedAt');
    return res.json(comments);
  } catch {
    return res.status(500).json({ message: 'Unable to retrieve comments' });
  }
};
