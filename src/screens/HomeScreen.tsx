import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
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
import SQLiteTest from '../components/SQLiteTest';
// import AudioRecorderTest from '../components/AudioRecorderTest';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onLogout: () => void;
  route: RouteProp<RootStackParamList, 'Home'>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, route }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [clonedRepos, setClonedRepos] = useState<Array<ClonedRepo>>([]);
  // const [loading, setLoading] = useState(true);
  const [activeBinder, setActiveBinder] = useState<string | null>(null);
  const [binderPages, setBinderPages] = useState<Record<string, number>>({});

  useEffect(() => {
    loadClonedRepos();
  }, []);

  const handleTelehealthPress = () => {
    navigation.navigate('VideoConference');
  };

  const sortedRepos = useMemo(() => {
    if (!activeBinder) return clonedRepos;
    
    return [...clonedRepos].sort((a, b) => {
      if (a.name === activeBinder) return 1;  // Active binder to end
      if (b.name === activeBinder) return -1;
      return 0; // Maintain original order for others
    });
  }, [clonedRepos, activeBinder]);

  const loadClonedRepos = async () => {
    try {
      const storedRepos = await AsyncStorage.getItem('clonedRepos');
      console.log('Raw AsyncStorage data:', storedRepos);
      if (storedRepos) {
        const parsedRepos = JSON.parse(storedRepos);
        console.log('Parsed repos:', parsedRepos);

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
      // setLoading(false);
    }
  };

  const saveClonedRepos = async (repos: Array<ClonedRepo>) => {
    try {
      await AsyncStorage.setItem('clonedRepos', JSON.stringify(repos));
    } catch (error) {
      console.error('Failed to save cloned repos:', error);
    }
  };

  const deleteRepo = async (index: number) => {
    const updatedRepos = clonedRepos.filter((_, i) => i !== index);
    setClonedRepos(updatedRepos);
    setActiveBinder(null);
    await saveClonedRepos(updatedRepos);
  };

  const handleScanSuccess: ScanSuccessCallback = async (name: string, repoUrl: string, localPath: string, token?: string) => {
    const newRepo = { name: name, url: repoUrl, path: localPath, clonedAt: new Date(), token: token };
    const updatedRepos = [...clonedRepos, newRepo];
    setClonedRepos(updatedRepos);
    await saveClonedRepos(updatedRepos);
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
      repoName: repo.name,
      token: repo.token ?? ''
    });
  };

  const navigateToActiveBinder = (repo: ClonedRepo, index: number) => {
    console.log('Opening binder:', repo);
    console.log('Navigating with shared element ID:', `binder-${index}`);
    // setActiveBinder(repo.name);

    navigation.navigate('ActiveBinder', { 
      repoPath: repo.path,
      repoName: repo.name,
      token: repo.token ?? '',
      sharedElementId: `binder-${index}`,
    });

    // navigation.navigate('FolderScreen');
  };

  // Update page when navigating or adding records
  const updateBinderPage = (binderName: string, pageNumber: number) => {
    setBinderPages(prev => ({ ...prev, [binderName]: pageNumber }));
  };

  // get the current page number from ActiveBinderScreen
  useFocusEffect(
    useCallback(() => {
      // Check if we're returning from ActiveBinderScreen with page info
      const params = route.params;
      if (params?.repoName) {
        // NOW set the active binder - user has actually used it
        setActiveBinder(params.repoName);
        
        // Also update page info if available
        if (params?.currentPage) {
          updateBinderPage(params.repoName, params.currentPage);
        }
      }
    }, [route.params])
  );

  const handleAddMedicalBinder = () => {
    console.log('Add Medical Binder pressed');
    setShowQRScanner(true);
    // For now, you might want to navigate to QR scanner or create repo flow
    // navigation.navigate('CreateBinder');
  };

  /* State Depdendent UI */
  // the button navigation text changes depending on if the Binder has been opened
  const getButtonText = (repo: ClonedRepo) => {
    const isActive = activeBinder === repo.name;
    const currentPage = binderPages[repo.name];
    
    if (isActive && currentPage) {
      return `Go to Page ${currentPage}`;
    }
    //console.log('currentPage: ', currentPage, binderPages);
    return "Open 📖";
  };

  const shouldShowPrimaryRecordButton = () => {
    return activeBinder !== null && clonedRepos.length > 0;
  }

  const handleRecord = () => {
    console.log('handleRecord pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content Area */}
      {/* Telehealth Appointment Rectangle -- @todo
      <View style={styles.telehealthContainer}>
        <TouchableOpacity
          style={styles.telehealthRectangle}
          onPress={handleTelehealthPress}
          activeOpacity={0.8}
        >
          <View style={styles.telehealthContent}>
            <View style={styles.telehealthIcon}>
              <Text style={styles.telehealthIconText}>🏥</Text>
            </View>
            <View style={styles.telehealthInfo}>
              <Text style={styles.telehealthTitle}>Upcoming Appointment</Text>
              <Text style={styles.telehealthSubtitle}>Dr. Smith - Cardiology</Text>
              <Text style={styles.telehealthTime}>Today, 2:30 PM</Text>
            </View>
            <View style={styles.telehealthJoinButton}>
              <Text style={styles.telehealthJoinText}>Join Call</Text>
            </View>
          </View>
        </TouchableOpacity> 
      </View> */}
      {/* <SQLiteTest /> */}
      {/* <AudioRecorderTest /> */}
      <View style={styles.binderContainer}>
        {/* Add Medical Binder button at top when there's an active binder */}
        {shouldShowPrimaryRecordButton() && (
          <View style={styles.topButtonContainer}>
            <TouchableOpacity 
              style={styles.addButtonSecondary}
              onPress={handleAddMedicalBinder}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonTextSecondary}>+ Binder</Text>
            </TouchableOpacity>
          </View>
        )}
        {sortedRepos.map((repo, index) => (
          <SharedElement
            style={[
              styles.binderItem,
              activeBinder === repo.name && styles.activeBinderItem
            ]}
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
            <View style={styles.binderInteractiveButtonContainer}>
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
                <Text style={styles.openButtonText}>{getButtonText(repo)}</Text>
              </TouchableOpacity>
            </View>
          </SharedElement>
        ))}
        {/* Centered Add Button in Lower Third */}
        <View style={styles.binderContent}>
          {shouldShowPrimaryRecordButton() ? (
            <TouchableOpacity 
              style={styles.recordButton}
              onPress={handleRecord}
              activeOpacity={0.8}
            >
              <Text style={styles.recordButtonText}>🔴 Record Doctor Appointment</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddMedicalBinder}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>Add a Medical Binder</Text>
            </TouchableOpacity>
          )}
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
  activeBinderItem: {
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8, // Android shadow
    transform: [{ scale: 1.02 }], // Slight scale up for prominence
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
  addButtonTextSecondary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  addButtonSecondary: {
    // width: 60,           // Fixed width and height for perfect circle
    height: 60,
    borderRadius: 30,    // Half of width/height for circle
    backgroundColor: '#2e2e2e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 250,
    alignItems: 'center',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  binderItem: {
    flexDirection: 'column',
    // alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    width: '100%',
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
  binderInteractiveButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  binderContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  binderContent: {
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
    marginBottom: 10,
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
  telehealthContainer: {
    marginBottom: 20,
    marginTop: 20,
    // width: '100%',
    paddingHorizontal: 30,
  },
  telehealthRectangle: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  telehealthContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  telehealthIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  telehealthIconText: {
    fontSize: 24,
  },
  telehealthInfo: {
    flex: 1,
  },
  telehealthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  telehealthSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  telehealthTime: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  telehealthJoinButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  telehealthJoinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  topButtonContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  }
});