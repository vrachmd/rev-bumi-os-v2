# Roadmap Polish Icons — Emoji → react-icon (Web & Mobile)

> Masalah: mobile `MainTabs.tsx:13` `ICONS` emoji `📊⛏️🏗️🧾💰`, `FinanceScreen.tsx` KPI `📈⛏️🚚🧾`, `QuarryScreen` watermark `🧾📅📍` — tidak konsisten, tidak scalable, tidak ada warna/size control. Web sudah `lucide-react` tapi beberapa tempat masih emoji.

## Prinsip UI/UX
- **Konsisten:** 1 library icon untuk semua — `lucide-react` (web) + `lucide-react-native` (mobile) atau `@expo/vector-icons` (Ionicons). Warna & size via props, bukan emoji.
- **Aksesibilitas:** icon + label, bukan emoji saja.

## Kontrak file
- Mobile:
  - `apps/mobile/src/navigation/MainTabs.tsx:13` `ICONS` emoji → `lucide-react-native` (`LayoutDashboard`, `Mountain`, `Building2`, `FileText`, `Wallet`) atau `Ionicons`.
  - `apps/mobile/src/screens/FinanceScreen.tsx:1` KPI `kpiIcon: 📈→ TrendingUp`, `⛏️→ Mountain`, `🚚→ Truck`, `🧾→ FileText`; hero `💰→ Wallet`; watermark `🧾📅📍→ FileText/Calendar/MapPin`.
  - `apps/mobile/src/screens/QuarryScreen.tsx:1` watermark `📅📍→ Calendar/MapPin`, preview `⚠️→ AlertTriangle`.
  - `apps/mobile/src/screens/RekonsilScreen.tsx:1` chart `📊→ BarChart3`.
  - Tambah deps: `lucide-react-native` + `react-native-svg` (peer) atau pakai `@expo/vector-icons` yang sudah ada via expo.

- Web:
  - Audit `apps/web/src/components/**/*` emoji → ganti `lucide-react` (`DollarSign`, `TrendingUp`, `Truck`, `Mountain` sudah ada — cek sisa `📦`/`⚠️`).

## Langkah
1. `npm install --workspace=mobile lucide-react-native react-native-svg` (atau pakai `@expo/vector-icons` tanpa install).
2. Ganti `MainTabs` `ICONS` ke komponen `Lucide` + `tabBarIcon` render `<Mountain size={18} color={...} />`.
3. Ganti `FinanceScreen` `kpiIconWrap` emoji → `<View><TrendingUp size={14} color="#0EA5E9" /></View>`.
4. Hapus emoji di `QuarryScreen` watermark & `RekonsilScreen`.
5. `turbo check-types` + `turbo lint` + `eas update` OTA.

## Exit
- `grep -r "📊\|⛏️\|🏗️\|🧾\|💰\|⚠️" apps/mobile/src` = 0.
- `MainTabs` & `Finance` render icon vektor, warna konsisten `REV #003C16`.
