// Frontend mirror of backend/utils/roles.js.
// Canonical roles: den > sse > je. Legacy admin/worker are treated as
// aliases (admin → sse-level, worker → je) so old sessions keep working.

/** Senior staff — full network view, drill controls, inspection logging. */
export const isAdminRole = (role) => ['admin', 'den', 'sse'].includes(role);

/** SSE (or legacy admin) — the only role that may verify repairs. */
export const isSSERole = (role) => ['admin', 'sse'].includes(role);

/** JE (or legacy worker) — field worker who acts on work orders. */
export const isJERole = (role) => ['worker', 'je'].includes(role);

/** DEN — district engineer, oversight tier. */
export const isDENRole = (role) => role === 'den';

/** Short human label for a role chip. */
export const roleLabel = (role) => {
  switch (role) {
    case 'den': return 'DEN';
    case 'sse': return 'SSE';
    case 'je': return 'JE';
    case 'admin': return 'admin';
    case 'worker': return 'worker';
    default: return role || '—';
  }
};
