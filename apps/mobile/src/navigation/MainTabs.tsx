import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Mountain, Building2, FileText, Wallet } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RekonsilScreen } from '../screens/RekonsilScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { SiteStack } from './SiteStack';
import { QuarryStack } from './QuarryStack';
import type { MobileRole, RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, React.ComponentType<{ size: number; color: string }>> = {
  Dashboard: LayoutDashboard,
  Quarry: Mountain,
  Site: Building2,
  Rekonsil: FileText,
  Finance: Wallet,
};

const COMPONENTS: Record<keyof RootTabParamList, React.ComponentType> = {
  Dashboard: DashboardScreen,
  Quarry: QuarryStack,
  Site: SiteStack,
  Rekonsil: RekonsilScreen,
  Finance: FinanceScreen,
};

const TAB_ACCESS: Record<MobileRole, (keyof RootTabParamList)[]> = {
  QUARRY_CHECKER: ['Dashboard', 'Quarry'],
  SITE_CHECKER: ['Dashboard', 'Site'],
  MANAGEMENT: ['Dashboard', 'Quarry', 'Site', 'Rekonsil', 'Finance'],
};

const TabIcon: React.FC<{ Icon: React.ComponentType<{ size: number; color: string }>; focused: boolean; color: string }> = ({ Icon, focused, color }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.05 : 1, friction: 5, tension: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: focused ? 1 : 0.6, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [focused, scale, opacity]);
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Icon size={focused ? 22 : 18} color={focused ? '#003C16' : color} />
    </Animated.View>
  );
};

export const MainTabs: React.FC = () => {
  const role = useAppStore((s) => s.profile.role);
  const routes = TAB_ACCESS[role];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#003C16',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarStyle: { height: 62, paddingBottom: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
        animation: 'shift' as const,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => {
          const Icon = ICONS[route.name];
          return <TabIcon Icon={Icon} focused={focused} color={color} />;
        },
      })}
    >
      {routes.map((name) => (
        <Tab.Screen key={name} name={name} component={COMPONENTS[name]} />
      ))}
    </Tab.Navigator>
  );
};