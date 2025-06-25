import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { QRScanner } from '../components/QRScanner';
import { NostrKeyManager } from '../components/NostrKeyManager';
import { NostrAuthService } from '../services/NostrAuthService';
import { ClonedRepo, ScanSuccessCallback } from '../types/git';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { NativeModules } from 'react-native'; // Add this import

const { MGitModule } = NativeModules; // Add this line

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [clonedRepos, setClonedRepos] = useState<Array<ClonedRepo>>([]);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
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

  const handleScanSuccess: ScanSuccessCallback = (name: string, repoUrl: string, localPath: string, token?: string) => {
    setClonedRepos(prev => [...prev, { url: repoUrl, path: localPath, name: name, clonedAt: new Date(), token: token }]);
    setShowQRScanner(false);
  };

  const handleScanError = (error: string) => {
    console.error('QR Scan Error:', error);
    // Keep scanner open for retry
  };

  const navigateToAddRecord = (repo: ClonedRepo) => {
    // Navigate to AddRecordScreen with repo details
    console.log('Navigating with repo:', repo);
    console.log('Repo path:', repo.path);

    navigation.navigate('AddRecord', { 
      repoPath: repo.path,
      repoName: repo.name
    });
  };

  const truncatePubkey = (pubkey: string | null) => {
    if (!pubkey) return 'Unknown';
    return `${pubkey.substring(0, 12)}...${pubkey.substring(pubkey.length - 8)}`;
  };

  // Add this new function for push functionality
  const handlePushRepo = async (repo: ClonedRepo) => {
    if (!repo.token) {
      console.error('Error', 'No authentication token found for this repository');
      return;
    }

    setIsPushing(prev => ({ ...prev, [repo.name]: true }));

    try {
      const result = await MGitModule.push(repo.path, 'Basic ' + repo.token);
      
      if (result.success) {
        console.log(
          'Push Successful', 
          `${result.message}\nCommit: ${result.commitHash?.substring(0, 7) || 'N/A'}`
        );
      } else {
        console.log('Push Failed', result.message);
      }
    } catch (error) {
      console.error('Push error, failed to push changes to remote repo:', error);
    } finally {
      setIsPushing(prev => ({ ...prev, [repo.name]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* User Identity Section */}
        <View style={styles.identitySection}>
          <Text style={styles.identityTitle}>🔐 Your NOSTR Identity</Text>
          <Text style={styles.pubkeyText}>{truncatePubkey(currentUserPubkey)}</Text>
          <TouchableOpacity 
            style={styles.manageKeysButton}
            onPress={() => setShowKeyManager(true)}
          >
            <Text style={styles.manageKeysText}>Manage Keys</Text>
          </TouchableOpacity>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>📱 Medical Repository Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowQRScanner(true)}
          >
            <Text style={styles.actionButtonText}>📷 Scan QR Code to Clone Repository</Text>
          </TouchableOpacity>
        </View>

        {/* Cloned Repositories */}
        {clonedRepos.length > 0 && (
          <View style={styles.reposSection}>
            <Text style={styles.sectionTitle}>📁 Your Medical Repositories</Text>
            
            {clonedRepos.map((repo, index) => (
              <View key={index} style={styles.repoCard}>
                <View style={styles.repoHeader}>
                  <Text style={styles.repoName}>{repo.name}</Text>
                  <Text style={styles.repoDate}>
                    Cloned: {repo.clonedAt.toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.repoPath}>{repo.path}</Text>
                
                <TouchableOpacity 
                  style={styles.addRecordButton}
                  onPress={() => navigateToAddRecord(repo)}
                >
                  <Text style={styles.addRecordButtonText}>+ Add Medical Record</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>🏥 About Medical Binder</Text>
          <Text style={styles.infoText}>
            Medical Binder uses NOSTR for sovereign identity and MGit for version-controlled medical records. 
            Your private keys never leave your device, ensuring complete self-custody of your medical data.
          </Text>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={() => setShowQRScanner(false)}
        />
      </Modal>

      {/* Key Manager Modal */}
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
            <NostrKeyManager onLogout={onLogout} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  identitySection: {
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
  identityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  pubkeyText: {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, monospace',
    color: '#666',
    marginBottom: 12,
  },
  manageKeysButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  manageKeysText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  reposSection: {
    marginBottom: 20,
  },
  repoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  repoDate: {
    fontSize: 12,
    color: '#666',
  },
  repoPath: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'Menlo, Monaco, monospace',
  },
  addRecordButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  addRecordButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
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