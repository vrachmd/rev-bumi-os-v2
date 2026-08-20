import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrendingUp, Mountain, Truck, FileText, Wallet, Lock } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const formatIDRShort = (n: number) => {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}jt`;
  return formatIDR(n);
};
const formatPct = (n: number) => `${n.toFixed(1)}%`;

export const FinanceScreen: React.FC = () => {
  const { profile, deliveries, contracts, quarryMaterialCosts, freightRates, quarries } = useAppStore();

  if (profile.role !== 'MANAGEMENT') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.lockWrap}>
          <View style={styles.lockCard}>
            <View style={styles.lockIconWrap}><Lock size={22} color="#92400E" /></View>
            <Text style={styles.lockTitle}>Akses Terbatas</Text>
            <Text style={styles.lockSub}>Dashboard keuangan hanya untuk Direksi & Management.</Text>
            <View style={styles.lockBadge}><Text style={styles.lockBadgeText}>Role Anda: {profile.role}</Text></View>
            <Text style={styles.lockHint}>Minta akses FINANCE ke Super Admin di Supabase profiles.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const delivered = useMemo(() => deliveries.filter((d) => d.status === 'DELIVERED'), [deliveries]);

  const stats = useMemo(() => {
    let revenue = 0, materialCost = 0, freightCost = 0, approvedM3 = 0;
    const byProject = new Map<string, { vol: number; rev: number; hpp: number; count: number }>();
    for (const d of delivered) {
      const contract = contracts.find((c) => c.id === d.contractId);
      const vol = d.approvedVolumeM3 ?? d.receivedVolumeM3 ?? d.loadedVolumeM3 ?? 0;
      approvedM3 += vol;
      if (!contract) continue;
      const unitPrice = contract.unitPricePerM3 || 175000;
      const rev = vol * unitPrice;
      revenue += rev;
      const qmc = quarryMaterialCosts.find((x) => x.productId === d.productId && x.quarryId === d.quarryId);
      const rate = freightRates.find((r) => r.quarryId === d.quarryId && r.projectId === contract.projectId);
      const isAllIn = rate?.pricingModel === 'ALL_IN';
      let mat = 0, fr = 0;
      if (isAllIn) {
        fr = vol * rate!.ratePerUnit; // ALL_IN sudah include material+angkut
      } else {
        mat = vol * (qmc?.costPerM3 ?? 95000);
        if (rate) {
          if (rate.pricingModel === 'PER_M3') fr = vol * rate.ratePerUnit;
          else if (rate.pricingModel === 'PER_TRIP') fr = rate.ratePerUnit;
          else if (rate.pricingModel === 'PER_TON') fr = vol * (qmc?.density ?? 1.6) * rate.ratePerUnit;
        }
      }
      materialCost += mat;
      freightCost += fr;
      const key = contract.projectId;
      const cur = byProject.get(key) ?? { vol: 0, rev: 0, hpp: 0, count: 0 };
      cur.vol += vol; cur.rev += rev; cur.hpp += mat + fr; cur.count += 1;
      byProject.set(key, cur);
    }
    const hpp = materialCost + freightCost;
    const gross = revenue - hpp;
    const margin = revenue > 0 ? (gross / revenue) * 100 : 0;
    return { revenue, materialCost, freightCost, hpp, gross, margin, approvedM3, count: delivered.length, byProject };
  }, [delivered, contracts, quarryMaterialCosts, freightRates]);

  const heroMarginColor = stats.margin >= 25 ? '#10B981' : stats.margin >= 15 ? '#F59E0B' : '#EF4444';
  const heroMarginLabel = stats.margin >= 25 ? 'Sehat' : stats.margin >= 15 ? 'Waspada' : 'Kritis';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroEyebrow}>KEUANGAN & ANALYTICS</Text>
            <View style={styles.heroTitleRow}><Wallet size={18} color="#FFFFFF" /><Text style={styles.heroTitle}> Finance Cockpit</Text></View>
          </View>
          <View style={styles.heroDateBadge}>
            <Text style={styles.heroDateText}>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</Text>
          </View>
        </View>
        <Text style={styles.heroSub}>Margin per proyek · sinkron cost_records · OTA tanpa rebuild APK</Text>
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>LABA KOTOR · {stats.count} ritase</Text>
            <Text style={styles.heroValue}>{formatIDRShort(stats.gross)}</Text>
            <Text style={styles.heroSubValue}>{stats.approvedM3.toFixed(1)} m³ approved · {formatIDR(stats.revenue)} pendapatan</Text>
            <View style={styles.heroTrendRow}>
              <View style={[styles.heroTrendDot, { backgroundColor: heroMarginColor }]} />
              <Text style={[styles.heroTrendText, { color: heroMarginColor }]}>{heroMarginLabel} · HPP {formatIDRShort(stats.hpp)}</Text>
            </View>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: heroMarginColor }]}>
            <Text style={styles.heroBadgeText}>{formatPct(stats.margin)}</Text>
            <Text style={styles.heroBadgeSub}>margin</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI 2x2 */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#0EA5E9' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#E0F2FE' }]}><TrendingUp size={14} color="#0EA5E9" /></View>
            <Text style={styles.kpiLabel}>Pendapatan</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{formatIDRShort(stats.revenue)}</Text>
            <Text style={styles.kpiSub}>{stats.approvedM3.toFixed(1)} m³ × 175k</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#8B5CF6' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EDE9FE' }]}><Mountain size={14} color="#8B5CF6" /></View>
            <Text style={styles.kpiLabel}>Material</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{formatIDRShort(stats.materialCost)}</Text>
            <Text style={styles.kpiSub}>qmc cost/m³</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}><Truck size={14} color="#F59E0B" /></View>
            <Text style={styles.kpiLabel}>Freight</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{formatIDRShort(stats.freightCost)}</Text>
            <Text style={styles.kpiSub}>per m³/trip/ton</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#D1FAE5' }]}><FileText size={14} color="#10B981" /></View>
            <Text style={styles.kpiLabel}>HPP Total</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{formatIDRShort(stats.hpp)}</Text>
            <Text style={styles.kpiSub}>material + freight</Text>
          </View>
        </View>

        {/* Per-project */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Margin per Proyek</Text>
              <Text style={styles.sectionSub}>8 proyek · hijau ≥25% · kuning 15-25% · merah &lt;15%</Text>
            </View>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{stats.byProject.size} proyek</Text></View>
          </View>
          {Array.from(stats.byProject.entries()).slice(0, 8).map(([projectId, v]) => {
            const m = v.rev > 0 ? ((v.rev - v.hpp) / v.rev) * 100 : 0;
            const color = m >= 25 ? '#10B981' : m >= 15 ? '#F59E0B' : '#EF4444';
            const bar = Math.min(100, Math.max(8, m * 2.5));
            const projName = contracts.find((c) => c.projectId === projectId)?.name ?? projectId;
            const short = projName.replace('Proyek ', '').replace('Plant ', '').slice(0, 22);
            return (
              <View key={projectId} style={styles.projRow}>
                <View style={styles.projLeft}>
                  <Text style={styles.projName} numberOfLines={1}>{short}</Text>
                  <Text style={styles.projMeta}>{v.vol.toFixed(1)} m³ · {v.count} rit · {formatIDRShort(v.rev - v.hpp)} laba</Text>
                </View>
                <View style={styles.projBarWrap}>
                  <View style={styles.projBarBg}><View style={[styles.projBarFill, { width: `${bar}%`, backgroundColor: color }]} /></View>
                  <Text style={[styles.projPct, { color }]}>{formatPct(m)}</Text>
                </View>
              </View>
            );
          })}
          {stats.byProject.size === 0 && <Text style={styles.empty}>Belum ada ritase DELIVERED — KPI dari 0.</Text>}
        </View>

        {/* Insight */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>💡 Sumber & Catatan</Text>
          <Text style={styles.insightText}>• <Text style={styles.insightBold}>Density & cost</Text> per quarry×product dari `quarry_material_costs` (fallback `products.density 1.6`).</Text>
          <Text style={styles.insightText}>• <Text style={styles.insightBold}>Freight</Text> `frate-01..13` per `projectId` — `ALL_IN` sudah include material.</Text>
          <Text style={styles.insightText}>• <Text style={styles.insightBold}>Approved</Text> = `min(loaded, received)` toleransi 2% — update OTA `eas update` tanpa APK baru.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  hero: { backgroundColor: '#003C16', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroEyebrow: { color: '#A7F3D0', fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  heroSub: { color: '#A7F3D0', fontSize: 11, marginTop: 2 },
  heroDateBadge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  heroDateText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  heroCard: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  heroValue: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  heroSubValue: { fontSize: 10, color: '#64748B', marginTop: 2 },
  heroTrendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  heroTrendDot: { width: 6, height: 6, borderRadius: 3 },
  heroTrendText: { fontSize: 10, fontWeight: '800', marginLeft: 6 },
  heroBadge: { width: 68, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  heroBadgeText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroBadgeSub: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', opacity: 0.9 },
  content: { padding: 16, paddingBottom: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  kpiIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiIcon: { fontSize: 14 },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  kpiSub: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  section: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  sectionSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  sectionBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sectionBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  projRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  projLeft: { flex: 1 },
  projName: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  projMeta: { fontSize: 10, color: '#64748B', marginTop: 1 },
  projBarWrap: { width: 110, alignItems: 'flex-end' },
  projBarBg: { width: 110, height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  projBarFill: { height: 7, borderRadius: 4 },
  projPct: { fontSize: 10, fontWeight: '900', marginTop: 3 },
  empty: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 8 },
  lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', width: '85%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  lockIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  lockIcon: { fontSize: 22 },
  lockTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 10 },
  lockSub: { fontSize: 11, color: '#64748B', marginTop: 6, textAlign: 'center' },
  lockBadge: { marginTop: 12, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  lockBadgeText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  lockHint: { fontSize: 10, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  insightCard: { marginTop: 14, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', padding: 12 },
  insightTitle: { fontSize: 11, fontWeight: '900', color: '#92400E' },
  insightText: { fontSize: 10, color: '#92400E', marginTop: 4, lineHeight: 14 },
  insightBold: { fontWeight: '800' },
});
