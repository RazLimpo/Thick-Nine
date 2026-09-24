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
  adminReply?: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

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
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
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

  const handleReply = async (messageId: string) => {
    const replyText = (replyDrafts[messageId] || '').trim();
    if (!replyText) {
      setReplyError('Reply text is required.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setReplyError('Authentication token missing.');
      return;
    }

    setReplyingId(messageId);
    setReplyError(null);

    try {
      const res = await fetch('/api/admin/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId, replyText }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setReplyError(data.message || 'Failed to submit reply.');
        return;
      }

      const saved = data.data as UserMessage | undefined;
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                adminReply: saved?.adminReply || replyText,
                status: saved?.status || 'replied',
              }
            : msg
        )
      );
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
    } catch (err) {
      console.error('Reply error:', err);
      setReplyError('Network error submitting reply.');
    } finally {
      setReplyingId(null);
    }
  };

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

      {replyError && (
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{replyError}</p>
      )}

      <div className="messages-list">
        {messages.length === 0 ? (
          <p>No messages found.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className="message-card"
              style={{
                padding: '1rem',
                border: '1px solid #ccc',
                marginBottom: '1rem',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <strong>
                  {msg.senderId?.fullName || msg.senderName || 'Anonymous Client'}{' '}
                  ({msg.senderId?.email || msg.senderEmail || 'No email'})
                </strong>
                <small>{new Date(msg.createdAt).toLocaleDateString()}</small>
              </div>
              {msg.subject && (
                <h4 style={{ margin: '0.25rem 0' }}>{msg.subject}</h4>
              )}
              <p style={{ margin: 0 }}>
                {msg.message || 'No content provided.'}
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                Status: {msg.status || 'unread'}
              </p>

              {msg.adminReply && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#f1f5f9',
                    borderRadius: '6px',
                  }}
                >
                  <strong>Admin reply</strong>
                  <p style={{ margin: '0.25rem 0 0' }}>{msg.adminReply}</p>
                </div>
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <textarea
                  className="profile-input"
                  rows={3}
                  placeholder="Write a reply..."
                  value={replyDrafts[msg._id] || ''}
                  onChange={(e) =>
                    setReplyDrafts((prev) => ({
                      ...prev,
                      [msg._id]: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="btn-action"
                  style={{ marginTop: '0.5rem' }}
                  disabled={replyingId === msg._id}
                  onClick={() => handleReply(msg._id)}
                >
                  {replyingId === msg._id ? 'Sending...' : 'Send reply'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}