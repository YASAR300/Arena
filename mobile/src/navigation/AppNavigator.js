import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './routes';
import HomeScreen from '../screens/HomeScreen';
import CompetitionDetailsScreen from '../screens/CompetitionDetailsScreen';
import SubmissionUploadScreen from '../screens/SubmissionUploadScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import useAuthStore from '../store/authStore';

const Stack = createNativeStackNavigator();

/**
 * Root Stack Navigator with Strict Authentication Guard
 * Users MUST log in or create an account before accessing the competition / home screen.
 */
export default function AppNavigator() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Show splash / loading indicator while reading persisted token
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005F60" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        // AUTHENTICATION STACK: User cannot view competition/home without login/signup
        <Stack.Group>
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.SIGNUP} component={SignupScreen} />
        </Stack.Group>
      ) : (
        // MAIN APPLICATION STACK: Available after successful authentication
        <Stack.Group>
          <Stack.Screen
            name={ROUTES.COMPETITION_DETAILS}
            component={CompetitionDetailsScreen}
            initialParams={{ competitionSlug: 'feedants-classical-dance' }}
          />
          <Stack.Screen
            name={ROUTES.SUBMISSION_UPLOAD}
            component={SubmissionUploadScreen}
          />
          <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
          <Stack.Screen name={ROUTES.EXPLORE} component={ExploreScreen} />
          <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
