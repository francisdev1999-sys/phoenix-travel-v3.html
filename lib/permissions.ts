/**
 * Permissions system — role hierarchy, default grants, runtime checks.
 *
 * Role ladder (most → least authority):
 *   owner → admin → moderation_admin → reviewer → source_verifier
 *   → verified_contributor → contributor → user | banned
 *
 * Permissions are stored in UserPermission; defaults below are applied
 * automatically when a permission record is missing.
 */

import { prisma } from '@/lib/db';

// ── Role type ─────────────────────────────────────────────────────────────────

export type UserRole =
  | 'owner'
  | 'admin'
  | 'moderation_admin'
  | 'reviewer'
  | 'source_verifier'
  | 'verified_contributor'
  | 'contributor'
  | 'user'
  | 'banned';

// Ordered from highest to lowest for comparison
const ROLE_ORDER: UserRole[] = [
  'owner', 'admin', 'moderation_admin', 'reviewer',
  'source_verifier', 'verified_contributor', 'contributor', 'user', 'banned',
];

export function roleRank(role: string): number {
  const idx = ROLE_ORDER.indexOf(role as UserRole);
  return idx === -1 ? ROLE_ORDER.length : idx;
}

export function isAtLeast(userRole: string, minRole: UserRole): boolean {
  return roleRank(userRole) <= roleRank(minRole);
}

// ── Role groups ───────────────────────────────────────────────────────────────

export const SUPER_ADMIN_ROLES:     UserRole[] = ['owner'];
export const ADMIN_ROLES:           UserRole[] = ['owner', 'admin'];
export const MOD_ROLES:             UserRole[] = ['owner', 'admin', 'moderation_admin'];
export const REVIEWER_ROLES:        UserRole[] = ['owner', 'admin', 'reviewer'];
export const SOURCE_VERIFIER_ROLES: UserRole[] = ['owner', 'admin', 'reviewer', 'source_verifier'];
export const CONTRIBUTOR_ROLES:     UserRole[] = [
  'owner', 'admin', 'moderation_admin', 'reviewer',
  'source_verifier', 'verified_contributor', 'contributor',
];

export function isSuperAdmin(role: string): boolean {
  return (SUPER_ADMIN_ROLES as string[]).includes(role);
}
export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as string[]).includes(role);
}
export function isModRole(role: string): boolean {
  return (MOD_ROLES as string[]).includes(role);
}
export function isReviewerRole(role: string): boolean {
  return (REVIEWER_ROLES as string[]).includes(role);
}
export function isContributorRole(role: string): boolean {
  return (CONTRIBUTOR_ROLES as string[]).includes(role);
}

// ── Session helpers (used by API routes) ──────────────────────────────────────

type SessionLike = { user?: { role?: string; email?: string | null; id?: string } } | null;

export function sessionRole(session: SessionLike): string {
  if (!session?.user) return 'user';
  if (session.user.email === process.env.ADMIN_EMAIL) return 'owner';
  return session.user.role ?? 'user';
}

export function isAdminSession(session: SessionLike): boolean {
  return isAdminRole(sessionRole(session));
}
export function isSuperAdminSession(session: SessionLike): boolean {
  return isSuperAdmin(sessionRole(session));
}
export function isModSession(session: SessionLike): boolean {
  return isModRole(sessionRole(session));
}
export function isReviewerOrAboveSession(session: SessionLike): boolean {
  return isReviewerRole(sessionRole(session));
}
export function isContributorOrAboveSession(session: SessionLike): boolean {
  return isContributorRole(sessionRole(session));
}

// ── Default permissions per role ──────────────────────────────────────────────

export interface PermissionFlags {
  canApproveSources:       boolean;
  canApproveRelationships: boolean;
  canApproveNodes:         boolean;
  canPublishNodes:         boolean;
  canAssignRoles:          boolean;
  canBanUsers:             boolean;
  canRunAiReview:          boolean;
  canViewPlatformHealth:   boolean;
  canViewTraffic:          boolean;
  canViewCosts:            boolean;
  canViewSecurityLogs:     boolean;
}

export const ALL_PERMISSIONS: (keyof PermissionFlags)[] = [
  'canApproveSources', 'canApproveRelationships', 'canApproveNodes',
  'canPublishNodes', 'canAssignRoles', 'canBanUsers', 'canRunAiReview',
  'canViewPlatformHealth', 'canViewTraffic', 'canViewCosts', 'canViewSecurityLogs',
];

const NO_PERMISSIONS: PermissionFlags = {
  canApproveSources: false, canApproveRelationships: false,
  canApproveNodes: false, canPublishNodes: false, canAssignRoles: false,
  canBanUsers: false, canRunAiReview: false, canViewPlatformHealth: false,
  canViewTraffic: false, canViewCosts: false, canViewSecurityLogs: false,
};

export function defaultPermissionsForRole(role: string): PermissionFlags {
  switch (role as UserRole) {
    case 'owner':
      return {
        canApproveSources: true, canApproveRelationships: true,
        canApproveNodes: true, canPublishNodes: true, canAssignRoles: true,
        canBanUsers: true, canRunAiReview: true, canViewPlatformHealth: true,
        canViewTraffic: true, canViewCosts: true, canViewSecurityLogs: true,
      };
    case 'admin':
      return {
        canApproveSources: true, canApproveRelationships: true,
        canApproveNodes: true, canPublishNodes: true, canAssignRoles: false,
        canBanUsers: true, canRunAiReview: true, canViewPlatformHealth: false,
        canViewTraffic: false, canViewCosts: false, canViewSecurityLogs: true,
      };
    case 'moderation_admin':
      return {
        ...NO_PERMISSIONS,
        canBanUsers: true, canViewSecurityLogs: true,
      };
    case 'reviewer':
      return {
        ...NO_PERMISSIONS,
        canApproveSources: true, canApproveRelationships: true,
        canApproveNodes: true, canRunAiReview: true,
      };
    case 'source_verifier':
      return { ...NO_PERMISSIONS, canApproveSources: true };
    default:
      return { ...NO_PERMISSIONS };
  }
}

// ── Permission lookup (DB → fallback to role default) ─────────────────────────

export async function getUserPermissions(
  userId: string,
  role: string,
): Promise<PermissionFlags> {
  const row = await prisma.userPermission.findUnique({ where: { userId } });
  if (row) {
    return {
      canApproveSources:       row.canApproveSources,
      canApproveRelationships: row.canApproveRelationships,
      canApproveNodes:         row.canApproveNodes,
      canPublishNodes:         row.canPublishNodes,
      canAssignRoles:          row.canAssignRoles,
      canBanUsers:             row.canBanUsers,
      canRunAiReview:          row.canRunAiReview,
      canViewPlatformHealth:   row.canViewPlatformHealth,
      canViewTraffic:          row.canViewTraffic,
      canViewCosts:            row.canViewCosts,
      canViewSecurityLogs:     row.canViewSecurityLogs,
    };
  }
  // No row → use role defaults
  return defaultPermissionsForRole(role);
}

export async function setUserPermissions(
  userId: string,
  flags: Partial<PermissionFlags>,
  updatedBy: string,
): Promise<void> {
  await prisma.userPermission.upsert({
    where:  { userId },
    create: { userId, ...flags, updatedBy },
    update: { ...flags, updatedBy },
  });
}
