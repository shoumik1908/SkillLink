/**
 * Helper to record state-changing admin actions to audit_log inside a transaction.
 * @param {import('pg').PoolClient} client - Active database client in transaction
 * @param {Object} entry
 * @param {string} entry.actorId - Admin user UUID
 * @param {string} entry.action - Action description (e.g., 'USER_ROLE_UPDATED', 'LISTING_STATUS_CHANGED')
 * @param {string} entry.targetType - 'user' | 'listing' | 'report' | 'system'
 * @param {string} entry.targetId - ID of the target resource
 * @param {Object} [entry.metadata] - Extra context (previous state, new state, reason)
 * @param {string} [entry.ipAddress] - Request IP address
 */
export async function logAudit(client, { actorId, action, targetType, targetId, metadata = {}, ipAddress = null }) {
  await client.query(
    `INSERT INTO audit_log (actor_id, user_id, action, target_type, target_id, metadata, details, ip_address, created_at)
     VALUES ($1, $1, $2, $3, $4, $5, $5, $6, NOW())`,
    [
      actorId,
      action,
      targetType,
      targetId ? String(targetId) : null,
      JSON.stringify(metadata),
      ipAddress,
    ]
  );
}
