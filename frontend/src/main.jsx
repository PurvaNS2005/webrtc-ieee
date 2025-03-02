import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { WebSocketProvider } from './components/WebSocketProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <WebSocketProvider>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </WebSocketProvider>
);
