import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NostrKeyManager } from './NostrKeyManager';
import { NostrProfile } from '../types/nostr';
import { ProfileService } from '../services/ProfileService';

interface ProfileIconProps {
  pubkey: string | null;
  onPress: () => void;
}

export const ProfileIcon: React.FC<ProfileIconProps> = ({ pubkey, onPress }) => {
  const [profile, setProfile] = useState<NostrProfile | null>(() => 
    pubkey ? ProfileService.getCachedProfile(pubkey) : null
  );
  const [loading, setLoading] = useState(false);
  const [showKeyManager, setShowKeyManager] = useState(false);

  // useEffect(() => {
  //   if (pubkey) {
  //     fetchProfile();
  //   }
  // }, [pubkey]);

  useEffect(() => {
    if (pubkey) {
      // Check cache first before setting loading state
      const fetchProfile = async () => {
        const cachedProfile = await ProfileService.getProfile(pubkey);
        if (cachedProfile !== profile) {
          setProfile(cachedProfile);
        }
      };
      
      fetchProfile();
    }
  }, [pubkey]);

  const fetchProfile = async () => {
    if (!pubkey) return;
    
    setLoading(true);
    try {
      const userProfile = await ProfileService.getProfile(pubkey);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Profile Options',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Manage Keys', 
          onPress: () => setShowKeyManager(true)
        },
        { text: 'Logout', style: 'destructive', onPress: onPress },
      ]
    );
  };

  const handleLogoutFromKeyManager = () => {
    setShowKeyManager(false);
    onPress();
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const renderProfileImage = () => {
    if (profile?.picture && !loading) {
      return (
        <Image 
          source={{ uri: profile.picture }}
          style={styles.profileImage}
          onError={() => setProfile(prev => prev ? { ...prev, picture: undefined } : null)}
        />
      );
    }

    // Fallback to initials or default
    const initials = getInitials(profile?.name || profile?.display_name);
    return (
      <View style={styles.initialsContainer}>
        <Text style={styles.initialsText}>{initials}</Text>
      </View>
    );
  };

  if (!pubkey) {
    return (
      <View style={styles.profileContainer}>
        <View style={styles.notLoggedIn}>
          <Text style={styles.notLoggedInText}>!</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.profileContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {renderProfileImage()}
        <View style={styles.statusDot} />
      </TouchableOpacity>

      <Modal
        visible={showKeyManager}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowKeyManager(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <NostrKeyManager onLogout={handleLogoutFromKeyManager} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E5E7',
  },
  initialsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E7',
  },
  initialsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notLoggedIn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E7',
  },
  notLoggedInText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});