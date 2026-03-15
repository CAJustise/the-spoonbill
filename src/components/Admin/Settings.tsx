import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { Save, Lock, Mail, Bell, Shield, Users, Plus, Edit2, Trash2 } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  roles: {
    id: string;
    name: string;
    description: string;
  }[];
}

interface Role {
  id: string;
  name: string;
  description: string;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    menuUpdates: true,
    reservationNotifications: true,
    securityAlerts: true
  });

  useEffect(() => {
    fetchUserProfile();
    fetchAdminUsers();
    fetchRoles();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const { data: userRoles, error: userRolesError } = await supabase
        .from('admin_user_roles')
        .select(`
          user_id,
          role:admin_roles(id, name, description)
        `);

      if (userRolesError) throw userRolesError;

      // Group roles by user_id
      const userRolesMap = userRoles.reduce((acc, ur) => {
        if (!acc[ur.user_id]) {
          acc[ur.user_id] = [];
        }
        if (ur.role) {
          acc[ur.user_id].push(ur.role);
        }
        return acc;
      }, {} as Record<string, Role[]>);

      // Get user emails from auth.users through admin_user_roles
      const adminUsers: AdminUser[] = Object.entries(userRolesMap).map(([userId, roles]) => ({
        id: userId,
        email: 'Loading...', // Placeholder until we get the email
        roles
      }));

      setAdminUsers(adminUsers);
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const newUserEmail = formData.get('email') as string;
      const password = formData.get('password') as string;

      // Create user through service role client
      const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: newUserEmail,
        password: password,
        email_confirm: true // Auto-confirm email
      });

      if (createError) throw createError;
      if (!user) throw new Error('No user returned from creation');

      // Assign roles
      if (selectedRoles.length > 0) {
        const { error: rolesError } = await supabase
          .from('admin_user_roles')
          .insert(
            selectedRoles.map(roleId => ({
              user_id: user.id,
              role_id: roleId
            }))
          );

        if (rolesError) throw rolesError;
      }

      await fetchAdminUsers();
      setIsUserFormOpen(false);
      setSelectedRoles([]);
      form.reset();

      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      if ((error as any).message === 'User already registered') {
        alert('A user with this email already exists.');
      } else {
        alert('Error creating user: ' + (error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      await fetchAdminUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error as Error).message);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ email });
      
      if (error) throw error;
      
      alert('Email update request sent. Please check your email to confirm the change.');
    } catch (error) {
      console.error('Error updating email:', error);
      alert('Error updating email: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      // Then update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      alert('Password updated successfully');
      form.reset();
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Error updating password: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async (setting: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-8">
          {/* User Management */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">User Management</h2>
                <p className="text-gray-600 text-sm">Manage admin users and their roles</p>
              </div>
            </div>

            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsUserFormOpen(true)}
                className="bg-ocean-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-ocean-700"
              >
                <Plus className="h-5 w-5" />
                Add User
              </button>
            </div>

            {isUserFormOpen && (
              <form onSubmit={handleCreateUser} className="bg-gray-50 p-6 rounded-lg mb-6">
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Roles
                    </label>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <label key={role.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles(prev => [...prev, role.id]);
                              } else {
                                setSelectedRoles(prev => prev.filter(id => id !== role.id));
                              }
                            }}
                            className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                          />
                          <span className="text-sm text-gray-900">{role.name}</span>
                          {role.description && (
                            <span className="text-sm text-gray-500">- {role.description}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserFormOpen(false);
                      setSelectedRoles([]);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{adminUser.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {adminUser.roles.map(role => (
                            <span
                              key={role.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ocean-100 text-ocean-800"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteUser(adminUser.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-gray-900">Email Settings</h2>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                Update Email
              </button>
            </form>
          </div>

          {/* Password Settings */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-gray-900">Password Settings</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                Update Password
              </button>
            </form>
          </div>

          {/* Notification Settings */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600">
                <Bell className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-gray-900">Notification Settings</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between py-2">
                <span className="text-gray-700">Email Alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.emailAlerts}
                  onChange={() => handleUpdateNotifications('emailAlerts')}
                  className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                />
              </label>

              <label className="flex items-center justify-between py-2">
                <span className="text-gray-700">Menu Update Notifications</span>
                <input
                  type="checkbox"
                  checked={notifications.menuUpdates}
                  onChange={() => handleUpdateNotifications('menuUpdates')}
                  className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                />
              </label>

              <label className="flex items-center justify-between py-2">
                <span className="text-gray-700">Reservation Notifications</span>
                <input
                  type="checkbox"
                  checked={notifications.reservationNotifications}
                  onChange={() => handleUpdateNotifications('reservationNotifications')}
                  className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                />
              </label>

              <label className="flex items-center justify-between py-2">
                <span className="text-gray-700">Security Alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.securityAlerts}
                  onChange={() => handleUpdateNotifications('securityAlerts')}
                  className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                />
              </label>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-gray-900">Security Settings</h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => alert('This feature is coming soon!')}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="text-gray-700">Two-Factor Authentication</span>
                <span className="text-sm text-gray-500">Coming Soon</span>
              </button>

              <button
                onClick={() => alert('This feature is coming soon!')}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="text-gray-700">Login History</span>
                <span className="text-sm text-gray-500">Coming Soon</span>
              </button>

              <button
                onClick={() => alert('This feature is coming soon!')}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="text-gray-700">Active Sessions</span>
                <span className="text-sm text-gray-500">Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;