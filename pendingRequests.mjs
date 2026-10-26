/** Retry small invitation requests after a connector reconnect; fail all others. */
export function recoverPendingRequestsForSocketClose(pending, socket) {
  const retry = [];
  const failed = [];
  for (const [id, item] of pending) {
    if (item.socket !== socket) continue;
    if (item.retryOnReconnect && item.retries < item.maxRetries) {
      item.retries += 1;
      item.socket = null;
      item.awaitingReconnect = true;
      item.started = false;
      item.upstreamStatus = null;
      item.upstreamHeaders = {};
      item.responseChunks = [];
      item.responseBytes = 0;
      retry.push({ id, item });
    } else {
      pending.delete(id);
      clearTimeout(item.timer);
      failed.push(item);
    }
  }
  return { retry, failed };
}
