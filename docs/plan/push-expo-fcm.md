# Plan — Push Notification Expo (FCM/APNS) — WA Hold (Mahal)

> Keputusan 2026-08-30: **Pakai Push Notification di aplikasi mobile saja, tidak pakai WhatsApp** (WA Cloud API $0.03-0.06/conv, butuh verifikasi bisnis, mahal). WA di-hold. Hanya `.md` di fase ini — tidak ubah aplikasi.

## Tujuan
- Notifikasi lapangan `SCHEDULED→LOADING→IN_TRANSIT→ARRIVED→UNLOADED→POD_SUBMITTED` ke `QUARRY_CHECKER`/`SITE_CHECKER`/`MANAGEMENT`
- Bisnis `invoice OVERDUE`, `payment`, `ABOVE_TOLERANCE`, `HPP daily` ke `MANAGEMENT`/`FINANCE`
- Deep link `quarry/:id` `site/:id` `finance` buka ritase langsung

## Arsitektur (rencana — belum ubah kode)
```sql
-- 0016_push.sql (nanti saat eksekusi)
CREATE TABLE push_tokens (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  expo_push_token text NOT NULL,
  device text,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  title text, body text, data jsonb,
  status text DEFAULT 'PENDING', -- PENDING/SENT/FAILED
  created_at timestamptz DEFAULT now()
);
-- RLS: SERVICE_ROLE insert, user read own
```

- `apps/mobile/src/utils/push.ts` — `registerForPushNotificationsAsync()` (`Notifications.getExpoPushTokenAsync`, `getDevicePushTokenAsync`, `Android channel #003C16`, `Permissions`), `saveToken` ke `push_tokens`, `addNotificationReceivedListener` deep link `MainTabs`.
- `supabase/functions/send-push/index.ts` (Deno) — `fetch https://exp.host/--/api/v2/push/send` fanout `push_tokens where role`, `EXPO_ACCESS_TOKEN` opsional, update `push_outbox`.
- Trigger fire-and-forget (tidak block `offlineQueue`): `AppContext` setelah `IN_TRANSIT/ARRIVED/POD_SUBMITTED` + `Finance` `OVERDUE` → `supabase.functions.invoke('send-push')` dengan `to role` (mis. `ARRIVED → SITE_CHECKER`).
- `app.json` `android.googleServicesFile` `ios.googleServicesFile` + `eas.json` env, `expo-notifications` `expo-device` `expo-constants`.

## Keamanan
- `push_tokens` per `user_id`, `wa_opt_in` tidak perlu; `push_outbox` `SERVICE_ROLE` insert.
- Rate limit per ritase (1 push per status), template `title/body` baku.

## Biaya
- Gratis (Expo Push Service) + `supabase/functions` free tier. Fallback offline: `push_outbox` + `Realtime` saat online ulang.

## Eksekusi (1.5 hari saat approved, setelah polish bisnis B1)
1. `0016_push.sql` push_tokens/outbox
2. `push.ts` + `App.tsx` register + `MainTabs` deep link
3. `send-push` Edge Function + test `QUARRY→SITE ARRIVED` push
4. `turbo check-types 7/7` + `eas build` cek token

## Hold WA
- `docs/plan/whatsapp-cloud-api.md` tetap ada tapi status **HOLD — mahal, tidak dipakai**. Jika vendor tanpa app butuh notifikasi eksternal, fallback WA bisa diaktifkan nanti via `WHATSAPP_PROVIDER` env (tanpa ubah push).

## Exit
- `QUARRY_CHECKER` terima push `IN_TRANSIT`, `SITE_CHECKER` `ARRIVED`, `MANAGEMENT` `ABOVE_TOLERANCE`/`OVERDUE`, tap push buka ritase, `check-types` hijau.
