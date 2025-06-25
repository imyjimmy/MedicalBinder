import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NostrAuthService } from '../services/NostrAuthService';
import { KeychainService } from '../services/KeychainService';
import { NostrKeyPair } from '../types/nostr';

interface NostrLoginScreenProps {
  onLoginSuccess: () => void;
}

export const NostrLoginScreen: React.FC<NostrLoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [showImportKey, setShowImportKey] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);

  useEffect(() => {
    checkExistingCredentials();
  }, []);

  const checkExistingCredentials = async () => {
    setIsCheckingCredentials(true);
    try {
      const hasCredentials = await KeychainService.hasStoredCredentials();
      setHasStoredCredentials(hasCredentials);
    } catch (error) {
      console.error('Failed to check existing credentials:', error);
    } finally {
      setIsCheckingCredentials(false);
    }
  };

  const handleLoginWithStoredKey = async () => {
    setLoading(true);
    try {
      // Check if we have valid stored credentials
      const credentials = await KeychainService.getNostrCredentials();
      
      if (credentials) {
        Alert.alert(
          'Welcome Back!', 
          `Logged in as: ${credentials.npub.substring(0, 20)}...`,
          [{ text: 'Continue', onPress: onLoginSuccess }]
        );
      } else {
        Alert.alert('Error', 'No stored credentials found');
      }
    } catch (error) {
      Alert.alert('Login Error', 'Failed to access stored credentials');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewKey = async () => {
    setLoading(true);
    try {
      // Generate new key pair
      const keyPair = NostrAuthService.generateKeyPair();
      
      // Store in keychain
      const stored = await NostrAuthService.storeCredentials(keyPair);
      
      if (!stored) {
        throw new Error('Failed to store credentials securely');
      }

      // Show user their new keys and authenticate
      Alert.alert(
        'New NOSTR Identity Created',
        `Your new public key (npub): ${keyPair.npub}\n\nPrivate key (nsec): ${keyPair.nsec}\n\n⚠️ IMPORTANT: Save your private key somewhere safe! This is the only way to recover your identity.`,
        [
          {
            text: 'I\'ve Saved My Key',
            onPress: async () => {
              // Authenticate with server
              const authResult = await NostrAuthService.authenticateWithServer();
              if (authResult.status === 'OK') {
                setHasStoredCredentials(true);
                onLoginSuccess();
              } else {
                Alert.alert('Authentication Failed', authResult.reason || 'Server authentication failed');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Key Generation Failed', 'Could not generate new NOSTR key pair');
      console.error('Key generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportKey = async () => {
    if (!privateKeyInput.trim()) {
      Alert.alert('Error', 'Please enter your private key');
      return;
    }

    setLoading(true);
    try {
      let keyPair: NostrKeyPair | null = null;

      // Try to import as nsec first, then hex
      if (privateKeyInput.startsWith('nsec')) {
        keyPair = NostrAuthService.importFromNsec(privateKeyInput.trim());
      } else {
        // Assume hex format
        keyPair = NostrAuthService.importFromHex(privateKeyInput.trim());
      }

      if (!keyPair) {
        throw new Error('Invalid private key format');
      }

      // Store in keychain
      const stored = await NostrAuthService.storeCredentials(keyPair);
      
      if (!stored) {
        throw new Error('Failed to store credentials securely');
      }

      Alert.alert(
        'Import Successful!',
        `Identity imported successfully.\nPublic key: ${keyPair.npub}`,
        [{ text: 'Continue', onPress: onLoginSuccess }]
      );
      setHasStoredCredentials(true);
      setShowImportKey(false);
      setPrivateKeyInput('');
    } catch (error) {
      Alert.alert(
        'Import Failed', 
        error instanceof Error ? error.message : 'Could not import private key'
      );
      console.error('Key import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStoredKey = async () => {
    Alert.alert(
      'Delete Stored Identity',
      'Are you sure you want to delete your stored NOSTR identity? You will need to re-import your private key to access your medical records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await NostrAuthService.logout();
            if (success) {
              setHasStoredCredentials(false);
              setShowImportKey(false);
              Alert.alert('Identity Deleted', 'Your stored identity has been removed from this device.');
            } else {
              Alert.alert('Error', 'Failed to delete stored identity.');
            }
          }
        }
      ]
    );
  };

  if (isCheckingCredentials) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking stored credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>NOSTR Authentication</Text>
          <Text style={styles.subtitle}>
            Your sovereign medical identity powered by NOSTR
          </Text>
        </View>

        {hasStoredCredentials ? (
          <View style={styles.existingKeyContainer}>
            <Text style={styles.sectionTitle}>✅ Identity Found</Text>
            <Text style={styles.description}>
              You have a NOSTR identity stored securely on this device.
            </Text>
            
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleLoginWithStoredKey}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue with Stored Identity</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleDeleteStoredKey}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Delete Stored Identity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.setupContainer}>
            <Text style={styles.sectionTitle}>🔐 Setup Your Identity</Text>
            <Text style={styles.description}>
              NOSTR provides you with a sovereign digital identity. Choose how you'd like to proceed:
            </Text>

            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleGenerateNewKey}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Generate New Identity</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => setShowImportKey(!showImportKey)}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Import Existing Key</Text>
            </TouchableOpacity>

            {showImportKey && (
              <View style={styles.importContainer}>
                <Text style={styles.inputLabel}>Private Key (nsec or hex)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="nsec1... or hex private key"
                  value={privateKeyInput}
                  onChangeText={setPrivateKeyInput}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline={true}
                  numberOfLines={3}
                />
                
                <TouchableOpacity 
                  style={styles.importButton} 
                  onPress={handleImportKey}
                  disabled={loading || !privateKeyInput.trim()}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Import & Authenticate</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>🏥 Why NOSTR for Medical Records?</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Self-Custody:</Text> You control your private keys{'\n'}
            • <Text style={styles.bold}>Permanent Identity:</Text> Never lose access to your records{'\n'}
            • <Text style={styles.bold}>No Dependencies:</Text> Works without external services{'\n'}
            • <Text style={styles.bold}>Cryptographic Security:</Text> Military-grade encryption
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  existingKeyContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setupContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  importButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  serverUrlContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});