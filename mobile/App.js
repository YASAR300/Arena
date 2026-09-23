import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { linking } from './src/navigation/linking';
import OfflineBanner from './src/components/common/OfflineBanner';
import { registerRootComponent } from 'expo';

// Configure TanStack Query Client for competition polling & caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <NavigationContainer linking={linking}>
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
