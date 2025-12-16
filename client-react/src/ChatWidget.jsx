import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import './widget.css'; 

// const API_URL = "https://aircloud-bot-api.onrender.com/api/chat"; // Render URL
const API_URI = "http://localhost:5000/api/chat";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef(null);

  // 1. Generate Session ID on mount
  useEffect(() => {
    let storedId = sessionStorage.getItem("aircloud_session");
    if (!storedId) {
      storedId = Math.random().toString(36).substring(7);
      sessionStorage.setItem("aircloud_session", storedId);
    }
    setSessionId(storedId);
    
    // Add initial greeting
    setMessages([{ sender: 'bot', text: "Hi! I'm the AirCloud Assistant. How can I help you today?" }]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const response = await fetch(API_URI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId })
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I'm having trouble connecting." }]);
    }
  };

  return (
    <div className="aircloud-widget-container">
      {/* 1. The Toggle Button */}
      <button 
        className={`aircloud-toggle ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle size={28} />
      </button>

      {/* 2. The Chat Window */}
      {isOpen && (
        <div className="aircloud-window">
          <div className="aircloud-header">
            <h3>AirCloud Support</h3>
            <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>
          
          <div className="aircloud-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="aircloud-input-area">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}