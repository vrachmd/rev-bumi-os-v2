import React, { useState } from 'react';
import { QuarryListView, QuarryDetailView } from '../screens/QuarryScreen';

export const QuarryStack: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <QuarryDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <QuarryListView onSelect={setSelectedId} />;
};