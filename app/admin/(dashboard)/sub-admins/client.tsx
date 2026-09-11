// app/admin/(dashboard)/sub-admins/client.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  createSubAdminSchema,
  ALLOWED_PERMISSIONS,
} from '@/lib/schemas/subAdmin';

import '@/styles/pages/sub-admins.css';

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
  { key: 'roles:manage', label: 'Manage Admin Roles' },
  { key: 'services:read', label: 'View Services' },
  { key: 'services:moderate', label: 'Moderate Services' },
  { key: 'orders:read', label: 'View Orders' },
  { key: 'reviews:manage', label: 'Manage Reviews' },
] as const;

const SUPPORT_PERMISSIONS = [
  'messages:read',
  'messages:reply',
  'users:read',
  'orders:read',
];

const MODERATOR_PERMISSIONS = [
  'services:read',
  'services:moderate',
  'messages:read',
  'reviews:manage',
];

const SENIOR_SUPPORT_PERMISSIONS = [
  ...SUPPORT_PERMISSIONS,
  'users:write',
  'services:moderate',
];

const ROLE_PRESETS: Record<
  string,
  {
    label: string;
    permissions: string[];
  }
> = {
  admin: {
    label: 'Standard Admin',
    permissions: [
      'users:read',
      'users:write',
      'messages:read',
      'messages:reply',
      'services:read',
      'services:moderate',
      'orders:read',
      'reviews:manage',
    ],
  },

  support: {
    label: 'Support Staff',
    permissions: SUPPORT_PERMISSIONS,
  },

  moderator: {
    label: 'Content Moderator',
    permissions: MODERATOR_PERMISSIONS,
  },

  senior_support: {
    label: 'Senior Support / Lead',
    permissions: SENIOR_SUPPORT_PERMISSIONS,
  },

  custom: {
    label: 'Custom Sub-Admin',
    permissions: [],
  },
};

const GRANULAR_ROLES = [
  'support',
  'moderator',
  'senior_support',
  'custom',
];

export default function SubAdminsClient() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('custom');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    []
  );

  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = useCallback((): HeadersInit => {
    if (typeof window === 'undefined') {
      return {
        'Content-Type': 'application/json',
      };
    }

    const token = localStorage.getItem('token');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchSubAdmins = useCallback(async () => {
    setListError('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/sub-admins`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.msg ||
            `Failed to load team members (Status ${res.status})`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message || 'Failed to fetch administrator accounts.'
        );
      }

      setSubAdmins(Array.isArray(data.data) ? data.data : []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error fetching administrator accounts.';

      console.error('Failed to load administrators:', err);
      setListError(message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, saving]);

  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);

    /*
     * Super Admin permissions are determined by the backend.
     * We therefore do not place "*" into the frontend form.
     */
    if (selectedRole === 'super_admin') {
      setSelectedPermissions([]);
      return;
    }

    const preset = ROLE_PRESETS[selectedRole];

    if (preset) {
      setSelectedPermissions(
        preset.permissions.filter((permission) =>
          ALLOWED_PERMISSIONS.includes(
            permission as (typeof ALLOWED_PERMISSIONS)[number]
          )
        )
      );
    } else {
      setSelectedPermissions([]);
    }
  };

 const handlePermissionToggle = (key: string) => {
  if (
    !ALLOWED_PERMISSIONS.includes(
      key as (typeof ALLOWED_PERMISSIONS)[number]
    )
  ) {
    return;
  }

  /*
   * Sensitive permissions are reserved exclusively for Super Admin.
   * They remain visible in the permission list for transparency,
   * but cannot be manually assigned to another administrator.
   */
  if (key === 'roles:manage' || key === 'payouts:read') {
    return;
  }

  setSelectedPermissions((prev) =>
    prev.includes(key)
      ? prev.filter((permission) => permission !== key)
      : [...prev, key]
  );
};

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('custom');
    setSelectedPermissions([]);
    setError('');
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    /*
     * Super Admin receives wildcard access from the backend.
     * The frontend deliberately sends no wildcard.
     */
    const permissions =
      role === 'super_admin' ? [] : selectedPermissions;

    /*
     * Validate using the same schema used by the API layer.
     */
    const validation = createSubAdminSchema.safeParse({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      permissions,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];

      setError(
        firstError?.message ||
          'Please correct the administrator details and try again.'
      );

      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/sub-admins`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(validation.data),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message ||
            data?.msg ||
            'Failed to create administrator account.'
        );
      }

      resetForm();
      setShowModal(false);

      await fetchSubAdmins();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error creating administrator account.';

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
    if (saving) return;

    setShowModal(false);
    setError('');
  };

  return (
    <div className="sub-admins-page">
      <div className="page-header sub-admins-page-header">
        <div className="sub-admins-heading">
          <h1>Team Roles &amp; RBAC</h1>
          <p>
            Manage administrator accounts and assign granular operational
            permissions.
          </p>
        </div>

        <button
          type="button"
          className="btn-action sub-admin-add-button"
          onClick={openModal}
        >
          + Add Administrator
        </button>
      </div>

      {listError && (
        <p className="sub-admin-list-error" role="alert">
          {listError}
        </p>
      )}

      {loading ? (
        <p className="sub-admin-loading">Loading administrators...</p>
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
                  <td colSpan={5} className="sub-admin-empty">
                    No administrators found. Click &quot;Add Administrator&quot;
                    to create one.
                  </td>
                </tr>
              ) : (
                subAdmins.map((admin) => {
                  const permissions = Array.isArray(admin.permissions)
                    ? admin.permissions
                    : [];

                  return (
                    <tr key={admin._id}>
                      <td>
                        <strong>{admin.name}</strong>
                      </td>

                      <td>{admin.email}</td>

                      <td>
                        <span className="admin-badge">
                          {admin.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        <div className="permission-badges">
                          {admin.role === 'super_admin' ||
                          permissions.includes('*') ? (
                            <span className="permission-badge permission-badge-full">
                              Full Platform Access
                            </span>
                          ) : permissions.length > 0 ? (
                            permissions.map((permission) => {
                              const matched = AVAILABLE_PERMISSIONS.find(
                                (item) => item.key === permission
                              );

                              return (
                                <span
                                  key={permission}
                                  className="permission-badge"
                                >
                                  {matched?.label || permission}
                                </span>
                              );
                            })
                          ) : (
                            <span className="permission-none">
                              No explicit permissions
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            admin.isActive ? 'active' : ''
                          }`}
                        >
                          {admin.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="sub-admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-subadmin-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="sub-admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sub-admin-modal-header">
              <h2 id="create-subadmin-title">
                Create New Administrator
              </h2>

              <button
                type="button"
                className="sub-admin-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {error && (
              <p className="sub-admin-form-error" role="alert">
                {error}
              </p>
            )}

            <form onSubmit={handleCreateSubAdmin}>
              <div className="sub-admin-form-group">
                <label htmlFor="sub-admin-name">
                  Full Name
                </label>

                <input
                  id="sub-admin-name"
                  type="text"
                  required
                  disabled={saving}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="sub-admin-form-group">
                <label htmlFor="sub-admin-email">
                  Email Address
                </label>

                <input
                  id="sub-admin-email"
                  type="email"
                  required
                  disabled={saving}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="sub-admin-form-group">
                <label htmlFor="sub-admin-password">
                  Password
                </label>

                <input
                  id="sub-admin-password"
                  type="password"
                  required
                  minLength={6}
                  disabled={saving}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />

                <p className="sub-admin-field-help">
                  Minimum 6 characters.
                </p>
              </div>

              <div className="sub-admin-form-group">
                <label htmlFor="sub-admin-role">
                  Administrative Role
                </label>

                <select
                  id="sub-admin-role"
                  value={role}
                  disabled={saving}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="super_admin">
                    Super Admin (Full Access)
                  </option>

                  <option value="admin">
                    Standard Admin
                  </option>

                  <optgroup label="Operational Roles">
                    <option value="support">
                      Support Staff
                    </option>

                    <option value="moderator">
                      Content Moderator
                    </option>

                    <option value="senior_support">
                      Senior Support
                    </option>

                    <option value="custom">
                      Custom Administrator
                    </option>
                  </optgroup>
                </select>
              </div>

              {role === 'super_admin' && (
                <div className="sub-admin-role-notice">
                  <strong>Super Admin</strong>
                  <span>
                    Full platform access is assigned securely by the
                    backend. No manual permission selection is required.
                  </span>
                </div>
              )}

              {role !== 'super_admin' && (
                <div className="sub-admin-permissions-section">
                  <label className="sub-admin-permissions-title">
                    Permissions
                  </label>

                  <div className="sub-admin-permissions-grid">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <label
                        key={permission.key}
                        className="sub-admin-permission-option"
                      >
                        <input
  type="checkbox"
  disabled={
    saving ||
    permission.key === 'roles:manage' ||
    permission.key === 'payouts:read'
  }
  checked={selectedPermissions.includes(permission.key)}
  onChange={() =>
    handlePermissionToggle(permission.key)
  }
/>

                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="sub-admin-permissions-help">
                    Role management is reserved exclusively for Super
                    Admins.
                  </p>
                </div>
              )}

              <div className="sub-admin-modal-actions">
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
                  className="btn-action sub-admin-submit-button"
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