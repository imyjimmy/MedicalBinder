import './src/polyfills'; // Import polyfills first
import 'text-encoding-polyfill';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileIcon } from './src/components/ProfileIcon';
import { NostrLoginScreen } from './src/screens/NostrLoginScreen';
import { NostrAuthService } from './src/services/NostrAuthService';
import { AddRecordScreen } from './src/screens/AddRecordScreen';
import { ActiveBinderScreen } from './src/screens/ActiveBinderScreen';
import { KeychainService } from './src/services/KeychainService';

// import { binderExpandTransition, binderTransitionSpec } from './src/animations/binderTransition';

// Define your navigation params
export type RootStackParamList = {
  Home: undefined;
  AddRecord: {
    repoPath: string;
    repoName: string;
  };
  ActiveBinder: {  // Add this
    repoPath: string;
    repoName: string;
    sharedElementId: string;
  };
};

const Stack = createSharedElementStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);

  const handleLogout = () => {
    console.log('handleLogout fn in App.tsx');
    setIsAuthenticated(false);
  };

  const headerProfileIcon = useMemo(() => (
    <View style={{ marginLeft: 20 }}>
      <ProfileIcon 
        pubkey={currentUserPubkey} 
        onPress={handleLogout}
      />
    </View>
  ), [currentUserPubkey, handleLogout]);

  useEffect(() => {
    checkAuthenticationStatus();
    loadCurrentUser();
  }, []);
  
  const loadCurrentUser = async () => {
    try {
      const pubkey = await NostrAuthService.getCurrentUserPubkey();
      setCurrentUserPubkey(pubkey);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const checkAuthenticationStatus = async () => {
    try {
      // Check if we have stored NOSTR credentials - no server needed
      const hasCredentials = await KeychainService.hasStoredCredentials();
      setIsAuthenticated(hasCredentials);
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <NostrLoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  const HomeScreenWrapper = (props: any) => (
    <HomeScreen {...props} onLogout={handleLogout} />
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home" 
            component={HomeScreenWrapper}
            options={{ 
              title: 'Medical Binder',
              headerShadowVisible: false, // get rid of grey horizontal line
              headerLeft: () => headerProfileIcon,
            }}
          />
          <Stack.Screen 
            name="AddRecord" 
            component={AddRecordScreen} 
            options={{ title: 'Add Medical Record' }}
          />
          <Stack.Screen 
            name="ActiveBinder" 
            component={ActiveBinderScreen}
            sharedElements={(route, otherRoute, showing) => {
              console.log('=== SHARED ELEMENT DEBUG ===');
              console.log('route:', route?.name, route?.params);
              console.log('otherRoute:', otherRoute?.name, otherRoute?.params);
              console.log('showing:', showing);
              console.log('=== END DEBUG ===');
              const { sharedElementId } = route.params;
              return [
                {
                  id: sharedElementId,
                  animation: 'fade',
                  resize: 'auto',  // Try 'auto' instead of 'stretch'
                  align: 'auto'
                }
              ];
            }}
            options={({ route }) => ({
              title: route.params.repoName,
              headerShadowVisible: false,
              headerLeft: () => headerProfileIcon,
              headerTitleStyle: {
                fontSize: 14,        // Smaller font size
                fontWeight: '400',   // Adjust weight if needed
              },
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;