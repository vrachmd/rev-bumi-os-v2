import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { QuarryListView, QuarryDetailView } from '../screens/QuarryScreen';

export const QuarryStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: selectedId ? 1 : 0,
      duration: 280,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
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
    <Animated.View style={{ flex: 1, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }}>
      <QuarryListView onSelect={setSelectedId} />
    </Animated.View>
  );
};