import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock3, MapPin } from 'lucide-react-native';
import { formatClockSeconds, formatDateLong } from '../utils/format';
import { colors, font } from '../theme/tokens';

const LOGO = require('../../assets/logo.png');

interface EvidenceViewerProps {
  visible: boolean;
  uri?: string;
  timestamp?: string;
  place?: string;
  gps?: { lat: number; lng: number };
  label?: string;
  onClose: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  visible,
  uri,
  timestamp,
  place,
  gps,
  label,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      ) : (
        <Text style={styles.empty}>Tidak ada foto bukti</Text>
      )}
      <View style={styles.meta}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.brandLogo} />
          <Text style={styles.brandText}>REV BUMI NUSANTARA</Text>
        </View>
        {label ? <Text style={styles.metaLabel}>{label}</Text> : null}
        {timestamp ? (
          <View style={styles.metaRow}>
            <Clock3 size={12} color="#FFFFFF" />
            <Text style={styles.metaText}> {formatDateLong(timestamp)} · {formatClockSeconds(timestamp)}</Text>
          </View>
        ) : null}
        {place ? (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#FFFFFF" />
            <Text style={styles.metaText}> {place}</Text>
          </View>
        ) : gps ? (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#FFFFFF" />
            <Text style={styles.metaText}> {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</Text>
          </View>
        ) : null}
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Tutup</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: { width: '100%', height: '68%', borderRadius: 10 },
  empty: { color: '#94A3B8', fontSize: 13 },
  meta: {
    width: '100%',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  metaLabel: {
    color: '#A7D7B6',
    fontSize: 11,
    fontFamily: font.extraBold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brandLogo: { width: 22, height: 22, borderRadius: 5, marginRight: 8 },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.black,
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, justifyContent: 'center' },
  metaText: { color: '#FFFFFF', fontSize: 12, fontFamily: font.semiBold, marginTop: 0 },
  closeBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  closeText: { color: '#FFFFFF', fontSize: 13, fontFamily: font.extraBold },
});
