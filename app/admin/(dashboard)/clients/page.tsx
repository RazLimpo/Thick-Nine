'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ClientUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'affiliate' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  wallet?: {
    availableBalance: number;
  };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch clients list
  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    fetch('/api/admin/clients', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.clients)) {
          setClients(data.clients);
        }
      })
      .catch((err) => console.error('Error fetching clients:', err))
      .finally(() => setLoading(false));
  }, []);

  // Update User Role
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/admin/clients/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setClients((prev) =>
          prev.map((c) => (c._id === userId ? { ...c, role: newRole as ClientUser['role'] } : c))
        );
      } else {
        alert(data.message || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered clients list based on search query, role, and status filters
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client._id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || client.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [clients, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Clients Management</h1>
        <p>Audit user accounts, manage permission roles, and monitor account statuses.</p>
      </div>

      {/* SEARCH AND FILTERS BAR */}
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
            <option value="affiliate">Affiliate</option>
            <option value="admin">Admin</option>
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

      {/* CLIENTS TABLE */}
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Joined Date</th>
              <th>Available Balance</th>
              <th>Status</th>
              <th>Role Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading clients list...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                  No client records matched your query.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{client.name || 'Unnamed Client'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>#{client._id}</div>
                  </td>
                  <td>{client.email}</td>
                  <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                  <td>${(client.wallet?.availableBalance || 0).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${client.status || 'active'}`}>
                      {client.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={client.role}
                      disabled={updatingId === client._id}
                      onChange={(e) => handleRoleChange(client._id, e.target.value)}
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
                      <option value="affiliate">Affiliate</option>
                      <option value="admin">Admin</option>
                    </select>
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