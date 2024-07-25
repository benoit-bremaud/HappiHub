import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true},
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  image: { type: String },
  isPrivate: { type: Boolean, default: false },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'},
  // likes: { type: Number, default: 0 },
  // dislikes: { type: Number, default: 0 },
  // reports: { type: Number, default: 0 },
}, 
{ 
  timestamps: true
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
