import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, UserCog, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BohPortal } from '../../lib/bohRoles';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  title: string;
  portal: BohPortal;
  can_view_reservations: boolean;
  can_view_events_parties: boolean;
  can_view_classes: boolean;
  active: boolean;
}

const DUMMY_LOGIN_PASSWORDS: Record<string, string> = {
  'hostlead@spoonbill.local': 'spoonbill-hostlead',
  'linecook@spoonbill.local': 'spoonbill-linecook',
  'bartender@spoonbill.local': 'spoonbill-bartender',
  'server@spoonbill.local': 'spoonbill-server',
};

const TeamMembersAdmin: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(error.message || 'Failed to load team members');
    }

    setMembers(
      (Array.isArray(data) ? data : []).map((member) => ({
        id: String((member as { id?: unknown }).id || ''),
        user_id: String((member as { user_id?: unknown }).user_id || ''),
        email: String((member as { email?: unknown }).email || ''),
        name: String((member as { name?: unknown }).name || ''),
        title: String((member as { title?: unknown }).title || ''),
        portal: ((member as { portal?: unknown }).portal as BohPortal) || 'staff',
        can_view_reservations: Boolean((member as { can_view_reservations?: unknown }).can_view_reservations),
        can_view_events_parties: Boolean((member as { can_view_events_parties?: unknown }).can_view_events_parties),
        can_view_classes: Boolean((member as { can_view_classes?: unknown }).can_view_classes),
        active: (member as { active?: unknown }).active !== false,
      })),
    );
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await fetchMembers();
      } catch (error) {
        alert((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const dummyMembers = useMemo(
    () => members.filter((member) => DUMMY_LOGIN_PASSWORDS[member.email]),
    [members],
  );

  const syncPortalRole = async (member: TeamMember) => {
    if (!member.user_id) return;

    if (member.portal === 'admin') {
      return;
    }

    const targetRole = member.portal === 'host' ? 'role_host' : 'role_staff';
    const oppositeRole = member.portal === 'host' ? 'role_staff' : 'role_host';

    const { error: removeError } = await supabase
      .from('admin_user_roles')
      .delete()
      .eq('user_id', member.user_id)
      .eq('role_id', oppositeRole);

    if (removeError) {
      throw new Error(removeError.message || 'Failed updating team role');
    }

    const { data: existingLinks, error: loadError } = await supabase
      .from('admin_user_roles')
      .select('id')
      .eq('user_id', member.user_id)
      .eq('role_id', targetRole);

    if (loadError) {
      throw new Error(loadError.message || 'Failed loading team role');
    }

    if (Array.isArray(existingLinks) && existingLinks.length > 0) {
      return;
    }

    const { error: insertError } = await supabase.from('admin_user_roles').insert([
      {
        user_id: member.user_id,
        role_id: targetRole,
      },
    ]);

    if (insertError) {
      throw new Error(insertError.message || 'Failed assigning team role');
    }
  };

  const handleSaveMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMember) return;

    const formData = new FormData(event.currentTarget);
    const payload: TeamMember = {
      ...editingMember,
      name: String(formData.get('name') || '').trim(),
      title: String(formData.get('title') || '').trim(),
      portal: (String(formData.get('portal') || 'staff').trim().toLowerCase() as BohPortal) || 'staff',
      can_view_reservations: Boolean(formData.get('can_view_reservations')),
      can_view_events_parties: Boolean(formData.get('can_view_events_parties')),
      can_view_classes: Boolean(formData.get('can_view_classes')),
      active: Boolean(formData.get('active')),
    };

    if (!payload.name) {
      alert('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          name: payload.name,
          title: payload.title,
          portal: payload.portal,
          can_view_reservations: payload.can_view_reservations,
          can_view_events_parties: payload.can_view_events_parties,
          can_view_classes: payload.can_view_classes,
          active: payload.active,
        })
        .eq('id', payload.id);

      if (error) throw error;

      await syncPortalRole(payload);
      await fetchMembers();
      setEditingMember(null);
    } catch (error) {
      alert(`Failed to save team member: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 font-garamond">
            Control each employee login portal and exactly which BOH dashboards they can access.
          </p>
        </div>

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-ocean-100 text-ocean-600">
              <UserCog className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900">Access Matrix</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Team Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Portal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reservations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Events</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Classes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.title || 'Team Member'}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-ocean-100 text-ocean-700 capitalize">
                        {member.portal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{member.can_view_reservations ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{member.can_view_events_parties ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{member.can_view_classes ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <span className={member.active ? 'text-green-600' : 'text-gray-500'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingMember(member)}
                        className="inline-flex items-center justify-center p-2 text-ocean-600 hover:text-ocean-700"
                        title="Edit team member"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!members.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-3">Dummy Team Logins</h2>
          <p className="text-sm text-gray-600 mb-4">
            These 4 employees are pre-seeded so you can test Host/Staff access controls immediately.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {dummyMembers.map((member) => (
              <div key={member.id} className="rounded-lg border border-gray-200 p-3">
                <div className="font-medium text-gray-900">{member.name}</div>
                <div className="text-sm text-gray-600">{member.email}</div>
                <div className="text-sm text-gray-600">Password: {DUMMY_LOGIN_PASSWORDS[member.email]}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editingMember && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-display font-bold text-gray-900">Edit Team Member</h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-2 text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(event) => void handleSaveMember(event)} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    name="name"
                    defaultValue={editingMember.name}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    name="title"
                    defaultValue={editingMember.title}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login Portal</label>
                  <select name="portal" defaultValue={editingMember.portal} className="w-full px-3 py-2 border rounded-lg">
                    <option value="admin">Admin</option>
                    <option value="host">Host</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={editingMember.active}
                      className="rounded border-gray-300"
                    />
                    Active
                  </label>
                </div>
                <div className="md:col-span-2 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">BOH Dashboard Access</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="can_view_reservations"
                        defaultChecked={editingMember.can_view_reservations}
                        className="rounded border-gray-300"
                      />
                      Reservations
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="can_view_events_parties"
                        defaultChecked={editingMember.can_view_events_parties}
                        className="rounded border-gray-300"
                      />
                      Event / Parties
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="can_view_classes"
                        defaultChecked={editingMember.can_view_classes}
                        className="rounded border-gray-300"
                      />
                      Classes
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-ocean-600 text-white hover:bg-ocean-700 disabled:opacity-60"
                >
                  Save Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersAdmin;
