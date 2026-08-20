import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { QuarryListView, QuarryDetailView } from '../screens/QuarryScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const QuarryStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [selectedId]);

  if (selectedId) {
    return <QuarryDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <QuarryListView onSelect={setSelectedId} />;
};