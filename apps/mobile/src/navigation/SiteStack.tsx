import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { SiteListView, SiteDetailView } from '../screens/SiteScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SiteStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [selectedId]);

  if (selectedId) {
    return <SiteDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <SiteListView onSelect={setSelectedId} />;
};