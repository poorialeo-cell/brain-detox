import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PartnerType, Language, ReminderTime } from '../types';
import i18n from 'i18next';

// 通知受信時の動作設定（フォアグラウンドでもバナー表示）
// Expo SDK 53+ では shouldShowAlert は deprecated。shouldShowBanner + shouldShowList を使用
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

function normalizeReminderTimes(times: ReminderTime[]): ReminderTime[] {
  const seen = new Set<string>();
  const normalized: ReminderTime[] = [];
  for (const time of times) {
    const hour = Math.min(23, Math.max(0, Math.floor(time.hour)));
    const minute = Math.min(59, Math.max(0, Math.floor(time.minute)));
    const key = `${hour}:${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ hour, minute });
  }
  normalized.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
  return normalized;
}

// ── 毎日のリマインダーを複数時刻でスケジュール ──────────────────────────
export async function scheduleDailyReminders(
  reminderTimes: ReminderTime[],
  partner: PartnerType,
): Promise<string[]> {
  // 既存の通知をキャンセルしてから再設定
  await Notifications.cancelAllScheduledNotificationsAsync();

  const normalized = normalizeReminderTimes(reminderTimes);
  const ids: string[] = [];

  for (const time of normalized) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: getPartnerName(partner),
        body: getRandomDailyMessage(partner),
        data: { screen: 'Home' satisfies NotificationScreen },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
    ids.push(id);
  }

  return ids;
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

// ── アクション・タイマーガイド終了（即時）───────────────────────────────
export async function sendTimerActionFinishedNotification(
  partner: PartnerType,
  actionTitle: string,
  appNotificationsEnabled: boolean,
): Promise<void> {
  if (!appNotificationsEnabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.timerFinishedTitle', { partner: getPartnerName(partner) }),
      body: i18n.t('notifications.timerFinishedBody', { title: actionTitle }),
      data: { screen: 'Action' satisfies NotificationScreen },
      sound: true,
    },
    trigger: null,
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
