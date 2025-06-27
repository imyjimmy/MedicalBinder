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

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [clonedRepos, setClonedRepos] = useState<Array<ClonedRepo>>([]);

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

  const navigateToOpenedBinder = (repo: ClonedRepo, index: number) => {
    console.log('Opening binder:', repo);
    
    navigation.navigate('OpenedBinder', { 
      repoPath: repo.path,
      repoName: repo.name,
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
              // This callback provides the node reference for the shared element system
              // Usually you don't need to do anything here unless you need custom behavior
          }}>
            <View key={index}>
              <View style={styles.repoInfo}>
                <Text style={styles.repoName}>{repo.name}</Text>
                <Text style={styles.repoPath}>{repo.path}</Text>
              </View>
              <View style={styles.binderOpenContainer}>
                {/* Circular Open Button */}
                <TouchableOpacity 
                  style={styles.openButton}
                  onPress={() => navigateToOpenedBinder(repo, index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openButtonText}>Open 📖</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SharedElement>
        ))}
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
    justifyContent: 'flex-end'
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