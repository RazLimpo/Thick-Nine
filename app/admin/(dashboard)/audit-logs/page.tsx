// app/admin/(dashboard)/audit-logs/page.tsx

'use client';

import React, { useEffect, useState } from 'react';

interface AuditLogActor {
  name?: string;
  email?: string;
  role?: string;
}

interface AuditLogTarget {
  name?: string;
  email?: string;
  role?: string;
}

interface AuditLog {
  _id: string;
  actor?: AuditLogActor;
  target?: AuditLogTarget;
  action: string;
  oldPermissions?: string[];
  newPermissions?: string[];
  details?: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/admin/audit-logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load audit logs');
        }

        setLogs(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const formatAction = (action: string) => {
    if (!action) return '—';
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1>Audit Logs</h1>
        <p>Track all administrative changes related to roles and permissions.</p>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {loading ? (
        <p>Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <p>No audit logs found yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <strong>{log.actor?.name || 'System / Unknown'}</strong>
                    {log.actor?.role && (
                      <>
                        <br />
                        <small style={{ color: '#64748b' }}>
                          {log.actor.role}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <span className="admin-badge">
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td>
                    <strong>{log.target?.name || '—'}</strong>
                    {log.target?.email && (
                      <>
                        <br />
                        <small style={{ color: '#64748b' }}>
                          {log.target.email}
                        </small>
                      </>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {log.details || '—'}
                    {Array.isArray(log.oldPermissions) && log.oldPermissions.length > 0 && (
                      <div style={{ marginTop: '4px', color: '#64748b' }}>
                        <small>
                          Old: {log.oldPermissions.join(', ')}
                        </small>
                      </div>
                    )}
                    {Array.isArray(log.newPermissions) && log.newPermissions.length > 0 && (
                      <div style={{ color: '#64748b' }}>
                        <small>
                          New: {log.newPermissions.join(', ')}
                        </small>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}