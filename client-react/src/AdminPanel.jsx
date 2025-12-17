import React, { useState, useEffect } from 'react';
import './App.css'; 

const API_BASE = "http://localhost:5000/api";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'logs', 'settings'
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Settings State
  const [settings, setSettings] = useState({ context: '', isActive: true });
  
  // Logs State
  const [selectedSession, setSelectedSession] = useState(null);
  const [groupedLogs, setGroupedLogs] = useState({});
  const [searchTerm, setSearchTerm] = useState(""); 

  const [formData, setFormData] = useState({ name: '', price: '', description: '' });
  const [status, setStatus] = useState('');

  // Fetch Data based on tab
  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  // Group and Filter Logs
  useEffect(() => {
    if (logs.length > 0) {
      const groups = {};
      logs.forEach(log => {
        // FILTER: Check if session ID matches search term
        if (searchTerm && !log.sessionId.toLowerCase().includes(searchTerm.toLowerCase())) {
          return; 
        }

        if (!groups[log.sessionId]) {
          groups[log.sessionId] = [];
        }
        groups[log.sessionId].push(log);
      });
      setGroupedLogs(groups);
    } else {
        setGroupedLogs({});
    }
  }, [logs, searchTerm]);

  // --- API CALLS ---
  const fetchProducts = async () => {
    const res = await fetch(`${API_BASE}/products`);
    setProducts(await res.json());
  };

  const fetchLogs = async () => {
    const res = await fetch(`${API_BASE}/logs`);
    setLogs(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch(`${API_BASE}/settings`);
    setSettings(await res.json());
  };

  const saveSettings = async () => {
    setStatus('Saving settings...');
    await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    setStatus('Settings saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const deleteSession = async (sessionId) => {
    if(!window.confirm("Are you sure you want to delete this session data permanently?")) return;
    
    await fetch(`${API_BASE}/logs/${sessionId}`, { method: 'DELETE' });
    setSelectedSession(null);
    fetchLogs(); // Refresh
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setStatus('Product added!');
      setFormData({ name: '', price: '', description: '' });
      fetchProducts();
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Store Admin Panel</h2>
        <div className="admin-tabs">
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
            Products
          </button>
          <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>
            Chat Logs
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            Bot Settings
          </button>
        </div>
      </div>

      {/* === 1. PRODUCTS VIEW === */}
      {activeTab === 'products' && (
        <div className="products-view">
          <div className="admin-card form-section">
            <h3>Add New Product</h3>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <input type="text" placeholder="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <input type="number" placeholder="Price" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="form-group">
                <textarea placeholder="Description" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button type="submit" className="save-btn">Save Product</button>
              {status && <span className="status-msg">{status}</span>}
            </form>
          </div>
          <div className="admin-card">
            <h3>Inventory ({products.length})</h3>
            <div className="product-list">
              {products.map(p => (
                <div key={p._id} className="item-card">
                   <h4>{p.name} <span className="price">${p.price}</span></h4>
                   <p>{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === 2. CHAT LOGS VIEW === */}
      {activeTab === 'logs' && (
        <div className="logs-view-container">
          <div className="logs-sidebar">
            <h3>
                Sessions
                {/* SEARCH FILTER */}
                <input 
                    type="text" 
                    placeholder="Search ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{width: '90%', marginTop: '10px', padding: '5px', fontSize:'12px'}}
                />
            </h3>
            <div className="session-list">
              {Object.keys(groupedLogs).map(sessionId => (
                <div 
                  key={sessionId} 
                  className={`session-item ${selectedSession === sessionId ? 'active' : ''}`}
                  onClick={() => setSelectedSession(sessionId)}
                >
                  <strong>{sessionId}</strong>
                  <span>{groupedLogs[sessionId].length} msgs</span>
                </div>
              ))}
            </div>
          </div>

          <div className="logs-main">
            {selectedSession ? (
              <>
                <div className="chat-toolbar" style={{padding: '10px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3>Session: {selectedSession}</h3>
                    {/* GDPR DELETE BUTTON */}
                    <button 
                        onClick={() => deleteSession(selectedSession)}
                        style={{background:'#dc3545', color:'white', padding:'5px 10px', borderRadius:'4px', fontSize:'12px'}}
                    >
                        Delete Data
                    </button>
                </div>
                <div className="chat-history-window">
                  {[...groupedLogs[selectedSession]].reverse().map((log, idx) => (
                    <div key={idx} className="history-pair">
                      <div className="msg-bubble user"><span className="label">User</span>{log.userMessage}</div>
                      <div className="msg-bubble bot"><span className="label">AI</span>{log.botReply}</div>
                      <div className="timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="empty-state">Select a session to view history</div>}
          </div>
        </div>
      )}

      {/* === 3. SETTINGS VIEW (NEW) === */}
      {activeTab === 'settings' && (
        <div className="admin-card">
            <h3>AI Configuration</h3>
            <p style={{marginBottom: '15px', color:'#666'}}>
                Update the bot's core instructions, shipping policies, and tone.
            </p>
            
            <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>
                    Status: 
                    <button 
                        onClick={() => setSettings({...settings, isActive: !settings.isActive})}
                        style={{
                            marginLeft: '10px',
                            padding: '5px 10px',
                            background: settings.isActive ? '#28a745' : '#dc3545',
                            color: 'white',
                            borderRadius: '4px'
                        }}
                    >
                        {settings.isActive ? 'ACTIVE' : 'DISABLED'}
                    </button>
                </label>
            </div>

            <div className="form-group">
                <label style={{fontWeight:'bold'}}>System Prompt & Policies</label>
                <textarea 
                    rows="15"
                    value={settings.context} 
                    onChange={e => setSettings({...settings, context: e.target.value})}
                    style={{fontFamily: 'monospace', lineHeight: '1.4'}}
                />
            </div>

            <button onClick={saveSettings} className="save-btn">Update AI Settings</button>
            {status && <span className="status-msg">{status}</span>}
        </div>
      )}
    </div>
  );
}