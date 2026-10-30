import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { alertNotes } from "./alert-text";
import { api, loadSession } from "./api";
import type { AlertsRes } from "./responses";

// Order alerts without a push service: Android wakes the app in the
// background about every 15 minutes (later when the battery is low), it asks
// the shop what came in since the last check, and shows a notification.
// No Firebase account or server keys needed.

export const ALERT_TASK = "snv-order-alerts";
const ON_KEY = "snv.alerts.on";
const SINCE_KEY = "snv.alerts.since";
const CHANNEL = "orders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Looks for news since the last check and notifies. Safe to call any time. */
export async function checkAlerts(): Promise<number> {
  if ((await AsyncStorage.getItem(ON_KEY)) !== "1") return 0;
  if (!(await loadSession())) return 0;
  const since = await AsyncStorage.getItem(SINCE_KEY);
  if (!since) {
    await markSeen();
    return 0;
  }
  const res = await api.get<AlertsRes>(`alerts?since=${encodeURIComponent(since)}`);
  const notes = alertNotes(res);
  for (const n of notes) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { url: n.url } },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
  }
  await AsyncStorage.setItem(SINCE_KEY, res.now);
  return notes.length;
}

TaskManager.defineTask(ALERT_TASK, async () => {
  try {
    await checkAlerts();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // No signal or the shop is down: try again next time, from the same point.
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** You've seen everything up to now (the app is open), so don't ping about it. */
export async function markSeen() {
  await AsyncStorage.setItem(SINCE_KEY, new Date().toISOString());
}

export async function alertsOn() {
  return (await AsyncStorage.getItem(ON_KEY)) === "1";
}

/** Asks for notification permission and starts the background check. False if refused. */
export async function enableAlerts(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Orders, requests and reviews",
      importance: AndroidImportance.HIGH,
      lightColor: "#d7ff3f",
      vibrationPattern: [0, 200, 120, 200],
    });
  }
  await AsyncStorage.setItem(ON_KEY, "1");
  await markSeen();
  await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: 15 });
  return true;
}

export async function disableAlerts() {
  await AsyncStorage.setItem(ON_KEY, "0");
  if (await TaskManager.isTaskRegisteredAsync(ALERT_TASK)) await BackgroundTask.unregisterTaskAsync(ALERT_TASK);
}
