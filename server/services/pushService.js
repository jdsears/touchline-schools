// Push notifications are currently disabled.
// To re-enable, install web-push and configure VAPID keys.

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || null

export async function sendPushToUser(userId, payload) {
  // no-op until web-push is properly configured
}

export async function sendPushToUsers(userIds, payload) {
  // no-op
}

export async function sendPushToTeam(teamId, payload, excludeUserId) {
  // no-op
}

export { VAPID_PUBLIC_KEY }
