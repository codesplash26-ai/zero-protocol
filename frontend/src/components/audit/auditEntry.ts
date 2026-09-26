import type { AuditRecord } from '../../types/contract';

/**
 * A decision-trace record (GET /audit/{decision_id}) with the title and
 * summary the backend stores for the same record ID in GET /audit. The trace
 * endpoint itself omits them; null when no matching activity was returned.
 */
export type AuditEntry = AuditRecord & { title: string | null; summary: string | null };
