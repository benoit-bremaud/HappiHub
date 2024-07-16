import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    // event_id: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, auto: true },
    title: { type: String, required: true, unique: true},
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    image: { type: String, required: false },
    isPrivate: { type: Boolean, required: true, default: false },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
} , { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

export default Event;