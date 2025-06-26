import './src/polyfills'; // Import polyfills first
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileIcon } from './src/components/ProfileIcon';
import { NostrLoginScreen } from './src/screens/NostrLoginScreen';
import { NostrAuthService } from './src/services/NostrAuthService';
import AddRecordScreen from './src/components/AddRecordScreen';
import { KeychainService } from './src/services/KeychainService';

// Define your navigation params
export type RootStackParamList = {
  Home: undefined;
  AddRecord: {
    repoPath: string;
    repoName: string;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);

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

  const handleLogout = () => {
    setIsAuthenticated(false);
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

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home" 
            options={{ 
              title: 'Medical Binder',
              headerShadowVisible: false,
              headerLeft: () => (
                <View style={{ marginLeft: 20 }}>
                  <ProfileIcon 
                    pubkey={currentUserPubkey} 
                    onPress={handleLogout}
                  />
                </View>
              ),
            }}
          >
            {(props) => (
              <HomeScreen 
                {...props} 
                onLogout={handleLogout} 
              />
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="AddRecord" 
            component={AddRecordScreen} 
            options={{ title: 'Add Medical Record' }}
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