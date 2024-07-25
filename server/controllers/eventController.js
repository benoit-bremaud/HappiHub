import Event from '../models/eventModel.js';
import User from '../models/userModel.js';
import { eventValidation } from '../validation/eventValidation.js';

export const createEvent = async (req, res) => {
    // Validate the event data
    const { error } = eventValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Create a new event
    const newEvent = new Event({
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        location: req.body.location,
        isPrivate: req.body.isPrivate,
        image: req.body.image,
        creator: req.body.creator, // req.user._id
    });

    try {
        const savedEvent = await newEvent.save();
        // Send the event data in the response
        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get all events (admin only)
export const getEvents = async (_req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all public events
export const getPublicEvents = async (_req, res) => {
    try {
        const events = await Event.find({ isPrivate: false });
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a single event by ID
export const getEventsId = async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json(event);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
};

// Patch a user id into event attendees array
export const addAttendee = async (req, res) => {
    try {
        // check if the event exists
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // check if the user exists
        const user = await User.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // check if the user is already an attendee
        if (event.attendees.includes(req.body.userId)) {
            return res.status(400).json({ message: 'User already an attendee' });
        }
        // add the user id to the attendees array
        event.attendees.push(req.body.userId);

        // add the event id to the user's events array
        user.events.push(req.params.id);

        // check if the event.attendess.push has been successful
        if (event.attendees.includes(req.body.userId) && user.events.includes(req.params.id)) {
            await event.save();
            await user.save();
            res.status(200).json({ message: 'User added to event successfully' });
        } else {
            res.status(500).json({ message: 'Failed to add user to event' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Patch a user id out of event attendees array
export const removeAttendee = async (req, res) => {
    try {
        // check if the event exists
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // check if the user exists
        const user = await User.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // check if the user is already out of attendees
        if (!event.attendees.includes(req.body.userId)) {
            return res.status(400).json({ message: 'User already out of attendees' });
        }
        // remove the user id from the attendees array
        event.attendees.pull(req.body.userId);

        // remove the event id from the user's events array
        user.events.pull(req.params.id);

        // check if the event.attendess.pull has been successful
        if (!event.attendees.includes(req.body.userId) && !user.events.includes(req.params.id)) {
            await event.save();
            await user.save();
            res.status(200).json({ message: 'User removed from event' });
        } else {
            res.status(500).json({ message: 'Failed to remove user from event' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}