'use client';

import { useEffect, useState } from 'react';

interface UserMessage {
  _id: string;
  senderId?: {
    fullName?: string;
    email?: string;
  };
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  message: string;
  createdAt: string;
  status?: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token missing.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/messages', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setMessages(data.messages);
        } else {
          setError(data.message || 'Failed to retrieve platform messages.');
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Network error fetching messages.');
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Platform Messages</h1>
          <p>Loading user communications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Platform Messages</h1>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Platform Messages</h1>
        <p>Manage direct inquiries and user support tickets.</p>
      </div>

      <div className="messages-list">
        {messages.length === 0 ? (
          <p>No messages found.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className="message-card" style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>
                  {msg.senderId?.fullName || msg.senderName || 'Anonymous Client'} ({msg.senderId?.email || msg.senderEmail || 'No email'})
                </strong>
                <small>{new Date(msg.createdAt).toLocaleDateString()}</small>
              </div>
              {msg.subject && <h4 style={{ margin: '0.25rem 0' }}>{msg.subject}</h4>}
              <p style={{ margin: 0 }}>{msg.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}