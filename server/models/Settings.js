import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, 
  context: { type: String, required: true }, 
  isActive: { type: Boolean, default: true } 
});

export default mongoose.model('Settings', settingsSchema);