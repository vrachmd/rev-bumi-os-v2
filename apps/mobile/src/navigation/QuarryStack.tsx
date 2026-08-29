import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, TouchableOpacity, Text, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuarryListView, QuarryDetailView } from '../screens/QuarryScreen';
import { BulkQuarryScreen } from '../screens/BulkQuarryScreen';

export const QuarryStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: selectedId ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [selectedId, slide]);

  if (bulkOpen) {
    return <BulkQuarryScreen onBack={() => setBulkOpen(false)} />;
  }

  if (selectedId) {
    return (
      <Animated.View style={{ flex: 1, opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <QuarryDetailView id={selectedId} onBack={() => setSelectedId(null)} />
      </Animated.View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#003C16" translucent={false} />
      <View style={{ height: insets.top > 0 ? insets.top : (RNStatusBar.currentHeight ?? 24), backgroundColor: '#003C16' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <TouchableOpacity onPress={() => setBulkOpen(true)} style={{ backgroundColor: '#003C16', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>+ Bulk 10 Ritase</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ flex: 1, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }}>
        <QuarryListView onSelect={setSelectedId} />
      </Animated.View>
    </View>
  );
};