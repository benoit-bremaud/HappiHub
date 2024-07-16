import Event from '../models/eventModel.js';
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
    });

    try {
        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};


// Get all events
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

// Get event by event id
export const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.event_id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Get event by user id

// Get event by event id and user id

// Update event by id

// Delete event by id
