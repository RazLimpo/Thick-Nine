'use client';

import React, { useState, useEffect } from 'react';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  notificationsEnabled: boolean;
  twoFactorEnabled: boolean;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    role: 'Admin',
    notificationsEnabled: true,
    twoFactorEnabled: false,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Admin Profile
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const token = localStorage.getItem('token') || '';

    fetch('/api/admin/profile', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.user) {
          setProfile({
            name: data.user.name || '',
            email: data.user.email || '',
            role: data.user.role || 'Admin',
            notificationsEnabled: data.user.notificationsEnabled ?? true,
            twoFactorEnabled: data.user.twoFactorEnabled ?? false,
          });
        } else {
          showToast(data.message || 'Failed to load admin profile', 'error');
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          showToast('Profile request timed out. Check database connection.', 'error');
        } else {
          console.error('Error loading admin profile:', err);
          showToast('Network error loading profile', 'error');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, []);

  // Update Profile Info & Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast('Profile settings updated successfully!');
        if (data.user) {
          setProfile((prev) => ({
            ...prev,
            name: data.user.name ?? prev.name,
            email: data.user.email ?? prev.email,
          }));
        }
      } else {
        showToast(data.message || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Server error while saving profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingPassword) return;

    if (!currentPassword) {
      showToast('Please enter your current password.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || 'Failed to update password.', 'error');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      showToast('Server error while updating password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <p>Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Admin Profile & Credentials</h1>
        <p>Manage your account settings, security preferences, and administrative details.</p>
      </div>

      {toast && (
        <div className={`profile-toast ${toast.type === 'error' ? 'removed' : ''}`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* PERSONAL DETAILS CARD */}
        <div className="table-wrapper profile-card">
          <h2 className="profile-card-title">Account Details</h2>
          <form onSubmit={handleSaveProfile}>
            <div className="profile-form-group">
              <label className="profile-form-label">Full Name</label>
              <input
                type="text"
                className="profile-input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Email Address</label>
              <input
                type="email"
                className="profile-input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group last">
              <label className="profile-form-label">System Role</label>
              <input
                type="text"
                className="profile-input"
                value={profile.role}
                disabled
              />
            </div>

            <button
              type="submit"
              className="btn-action btn-save-profile"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* SECURITY & PASSWORD CARD */}
        <div className="table-wrapper profile-card">
          <h2 className="profile-card-title">Security Settings</h2>
          <form onSubmit={handleUpdatePassword}>
            <div className="profile-form-group">
              <label className="profile-form-label">Current Password</label>
              <input
                type="password"
                className="profile-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">New Password</label>
              <input
                type="password"
                className="profile-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="profile-form-group last">
              <label className="profile-form-label">Confirm New Password</label>
              <input
                type="password"
                className="profile-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn-action btn-update-password"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}