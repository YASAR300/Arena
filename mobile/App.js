import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/queryClient';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { linking } from './src/navigation/linking';
import { navigationRef } from './src/navigation/navigationRef';
import OfflineBanner from './src/components/common/OfflineBanner';
import useAuthStore from './src/store/authStore';
import { registerRootComponent } from 'expo';

function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <NavigationContainer ref={navigationRef} linking={linking}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);

export default App;
