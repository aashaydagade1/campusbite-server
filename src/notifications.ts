import { Expo } from "expo-server-sdk";
import { pool } from "./db";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN || undefined });

export async function savePushToken(userId: number, token: string, platform?: string) {
  if (!Expo.isExpoPushToken(token)) throw new Error("Invalid Expo push token");
  await pool.query(`INSERT INTO notification_tokens (user_id, expo_push_token, platform) VALUES ($1,$2,$3) ON CONFLICT (expo_push_token) DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, updated_at=now()`, [userId, token, platform || null]);
}

export async function notifyUser(userId: number, title: string, body: string, data: Record<string, any> = {}) {
  const { rows } = await pool.query("SELECT expo_push_token FROM notification_tokens WHERE user_id=$1", [userId]);
  const messages = rows.filter(r => Expo.isExpoPushToken(r.expo_push_token)).map(r => ({ to: r.expo_push_token, sound: "default" as const, title, body, data }));
  if (!messages.length) return;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try { await expo.sendPushNotificationsAsync(chunk); } catch (e) { console.error("Push notification error", e); }
  }
}

export function statusMessage(status: string) {
  const map: Record<string, [string,string]> = {
    confirmed: ["Order confirmed", "Your CampusBite order has been confirmed."],
    preparing: ["Order is preparing", "Your CampusBite order is now being prepared."],
    ready: ["Order ready", "Your CampusBite order is ready for pickup."],
    completed: ["Order completed", "Your CampusBite order has been completed."],
    cancelled: ["Order cancelled", "Your CampusBite order was cancelled."]
  };
  return map[status] || ["Order updated", `Your order status is ${status}.`];
}
