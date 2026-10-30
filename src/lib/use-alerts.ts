import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { alertsOn, markSeen } from "./alerts";

/**
 * Opens the right screen when an alert is tapped, and resets "seen up to"
 * whenever the app comes to the front, so you're only pinged about news you
 * haven't seen in the app.
 */
export function useAlerts(signedIn: boolean) {
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!signedIn || !last) return;
    const url = last.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/")) router.push(url as Href);
  }, [signedIn, last]);

  useEffect(() => {
    if (!signedIn) return;
    const seen = () => alertsOn().then((on) => (on ? markSeen() : undefined));
    seen().catch(() => undefined);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") seen().catch(() => undefined);
    });
    return () => sub.remove();
  }, [signedIn]);
}
