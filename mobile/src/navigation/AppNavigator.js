import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './routes';
import HomeScreen from '../screens/HomeScreen';
import CompetitionDetailsScreen from '../screens/CompetitionDetailsScreen';
import SubmissionUploadScreen from '../screens/SubmissionUploadScreen';

const Stack = createNativeStackNavigator();

/**
 * Root Stack Navigator
 */
export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.COMPETITION_DETAILS}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
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
    </Stack.Navigator>
  );
}
