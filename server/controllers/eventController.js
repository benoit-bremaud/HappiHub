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
  
