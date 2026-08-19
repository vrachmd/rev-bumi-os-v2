import React, { useState } from 'react';
import { SiteListView, SiteDetailView } from '../screens/SiteScreen';

export const SiteStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <SiteDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <SiteListView onSelect={setSelectedId} />;
};