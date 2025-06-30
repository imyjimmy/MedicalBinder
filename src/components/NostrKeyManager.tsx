import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { KeychainService } from '../services/KeychainService';
import { NostrAuthService } from '../services/NostrAuthService';

interface NostrKeyManagerProps {
  onLogout?: () => void;
}

export const NostrKeyManager: React.FC<NostrKeyManagerProps> = ({ onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const creds = await KeychainService.getNostrCredentials();
      setCredentials(creds);
    } catch (error) {
      Alert.alert('Error', 'Failed to load credentials');
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setString(text);
      Alert.alert('Copied!', `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const shareKey = async (text: string, label: string) => {
    try {
      await Share.share({
        message: `${label}: ${text}`,
        title: label,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share key');
    }
  };

  const handleBackupPrivateKey = () => {
    if (!credentials) return;

    Alert.alert(
      '⚠️ Private Key Backup',
      'Your private key gives complete access to your medical records. Only share this with trusted backup locations.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Copy to Clipboard', 
          onPress: () => copyToClipboard(credentials.nsec, 'Private Key (nsec)')
        },
        { 
          text: 'Share Securely', 
          onPress: () => shareKey(credentials.nsec, 'NOSTR Private Key')
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'This will remove your NOSTR identity from this device. Make sure you have your private key backed up.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const success = await NostrAuthService.logout();
            if (success && onLogout) {
              onLogout();
            } else if (!success) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const truncateKey = (key: string, length: number = 16) => {
    return `${key.substring(0, length)}...${key.substring(key.length - 8)}`;
  };

  React.useEffect(() => {
    loadCredentials();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading key information...</Text>
      </View>
    );
  }

  if (!credentials) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No credentials found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Your NOSTR Identity</Text>
      
      <View style={styles.keySection}>
        <Text style={styles.keyLabel}>Public Key (npub)</Text>
        <TouchableOpacity 
          style={styles.keyContainer}
          onPress={() => copyToClipboard(credentials.npub, 'Public Key')}
        >
          <Text style={styles.keyText}>{truncateKey(credentials.npub, 20)}</Text>
          <Text style={styles.copyHint}>Tap to copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.keySection}>
        <Text style={styles.keyLabel}>Keys Imported</Text>
        <Text style={styles.infoText}>
          {new Date(credentials.lastLoginAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.backupButton}
          onPress={handleBackupPrivateKey}
        >
          <Text style={styles.backupButtonText}>💾 Backup Private Key</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.sharePublicButton}
          onPress={() => shareKey(credentials.npub, 'My NOSTR Public Key')}
        >
          <Text style={styles.sharePublicButtonText}>📤 Share Public Key</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningSection}>
        <Text style={styles.warningTitle}>🛡️ Security Reminder</Text>
        <Text style={styles.warningText}>
          • Your private key is stored securely in iOS Keychain{'\n'}
          • Never share your private key with untrusted parties{'\n'}
          • Your public key can be safely shared{'\n'}
          • Back up your private key in multiple secure locations
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  keySection: {
    marginBottom: 20,
  },
  keyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  keyContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  keyText: {
    fontSize: 16,
    fontFamily: 'Menlo, Monaco, monospace',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  actionSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  backupButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  backupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sharePublicButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  sharePublicButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});