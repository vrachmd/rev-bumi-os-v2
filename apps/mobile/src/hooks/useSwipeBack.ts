import { useEffect, useRef } from 'react';
import { BackHandler, PanResponder } from 'react-native';

export const useSwipeBack = (onBack: () => void, enabled = true) => {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, [enabled]);

  const { panHandlers } = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx < 0 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) onBackRef.current();
      },
    })
  ).current;

  return panHandlers;
};