import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../store/useAppStore';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RekonsilScreen } from '../screens/RekonsilScreen';
import { SiteStack } from './SiteStack';
import { QuarryStack } from './QuarryStack';
import type { MobileRole, RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, string> = {
  Dashboard: '📊',
  Quarry: '⛏️',
  Site: '🏗️',
  Rekonsil: '🧾',
};

const COMPONENTS: Record<keyof RootTabParamList, React.ComponentType> = {
  Dashboard: DashboardScreen,
  Quarry: QuarryStack,
  Site: SiteStack,
  Rekonsil: RekonsilScreen,
};

const TAB_ACCESS: Record<MobileRole, (keyof RootTabParamList)[]> = {
  QUARRY_CHECKER: ['Dashboard', 'Quarry'],
  SITE_CHECKER: ['Dashboard', 'Site'],
  MANAGEMENT: ['Dashboard', 'Quarry', 'Site', 'Rekonsil'],
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
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>
            {ICONS[route.name]}
          </Text>
        ),
      })}
    >
      {routes.map((name) => (
        <Tab.Screen key={name} name={name} component={COMPONENTS[name]} />
      ))}
    </Tab.Navigator>
  );
};