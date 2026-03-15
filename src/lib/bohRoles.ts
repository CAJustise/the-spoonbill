import { supabase } from './supabase';

export const ROLE_OWNER_ID = 'role_owner';
export const ROLE_MANAGER_ID = 'role_manager';
export const ROLE_HOST_ID = 'role_host';
export const ROLE_STAFF_ID = 'role_staff';

export type BohPortal = 'admin' | 'host' | 'staff';
export type BohCapability = 'reservations' | 'events_parties' | 'classes';

const ADMIN_ROLE_IDS = new Set<string>([ROLE_OWNER_ID, ROLE_MANAGER_ID]);
const HOST_ROLE_IDS = new Set<string>([ROLE_HOST_ID]);
const STAFF_ROLE_IDS = new Set<string>([ROLE_STAFF_ID]);

export interface TeamMemberAccess {
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

export interface RoleResolution {
  roleIds: string[];
  isAdmin: boolean;
  isHost: boolean;
  isStaff: boolean;
  primaryPortal: BohPortal | null;
}

export interface PortalCapabilities {
  canViewReservations: boolean;
  canViewEventsParties: boolean;
  canViewClasses: boolean;
}

const EMPTY_CAPABILITIES: PortalCapabilities = {
  canViewReservations: false,
  canViewEventsParties: false,
  canViewClasses: false,
};

const FULL_CAPABILITIES: PortalCapabilities = {
  canViewReservations: true,
  canViewEventsParties: true,
  canViewClasses: true,
};

const normalizePortal = (value: unknown): BohPortal => {
  const candidate = String(value ?? '')
    .trim()
    .toLowerCase();

  if (candidate === 'admin' || candidate === 'host' || candidate === 'staff') {
    return candidate;
  }

  return 'staff';
};

const toUniqueRoleIds = (roleIds: string[]) => Array.from(new Set(roleIds.filter(Boolean)));

const normalizeTeamMember = (row: unknown): TeamMemberAccess | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const userId = String(candidate.user_id ?? '').trim();
  if (!userId) {
    return null;
  }

  return {
    id: String(candidate.id ?? ''),
    user_id: userId,
    email: String(candidate.email ?? ''),
    name: String(candidate.name ?? ''),
    title: String(candidate.title ?? ''),
    portal: normalizePortal(candidate.portal),
    can_view_reservations: Boolean(candidate.can_view_reservations),
    can_view_events_parties: Boolean(candidate.can_view_events_parties),
    can_view_classes: Boolean(candidate.can_view_classes),
    active: Boolean(candidate.active ?? true),
  };
};

export const deriveRoleResolution = (roleIds: string[]): RoleResolution => {
  const uniqueRoleIds = toUniqueRoleIds(roleIds);
  const isAdmin = uniqueRoleIds.some((roleId) => ADMIN_ROLE_IDS.has(roleId));
  const isHost = uniqueRoleIds.some((roleId) => HOST_ROLE_IDS.has(roleId));
  const isStaff = uniqueRoleIds.some((roleId) => STAFF_ROLE_IDS.has(roleId));

  return {
    roleIds: uniqueRoleIds,
    isAdmin,
    isHost,
    isStaff,
    primaryPortal: isAdmin ? 'admin' : isHost ? 'host' : isStaff ? 'staff' : null,
  };
};

const derivePortalAccess = (roleResolution: RoleResolution, teamMember: TeamMemberAccess | null) => {
  const access: Record<BohPortal, boolean> = {
    admin: false,
    host: false,
    staff: false,
  };

  if (roleResolution.isAdmin) {
    access.admin = true;
    access.host = true;
    access.staff = true;
    return access;
  }

  if (teamMember) {
    if (!teamMember.active) {
      return access;
    }

    access[teamMember.portal] = true;
    return access;
  }

  if (roleResolution.isHost) {
    access.host = true;
  }

  if (roleResolution.isStaff) {
    access.staff = true;
  }

  return access;
};

export const derivePortalCapabilities = (
  roleIds: string[],
  teamMember: TeamMemberAccess | null,
): PortalCapabilities => {
  const roleResolution = deriveRoleResolution(roleIds);

  if (roleResolution.isAdmin) {
    return FULL_CAPABILITIES;
  }

  if (teamMember) {
    if (!teamMember.active) {
      return EMPTY_CAPABILITIES;
    }

    return {
      canViewReservations: Boolean(teamMember.can_view_reservations),
      canViewEventsParties: Boolean(teamMember.can_view_events_parties),
      canViewClasses: Boolean(teamMember.can_view_classes),
    };
  }

  if (roleResolution.isHost) {
    return FULL_CAPABILITIES;
  }

  return EMPTY_CAPABILITIES;
};

export const canAccessCapability = (capabilities: PortalCapabilities, capability: BohCapability) => {
  if (capability === 'reservations') return capabilities.canViewReservations;
  if (capability === 'events_parties') return capabilities.canViewEventsParties;
  return capabilities.canViewClasses;
};

export const canAccessPortal = (
  roleIds: string[],
  portal: BohPortal,
  teamMember: TeamMemberAccess | null = null,
) => {
  const roleResolution = deriveRoleResolution(roleIds);
  return derivePortalAccess(roleResolution, teamMember)[portal];
};

export const resolveDefaultPortal = (
  roleIds: string[],
  teamMember: TeamMemberAccess | null = null,
): BohPortal | null => {
  const roleResolution = deriveRoleResolution(roleIds);
  const access = derivePortalAccess(roleResolution, teamMember);

  if (access.admin) return 'admin';
  if (access.host) return 'host';
  if (access.staff) return 'staff';
  return null;
};

export const getRoleIdsForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('admin_user_roles')
    .select('role_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to load user roles');
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => String((row as { role_id?: unknown }).role_id ?? '').trim())
    .filter(Boolean);
};

export const getTeamMemberForUser = async (userId: string): Promise<TeamMemberAccess | null> => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('no rows') || message.includes('0 rows')) {
      return null;
    }
    throw new Error(error.message || 'Unable to load team member permissions');
  }

  return normalizeTeamMember(data);
};

export const getCurrentRoleResolution = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return {
      session: null,
      teamMember: null,
      capabilities: EMPTY_CAPABILITIES,
      ...deriveRoleResolution([]),
    };
  }

  const roleIds = await getRoleIdsForUser(session.user.id);
  const teamMember = await getTeamMemberForUser(session.user.id);

  return {
    session,
    teamMember,
    capabilities: derivePortalCapabilities(roleIds, teamMember),
    ...deriveRoleResolution(roleIds),
  };
};
