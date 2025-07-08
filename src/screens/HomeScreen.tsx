import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { QRScanner } from '../components/QRScanner';
import { ClonedRepo, ScanSuccessCallback } from '../types/git';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { SharedElement } from 'react-native-shared-element';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [clonedRepos, setClonedRepos] = useState<Array<ClonedRepo>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClonedRepos();
  }, []);

  const loadClonedRepos = async () => {
    try {
      const storedRepos = await AsyncStorage.getItem('clonedRepos');
      if (storedRepos) {
        const parsedRepos = JSON.parse(storedRepos);
        // Convert clonedAt strings back to Date objects
        const reposWithDates = parsedRepos.map((repo: any) => ({
          ...repo,
          clonedAt: new Date(repo.clonedAt)
        }));
        setClonedRepos(reposWithDates);
      }
    } catch (error) {
      console.error('Failed to load cloned repos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveClonedRepos = async (repos: Array<ClonedRepo>) => {
    try {
      await AsyncStorage.setItem('clonedRepos', JSON.stringify(repos));
    } catch (error) {
      console.error('Failed to save cloned repos:', error);
    }
  };

  // const handleScanSuccess: ScanSuccessCallback = (name: string, repoUrl: string, localPath: string, token?: string) => {
  //   setClonedRepos(prev => [...prev, { url: repoUrl, path: localPath, name: name, clonedAt: new Date(), token: token }]);
  //   setShowQRScanner(false);
  // };
  const clearAllRepos = async () => {
    try {
      await AsyncStorage.removeItem('clonedRepos');
      setClonedRepos([]);
      console.log('Cleared all cloned repositories');
    } catch (error) {
      console.error('Failed to clear repos:', error);
    }
  };

  const deleteRepo = async (index: number) => {
    const updatedRepos = clonedRepos.filter((_, i) => i !== index);
    setClonedRepos(updatedRepos);
    await saveClonedRepos(updatedRepos);
  };

  const handleScanSuccess: ScanSuccessCallback = async (name: string, repoUrl: string, localPath: string, token?: string) => {
    const newRepo = { name: name, url: repoUrl, path: localPath, clonedAt: new Date(), token: token };
    const updatedRepos = [...clonedRepos, newRepo];
    setClonedRepos(updatedRepos);
    await saveClonedRepos(updatedRepos);
    setShowQRScanner(false);
  };

  // Show loading state while repos are being loaded
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text>Loading medical binders...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
      repoName: repo.name,
      token: repo.token ?? ''
    });
  };

  const navigateToActiveBinder = (repo: ClonedRepo, index: number) => {
    console.log('Opening binder:', repo);
    console.log('Navigating with shared element ID:', `binder-${index}`);

    navigation.navigate('ActiveBinder', { 
      repoPath: repo.path,
      repoName: repo.name,
      token: repo.token ?? '',
      sharedElementId: `binder-${index}`,
    });
  };

  const handleAddMedicalBinder = () => {
    // TODO: Navigate to create/add medical binder flow
    console.log('Add Medical Binder pressed');
    setShowQRScanner(true);
    // For now, you might want to navigate to QR scanner or create repo flow
    // navigation.navigate('CreateBinder');
  };

  // if (loading) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
  //         <Text>Loading medical binders...</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content Area */}
      <View style={styles.content}>
        {clonedRepos.map((repo, index) => (
          <SharedElement
            style={styles.repoItem}
            id={`binder-${index}`} 
            key={index} 
            onNode={(node) => {
              console.log('🏠 HomeScreen SharedElement registered:', `binder-${index}`, !!node);
            }}>
            {/* <View key={index}> */}
              <View style={styles.repoInfo}>
                <Text style={styles.repoName}>{repo.name}</Text>
                <Text style={styles.repoPath}>{repo.path}</Text>
              </View>
              <View style={styles.binderOpenContainer}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteRepo(index)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
                {/* Circular Open Button */}
                <TouchableOpacity 
                  style={styles.openButton}
                  onPress={() => navigateToActiveBinder(repo, index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openButtonText}>Open 📖</Text>
                </TouchableOpacity>
              </View>
            {/* </View> */}
          </SharedElement>
        ))}
        {/* Centered Add Button in Lower Third */}
        {/* <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: '#FF3B30' }]}
          onPress={clearAllRepos}
        >
          <Text style={styles.scanButtonText}>Clear All Repos</Text>
        </TouchableOpacity> */}
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
  binderOpenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: '10%',
    marginTop: 18,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  openButton: {
    // width: 44,
    width: '40%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  openButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  repoInfo: {
    // flex: 1,
    // marginRight: 12,
  },
  repoItem: {
    flexDirection: 'column',
    // alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    width: '100%',
    height: '20%',
    padding: 15,
    paddingBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#757575',
    borderStyle: 'solid',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 5 },
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
  repoPath: {
    fontSize: 8,
    color: '#666',
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
});

{/* <View style={styles.buttonContainer}>
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
</View> */}