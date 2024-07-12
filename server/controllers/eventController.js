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