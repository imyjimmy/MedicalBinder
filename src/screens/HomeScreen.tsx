import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { ProfileIcon } from '../components/ProfileIcon';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { useNavigation } from '@react-navigation/native';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleAddMedicalBinder = () => {
    // TODO: Navigate to create/add medical binder flow
    console.log('Add Medical Binder pressed');
    // For now, you might want to navigate to QR scanner or create repo flow
    // navigation.navigate('CreateBinder');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Profile Icon */}
      <View style={styles.header}>
        {/* <ProfileIcon 
          pubkey={currentUserPubkey} 
          onPress={onLogout}
        /> */}
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Centered Add Button in Lower Third */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddMedicalBinder}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Add a Medical Binder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end', // Changed from 'center'
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  buttonContainer: {
    width: '100%',
    // Position much lower - about 20% from bottom
    marginBottom: '10%',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 250,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});