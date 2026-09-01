//app/admin/sub-admins/client.tsx

'use client';

import React, { useState, useEffect } from 'react';

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'users:read', label: 'View Users/Clients' },
  { key: 'users:write', label: 'Manage Users/Clients' },
  { key: 'messages:read', label: 'View Contact Messages' },
  { key: 'messages:reply', label: 'Reply to Messages' },
  { key: 'payouts:read', label: 'View Withdrawals' },
  { key: 'roles:manage', label: 'Manage Team Roles' },
];

export default function SubAdminsClient() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      const res = await fetch('/api/admin/sub-admins');
      const data = await res.json();
      if (data.success) {
        setSubAdmins(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load sub-admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create sub-admin');
      }

      // Reset & Refresh
      setName('');
      setEmail('');
      setPassword('');
      setSelectedPermissions([]);
      setShowModal(false);
      fetchSubAdmins();
    } catch (err: any) {
      setError(err.message || 'Error creating sub-admin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Team Roles & RBAC</h1>
          <p>Manage sub-admin accounts and assign granular operational permissions.</p>
        </div>
        <button className="btn-action" style={{ backgroundColor: '#0f172a', color: '#fff' }} onClick={() => setShowModal(true)}>
          + Add Sub-Admin
        </button>
      </div>

      {loading ? (
        <p>Loading team members...</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assigned Permissions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                    No sub-admins found. Click &quot;Add Sub-Admin&quot; to create one.
                  </td>
                </tr>
              ) : (
                subAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td><strong>{admin.name}</strong></td>
                    <td>{admin.email}</td>
                    <td><span className="admin-badge">{admin.role}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {admin.permissions.length > 0 ? (
                          admin.permissions.map((p) => (
                            <span key={p} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                              {p}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No permissions</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${admin.isActive ? 'active' : ''}`}>
                        {admin.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE SUB-ADMIN MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '16px' }}>Create New Sub-Admin</h2>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>}

            <form onSubmit={handleCreateSubAdmin}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.key)}
                        onChange={() => handlePermissionToggle(perm.key)}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-action" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-action" style={{ backgroundColor: '#0f172a', color: '#fff' }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}