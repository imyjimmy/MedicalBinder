import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from './src/screens/HomeScreen';
import AddRecordScreen from './src/components/AddRecordScreen';

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
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Medical Binder' }}
          />
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

export default App;