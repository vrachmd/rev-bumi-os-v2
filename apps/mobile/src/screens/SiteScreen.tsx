import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { calculateVolumeFromDimensions } from 'shared-engine';
import { useAppStore } from '../store/useAppStore';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceViewer } from '../components/EvidenceViewer';
import {
  formatClockSeconds,
  formatDateLong,
  formatVolume,
  labelFrom,
} from '../utils/format';

const SITE_GPS = { lat: -6.3054, lng: 107.0455 };

interface SiteListViewProps {
  onSelect: (id: string) => void;
}

export const SiteListView: React.FC<SiteListViewProps> = ({ onSelect }) => {
  const { deliveries, products, quarries, vendors, contracts } = useAppStore();

  const siteList = deliveries.filter(
    (d) => d.status === 'IN_TRANSIT' || d.status === 'ARRIVED' || d.status === 'UNLOADED'
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>2 · Site Project</Text>
        <Text style={styles.subtitle}>Penerimaan truk di lokasi proyek & e-POD</Text>
      </View>
      <FlatList
        data={siteList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Tidak ada truk yang perlu diproses di site.</Text>
        }
        renderItem={({ item }) => {
          const product = labelFrom(products, item.productId);
          const quarry = labelFrom(quarries, item.quarryId);
          const vendor = labelFrom(vendors, item.transportVendorId);
          const project = labelFrom(contracts, item.contractId);
          return (
            <Pressable style={styles.card} onPress={() => onSelect(item.id)}>
              <View style={styles.cardTop}>
                <Text style={styles.sj}>{item.deliveryNumber}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMain}>{product} · {quarry}</Text>
              <Text style={styles.cardProject}>Tujuan: {project}</Text>
              <Text style={styles.cardSub}>{item.plateNumber} · {item.driverName} · {vendor}</Text>
              {item.status === 'ARRIVED' ? (
                <Text style={styles.cardAccent}>Truk sudah tiba — lanjutkan pengukuran</Text>
              ) : item.status === 'UNLOADED' ? (
                <Text style={styles.cardAccent}>Menunggu tanda tangan e-POD</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};

interface SiteDetailViewProps {
  id: string;
  onBack: () => void;
}

export const SiteDetailView: React.FC<SiteDetailViewProps> = ({ id, onBack }) => {
  const { deliveries, products, quarries, vendors, contracts, getDensity, confirmArrival, recordUnloading, submitPod } =
    useAppStore();
  const [received, setReceived] = useState(() => {
    const d = deliveries.find((x) => x.id === id);
    return d && d.loadedVolumeM3 > 0 ? String(d.loadedVolumeM3) : '15.0';
  });
  const [signatureSite, setSignatureSite] = useState('');
  const [signatureDriver, setSignatureDriver] = useState('');
  const [refLength, setRefLength] = useState('6.0');
  const [refWidth, setRefWidth] = useState('2.3');
  const [refHeight, setRefHeight] = useState('1.2');
  const [viewer, setViewer] = useState<{
    uri: string;
    timestamp: string;
    place?: string;
    gps?: { lat: number; lng: number };
  } | null>(null);

  const refVolume = useMemo(
    () =>
      calculateVolumeFromDimensions(
        Number(refLength) || 0,
        Number(refWidth) || 0,
        Number(refHeight) || 0
      ),
    [refLength, refWidth, refHeight]
  );

  const panHandlers = useSwipeBack(onBack);

  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return null;

  const product = labelFrom(products, delivery.productId);
  const quarry = labelFrom(quarries, delivery.quarryId);
  const vendor = labelFrom(vendors, delivery.transportVendorId);
  const project = labelFrom(contracts, delivery.contractId);
  const arrived = delivery.status === 'ARRIVED';
  const unloaded = delivery.status === 'UNLOADED';
  const gpsLocked = arrived || unloaded;
  const variance = delivery.varianceM3 !== undefined ? delivery.varianceM3 : null;
  const density = getDensity(delivery.productId, delivery.quarryId);
  const refTons = refVolume * density;
  const siteGps = delivery.gps ?? SITE_GPS;

  const lockGps = () => {
    confirmArrival(delivery.id, siteGps);
  };

  const record = () => {
    if (!gpsLocked || !signatureSite) return;
    recordUnloading(delivery.id, {
      receivedVolumeM3: Number(received),
      gps: siteGps,
      signatureSite,
    });
  };

  const pod = () => {
    submitPod(delivery.id, signatureDriver || `TTD-D-${Date.now()}`);
    onBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} {...panHandlers}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>2 · Site Unloading</Text>
        <Text style={styles.subtitle}>
          {delivery.deliveryNumber} · {quarry} → {project}
        </Text>
        <Text style={styles.swipeHint}>‹ geser ke kiri untuk kembali</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoMain}>{product} · {vendor}</Text>
            <Text style={styles.infoSub}>Tujuan: {project}</Text>
            <Text style={styles.infoSub}>
              {delivery.plateNumber} · {delivery.driverName}
            </Text>
            <View style={styles.infoRow}>
              <View style={styles.infoCellBlock}>
                <Text style={styles.infoCell}>Muat: {formatVolume(delivery.loadedVolumeM3)}</Text>
                <Text style={styles.infoCellSub}>
                  ≈ {(delivery.loadedVolumeM3 * density).toFixed(1)} ton
                </Text>
              </View>
              {delivery.receivedVolumeM3 !== undefined && (
                <View style={styles.infoCellBlock}>
                  <Text style={styles.infoCell}>Terima: {formatVolume(delivery.receivedVolumeM3)}</Text>
                  <Text style={styles.infoCellSub}>
                    ≈ {(delivery.receivedVolumeM3 * density).toFixed(1)} ton
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.infoDensity}>
              Densitas {product}: {density.toFixed(2)} ton/m³
            </Text>
          </View>

          {delivery.photoUri ? (
            <View style={styles.evidenceCard}>
              <Text style={styles.evidenceTitle}>Bukti Loading Quarry</Text>
              <Pressable
                onPress={() =>
                  setViewer({
                    uri: delivery.photoUri ?? '',
                    timestamp: delivery.evidenceAt ?? '',
                    place: delivery.evidencePlace,
                    gps: delivery.evidenceGps,
                  })
                }
              >
                <Image source={{ uri: delivery.photoUri }} style={styles.evidencePhoto} />
              </Pressable>
              {delivery.evidenceAt ? (
                <Text style={styles.evidenceMeta}>
                   {formatDateLong(delivery.evidenceAt)} · {formatClockSeconds(delivery.evidenceAt)}
                </Text>
              ) : null}
              {delivery.evidencePlace ? (
                <Text style={styles.evidenceMeta}> {delivery.evidencePlace}</Text>
              ) : null}
              <Text style={styles.evidenceHint}>Verifikasi muatan quarry vs pengukuran di site — tap foto untuk perbesar.
              </Text>
            </View>
          ) : null}

          {delivery.status === 'IN_TRANSIT' && (
            <>
              <Text style={styles.stepTitle}>Langkah 1 · Konfirmasi Kedatangan</Text>
              <Pressable
                style={[styles.btnPrimary, gpsLocked && styles.btnDone]}
                onPress={lockGps}
              >
                <Text style={styles.btnPrimaryText}>
                  {gpsLocked ? 'GPS Terkunci' : 'Kunci GPS & Konfirmasi Tiba'}
                </Text>
              </Pressable>
              <Text style={styles.hint}>Posisi: {siteGps.lat.toFixed(4)}, {siteGps.lng.toFixed(4)}</Text>
            </>
          )}

          {arrived && (
            <>
              <Text style={styles.stepTitle}>Langkah 2 · Kubikasi Fisik Unloading</Text>

              <View style={styles.refCard}>
                <Text style={styles.refTitle}> Kalkulator Volume Bak Tronton</Text>
                <Text style={styles.refHint}>
                  Isi dimensi ukur bak (P × L × T rata-rata). Volume & tonase dihitung otomatis
                  sebagai pembanding volume terima di lapangan.
                </Text>
                <View style={styles.inputRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Panjang (m)</Text>
                    <TextInput
                      style={styles.input}
                      value={refLength}
                      onChangeText={setRefLength}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Lebar (m)</Text>
                    <TextInput
                      style={styles.input}
                      value={refWidth}
                      onChangeText={setRefWidth}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Tinggi rata-rata muatan (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={refHeight}
                    onChangeText={setRefHeight}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.refResult}>
                  <Text style={styles.refResultLabel}>Hasil Kubikasi</Text>
                  <Text style={styles.refResultValue}>{formatVolume(refVolume)}</Text>
                  <Text style={styles.refResultRow}>
                    <Text style={styles.refResultLabel}>Estimasi Tonase ({product}): </Text>
                    <Text style={styles.refResultTons}>{refTons.toFixed(1)} ton</Text>
                  </Text>
                  <Text style={styles.refResultHint}>
                    Volume × Densitas {density.toFixed(2)} ton/m³. Gunakan sebagai pembanding saat
                    mengisi Volume Terima di bawah.
                  </Text>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>Volume Terima (m³)</Text>
                <TextInput
                  style={styles.input}
                  value={received}
                  onChangeText={setReceived}
                  keyboardType="decimal-pad"
                  placeholder={delivery.loadedVolumeM3 > 0 ? formatVolume(delivery.loadedVolumeM3) : '0.00 m³'}
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.hint}>Diukur fisik di seksi proyek saat bongkar</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tanda Tangan Petugas Site</Text>
                <Pressable
                  style={[styles.signBtn, signatureSite && styles.signBtnDone]}
                  onPress={() => setSignatureSite(`TTD-S-${Date.now()}`)}
                >
                  <Text style={[styles.signText, signatureSite && styles.signTextDone]}>
                    {signatureSite ? 'Tanda tangan tercatat' : 'Tandatangani sekarang'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.btnPrimary, (!gpsLocked || !signatureSite) && styles.btnDisabled]}
                onPress={record}
                disabled={!gpsLocked || !signatureSite}
              >
                <Text style={styles.btnPrimaryText}>Catat Unloading & Hitung Selisih</Text>
              </Pressable>
            </>
          )}

          {unloaded && (
            <>
              <Text style={styles.stepTitle}>Langkah 3 · Terbitkan e-POD</Text>
              <View style={styles.formCard}>
                <Text style={styles.infoMain}>Selisih Kubikasi</Text>
                {variance !== null && (
                  <Text style={[styles.variance, variance > 0 ? styles.varianceNeg : styles.variancePos]}>
                    {variance > 0 ? `−${variance.toFixed(2)}` : `+${Math.abs(variance).toFixed(2)}`} m³ (
                    {delivery.variancePercent !== undefined ? `${delivery.variancePercent.toFixed(2)}%` : '-'})
                  </Text>
                )}
                <Text style={styles.hint}>Toleransi kontrak 2% — selisih di atas toleransi memicu investigasi deviasi</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tanda Tangan Driver</Text>
                <Pressable
                  style={[styles.signBtn, signatureDriver && styles.signBtnDone]}
                  onPress={() => setSignatureDriver(`TTD-D-${Date.now()}`)}
                >
                  <Text style={[styles.signText, signatureDriver && styles.signTextDone]}>
                    {signatureDriver ? 'Tanda tangan driver tercatat' : 'Tandatangani driver'}
                  </Text>
                </Pressable>
              </View>
              <Pressable style={styles.btnPrimary} onPress={pod}>
                <Text style={styles.btnPrimaryText}>Terbitkan e-POD (Serah Terima Digital)</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <EvidenceViewer
        visible={!!viewer}
        uri={viewer?.uri}
        timestamp={viewer?.timestamp}
        place={viewer?.place}
        gps={viewer?.gps}
        label="Bukti Loading Quarry"
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
  swipeHint: { color: '#D1FAE5', fontSize: 10, fontWeight: '600', marginTop: 6 },
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
  cardMain: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 6 },
  cardProject: { fontSize: 11, fontWeight: '800', color: '#003C16', marginTop: 3 },
  cardSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardAccent: { fontSize: 11, fontWeight: '700', color: '#0891B2', marginTop: 6 },
  formContent: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    marginBottom: 12,
  },
  infoMain: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  infoSub: { fontSize: 12, color: '#047857', marginTop: 2 },
  infoRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  infoCellBlock: { flex: 1 },
  infoCell: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  infoCellSub: { fontSize: 11, fontWeight: '700', color: '#B45309', marginTop: 2 },
  infoDensity: { fontSize: 10, color: '#047857', marginTop: 8 },
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  evidenceTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  evidencePhoto: { width: '100%', height: 130, borderRadius: 10, backgroundColor: '#F1F5F9' },
  evidenceMeta: { fontSize: 11, fontWeight: '700', color: '#047857', marginTop: 6 },
  evidenceHint: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  stepTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginTop: 4 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  refCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDBA74',
    padding: 14,
    marginBottom: 12,
  },
  refTitle: { fontSize: 13, fontWeight: '800', color: '#9A3412', marginBottom: 4 },
  refHint: { fontSize: 10, color: '#C2410C', marginBottom: 10, lineHeight: 14 },
  refResult: {
    backgroundColor: '#003C16',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  refResultLabel: { color: '#A7D7B6', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  refResultValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginVertical: 2 },
  refResultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  refResultTons: { color: '#FDE68A', fontSize: 16, fontWeight: '800' },
  refResultHint: { color: '#A7D7B6', fontSize: 9, textAlign: 'center', marginTop: 6 },
  fieldHalf: { flex: 1 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  hint: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  signBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signBtnDone: { backgroundColor: '#ECFDF5', borderColor: '#34D399', borderStyle: 'solid' },
  signText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  signTextDone: { color: '#047857' },
  variance: { fontSize: 24, fontWeight: '900', marginVertical: 6 },
  varianceNeg: { color: '#DC2626' },
  variancePos: { color: '#16A34A' },
  btnPrimary: {
    backgroundColor: '#003C16',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDone: { backgroundColor: '#059669' },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});