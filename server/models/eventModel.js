import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true},
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  image: { type: String, required: false },
  isPrivate: { type: Boolean, required: false, default: false },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
