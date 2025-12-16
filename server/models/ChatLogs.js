import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true, 
        index: true 
    },
    userMessage: { 
        type: String, 
        required: true 
    },
    botReply: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

const ChatLog = mongoose.model('ChatLog', chatSchema);
export default ChatLog;