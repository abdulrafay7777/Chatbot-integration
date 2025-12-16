import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';

const widgetDivId = 'aircloud-chat-widget-root';
let widgetDiv = document.getElementById(widgetDivId);

if (!widgetDiv) {
  widgetDiv = document.createElement('div');
  widgetDiv.id = widgetDivId;
  document.body.appendChild(widgetDiv);
}

// 2. Mount React into that Div
const root = ReactDOM.createRoot(widgetDiv);
root.render(
  <React.StrictMode>
    <ChatWidget />
  </React.StrictMode>
);