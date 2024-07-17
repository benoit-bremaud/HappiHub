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
        // Send the event data in the response
        res.status(201).json(savedEvent);
        // res.status(201).json({ message: 'Event created successfully', event_id: savedEvent._id });
    } catch (error) {
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
