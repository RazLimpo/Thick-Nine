// app/admin/clients/page.tsx  (or client component used by page)
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface ClientUser {
  _id: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  email: string;
  role:
    | 'user'
    | 'client'
    | 'freelancer'
    | 'affiliate'
    | 'admin'
    | 'super_admin'
    | 'sub_admin'
    | 'support'
    | 'moderator'
    | 'senior_support'
    | 'custom'
    | string;
  status?: 'active' | 'suspended' | 'pending' | string;
  accountStatus?: string;
  createdAt: string;
  wallet?: {
    availableBalance: number;
  };
}

function displayName(c: ClientUser) {
  return c.name || c.displayName || c.fullName || 'Unnamed Client';
}

function statusOf(c: ClientUser) {
  return c.status || c.accountStatus || 'active';
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token') || '';
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients', {
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.clients)) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/clients/${userId}/role`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClients((prev) =>
          prev.map((c) =>
            c._id === userId ? { ...c, role: newRole } : c
          )
        );
      } else {
        setMsg(data.message || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const setStatus = async (
    userId: string,
    status: 'active' | 'suspended' | 'pending',
    warn = false
  ) => {
    setUpdatingId(userId);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/clients/${userId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status, warn }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg(data.message || 'Failed to update status');
        return;
      }
      setClients((prev) =>
        prev.map((c) =>
          c._id === userId ? { ...c, status, accountStatus: status } : c
        )
      );
      setMsg(data.message || `Status → ${status}`);
    } catch {
      setMsg('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  const warnUser = async (userId: string) => {
    const message = window.prompt(
      'Warning message to the user:',
      'Your account activity was flagged as suspicious. Please follow platform rules.'
    );
    if (message == null) return;
    setUpdatingId(userId);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/clients/${userId}/warn`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMsg(data.message || (res.ok ? 'Warning sent' : 'Failed to warn'));
    } catch {
      setMsg('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (
      !window.confirm(
        'Soft-delete this user? They will be suspended and anonymized. Cancel to abort.'
      )
    ) {
      return;
    }
    const hard = window.confirm(
      'Permanently delete instead? OK = hard delete, Cancel = soft delete only.'
    );
    setUpdatingId(userId);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/clients/${userId}${hard ? '?hard=1' : ''}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg(data.message || 'Delete failed');
        return;
      }
      if (hard) {
        setClients((prev) => prev.filter((c) => c._id !== userId));
      } else {
        setClients((prev) =>
          prev.map((c) =>
            c._id === userId
              ? { ...c, status: 'suspended', name: 'Deleted User' }
              : c
          )
        );
      }
      setMsg(data.message || 'Done');
    } catch {
      setMsg('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const name = displayName(client).toLowerCase();
      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        client._id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || client.role === roleFilter;
      const st = statusOf(client);
      const matchesStatus = statusFilter === 'all' || st === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [clients, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Clients Management</h1>
        <p>
          Audit accounts, roles, warnings, suspensions, and deletions.
        </p>
      </div>

      {msg && (
        <p style={{ marginBottom: 12, color: '#b45309', fontWeight: 600 }}>
          {msg}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="header-search" style={{ width: '320px' }}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="search-input"
            style={{
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="client">Client</option>
            <option value="freelancer">Freelancer</option>
            <option value="affiliate">Affiliate</option>
            <optgroup label="Administrators">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Standard Admin</option>
              <option value="sub_admin">Sub Admin</option>
              <option value="support">Support Staff</option>
              <option value="moderator">Content Moderator</option>
              <option value="senior_support">Senior Support</option>
              <option value="custom">Custom Sub-Admin</option>
            </optgroup>
          </select>

          <select
            className="search-input"
            style={{
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Joined Date</th>
              <th>Available Balance</th>
              <th>Status</th>
              <th>Role</th>
              <th>Moderation</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading clients list...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                  No client records matched your query.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const st = statusOf(client);
                const busy = updatingId === client._id;
                return (
                  <tr key={client._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{displayName(client)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        #{client._id}
                      </div>
                    </td>
                    <td>{client.email}</td>
                    <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td>
                      ${(client.wallet?.availableBalance || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-badge ${st}`}>{st}</span>
                    </td>
                    <td>
                      <select
                        value={client.role}
                        disabled={busy}
                        onChange={(e) =>
                          handleRoleChange(client._id, e.target.value)
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="user">User</option>
                        <option value="client">Client</option>
                        <option value="freelancer">Freelancer</option>
                        <option value="affiliate">Affiliate</option>
                        <optgroup label="Administrative Roles">
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Standard Admin</option>
                          <option value="sub_admin">Sub Admin</option>
                          <option value="support">Support</option>
                          <option value="moderator">Moderator</option>
                          <option value="senior_support">Senior Support</option>
                          <option value="custom">Custom</option>
                        </optgroup>
                      </select>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {st !== 'suspended' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(client._id, 'suspended')}
                            title="Block / suspend"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#991b1b',
                              cursor: 'pointer',
                            }}
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(client._id, 'active')}
                            title="Unblock"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#166534',
                              cursor: 'pointer',
                            }}
                          >
                            Unblock
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => warnUser(client._id)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #fde68a',
                            background: '#fffbeb',
                            color: '#92400e',
                            cursor: 'pointer',
                          }}
                        >
                          Warn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteUser(client._id)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
