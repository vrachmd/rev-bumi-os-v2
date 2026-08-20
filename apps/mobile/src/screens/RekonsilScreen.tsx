import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BarChart3 } from 'lucide-react-native';
import { evaluateTolerance } from 'shared-engine';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { formatVolume, labelFrom } from '../utils/format';

export const RekonsilScreen: React.FC = () => {
  const { deliveries, products, quarries, vendors, contracts, profile, advancePod } = useAppStore();
  const isManager = profile.role === 'MANAGEMENT';
  const [viewer, setViewer] = useState<{
    uri: string;
    timestamp: string;
    place?: string;
    gps?: { lat: number; lng: number };
  } | null>(null);

  const rekon = deliveries.filter(
    (d) => d.receivedVolumeM3 !== undefined && d.receivedVolumeM3 > 0
  );

  const within = rekon.filter(
    (d) => evaluateTolerance(d.variancePercent ?? 0, 2) === 'WITHIN_TOLERANCE'
  ).length;
  const above = rekon.length - within;
  const totalM3 = rekon.reduce((s, d) => s + (d.receivedVolumeM3 ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Rekonsiliasi</Text>
        <Text style={styles.subtitle}>Kubikasi muat vs terima & ambang toleransi 2%</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.sumCell}>
          <Text style={styles.sumValue}>{rekon.length}</Text>
          <Text style={styles.sumLabel}>Ritase Selesai</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={[styles.sumValue, { color: '#16A34A' }]}>{within}</Text>
          <Text style={styles.sumLabel}>Dalam Toleransi</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={[styles.sumValue, { color: '#DC2626' }]}>{above}</Text>
          <Text style={styles.sumLabel}>Di Atas Toleransi</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={[styles.sumValue, { color: '#B45309' }]}>{totalM3.toFixed(1)}</Text>
          <Text style={styles.sumLabel}>m³ Terima</Text>
        </View>
      </View>

      {/* Chart variance per quarry — polish */}
      {rekon.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}><BarChart3 size={14} color="#0F172A" /><Text style={styles.chartTitle}> Variance per Quarry (avg %)</Text></View>
          {quarries.map((q) => {
            const list = rekon.filter((d) => d.quarryId === q.id);
            if (list.length === 0) return null;
            const avg = list.reduce((s, d) => s + Math.abs(d.variancePercent ?? 0), 0) / list.length;
            const bar = Math.min(100, (avg / 5) * 100); // 5% = full
            const color = avg <= 2 ? '#16A34A' : avg <= 3.5 ? '#F59E0B' : '#DC2626';
            return (
              <View key={q.id} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{q.name.replace('Quarry ', '')}</Text>
                <View style={styles.chartBarBg}>
                  <View style={[styles.chartBarFill, { width: `${bar}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.chartValue, { color }]}>{avg.toFixed(2)}% · {list.length} rit</Text>
              </View>
            );
          })}
          <Text style={styles.chartHint}>Batas toleransi kontrak 2% · &gt;3.5% butuh investigasi (qmc density per quarry)</Text>
        </View>
      )}

      <FlatList
        data={rekon}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada ritase yang selesai direkonsiliasi.</Text>
        }
        renderItem={({ item }) => {
          const product = labelFrom(products, item.productId);
          const quarry = labelFrom(quarries, item.quarryId);
          const vendor = labelFrom(vendors, item.transportVendorId);
          const contract = contracts.find((c) => c.id === item.contractId);
          const projectName = contract ? labelFrom(contracts, item.contractId) : '-';
          // tanggal kirim: scheduledAt || createdAt
          const tgl = (() => {
            const d = new Date(item.scheduledAt || item.createdAt);
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          })();
          const variance = item.varianceM3 ?? 0;
          const percent = item.variancePercent ?? 0;
          const toleranceStatus = evaluateTolerance(percent, 2);
          const ok = toleranceStatus === 'WITHIN_TOLERANCE';
          const selisihColor =
            variance > 0 ? '#DC2626' : variance < 0 ? '#16A34A' : '#0F172A';

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.sj}>{item.deliveryNumber}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSub}>{tgl} · {projectName}</Text>
              <Text style={styles.cardMain}>{product} · {quarry} · {vendor}</Text>

              <View style={styles.volRow}>
                <View style={styles.volCell}>
                  <Text style={styles.volLabel}>MUAT</Text>
                  <Text style={styles.volValue}>{formatVolume(item.loadedVolumeM3)}</Text>
                </View>
                <View style={styles.volCell}>
                  <Text style={styles.volLabel}>TERIMA</Text>
                  <Text style={styles.volValue}>{formatVolume(item.receivedVolumeM3 ?? 0)}</Text>
                </View>
                <View style={styles.volCell}>
                  <Text style={styles.volLabel}>SELISIH</Text>
                  <Text style={[styles.volValue, { color: selisihColor }]}>
                    {variance === 0 ? '0.00' : `${variance > 0 ? '−' : '+'}${Math.abs(variance).toFixed(2)}`}
                  </Text>
                </View>
              </View>

              <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeAlert]}>
                <Text style={[styles.badgeText, ok ? styles.badgeTextOk : styles.badgeTextAlert]}>
                  {ok
                    ? '✓ WITHIN TOLERANCE'
                    : `⚠ ABOVE TOLERANCE (${percent.toFixed(2)}% > 2%) — Investigasi deviasi`}
                </Text>
              </View>

              {item.photoUri && (
                <Pressable
                  style={styles.evidenceBtn}
                  onPress={() =>
                    setViewer({
                      uri: item.photoUri ?? '',
                      timestamp: item.evidenceAt ?? '',
                      place: item.evidencePlace,
                      gps: item.evidenceGps,
                    })
                  }
                >
                  <Text style={styles.evidenceBtnText}>📸 Lihat Bukti Pengiriman</Text>
                </Pressable>
              )}

              {isManager && (item.status === 'POD_SUBMITTED' || item.status === 'POD_VERIFIED') && (
                <Pressable style={styles.resolveBtn} onPress={() => advancePod(item.id)}>
                  <Text style={styles.resolveBtnText}>
                    {item.status === 'POD_SUBMITTED' ? '✓ Verifikasi e-POD' : '✓ Selesaikan Delivery'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <EvidenceViewer
        visible={!!viewer}
        uri={viewer?.uri}
        timestamp={viewer?.timestamp}
        place={viewer?.place}
        gps={viewer?.gps}
        label="Bukti Pengiriman"
        onClose={() => setViewer(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#003C16',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#A7D7B6', fontSize: 12, marginTop: 2 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
  },
  sumCell: { flex: 1, alignItems: 'center' },
  sumValue: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  sumLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 2, textTransform: 'uppercase' },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  chartTitle: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  chartLabel: { fontSize: 10, fontWeight: '700', color: '#475569', width: 90 },
  chartBarBg: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  chartBarFill: { height: 10, borderRadius: 5 },
  chartValue: { fontSize: 10, fontWeight: '800', width: 90, textAlign: 'right' },
  chartHint: { fontSize: 9, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 24, fontSize: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sj: { fontSize: 13, fontWeight: '800', color: '#003C16' },
  cardMain: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginTop: 6 },
  cardSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  volRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 10,
  },
  volCell: { flex: 1, alignItems: 'center' },
  volLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  volValue: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  badge: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  badgeOk: { backgroundColor: '#ECFDF5' },
  badgeAlert: { backgroundColor: '#FEF2F2' },
  badgeText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  badgeTextOk: { color: '#047857' },
  badgeTextAlert: { color: '#B91C1C' },
  resolveBtn: {
    marginTop: 10,
    backgroundColor: '#003C16',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resolveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  evidenceBtn: {
    marginTop: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  evidenceBtnText: { color: '#0369A1', fontSize: 12, fontWeight: '800' },
});