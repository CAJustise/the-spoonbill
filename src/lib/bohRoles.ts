import { supabase } from './supabase';

export const ROLE_OWNER_ID = 'role_owner';
export const ROLE_MANAGER_ID = 'role_manager';
export const ROLE_HOST_ID = 'role_host';

export type BohPortal = 'admin' | 'host';

const ADMIN_ROLE_IDS = new Set<string>([ROLE_OWNER_ID, ROLE_MANAGER_ID]);
const HOST_ROLE_IDS = new Set<string>([ROLE_HOST_ID]);

export interface RoleResolution {
  roleIds: string[];
  isAdmin: boolean;
  isHost: boolean;
  primaryPortal: BohPortal | null;
}

const toUniqueRoleIds = (roleIds: string[]) => Array.from(new Set(roleIds.filter(Boolean)));

export const deriveRoleResolution = (roleIds: string[]): RoleResolution => {
  const uniqueRoleIds = toUniqueRoleIds(roleIds);
  const isAdmin = uniqueRoleIds.some((roleId) => ADMIN_ROLE_IDS.has(roleId));
  const isHost = uniqueRoleIds.some((roleId) => HOST_ROLE_IDS.has(roleId));

  return {
    roleIds: uniqueRoleIds,
    isAdmin,
    isHost,
    primaryPortal: isAdmin ? 'admin' : isHost ? 'host' : null,
  };
};

export const canAccessPortal = (roleIds: string[], portal: BohPortal) => {
  const resolved = deriveRoleResolution(roleIds);
  if (portal === 'admin') return resolved.isAdmin;
  return resolved.isHost || resolved.isAdmin;
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

export const getCurrentRoleResolution = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return {
      session: null,
      ...deriveRoleResolution([]),
    };
  }

  const roleIds = await getRoleIdsForUser(session.user.id);
  return {
    session,
    ...deriveRoleResolution(roleIds),
  };
};
