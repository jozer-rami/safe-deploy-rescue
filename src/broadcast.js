/**
 * Deploy scripts stay dry-run unless the caller opts in.
 * Set BROADCAST=1 (or DRY_RUN=0) to send the transaction.
 */
export function isBroadcastEnabled(env = process.env) {
  const broadcast = env.BROADCAST;
  if (broadcast === "1" || broadcast === "true") return true;
  if (env.DRY_RUN === "0" || env.DRY_RUN === "false") return true;
  return false;
}
