import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PartnerType, Language } from '../types';
import i18n from 'i18next';

// 通知受信時の動作設定（フォアグラウンドでもバナー表示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationScreen = 'Home' | 'Action';

// ── 権限取得 ──────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Expo Push Token取得（Firebase連携用） ─────────────────────────────
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch {
    return null;
  }
}

// ── 通知メッセージ取得 ────────────────────────────────────────────────
function getPartnerName(partner: PartnerType): string {
  return i18n.t(`partner.${partner}.name`);
}

function getRandomDailyMessage(partner: PartnerType): string {
  const messages = i18n.t(`notifications.daily.${partner}`, { returnObjects: true }) as string[];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ── 毎日のリマインダーをスケジュール ─────────────────────────────────
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  partner: PartnerType,
): Promise<string> {
  // 既存の通知をキャンセルしてから再設定
  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: getPartnerName(partner),
      body: getRandomDailyMessage(partner),
      data: { screen: 'Home' satisfies NotificationScreen },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  // 朝の通知も追加（7:30固定）
  await Notifications.scheduleNotificationAsync({
    content: {
      title: getPartnerName(partner),
      body: i18n.t(`notifications.morning.${partner}`),
      data: { screen: 'Action' satisfies NotificationScreen },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 30,
    },
  });

  return id;
}

// ── 全通知キャンセル ──────────────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}

// ── 緊急介入通知（スコアが低い場合）──────────────────────────────────
export async function sendInterventionNotification(partner: PartnerType): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ${getPartnerName(partner)}`,
      body: i18n.t(`notifications.intervention.${partner}`),
      data: { screen: 'Action' satisfies NotificationScreen },
      sound: true,
    },
    trigger: null, // 即時送信
  });
}

// ── テスト通知（設定画面用）───────────────────────────────────────────
export async function sendTestNotification(partner: PartnerType): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${getPartnerName(partner)} 📬`,
      body: getRandomDailyMessage(partner),
      data: { screen: 'Home' satisfies NotificationScreen },
      sound: true,
    },
    trigger: null, // 即時送信
  });
}

// ── スコアを監視して自動介入（呼び出し元がスコア変化時に使用）────────
export async function checkAndIntervene(
  score: number,
  partner: PartnerType,
  notificationsEnabled: boolean,
): Promise<void> {
  if (!notificationsEnabled) return;
  if (score <= 20) {
    await sendInterventionNotification(partner);
  }
}
