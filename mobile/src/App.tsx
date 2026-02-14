import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { I18nProvider } from './i18n/I18nProvider';
import { useI18n } from './i18n/useI18n';
import { useAuth } from './hooks/useAuth';
import { AddParakeetScreen } from './screens/AddParakeetScreen';
import { GuideScreen } from './screens/GuideScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ParakeetProfileScreen } from './screens/ParakeetProfileScreen';
import { RecordScreen } from './screens/RecordScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { colors, typography } from './theme/tokens';
import type { HomeTabParamList, RootStackParamList } from './types/navigation';

const Tab = createBottomTabNavigator<HomeTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{label}</Text>;
}

function HomeTabs() {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8A94A6',
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 84,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabHome'),
          tabBarIcon: ({ color }) => <TabIcon label={'🏠'} color={color} />,
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarLabel: t('tabRecord'),
          tabBarIcon: ({ color }) => <TabIcon label={'🎤'} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('tabHistory'),
          tabBarIcon: ({ color }) => <TabIcon label={'📈'} color={color} />,
        }}
      />
      <Tab.Screen
        name="Guide"
        component={GuideScreen}
        options={{
          tabBarLabel: t('tabGuide'),
          tabBarIcon: ({ color }) => <TabIcon label={'📚'} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabSettings'),
          tabBarIcon: ({ color }) => <TabIcon label={'⚙️'} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppShell() {
  const { isLoading } = useAuth();
  const { ready, t } = useI18n();

  if (isLoading || !ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <Text style={{ fontSize: 64, marginBottom: 16 }}>{'🦜'}</Text>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 12, fontSize: typography.body }}>{t('loadingBrand')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ParakeetProfile"
          component={ParakeetProfileScreen}
          options={{
            title: t('navProfile'),
            headerTintColor: colors.primary,
          }}
        />
        <Stack.Screen
          name="AddParakeet"
          component={AddParakeetScreen}
          options={{
            title: t('navAddParakeet'),
            headerTintColor: colors.primary,
          }}
        />
        <Stack.Screen
          name="Auth"
          component={LoginScreen}
          options={{
            title: t('navAuth'),
            headerTintColor: colors.primary,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
