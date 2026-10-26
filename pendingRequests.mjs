/** Remove only requests owned by the connector socket that just closed. */
export function detachPendingRequestsForSocket(pending, socket) {
  const detached = [];
  for (const [id, item] of pending) {
    if (item.socket !== socket) continue;
    pending.delete(id);
    clearTimeout(item.timer);
    detached.push(item);
  }
  return detached;
}
