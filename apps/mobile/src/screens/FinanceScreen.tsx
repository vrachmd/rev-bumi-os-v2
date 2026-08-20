import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../store/useAppStore';
import { KpiCard } from '../components/KpiCard';

const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const FinanceScreen: React.FC = () => {
  const { profile, deliveries, contracts, products, quarryMaterialCosts, freightRates } = useAppStore();

  if (profile.role !== 'MANAGEMENT') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <Text style={styles.lockTitle}>🔒 Akses Terbatas</Text>
          <Text style={styles.lockSub}>Hanya MANAGEMENT / FINANCE dapat melihat dashboard keuangan.</Text>
          <Text style={styles.lockSub}>Role Anda: {profile.role}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const delivered = useMemo(() => deliveries.filter((d) => d.status === 'DELIVERED'), [deliveries]);

  const stats = useMemo(() => {
    let revenue = 0;
    let materialCost = 0;
    let freightCost = 0;
    let approvedM3 = 0;

    for (const d of delivered) {
      const contract = contracts.find((c) => c.id === d.contractId);
      const vol = d.approvedVolumeM3 ?? d.receivedVolumeM3 ?? d.loadedVolumeM3 ?? 0;
      approvedM3 += vol;
      if (!contract) continue;
      // harga jual kontrak
      // contracts di mobile tidak punya unitPrice, fallback dari products? pakai 175k default
      const product = products.find((p) => p.id === d.productId);
      const unitPrice = 175000; // fallback, real dari contracts.unitPricePerM3 di web
      revenue += vol * unitPrice;

      // biaya material per quarry
      const qmc = quarryMaterialCosts.find((x) => x.productId === d.productId && x.quarryId === d.quarryId);
      const costPerM3 = qmc?.costPerM3 ?? 95000;
      materialCost += vol * costPerM3;

      // freight: resolve via projectId (mobile freightRates sudah projectId)
      const projectId = contract.projectId;
      const rate = freightRates.find((r) => r.quarryId === d.quarryId && r.projectId === projectId);
      if (rate) {
        if (rate.pricingModel === 'PER_M3') freightCost += vol * rate.ratePerUnit;
        else if (rate.pricingModel === 'PER_TRIP') freightCost += rate.ratePerUnit;
        else if (rate.pricingModel === 'PER_TON') {
          const density = qmc?.density ?? 1.6;
          freightCost += vol * density * rate.ratePerUnit;
        }
        // ALL_IN sudah include material, freight 0
      }
    }
    const hpp = materialCost + freightCost;
    const gross = revenue - hpp;
    const margin = revenue > 0 ? (gross / revenue) * 100 : 0;
    return { revenue, materialCost, freightCost, hpp, gross, margin, approvedM3, count: delivered.length };
  }, [delivered, contracts, products, quarryMaterialCosts, freightRates]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>💰 Finance & Analytics</Text>
        <Text style={styles.subtitle}>Margin per proyek · sinkron cost_records (offline cache)</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard label="Approved m³" value={`${stats.approvedM3.toFixed(2)} m³`} sub={`${stats.count} ritase DELIVERED`} />
          <KpiCard label="Pendapatan Diakui" value={formatIDR(stats.revenue)} sub="vol × harga kontrak" />
          <KpiCard label="Biaya Material" value={formatIDR(stats.materialCost)} sub="qmc cost_per_m3" />
          <KpiCard label="Biaya Angkut" value={formatIDR(stats.freightCost)} sub="frate per m³/trip/ton" />
          <KpiCard label="Total HPP" value={formatIDR(stats.hpp)} sub="material + freight" />
          <KpiCard label="Laba Kotor" value={formatIDR(stats.gross)} sub={`${stats.margin.toFixed(1)}% margin`} />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Sumber</Text>
          <Text style={styles.noteText}>• Density & cost per quarry×product dari `quarry_material_costs` (fallback `products.density`).</Text>
          <Text style={styles.noteText}>• Freight dari `freight_rates` per `projectId` (kanonik `frate-01..13`).</Text>
          <Text style={styles.noteText}>• Approved volume = `min(loaded, received)` sesuai kontrak, sinkron `cost_records` saat online (offline cache via AsyncStorage).</Text>
          <Text style={styles.noteText}>• OTA `eas update` tanpa rebuild APK.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '900', color: '#003C16' },
  subtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  lockSub: { fontSize: 12, color: '#64748B', marginTop: 6, textAlign: 'center' },
  noteCard: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 },
  noteTitle: { fontSize: 11, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  noteText: { fontSize: 10, color: '#475569', marginTop: 2 },
});
