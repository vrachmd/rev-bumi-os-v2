import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuarryListView, QuarryDetailView } from '../screens/QuarryScreen';

export const QuarryStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      <Animated.View style={{ flex: 1, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }}>
        <QuarryListView onSelect={setSelectedId} />
      </Animated.View>
    </View>
  );
};