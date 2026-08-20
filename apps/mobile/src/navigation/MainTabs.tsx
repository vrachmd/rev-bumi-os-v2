import React from 'react';
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
          return <Icon size={focused ? 20 : 18} color={focused ? '#003C16' : color} />;
        },
      })}
    >
      {routes.map((name) => (
        <Tab.Screen key={name} name={name} component={COMPONENTS[name]} />
      ))}
    </Tab.Navigator>
  );
};