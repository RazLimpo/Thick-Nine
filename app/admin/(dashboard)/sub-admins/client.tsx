'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sub_admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

  const fetchSubAdmins = useCallback(async () => {
    setListError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/sub-admins`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load team members (Status ${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setSubAdmins(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch sub-admins');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching team members.';
      console.error('Failed to load sub-admins:', err);
      setListError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, saving]);

  const handlePermissionToggle = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('sub_admin');
    setSelectedPermissions([]);
    setError('');
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'sub_admin' && selectedPermissions.length === 0) {
      setError('Please select at least one permission for a sub-admin account.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/sub-admins`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          permissions: role === 'super_admin' ? ['*'] : selectedPermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create admin account.');
      }

      resetForm();
      setShowModal(false);
      fetchSubAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating admin';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
      setError('');
    }
  };

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1>Team Roles & RBAC</h1>
          <p>Manage sub-admin accounts and assign granular operational permissions.</p>
        </div>
        <button
          className="btn-action"
          style={{ backgroundColor: '#0f172a', color: '#fff' }}
          onClick={openModal}
        >
          + Add Sub-Admin
        </button>
      </div>

      {/* List-level error (visible outside modal) */}
      {listError && (
        <p
          style={{
            color: '#ef4444',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.9rem',
          }}
        >
          {listError}
        </p>
      )}

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
                    <td>
                      <strong>{admin.name}</strong>
                    </td>
                    <td>{admin.email}</td>
                    <td>
                      <span className="admin-badge" style={{ textTransform: 'capitalize' }}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {admin.permissions.includes('*') ? (
                          <span
                            style={{
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Full Platform Access (*)
                          </span>
                        ) : admin.permissions.length > 0 ? (
                          admin.permissions.map((p) => {
                            const matched = AVAILABLE_PERMISSIONS.find((item) => item.key === p);
                            return (
                              <span
                                key={p}
                                style={{
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {matched ? matched.label : p}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                            No permissions
                          </span>
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-subadmin-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '28px',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 id="create-subadmin-title" style={{ margin: 0 }}>
                Create New Sub-Admin
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  lineHeight: 1,
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: '#ef4444',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '12px',
                }}
              >
                {error}
              </p>
            )}

            <form onSubmit={handleCreateSubAdmin}>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={saving}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={saving}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  disabled={saving}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Minimum 6 characters
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Administrative Role
                </label>
                <select
                  value={role}
                  disabled={saving}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setRole(newRole);
                    if (newRole === 'super_admin') {
                      setSelectedPermissions([]);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="sub_admin">Sub-Admin (Granular Permissions)</option>
                  <option value="super_admin">Super Admin (Full Platform Access)</option>
                </select>
              </div>

              {role === 'sub_admin' && (
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}
                  >
                    Permissions
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                    }}
                  >
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label
                        key={perm.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={saving}
                          checked={selectedPermissions.includes(perm.key)}
                          onChange={() => handlePermissionToggle(perm.key)}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-action"
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-action"
                  style={{ backgroundColor: '#0f172a', color: '#fff' }}
                  disabled={saving}
                >
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