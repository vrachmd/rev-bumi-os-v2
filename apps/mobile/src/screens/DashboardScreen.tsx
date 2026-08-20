import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppStore, NewRitaseInput } from '../store/useAppStore';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { Select } from '../components/Select';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { formatClock, formatDateShort, formatVolume, formatRupiah, labelFrom } from '../utils/format';
import { calculateEta, formatDistance, formatDuration, getRouteWithFallback } from '../utils/osrm';
import type { DeliveryItem, MobileRole, FreightRateItem } from '../types';

const ROLE_OPTIONS: { role: MobileRole; label: string }[] = [
  { role: 'QUARRY_CHECKER', label: 'Quarry' },
  { role: 'SITE_CHECKER', label: 'Site' },
  { role: 'MANAGEMENT', label: 'Direksi' },
];

const ROLE_NAMES: Record<MobileRole, string> = {
  QUARRY_CHECKER: 'Petugas Quarry',
  SITE_CHECKER: 'Petugas Site',
  MANAGEMENT: 'Direksi & Manajemen',
};

const LOGO_WHITE = require('../../assets/logo-white.png');

const emptyForm: NewRitaseInput = {
  contractId: 'cont-01',
  productId: 'prod-01',
  quarryId: 'quarry-01',
  transportVendorId: 'vendor-01',
  vehicleId: 'veh-01',
  driverName: '',
  driverPhone: '',
};

const toForm = (d: DeliveryItem): NewRitaseInput => ({
  contractId: d.contractId,
  productId: d.productId,
  quarryId: d.quarryId,
  transportVendorId: d.transportVendorId,
  vehicleId: d.vehicleId,
  driverName: d.driverName,
  driverPhone: d.driverPhone,
});

export const DashboardScreen: React.FC = () => {
  const {
    profile,
    setProfile,
    deliveries,
    products,
    quarries,
    vendors,
    contracts,
    vehicles,
    freightRates,
    isOnline,
    pendingCount,
    lastSyncAt,
    isReplaying,
    refreshQueueStatus,
    addVendor,
    addVehicle,
    addRitase,
    editRitase,
    deleteRitase,
  } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const setOnline = useAppStore((s) => s.setOnline);
  useEffect(() => {
    void refreshQueueStatus();
  }, [refreshQueueStatus]);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshQueueStatus();
    if (isOnline) setOnline(true);
    // beri waktu replay
    setTimeout(() => setRefreshing(false), 800);
  };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewRitaseInput>(emptyForm);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorDetail, setNewVendorDetail] = useState('');
  const [newVendorSupplyType, setNewVendorSupplyType] = useState<'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT'>('TRANSPORT_ONLY');
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleDetail, setNewVehicleDetail] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeliveryItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [detailTarget, setDetailTarget] = useState<DeliveryItem | null>(null);
  const [viewer, setViewer] = useState<{
    uri: string;
    timestamp: string;
    place?: string;
    gps?: { lat: number; lng: number };
  } | null>(null);
  const [etaData, setEtaData] = useState<{
    distance: number;
    duration: number;
    eta: string;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [cardEtas, setCardEtas] = useState<Record<string, { 
    distance: number; 
    duration: number; 
    eta: string; 
    destination: string; 
    loading: boolean 
  }>>({});

  const panHandlers = useSwipeBack(() => closeForm(), showForm);

  // Asal & tujuan rute SELALU dari master data quarry & kontrak,
  // bukan dari evidenceGps/gps yang bisa tertimpa lokasi GPS perangkat saat foto/kedatangan.
  const routeOriginOf = (d: DeliveryItem) => quarries.find((q) => q.id === d.quarryId)?.gps;
  const routeDestinationOf = (d: DeliveryItem) => contracts.find((c) => c.id === d.contractId)?.gps;

  React.useEffect(() => {
    const d = detailTarget;
    if (!d) return;
    const origin = routeOriginOf(d);
    const dest = routeDestinationOf(d);
    if (d.status !== 'IN_TRANSIT' || !origin || !dest) {
      console.log('[ETA Debug] Tidak menghitung ETA:', d.deliveryNumber, 'status:', d.status);
      setEtaData(null);
      return;
    }
    setEtaData({ distance: 0, duration: 0, eta: '', loading: true, error: null });
    getRouteWithFallback(origin, dest)
      .then((route) => {
        const departure = d.evidenceAt ? new Date(d.evidenceAt) : new Date();
        const eta = calculateEta(departure.toISOString(), route.duration);
        setEtaData({
          distance: route.distance,
          duration: route.duration,
          eta,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        console.error('[ETA Debug] Error:', err);
        setEtaData({ distance: 0, duration: 0, eta: '', loading: false, error: 'Error jaringan' });
      });
  }, [detailTarget]);

  const recent = React.useMemo(
    () =>
      [...deliveries]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [deliveries]
  );

  // Pre-fetch ETA for IN_TRANSIT items in recent list
React.useEffect(() => {
    const inTransitItems = recent.filter(
      (d) => d.status === 'IN_TRANSIT' && routeOriginOf(d) && routeDestinationOf(d)
    );
    if (inTransitItems.length === 0) return;

    inTransitItems.forEach((d) => {
      const origin = routeOriginOf(d)!;
      const dest = routeDestinationOf(d)!;
      // Set loading state immediately (only if not already loaded)
      setCardEtas((prev) => {
        if (prev[d.id] && !prev[d.id].loading) return prev;
        return {
          ...prev,
          [d.id]: { distance: 0, duration: 0, eta: '', destination: '', loading: true },
        };
      });

      getRouteWithFallback(origin, dest)
        .then((route) => {
          const departure = d.evidenceAt ? new Date(d.evidenceAt) : new Date();
          const eta = calculateEta(departure.toISOString(), route.duration);
          const destinationName = labelFrom(contracts, d.contractId);
          setCardEtas((prev) => ({
            ...prev,
            [d.id]: {
              distance: route.distance,
              duration: route.duration,
              eta,
              destination: destinationName,
              loading: false,
            },
          }));
        })
        .catch((err) => {
          console.error('Card ETA error:', err);
          setCardEtas((prev) => ({
            ...prev,
            [d.id]: { distance: 0, duration: 0, eta: '', destination: 'Gagal memuat', loading: false },
          }));
        });
    });
  }, [recent]);

  const canAddRitase = profile.role === 'QUARRY_CHECKER' || profile.role === 'MANAGEMENT';

  const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT').length;
  const scheduled = deliveries.filter((d) => d.status === 'SCHEDULED').length;
  const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const totalM3 = deliveries.reduce((s, d) => s + d.loadedVolumeM3, 0);

  const set = <K extends keyof NewRitaseInput>(key: K, value: NewRitaseInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectVendor = (vendorId: string) => {
    setForm((f) => {
      const belongs = vehicles.some((v) => v.id === f.vehicleId && v.vendorId === vendorId);
      return { ...f, transportVendorId: vendorId, vehicleId: belongs ? f.vehicleId : '' };
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: DeliveryItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowNewVendor(false);
    setShowNewVehicle(false);
    setNewVendorName('');
    setNewVendorDetail('');
    setNewVehicleName('');
    setNewVehicleDetail('');
  };

  // Resolusi tarif: kanonik projectId (freight_rates.project_id ↔ web FreightRate.projectId)
  const projectIdOf = (contractId: string): string =>
    contracts.find((c) => c.id === contractId)?.projectId ?? '';
  const resolveRate = (vendorId: string, quarryId: string, projectId: string): FreightRateItem | undefined => {
    return freightRates.find((r) => r.vendorId === vendorId && r.quarryId === quarryId && r.projectId === projectId);
  };

  // Vendor yang punya tarif untuk rute terpilih
  const eligibleVendorIds = React.useMemo(() => {
    const pid = projectIdOf(form.contractId);
    if (!pid) return [];
    return freightRates.filter((r) => r.quarryId === form.quarryId && r.projectId === pid).map((r) => r.vendorId);
  }, [form.quarryId, form.contractId, freightRates, contracts]);

  const eligibleVendors = vendors.filter((v) => eligibleVendorIds.includes(v.id));

  // Tarif yang berlaku untuk vendor terpilih
  const resolvedRate = resolveRate(form.transportVendorId, form.quarryId, projectIdOf(form.contractId));

  const saveNewVendor = () => {
    const name = newVendorName.trim();
    if (!name) return;
    const id = addVendor(name, newVendorDetail.trim(), newVendorSupplyType);
    setForm((f) => ({ ...f, transportVendorId: id, vehicleId: '' }));
    setShowNewVendor(false);
    setNewVendorName('');
    setNewVendorDetail('');
    setNewVendorSupplyType('TRANSPORT_ONLY');
  };

  const saveNewVehicle = () => {
    const name = newVehicleName.trim();
    if (!name) return;
    const id = addVehicle(form.transportVendorId, name, newVehicleDetail.trim());
    set('vehicleId', id);
    setShowNewVehicle(false);
    setNewVehicleName('');
    setNewVehicleDetail('');
  };

  const submit = () => {
    if (!form.driverName.trim()) return;
    if (!resolvedRate) {
      alert('Vendor belum punya tarif aktif untuk rute ini. Atur tarif di web sebelum terbitkan.');
      return;
    }
    if (editingId) {
      editRitase(editingId, form);
    } else {
      addRitase(form);
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    deleteRitase(deleteTarget.id, deleteReason.trim());
    setDeleteTarget(null);
    setDeleteReason('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} {...(showForm ? panHandlers : {})}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={LOGO_WHITE} style={styles.brandLogo} />
          <View>
            <Text style={styles.brand}>REV BUMI NUSANTARA OS</Text>
            <Text style={styles.headerSub}>Sistem Operasi Rantai Pasok Material Konstruksi</Text>
          </View>
        </View>
        <View style={styles.roleBox}>
          <Text style={styles.roleLabel}>Switch Role</Text>
          <View style={styles.roleBtns}>
            {ROLE_OPTIONS.map(({ role, label }) => (
              <Pressable
                key={role}
                onPress={() => setProfile({ name: ROLE_NAMES[role], role })}
                style={[styles.roleBtn, profile.role === role && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, profile.role === role && styles.roleBtnTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline — ritase disimpan lokal, akan sync otomatis saat online</Text>
          {pendingCount > 0 && <Text style={styles.offlineBannerSub}>{pendingCount} pending di antrian</Text>}
        </View>
      )}
      {isOnline && pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>{pendingCount} ritase pending sync — menyinkronkan...</Text>
          {lastSyncAt && <Text style={styles.pendingBannerSub}>Last sync: {new Date(lastSyncAt).toLocaleTimeString()}</Text>}
          <Text style={styles.pendingBannerSub}>Jika tetap, tarik layar ke bawah untuk refresh atau restart Expo Go.</Text>
        </View>
      )}
      {isReplaying && (
        <View style={styles.replayingBanner}>
          <Text style={styles.replayingBannerText}>Replaying offline queue...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003C16']} />}
        >
          <Text style={styles.sectionTitle}>Ringkasan Operasional</Text>
          <View style={styles.kpiRow}>
            <KpiCard label="Ritase Hari Ini" value={String(deliveries.length)} sub={`${delivered} selesai`} />
            <KpiCard label="Dalam Perjalanan" value={String(inTransit)} accent="#7C3AED" />
            <KpiCard label="Terjadwal" value={String(scheduled)} accent="#2563EB" />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard label="Volume Muat" value={`${totalM3.toFixed(1)} m³`} sub="Total semua ritase" accent="#B45309" />
          </View>

          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Ritase' : 'Tambah Ritase Baru'}
              </Text>
              <Select label="Kontrak Proyek" value={form.contractId} options={contracts} onSelect={(id) => { set('contractId', id); if (!eligibleVendorIds.includes(form.transportVendorId)) set('transportVendorId', ''); }} />
              <Select label="Material" value={form.productId} options={products} onSelect={(id) => set('productId', id)} />
              <Select label="Quarry Asal" value={form.quarryId} options={quarries} onSelect={(id) => { set('quarryId', id); if (!eligibleVendorIds.includes(form.transportVendorId)) set('transportVendorId', ''); }} />
              <Select label="Vendor Transportasi" value={form.transportVendorId} options={eligibleVendors} onSelect={selectVendor} />
              <View style={{ marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: resolvedRate ? '#ECFDF5' : '#FEF3C7', borderWidth: 1, borderColor: resolvedRate ? '#A7F3D0' : '#FDE68A' }}>
                {resolvedRate ? (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: resolvedRate ? '#047857' : '#92400E' }}>
                      Tarif Angkutan Berlaku
                    </Text>
                    <Text style={{ fontSize: 11, color: resolvedRate ? '#047857' : '#92400E', marginTop: 4 }}>
                      {resolvedRate.pricingModel === 'ALL_IN'
                        ? 'All-in (material + angkut)'
                        : `Harga per ${resolvedRate.pricingModel === 'PER_TRIP' ? 'ritase' : resolvedRate.pricingModel === 'PER_TON' ? 'ton' : 'm³'}`}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                      {formatRupiah(resolvedRate.ratePerUnit)}
                      {resolvedRate.pricingModel === 'PER_TRIP' ? '/rit' : resolvedRate.pricingModel === 'PER_TON' ? '/ton' : '/m³'}
                    </Text>
                    {(resolvedRate.tollFee || resolvedRate.loadingFee || resolvedRate.unloadingFee) && (
                      <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                        + {[
                          resolvedRate.tollFee ? `Toll ${formatRupiah(resolvedRate.tollFee)}` : '',
                          resolvedRate.loadingFee ? `Muat ${formatRupiah(resolvedRate.loadingFee)}` : '',
                          resolvedRate.unloadingFee ? `Bongkar ${formatRupiah(resolvedRate.unloadingFee)}` : '',
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                    ⚠ Vendor belum punya tarif untuk rute ini — atur tarif di web sebelum terbitkan
                  </Text>
                )}
              </View>
              <Pressable style={styles.quickAddLink} onPress={() => setShowNewVendor((v) => !v)}>
                <Text style={styles.quickAddText}>{showNewVendor ? '− Batal tambah vendor' : '+ Tambah vendor baru'}</Text>
              </Pressable>
              {showNewVendor && (
                <View style={styles.quickAddBox}>
                  <Text style={styles.fieldLabel}>Nama Vendor / Perorangan</Text>
                  <TextInput
                    style={styles.input}
                    value={newVendorName}
                    onChangeText={setNewVendorName}
                    placeholder="mis. Bpk. Slamet Transport"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.fieldLabel}>Keterangan (opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVendorDetail}
                    onChangeText={setNewVendorDetail}
                    placeholder="mis. 3 armada, melayani rute Rumpin–Cisumdawu"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.fieldLabel}>Tipe Vendor</Text>
                  <View style={styles.supplyTypeRow}>
                    <Pressable
                      style={[styles.supplyTypeBtn, newVendorSupplyType === 'TRANSPORT_ONLY' && styles.supplyTypeBtnActive]}
                      onPress={() => setNewVendorSupplyType('TRANSPORT_ONLY')}
                    >
                      <Text style={[styles.supplyTypeText, newVendorSupplyType === 'TRANSPORT_ONLY' && styles.supplyTypeTextActive]}>
                        Angkut Saja
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.supplyTypeBtn, newVendorSupplyType === 'MATERIAL_AND_TRANSPORT' && styles.supplyTypeBtnActive]}
                      onPress={() => setNewVendorSupplyType('MATERIAL_AND_TRANSPORT')}
                    >
                      <Text style={[styles.supplyTypeText, newVendorSupplyType === 'MATERIAL_AND_TRANSPORT' && styles.supplyTypeTextActive]}>
                        All-in (Material + Angkut)
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]} onPress={saveNewVendor}>
                    <Text style={styles.btnPrimaryText}>Simpan Vendor</Text>
                  </Pressable>
                </View>
              )}
              <Select label="Armada Truk" value={form.vehicleId} options={vehicles.filter((v) => v.vendorId === form.transportVendorId)} onSelect={(id) => set('vehicleId', id)} />
              <Pressable style={styles.quickAddLink} onPress={() => setShowNewVehicle((v) => !v)}>
                <Text style={styles.quickAddText}>{showNewVehicle ? '− Batal tambah armada' : '+ Tambah armada baru'}</Text>
              </Pressable>
              {showNewVehicle && (
                <View style={styles.quickAddBox}>
                  <Text style={styles.fieldLabel}>Nomor Polisi / Nama Armada</Text>
                  <TextInput
                    style={styles.input}
                    value={newVehicleName}
                    onChangeText={setNewVehicleName}
                    placeholder="mis. B 1234 XYZ"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.fieldLabel}>Keterangan (opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVehicleDetail}
                    onChangeText={setNewVehicleDetail}
                    placeholder="mis. Tronton 22 m³"
                    placeholderTextColor="#94A3B8"
                  />
                  <Pressable style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]} onPress={saveNewVehicle}>
                    <Text style={styles.btnPrimaryText}>Simpan Armada</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nama Driver</Text>
                <TextInput
                  style={styles.input}
                  value={form.driverName}
                  onChangeText={(v) => set('driverName', v)}
                  placeholder="Nama lengkap supir"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>No. HP Driver</Text>
                <TextInput
                  style={styles.input}
                  value={form.driverPhone}
                  onChangeText={(v) => set('driverPhone', v)}
                  placeholder="08xx-xxxx-xxxx"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={closeForm}>
                  <Text style={styles.btnGhostText}>Batal</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={submit}>
                  <Text style={styles.btnPrimaryText}>
                    {editingId ? 'Simpan Perubahan' : 'Simpan Ritase'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            canAddRitase && (
              <Pressable style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Tambah Ritase Baru</Text>
              </Pressable>
            )
          )}

          <Text style={styles.sectionTitle}>Ritase Terbaru</Text>
          <FlatList
            data={recent}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.empty}>Belum ada ritase.</Text>
            }
            renderItem={({ item }) => {
              const product = labelFrom(products, item.productId);
              const quarry = labelFrom(quarries, item.quarryId);
              const vendor = labelFrom(vendors, item.transportVendorId);
              const siteName = labelFrom(contracts, item.contractId);
              const destRaw = cardEtas[item.id]?.destination ?? '';
              const isCoord = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(destRaw.trim());
              const destLabel = isCoord ? siteName : destRaw;
              const editable = canAddRitase && item.status === 'SCHEDULED';
              return (
                <Pressable style={styles.card} onPress={() => setDetailTarget(item)}>
                  <View style={styles.cardTop}>
                    <Text style={styles.sj}>{item.deliveryNumber}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.cardMain}>
                    {product} · {quarry}
                  </Text>
                  <Text style={styles.cardSub}>
                    {item.plateNumber} · {item.driverName} · {vendor}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDateShort(item.scheduledAt)} {formatClock(item.scheduledAt)}
                  </Text>
                  {item.status === 'IN_TRANSIT' && cardEtas[item.id] && (
                    <View style={styles.etaCardInline}>
                      <View style={styles.etaInlineRow}>
                        <Text style={styles.etaInlineLabel}>Tujuan:</Text>
                        <Text style={styles.etaInlineValue}>
                          {cardEtas[item.id].loading ? 'Menghitung lokasi...' : destLabel}
                        </Text>
                      </View>
                      <View style={styles.etaInlineRow}>
                        <Text style={styles.etaInlineLabel}>Jarak:</Text>
                        <Text style={styles.etaInlineValue}>
                          {cardEtas[item.id].loading ? '...' : formatDistance(cardEtas[item.id].distance)}
                        </Text>
                      </View>
                      <View style={styles.etaInlineRow}>
                        <Text style={styles.etaInlineLabel}>ETA:</Text>
                        <Text style={styles.etaInlineValue}>
                          {cardEtas[item.id].loading ? '...' : cardEtas[item.id].eta}
                        </Text>
                      </View>
                    </View>
                  )}
                  {editable && (
                    <View style={styles.cardActions}>
                      <Pressable
                        style={[styles.actionBtn, styles.actionEdit]}
                        onPress={() => openEdit(item)}
                      >
                        <Text style={styles.actionText}>✏️ Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.actionDelete]}
                        onPress={() => {
                          setDeleteTarget(item);
                          setDeleteReason('');
                        }}
                      >
                        <Text style={styles.actionText}>🗑️ Hapus</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus Ritase {deleteTarget?.deliveryNumber}?</Text>
            <Text style={styles.modalHint}>
              Aksi ini tidak bisa dibatalkan dan akan tercatat di audit log.
            </Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Alasan Hapus (wajib)</Text>
              <TextInput
                style={styles.input}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="cth: salah input armada"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.btnGhostText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.btnDanger,
                  !deleteReason.trim() && styles.btnDisabled,
                ]}
                onPress={confirmDelete}
                disabled={!deleteReason.trim()}
              >
                <Text style={styles.btnPrimaryText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!detailTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailTarget(null)}
      >
        <View style={styles.detailOverlay}>
          <ScrollView contentContainerStyle={styles.detailScrollContent}>
            <View style={styles.modalCard}>
<View style={styles.cardTop}>
                  <Text style={styles.sj}>{detailTarget?.deliveryNumber}</Text>
                  {detailTarget ? <StatusBadge status={detailTarget.status} /> : null}
                </View>
                {etaData && detailTarget?.status === 'IN_TRANSIT' && (
                  <View style={styles.etaCard}>
                    <Text style={styles.etaTitle}>🚚 Perkiraan Tiba (ETA)</Text>
                    {etaData.loading ? (
                      <Text style={styles.etaLoading}>Menghitung rute...</Text>
                    ) : etaData.error ? (
                      <Text style={styles.etaError}>{etaData.error}</Text>
                    ) : (
                      <>
                        <View style={styles.etaInfoRow}>
                          <View style={styles.etaInfoItem}>
                            <Text style={styles.etaInfoLabel}>Asal (Quarry)</Text>
                            <Text style={styles.etaInfoValue}>{labelFrom(quarries, detailTarget?.quarryId || '')}</Text>
                          </View>
                          <View style={styles.etaInfoItem}>
                            <Text style={styles.etaInfoLabel}>Tujuan (Site)</Text>
                            <Text style={styles.etaInfoValue}>
                              {labelFrom(contracts, detailTarget?.contractId || '')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.etaDivider} />
                        <View style={styles.etaRow}>
                          <View style={styles.etaItem}>
                            <Text style={styles.etaLabel}>Jarak</Text>
                            <Text style={styles.etaValue}>{formatDistance(etaData.distance)}</Text>
                          </View>
                          <View style={styles.etaItem}>
                            <Text style={styles.etaLabel}>Waktu Tempuh</Text>
                            <Text style={styles.etaValue}>{formatDuration(etaData.duration)}</Text>
                          </View>
                          <View style={styles.etaItem}>
                            <Text style={styles.etaLabel}>Perkiraan Tiba</Text>
                            <Text style={styles.etaValue}>{etaData.eta}</Text>
                          </View>
                        </View>
                        <Text style={styles.etaNote}>
                          Berdasarkan rute terpendek dari quarry ke site. Estimasi tidak termasuk jeda istirahat/kecelakaan.
                        </Text>
                      </>
                    )}
                  </View>
                )}
              <Text style={styles.detailTitle}>Detail Pengiriman</Text>
              {(() => {
                const d = detailTarget;
                if (!d) return null;
                const product = labelFrom(products, d.productId);
                const quarry = labelFrom(quarries, d.quarryId);
                const vendor = labelFrom(vendors, d.transportVendorId);
                return (
                  <>
                    <Text style={styles.cardMain}>{product} · {quarry}</Text>
                    <Text style={styles.cardSub}>{d.plateNumber} · {d.driverName} · {vendor}</Text>
                    <Text style={styles.cardSub}>📞 {d.driverPhone || '-'}</Text>
                    <Text style={styles.cardDate}>
                      📅 Jadwal: {formatDateShort(d.scheduledAt)} {formatClock(d.scheduledAt)}
                    </Text>

                    <View style={styles.detailRow}>
                      <View style={styles.detailCell}>
                        <Text style={styles.volLabel}>MUAT</Text>
                        <Text style={styles.volValue}>{formatVolume(d.loadedVolumeM3)}</Text>
                      </View>
                      <View style={styles.detailCell}>
                        <Text style={styles.volLabel}>TERIMA</Text>
                        <Text style={styles.volValue}>
                          {d.receivedVolumeM3 !== undefined ? formatVolume(d.receivedVolumeM3) : '-'}
                        </Text>
                      </View>
                      {d.varianceM3 !== undefined ? (
                        <View style={styles.detailCell}>
                          <Text style={styles.volLabel}>SELISIH</Text>
                          <Text
                            style={[
                              styles.volValue,
                              {
                                color:
                                  d.varianceM3 > 0 ? '#DC2626' : d.varianceM3 < 0 ? '#16A34A' : '#0F172A',
                              },
                            ]}
                          >
                            {d.varianceM3 === 0
                              ? '0.00'
                              : `${d.varianceM3 > 0 ? '−' : '+'}${Math.abs(d.varianceM3).toFixed(2)}`}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {d.photoUri ? (
                      <>
                        <Text style={styles.detailPhotoLabel}>📸 Bukti Loading Quarry</Text>
                        <Pressable
                          onPress={() =>
                            setViewer({
                              uri: d.photoUri ?? '',
                              timestamp: d.evidenceAt ?? '',
                              place: d.evidencePlace,
                              gps: d.evidenceGps,
                            })
                          }
                        >
                          <Image source={{ uri: d.photoUri }} style={styles.detailPhoto} />
                        </Pressable>
                        <Text style={styles.cardSub}>Tap foto untuk perbesar</Text>
                      </>
                    ) : null}
                  </>
                );
              })()}

              <Pressable
                style={[styles.btn, styles.btnPrimary, styles.detailClose]}
                onPress={() => setDetailTarget(null)}
              >
                <Text style={styles.btnPrimaryText}>Tutup</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
  brand: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5, flexShrink: 1 },
  headerSub: { color: '#A7D7B6', fontSize: 11, marginTop: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 40, height: 40 },
  roleBox: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 8,
  },
  roleLabel: { fontSize: 9, color: '#A7D7B6', fontWeight: '700', marginBottom: 6 },
  roleBtns: { flexDirection: 'row', gap: 6 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  roleBtnActive: { backgroundColor: '#FFFFFF' },
  roleBtnText: { fontSize: 11, fontWeight: '700', color: '#DCEBE1' },
  roleBtnTextActive: { color: '#003C16' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 6,
  },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addBtn: {
    backgroundColor: '#003C16',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
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
  cardSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardDate: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionEdit: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  actionDelete: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  actionText: { fontSize: 11, fontWeight: '800' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  quickAddLink: { alignSelf: 'flex-start', marginTop: -4, marginBottom: 10, paddingVertical: 2 },
  quickAddText: { fontSize: 11, fontWeight: '700', color: '#003C16', textDecorationLine: 'underline' },
  quickAddBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 12,
  },
  supplyTypeRow: { flexDirection: 'row', gap: 8 },
  supplyTypeBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    alignItems: 'center',
  },
  supplyTypeBtnActive: { backgroundColor: '#003C16', borderColor: '#003C16' },
  supplyTypeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  supplyTypeTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnGhost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  btnGhostText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  btnPrimary: { backgroundColor: '#003C16' },
  btnDanger: { backgroundColor: '#B91C1C' },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  modalHint: { fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 12 },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  detailScrollContent: { flexGrow: 1, justifyContent: 'center' },
  detailTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 4 },
  detailRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 10,
  },
  detailCell: { flex: 1, alignItems: 'center' },
  volLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  volValue: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  detailPhotoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  detailPhoto: { width: '100%', height: 150, borderRadius: 10, backgroundColor: '#F1F5F9' },
  detailClose: { marginTop: 14 },
  etaCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  etaTitle: { fontSize: 13, fontWeight: '800', color: '#1E40AF', marginBottom: 8 },
  etaLoading: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  etaError: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  etaInfoRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  etaInfoItem: { flex: 1 },
  etaInfoLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  etaInfoValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  etaDivider: { height: 1, backgroundColor: '#BFDBFE', marginVertical: 8 },
  etaRow: { flexDirection: 'row', gap: 12 },
  etaItem: { flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10 },
  etaLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  etaValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  etaNote: { fontSize: 9, color: '#64748B', marginTop: 8, textAlign: 'center' },
  etaCardInline: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  etaInlineRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  etaInlineLabel: { fontSize: 10, fontWeight: '700', color: '#0369A1', marginRight: 4 },
  etaInlineValue: { fontSize: 10, fontWeight: '600', color: '#0F172A' },
  offlineBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  offlineBannerText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  offlineBannerSub: { fontSize: 10, color: '#B45309', marginTop: 2 },
  pendingBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
  },
  pendingBannerText: { fontSize: 11, fontWeight: '800', color: '#1E40AF' },
  pendingBannerSub: { fontSize: 10, color: '#1E3A8A', marginTop: 2 },
  replayingBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  replayingBannerText: { fontSize: 11, fontWeight: '700', color: '#6D28D9' },
});