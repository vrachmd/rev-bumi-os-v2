import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';
import { FileText, Calendar, MapPin, AlertTriangle } from 'lucide-react-native';
import { calculateVolumeFromDimensions, convertWeightToVolume } from 'shared-engine';
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

const DEFAULT_QUARRY_GPS = { lat: -6.4713, lng: 106.5246 };

const LOGO = require('../../assets/logo.png');

interface QuarryListViewProps {
  onSelect: (id: string) => void;
}

export const QuarryListView: React.FC<QuarryListViewProps> = ({ onSelect }) => {
  const { deliveries, products, quarries, vendors, contracts } = useAppStore();

  const quarryList = deliveries.filter((d) => d.status === 'SCHEDULED' || d.status === 'LOADING');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>1 · Quarry Loading</Text>
        <Text style={styles.subtitle}>Pilih ritase untuk proses pemuatan & timbang</Text>
      </View>
      <FlatList
        data={quarryList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada ritase untuk diproses di quarry.</Text>}
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
              {item.status === 'LOADING' ? (
                <Text style={styles.cardAccent}>Tercatat {formatVolume(item.loadedVolumeM3)} — lanjutkan dispatch</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};

interface QuarryDetailViewProps {
  id: string;
  onBack: () => void;
}

export const QuarryDetailView: React.FC<QuarryDetailViewProps> = ({ id, onBack }) => {
  const { deliveries, products, quarries, vendors, vehicles, getDensity, recordQuarryLoading, dispatchTruck } =
    useAppStore();
  const [method, setMethod] = useState<'WEIGHBRIDGE' | 'DIMENSION'>('WEIGHBRIDGE');
  const [grossKg, setGrossKg] = useState('38000');
  const [tareKg, setTareKg] = useState('14000');
  const [lengthM, setLengthM] = useState('6.0');
  const [widthM, setWidthM] = useState('2.3');
  const [heightM, setHeightM] = useState('1.1');
  const [signature, setSignature] = useState('');
  const [rawUri, setRawUri] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [rawDim, setRawDim] = useState({ width: 4, height: 3 });
  const [evidenceAt, setEvidenceAt] = useState('');
  const [evidenceGps, setEvidenceGps] = useState<{ lat: number; lng: number } | null>(null);
  const [evidencePlace, setEvidencePlace] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const [signatureDriver, setSignatureDriver] = useState('');
  const [viewer, setViewer] = useState<{
    uri: string;
    timestamp: string;
    place?: string;
    gps?: { lat: number; lng: number };
  } | null>(null);
  const watermarkRef = useRef<View>(null);
  const [wmReady, setWmReady] = useState(false);

  useEffect(() => {
    if (!rawUri) return;
    setWmReady(false);
  }, [rawUri]);

  useEffect(() => {
    if (!rawUri || !wmReady || photoUri) return;
    const t = setTimeout(async () => {
      const doCapture = (): Promise<string> =>
        captureRef(watermarkRef, { format: 'jpg', quality: 0.85 });
      try {
        const uri = await doCapture();
        setPhotoUri(uri);
      } catch {
        try {
          const uri = await doCapture();
          setPhotoUri(uri);
        } catch {
          setEvidenceError('Gagal membubuhkan watermark — foto tetap disimpan tanpa watermark.');
          setPhotoUri(rawUri);
        }
      }
    }, 300);
    return () => clearTimeout(t);
  }, [rawUri, evidenceGps, evidencePlace, wmReady, photoUri]);

  const panHandlers = useSwipeBack(onBack);

  const delivery = deliveries.find((d) => d.id === id);
  const density = delivery ? getDensity(delivery.productId, delivery.quarryId) : 1.6;
  const vehicle = delivery ? vehicles.find((v) => v.id === delivery.vehicleId) : null;
  const nominalM3 = vehicle ? Number(vehicle.detail.match(/([\d.]+)\s*m³/)?.[1] ?? 0) : 0;
  const maxM3 = nominalM3 * 1.05;
  const maxKg = maxM3 * density * 1000;

  const previewVolume = useMemo(() => {
    if (!delivery) return 0;
    if (method === 'WEIGHBRIDGE') {
      return convertWeightToVolume(Number(grossKg) || 0, Number(tareKg) || 0, density);
    }
    return calculateVolumeFromDimensions(
      Number(lengthM) || 0,
      Number(widthM) || 0,
      Number(heightM) || 0
    );
  }, [delivery, method, grossKg, tareKg, lengthM, widthM, heightM, density]);

  const overload = useMemo(() => {
    if (!delivery || previewVolume <= 0 || nominalM3 <= 0) return null;
    const netKg = method === 'WEIGHBRIDGE' ? (Number(grossKg) || 0) - (Number(tareKg) || 0) : 0;
    if (method === 'WEIGHBRIDGE' && netKg > maxKg) return `Overload: ${netKg.toLocaleString('id-ID')} kg > kapasitas ${maxKg.toLocaleString('id-ID')} kg (${nominalM3} m³ × ${density.toFixed(2)})`;
    if (previewVolume > maxM3) return `Overload volume: ${previewVolume.toFixed(2)} m³ > kapasitas ${nominalM3} m³ (+5% toleransi ${maxM3.toFixed(2)} m³)`;
    return null;
  }, [delivery, previewVolume, nominalM3, maxM3, maxKg, method, grossKg, tareKg, density]);

  if (!delivery) return null;

  const product = labelFrom(products, delivery.productId);
  const quarry = labelFrom(quarries, delivery.quarryId);
  const vendor = labelFrom(vendors, delivery.transportVendorId);
  const { contracts: contractsDetail } = useAppStore();
  const projectDetail = labelFrom(contractsDetail, delivery.contractId);
  const isLoading = delivery.status === 'LOADING';
  const quarryGps = quarries.find((q) => q.id === delivery.quarryId)?.gps ?? DEFAULT_QUARRY_GPS;

  const record = () => {
    // Server timestamp enforcement: evidenceAt tidak boleh beda >5 menit dari jam device (proxy server)
    if (evidenceAt && Math.abs(new Date(evidenceAt).getTime() - Date.now()) > 5 * 60 * 1000) {
      setEvidenceError('Timestamp foto tidak sesuai jam server (>5 menit) — ambil ulang foto bukti.');
      return;
    }
    if (method === 'WEIGHBRIDGE') {
      recordQuarryLoading(delivery.id, {
        method: 'WEIGHBRIDGE',
        grossKg: Number(grossKg),
        tareKg: Number(tareKg),
        densityTonPerM3: density,
        signature,
        evidenceAt,
        photoUri,
        evidenceGps: evidenceGps ?? quarryGps,
        evidencePlace: evidencePlace || undefined,
      });
    } else {
      recordQuarryLoading(delivery.id, {
        method: 'DIMENSION',
        lengthM: Number(lengthM),
        widthM: Number(widthM),
        heightM: Number(heightM),
        signature,
        evidenceAt,
        photoUri,
        evidenceGps: evidenceGps ?? quarryGps,
        evidencePlace: evidencePlace || undefined,
      });
    }
  };

  const takeEvidence = async () => {
    setEvidenceError('');
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      setEvidenceError('Izin kamera ditolak — aktifkan untuk mengambil foto bukti.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setRawUri(asset.uri);
    setPhotoUri('');
    setEvidenceAt(new Date().toISOString());
    setEvidencePlace('');
    if (asset.width && asset.height) setRawDim({ width: asset.width, height: asset.height });
    let gps = quarryGps;
    let place = '';
    try {
      const loc = await Location.requestForegroundPermissionsAsync();
      if (loc.granted) {
        const pos = await Location.getCurrentPositionAsync({});
        gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const addrs = await Location.reverseGeocodeAsync({ latitude: gps.lat, longitude: gps.lng });
        if (addrs.length) {
          const a = addrs[0];
          const parts = [a.street, a.district, a.city, a.subregion, a.region].filter(Boolean);
          place = parts.join(', ');
        }
      }
    } catch {
      // lokasi/gelocode gagal — pakai koordinat default quarry
    }
    setEvidenceGps(gps);
    setEvidencePlace(place);
  };

  const dispatch = () => {
    dispatchTruck(delivery.id, `TTD-Q-${Date.now()}`, signatureDriver || undefined);
    onBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} {...panHandlers}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Loading Quarry</Text>
        <Text style={styles.subtitle}>
          {delivery.deliveryNumber} · {quarry}
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
            <Text style={styles.infoSub}>Tujuan: {projectDetail}</Text>
            <Text style={styles.infoSub}>
              {delivery.plateNumber} · {delivery.driverName}
            </Text>
            {isLoading && (
              <Text style={styles.infoLoaded}>Tercatat: {formatVolume(delivery.loadedVolumeM3)}</Text>
            )}
          </View>

          {!isLoading && (
            <>
              <View style={styles.seg}>
                {(['WEIGHBRIDGE', 'DIMENSION'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[styles.segBtn, method === m && styles.segBtnActive]}
                  >
                    <Text style={[styles.segText, method === m && styles.segTextActive]}>
                      {m === 'WEIGHBRIDGE' ? 'Jembatan Timbang' : 'Dimensi Bak'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {method === 'WEIGHBRIDGE' ? (
                <View style={styles.formCard}>
                  <Text style={styles.fieldLabel}>Densitas Material ({product})</Text>
                  <Text style={styles.densityText}>{density.toFixed(2)} ton/m³</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Gross (kg)</Text>
                      <TextInput
                        style={styles.input}
                        value={grossKg}
                        onChangeText={setGrossKg}
                        keyboardType="numeric"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Tare (kg)</Text>
                      <TextInput
                        style={styles.input}
                        value={tareKg}
                        onChangeText={setTareKg}
                        keyboardType="numeric"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.formCard}>
                  <View style={styles.inputRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Panjang (m)</Text>
                      <TextInput style={styles.input} value={lengthM} onChangeText={setLengthM} keyboardType="decimal-pad" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Lebar (m)</Text>
                      <TextInput style={styles.input} value={widthM} onChangeText={setWidthM} keyboardType="decimal-pad" placeholderTextColor="#94A3B8" />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Tinggi rata-rata (m)</Text>
                    <TextInput style={styles.input} value={heightM} onChangeText={setHeightM} keyboardType="decimal-pad" placeholderTextColor="#94A3B8" />
                  </View>
                </View>
              )}

              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Volume Muat (m³)</Text>
                <Text style={styles.previewValue}>{formatVolume(previewVolume)}</Text>
                <Text style={styles.previewHint}>
                  Netto = Gross − Tare; Volume = Netto(ton) ÷ Densitas {density.toFixed(2)} (per quarry)
                </Text>
              </View>

              {overload && (
                <View style={styles.overloadCard}>
                  <View style={styles.overloadRow}><AlertTriangle size={14} color="#92400E" /><Text style={styles.overloadText}> {overload}</Text></View>
                </View>
              )}

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>Bukti Dokumentasi Loading (Foto)</Text>
                <Pressable
                  style={[styles.signBtn, photoUri && styles.signBtnDone]}
                  onPress={takeEvidence}
                >
                  <Text style={[styles.signText, photoUri && styles.signTextDone]}>
                    {photoUri ? '✓ Foto bukti dengan watermark' : '📸 Ambil Foto Bukti Muatan'}
                  </Text>
                </Pressable>
                {photoUri ? (
                  <>
                    <Pressable
                      onPress={() =>
                        setViewer({
                          uri: photoUri,
                          timestamp: evidenceAt,
                          place: evidencePlace || undefined,
                          gps: evidenceGps ?? undefined,
                        })
                      }
                    >
                      <Image source={{ uri: photoUri }} style={styles.evidencePhoto} />
                    </Pressable>
                    <Text style={styles.evidenceMeta}>
                      ✓ Tanggal & lokasi tercetak permanen pada foto · tap untuk perbesar
                    </Text>
                  </>
                ) : rawUri ? (
                  <>
                    <View
                      ref={watermarkRef}
                      collapsable={false}
                      style={[styles.wmWrap, { aspectRatio: rawDim.width / rawDim.height }]}
                    >
                      <Image
                        source={{ uri: rawUri }}
                        style={styles.wmImage}
                        resizeMode="cover"
                        onLoad={() => setWmReady(true)}
                        onError={() => setWmReady(true)}
                      />
                      <View style={styles.wmBar}>
                        <View style={styles.wmBrandRow}>
                          <Image source={LOGO} style={styles.wmLogo} />
                          <Text style={styles.wmBrand}>REV BUMI NUSANTARA</Text>
                        </View>
                        <View style={styles.wmDivider} />
                        <View style={styles.wmLine}><FileText size={12} color="#FFFFFF" /><Text style={styles.wmText}> {delivery.deliveryNumber}</Text></View>
                        <View style={styles.wmLine}><Calendar size={12} color="#FFFFFF" /><Text style={styles.wmText}> {formatDateLong(evidenceAt)} · {formatClockSeconds(evidenceAt)}</Text></View>
                        <View style={styles.wmLine}><MapPin size={12} color="#FFFFFF" /><Text style={styles.wmText}> {evidencePlace || (evidenceGps ? `${evidenceGps.lat.toFixed(5)}, ${evidenceGps.lng.toFixed(5)}` : 'lokasi diproses…')}</Text></View>
                      </View>
                    </View>
                    <Text style={styles.hint}>Membubuhkan watermark tanggal & lokasi…</Text>
                  </>
                ) : (
                  <Text style={styles.hint}>
                    Wajib: foto muatan saat selesai dimuat. Timestamp & lokasi otomatis tercetak
                    pada foto.
                  </Text>
                )}
                {evidenceError ? <Text style={styles.evidenceError}>{evidenceError}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tanda Tangan Petugas Quarry</Text>
                <Pressable
                  style={[styles.signBtn, signature && styles.signBtnDone]}
                  onPress={() => setSignature(`TTD-Q-${Date.now()}`)}
                >
                  <Text style={[styles.signText, signature && styles.signTextDone]}>
                    {signature ? '✓ Tanda tangan tercatat' : 'Tandatangani sekarang'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.btnPrimary, (!signature || !photoUri || !evidenceAt || previewVolume <= 0) && styles.btnDisabled]}
                onPress={record}
                disabled={!signature || !photoUri || !evidenceAt || previewVolume <= 0}
              >
                <Text style={styles.btnPrimaryText}>Catat Loading & Proses Timbang</Text>
              </Pressable>
            </>
          )}

          {isLoading && (
            <>
              {delivery.photoUri ? (
                <View style={styles.infoCard}>
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
                  <Text style={styles.infoMain}>📸 Bukti Dokumentasi</Text>
                  {delivery.evidenceAt ? (
                    <Text style={styles.infoSub}>
                      🕐 {formatDateLong(delivery.evidenceAt)} · {formatClockSeconds(delivery.evidenceAt)}
                    </Text>
                  ) : null}
                  {delivery.evidencePlace ? (
                    <Text style={styles.infoSub}>📍 {delivery.evidencePlace}</Text>
                  ) : delivery.evidenceGps ? (
                    <Text style={styles.infoSub}>
                      📍 {delivery.evidenceGps.lat.toFixed(5)}, {delivery.evidenceGps.lng.toFixed(5)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tanda Tangan Supir (Opsional)</Text>
                <Pressable
                  style={[styles.signBtn, signatureDriver && styles.signBtnDone]}
                  onPress={() => setSignatureDriver(`TTD-DR-Q-${Date.now()}`)}
                >
                  <Text style={[styles.signText, signatureDriver && styles.signTextDone]}>
                    {signatureDriver ? '✓ Tanda tangan supir tercatat' : 'Tandatangani supir (opsional)'}
                  </Text>
                </Pressable>
              </View>
              <Pressable style={styles.btnPrimary} onPress={dispatch}>
                <Text style={styles.btnPrimaryText}>✓ Berangkatkan Truk (In-Transit)</Text>
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
  cardAccent: { fontSize: 11, fontWeight: '700', color: '#EA580C', marginTop: 6 },
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
  infoLoaded: { fontSize: 12, fontWeight: '700', color: '#B45309', marginTop: 6 },
  seg: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#003C16' },
  segText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segTextActive: { color: '#FFFFFF' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  fieldHalf: { flex: 1 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
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
  densityText: { fontSize: 14, fontWeight: '800', color: '#003C16', marginBottom: 8 },
  preview: {
    backgroundColor: '#003C16',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  previewLabel: { color: '#A7D7B6', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  previewValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginVertical: 2 },
  previewHint: { color: '#A7D7B6', fontSize: 9, textAlign: 'center' },
  overloadCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  overloadRow: { flexDirection: 'row', alignItems: 'center' },
  overloadText: { fontSize: 11, fontWeight: '800', color: '#92400E', flex: 1 },
  wmLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
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
  hint: { fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
  evidencePhoto: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#F1F5F9',
  },
  wmWrap: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  wmImage: { width: '100%', height: '100%' },
  wmBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  wmBrandRow: { flexDirection: 'row', alignItems: 'center' },
  wmLogo: { width: 38, height: 38, marginRight: 10 },
  wmBrand: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wmDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 6 },
  wmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  evidenceMeta: { fontSize: 11, fontWeight: '700', color: '#047857', marginTop: 6 },
  evidenceError: { fontSize: 11, fontWeight: '700', color: '#DC2626', marginTop: 6, textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#003C16',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});