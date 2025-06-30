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
import { NostrAuthService } from '../services/NostrAuthService';
import { NostrKeyManager } from './NostrKeyManager';
import { NostrProfile } from '../types/nostr';
import { bech32 } from 'bech32';

interface ProfileIconProps {
  pubkey: string | null;
  onPress: () => void;
}

function bech32ToHex(bech32Str: string): string {
  const decoded = bech32.decode(bech32Str);
  const bytes = bech32.fromWords(decoded.words);
  if (bytes.length !== 32) throw new Error('Invalid public key length');  
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function fetchNostrMetadata(pubkey: string, timeoutMs = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const relays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.snort.social',
      'wss://relay.nostr.band'
    ];
    
    let currentRelayIndex = 0;
    
    function tryNextRelay() {
      if (currentRelayIndex >= relays.length) {
        reject(new Error('All relays failed to provide metadata'));
        return;
      }
      
      const relayUrl = relays[currentRelayIndex++];
      console.log(`Trying relay: ${relayUrl}`);
      
      tryFetchFromRelay(relayUrl, pubkey, timeoutMs / relays.length)
        .then(resolve)
        .catch((error) => {
          console.log(`Relay ${relayUrl} failed: ${error.message}`);
          tryNextRelay();
        });
    }
    
    tryNextRelay();
  });
}

// function tryFetchFromRelay(relayUrl: string, hexPubkey: string, timeoutMs: number): Promise<any> {
//   return new Promise((resolve, reject) => {
//     const ws = new WebSocket(relayUrl);
//     let resolved = false;
    
//     const timeout = setTimeout(() => {
//       if (!resolved) {
//         resolved = true;
//         ws.close();
//         reject(new Error('Timeout'));
//       }
//     }, timeoutMs);
    
//     ws.onopen = () => {
//       console.log('Connected to relay:', relayUrl);
      
//       const subscription = {
//         id: 'profile_' + Math.random().toString(36).substring(7),
//         kinds: [0],
//         authors: [hexPubkey],
//         limit: 1
//       };
      
//       ws.send(JSON.stringify(['REQ', subscription.id, subscription]));
//     };
    
//     ws.onmessage = (event) => {
//       try {
//         const message = JSON.parse(event.data);
        
//         if (message[0] === 'EVENT' && message[2]?.kind === 0) {
//           const profileEvent = message[2];
//           const profile = JSON.parse(profileEvent.content);
          
//           console.log('Found profile:', profile.name || profile.display_name || 'unnamed');
          
//           if (!resolved) {
//             resolved = true;
//             clearTimeout(timeout);
//             ws.close();
//             resolve(profile);
//           }
//         }
//       } catch (error) {
//         console.error('Error parsing relay message:', error);
//       }
//     };
    
//     ws.onerror = (error) => {
//       if (!resolved) {
//         resolved = true;
//         clearTimeout(timeout);
//         reject(new Error('WebSocket error'));
//       }
//     };
    
//     ws.onclose = () => {
//       if (!resolved) {
//         resolved = true;
//         clearTimeout(timeout);
//         reject(new Error('Connection closed'));
//       }
//     };
//   });
// }

function tryFetchFromRelay(relayUrl: string, hexPubkey: string, timeoutMs: number): Promise<NostrProfile | null> {
  return new Promise((resolve, reject) => {
    console.log(`🔌 Attempting connection to ${relayUrl} with ${timeoutMs}ms timeout`);
    const ws = new WebSocket(relayUrl);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`⏰ Timeout reached for ${relayUrl}`);
        ws.close();
        reject(new Error('Timeout'));
      }
    }, timeoutMs);
    
    ws.onopen = () => {
      console.log('Connected to relay:', relayUrl);
      
      const subscriptionId = 'profile_' + Math.random().toString(36).substring(7); // ← ADD THIS LINE
      const subscription = {
        kinds: [0],
        authors: [hexPubkey],
        limit: 1
      };
      
      console.log('📤 Sending query to', relayUrl, ':', JSON.stringify(['REQ', subscriptionId, subscription]));
      ws.send(JSON.stringify(['REQ', subscriptionId, subscription]));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received message from', relayUrl, ':', JSON.stringify(message));
        
        if (message[0] === 'EVENT' && message[2]?.kind === 0) {
          const profileEvent = message[2];
          const profile = JSON.parse(profileEvent.content);
          
          console.log('Found profile:', profile.name || profile.display_name || 'unnamed');
          
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(profile);
          }
        } else if (message[0] === 'EOSE') {
          console.log('📝 End of stored events from', relayUrl, '- no profile found');
        } else if (message[0] === 'NOTICE') {
          console.log('⚠️ Notice from', relayUrl, ':', message[1]);
        }
      } catch (error) {
        console.error('Error parsing relay message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.log(`❌ WebSocket error for ${relayUrl}:`, error);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error('WebSocket error'));
      }
    };
  })
}

export const ProfileIcon: React.FC<ProfileIconProps> = ({ pubkey, onPress }) => {
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKeyManager, setShowKeyManager] = useState(false);

  const testBasicWebSocket = () => {
    console.log('🧪 Testing basic WebSocket connectivity...');
    const ws = new WebSocket('wss://echo.websocket.org');
    
    const timeout = setTimeout(() => {
      console.log('❌ Echo test timeout');
      ws.close();
    }, 5000);
    
    ws.onopen = () => {
      console.log('✅ Echo WebSocket connected successfully');
      clearTimeout(timeout);
      ws.send('test message');
    };
    
    ws.onmessage = (event) => {
      console.log('📨 Echo response:', event.data);
      ws.close();
    };
    
    ws.onerror = (error) => {
      console.log('❌ Echo WebSocket error:', error);
      clearTimeout(timeout);
    };
    
    ws.onclose = () => {
      console.log('🔌 Echo WebSocket closed');
    };
  };

  // Call this in useEffect to test
  useEffect(() => {
    if (pubkey) {
      testBasicWebSocket(); // Add this line temporarily
      fetchProfile();
    }
  }, [pubkey]);

  useEffect(() => {
    if (pubkey) {
      fetchProfile();
    }
  }, [pubkey]);

  const fetchProfile = async () => {
    if (!pubkey) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching profile for pubkey:', pubkey.substring(0, 20) + '...');
      
      // Convert npub to hex
      const hexPubkey = bech32ToHex(pubkey);
      console.log('🔑 Converted to hex:', hexPubkey.substring(0, 20) + '...');
      
      // Fetch profile using hex pubkey
      const userProfile = await fetchNostrMetadata(hexPubkey);
      console.log('👤 Profile result:', userProfile ? 'Found profile' : 'No profile found');
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