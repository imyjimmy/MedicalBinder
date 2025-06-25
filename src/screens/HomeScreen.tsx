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

export const HomeScreen: React.FC = () => {
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
        <View style={styles.content}>
          <Text style={styles.title}>Add a Binder</Text>
          
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowQRScanner(true)}
          >
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          {clonedRepos.map((repo, index) => (
            <View key={index} style={styles.repoItem}>
              <View style={styles.repoInfo}>
                <Text style={styles.repoName}>{repo.name}</Text>
                <Text style={styles.repoPath}>{repo.path}</Text>
              </View>
              <View style={styles.buttonContainer}> {/* New container for buttons */}
                <TouchableOpacity
                  style={styles.addRecordButton}
                  onPress={() => navigateToAddRecord(repo)}
                >
                  <Text style={styles.addRecordButtonText}>📝 Add Record</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.pushButton, 
                    isPushing[repo.name] && styles.pushButtonDisabled
                  ]}
                  onPress={() => handlePushRepo(repo)}
                  disabled={isPushing[repo.name]}
                >
                  <Text style={styles.pushButtonText}>
                    {isPushing[repo.name] ? '⏳ Pushing...' : '📤 Push'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  addRecordButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,      
    alignSelf: 'center',
  },
  addRecordButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: { // Add this new style
    flexDirection: 'column',
    gap: 8,
  },
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
  pubkeyText: {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, monospace',
    color: '#666',
    marginBottom: 12,
  },
  pushButton: {
    backgroundColor: '#34C759', // Green color for push
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pushButtonDisabled: {
    backgroundColor: '#8E8E93', // Gray when disabled
  },
  pushButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  reposList: {
    flex: 1,
  },
  reposTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  repoInfo: {
    flex: 1,
    marginRight: 12,
  },
  repoItem: {
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  repoDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  repoUrl: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 5,
  },
  repoPath: {
    fontSize: 12,
    color: '#666',
  },
});