// client-react/src/App.jsx
import React, { useState } from 'react';
import ChatWidget from './ChatWidget';
import AdminPanel from './AdminPanel';
import './App.css';

function App() {
  const [view, setView] = useState('home'); // 'home' or 'admin'

  return (
    <div className="app-container" style={{ padding: '20px' }}>
      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <button 
          onClick={() => setView('home')}
          style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}
        >
          Store Home (Chat)
        </button>
        <button 
          onClick={() => setView('admin')}
          style={{ padding: '8px 16px', cursor: 'pointer', background: '#333', color: '#fff' }}
        >
          Admin Panel
        </button>
      </nav>

      {view === 'home' ? (
        <div className="home-view">
          <h1>Welcome to AirCloud Store</h1>
          <p>Browse our products or ask our AI assistant for help!</p>
          <ChatWidget /> 
        </div>
      ) : (
        <AdminPanel />
      )}
    </div>
  );
}

export default App;