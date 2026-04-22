'use client';

import React, { useState } from 'react';
import './header.css';

const Header: React.FC = () => {
  const [testMenuOpen, setTestMenuOpen] = useState(false);

  return (
    <header className="main-header" style={{ background: '#1a1a1a', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="logo-container">
        <h2 style={{ color: '#fff', margin: 0 }}>Thick 9 <span style={{ fontSize: '12px', color: '#00ff00' }}>[DB TEST MODE]</span></h2>
      </div>

      <nav>
        <ul style={{ display: 'flex', gap: '20px', listStyle: 'none', color: '#fff' }}>
          <li><a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a></li>
          <li><a href="/search" style={{ color: '#fff', textDecoration: 'none' }}>Search</a></li>
          <li><a href="/api/services" style={{ color: '#00ff00', textDecoration: 'none', fontWeight: 'bold' }}>Test API/DB</a></li>
        </ul>
      </nav>

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setTestMenuOpen(!testMenuOpen)}
          style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}
        >
          Menu ▾
        </button>

        {testMenuOpen && (
          <ul style={{ position: 'absolute', right: 0, top: '40px', background: '#fff', color: '#333', listStyle: 'none', padding: '10px', borderRadius: '5px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', width: '150px', zIndex: 1000 }}>
            <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}><a href="/settings">Settings</a></li>
            <li style={{ padding: '5px 0', color: 'red', cursor: 'pointer' }} onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset Auth</li>
          </ul>
        )}
      </div>
    </header>
  );
};

export default Header;