'use client';

import React, { useState, useEffect } from 'react';

interface WithdrawalRequest {
  _id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  createdAt: string;
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending/recent withdrawals on load
  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    fetch('/api/admin/withdraw', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.withdrawals)) {
          setRequests(data.withdrawals);
        }
      })
      .catch((err) => console.error('Error fetching admin payouts:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ withdrawalId, action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRequests((prev) =>
          prev.map((item) =>
            item._id === withdrawalId
              ? { ...item, status: action === 'approve' ? 'completed' : 'failed' }
              : item
          )
        );
      } else {
        alert(data.message || 'Failed to process payout action');
      }
    } catch (err) {
      console.error('Error processing payout action:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Payout & Withdrawal Approvals</h1>
        <p>Review, approve, or reject pending affiliate payout requests.</p>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User ID</th>
              <th>Amount ($)</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>Loading withdrawal requests...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No withdrawal requests found.</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req._id}>
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>{req.userId}</td>
                  <td>${req.amount.toFixed(2)}</td>
                  <td>{req.method}</td>
                  <td>
                    <span className={`status-badge ${req.status}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-action btn-approve"
                          disabled={processingId === req._id}
                          onClick={() => handleAction(req._id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-action btn-reject"
                          disabled={processingId === req._id}
                          onClick={() => handleAction(req._id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}