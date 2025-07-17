import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Switch
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { NostrAuthService } from '../services/NostrAuthService';
import SimpleAudioRecorderComponent from '../components/SimpleAudioRecorder';

const MGitModule = NativeModules.MGitModule;

interface AddRecordScreenProps {
  route: RouteProp<RootStackParamList, 'AddRecord'>;
}

type TabType = 'text' | 'photos' | 'pdfs';

export const AddRecordScreen: React.FC<AddRecordScreenProps> = ({ route }) => {
  const { repoPath, repoName, token } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [recordText, setRecordText] = useState('');
  const [audioHash, setAudioHash] = useState('');
  const [nostrPubkey, setNostrPubkey] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  // const [isDoctorAppt, setIsDoctorAppt] = useState(false);
  // const toggleSwitch = () => setIsDoctorAppt(previousState => !previousState);

  useEffect(() => {
    const loadUserPubkey = async () => {
      const userPubkey = await NostrAuthService.getCurrentUserPubkey();
      if (userPubkey) {
        setNostrPubkey(userPubkey);
      }
    };
    loadUserPubkey();
  }, []);

  /**
   * Adds a new medical record to the repository and commits it with Nostr signature
   * Validates input, updates medical-history.json, stages changes, and creates an MGit commit
  */
  const addRecord = async () => {
    // Validate that user has provided some content (text, photos, or PDFs)
    if (!recordText.trim() && photos.length === 0 && pdfs.length === 0) {
      Alert.alert('Error', 'Please add some content to your medical record');
      return;
    }

    // Ensure Nostr public key is present for commit signing
    if (!nostrPubkey.trim()) {
      Alert.alert('Error', 'Please enter your Nostr public key');
      return;
    }

    // Show loading state during the commit process
    setIsCommitting(true);

    try {
      // Step 1: Read existing medical-history.json
      const medicalHistoryPath = `${repoPath}/medical-history.json`;
      let existingData = [];
      
      try {
        // Attempt to read and parse existing medical history file
        const fileContent = await RNFS.readFile(medicalHistoryPath, 'utf8');
        existingData = JSON.parse(fileContent);
        
        // Ensure data is in expected array format
        if (!Array.isArray(existingData)) {
          existingData = [];
        }
      } catch (error) {
        // File doesn't exist or is corrupted - start with empty array
        console.log('No existing medical-history.json or invalid JSON, starting fresh');
        existingData = [];
      }

      // Step 2: Create new medical record entry with metadata
      const newRecord = {
        id: `record-${Date.now()}`, // Unique timestamp-based ID
        timestamp: new Date().toISOString(), // ISO timestamp for sorting/filtering
        content: recordText, // User's text content
        author: {
          nostrPubkey: nostrPubkey // Nostr identity for verification
        },
        ...(audioHash && {audio: audioHash}),
        ...(photos && { photos: photos }),
        ...(pdfs && { pdfs: pdfs })
      };

      // Add new record to existing data array
      existingData.push(newRecord);

      // Step 3: Write updated medical history back to repository
      await RNFS.writeFile(
        medicalHistoryPath, 
        JSON.stringify(existingData, null, 2), 
        'utf8'
      );

      // Step 4: Stage the modified file for commit using MGit
      console.log('Staging file with MGit add...');
      const addResult = await MGitModule.add(repoPath, 'medical-history.json');
      if (!addResult.success) {
        throw new Error(addResult.error || 'Failed to stage file');
      }
      console.log('File staged successfully:', addResult.message);

      // Step 5: Create MGit commit with Nostr signature for authenticity
      console.log('Creating MCommit with Nostr signature...');
      const commitResult = await MGitModule.commit(
        repoPath,
        'add_medical_record', // Commit message
        'Patient', // Author name (could be made configurable)
        'patient@example.com', // Author email (could be made configurable)
        nostrPubkey // Nostr pubkey for cryptographic signing
      );

      if (commitResult.success) {
        // Display success message with commit hashes for verification
        console.log('MCommit success:', commitResult);
        // Step 6: Push changes to remote repository
        console.log('Pushing changes to remote repository...');
        const pushResult = await MGitModule.push(
          repoPath,
          token,
        );

        if (!pushResult.success) {
          console.warn('Local commit succeeded but push failed:', pushResult.error);
          console.error('Push error details:', pushResult, 'token: ', token);
          // You might want to show a warning to the user about sync status
        }
        Alert.alert(
          'Success! 🎉',
          `Medical record added and committed!\n\nGit Hash: ${commitResult.gitHash?.substring(0, 8)}\nMGit Hash: ${commitResult.mGitHash?.substring(0, 8)}\nNostr Signed: ✓`,
          [{ text: 'OK', onPress: () => {
            // Reset form after successful commit
            setRecordText('');
            setPhotos([]);
            setPdfs([]);
          }}]
        );
      } else {
        throw new Error(commitResult.message || 'Commit failed');
      }

    } catch (error) {
      // Handle any errors during the record addition process
      console.error('Add record error:', error);
      Alert.alert('Error', `Failed to add record: ${error.message}`);
    } finally {
      // Always reset loading state regardless of success/failure
      setIsCommitting(false);
    }
  };

  const renderTabButton = (tab: TabType, icon: string, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabIcon, activeTab === tab && styles.tabIconActive]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTextTab = () => (
    <View style={styles.textTabContent}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>📝 Note</Text>
          <Text style={styles.cardDescription}>
            Write down your medical information, symptoms, or observations
          </Text>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.expandableTextArea}
              placeholder="Enter your medical notes here... (e.g., symptoms, medications, doctor visits, test results)"
              value={recordText}
              onChangeText={setRecordText}
              multiline
              textAlignVertical="top"
            />
          </View>
          {/* <View style={styles.switchContainer}>
            <Switch
              onValueChange={toggleSwitch}
              value={isDoctorAppt}
            />
            <Text style={styles.switchLabel}>Doctor's Appointment</Text>
          </View> */}
        </View>
      </View>
    </View>
  );

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📷 Photo Records</Text>
          <Text style={styles.cardDescription}>
            Take photos or upload images of physical medical documents
          </Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.photoGrid}>
            <TouchableOpacity style={styles.photoUploadButton}>
              <Text style={styles.photoUploadIcon}>📷</Text>
              <Text style={styles.photoUploadText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.photoUploadButton}>
              <Text style={styles.photoUploadIcon}>🖼️</Text>
              <Text style={styles.photoUploadText}>From Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {photos.length > 0 && (
            <View style={styles.uploadedFiles}>
              <Text style={styles.uploadedLabel}>Uploaded Photos ({photos.length})</Text>
              {photos.map((photo, index) => (
                <View key={index} style={styles.fileItem}>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileIcon}>🖼️</Text>
                    <Text style={styles.fileName}>Photo {index + 1}</Text>
                    <View style={styles.fileBadge}>
                      <Text style={styles.fileBadgeText}>IMG</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderPdfsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📄 PDF Documents</Text>
          <Text style={styles.cardDescription}>
            Upload PDF files of medical reports, test results, or prescriptions
          </Text>
        </View>
        <View style={styles.cardContent}>
          <TouchableOpacity style={styles.pdfUploadArea}>
            <Text style={styles.pdfUploadIcon}>📁</Text>
            <Text style={styles.pdfUploadTitle}>Upload PDF Files</Text>
            <Text style={styles.pdfUploadSubtitle}>Tap to browse files</Text>
          </TouchableOpacity>
          
          {pdfs.length > 0 && (
            <View style={styles.uploadedFiles}>
              <Text style={styles.uploadedLabel}>Uploaded PDFs ({pdfs.length})</Text>
              {pdfs.map((pdf, index) => (
                <View key={index} style={styles.fileItem}>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileIcon}>📄</Text>
                    <Text style={styles.fileName}>Document {index + 1}.pdf</Text>
                    <View style={[styles.fileBadge, styles.pdfBadge]}>
                      <Text style={styles.fileBadgeText}>PDF</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  /* audio functions */
  const onAudioRecorded = (hash: string) => {
    console.log('in AddRecordScreen, audio hash: ', hash);
    setAudioHash(hash);
  }

  const hasContent = recordText.trim() || photos.length > 0 || pdfs.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Tab Navigation - stays at top */}
        <View style={styles.tabContainer}>
          <View style={styles.tabList}>
            {renderTabButton('text', '📝', 'Notes')}
            {renderTabButton('photos', '📷', 'Photos')}
            {renderTabButton('pdfs', '📄', 'PDFs')}
          </View>
        </View>

        {/* Summary Card */}
        {hasContent && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Record Summary</Text>
            <View style={styles.summaryContent}>
              {recordText && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>📝</Text>
                  <Text style={styles.summaryText}>Text notes added</Text>
                </View>
              )}
              {photos.length > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>📷</Text>
                  <Text style={styles.summaryText}>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
                  </Text>
                </View>
              )}
              {pdfs.length > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>📄</Text>
                  <Text style={styles.summaryText}>
                    {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} uploaded
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Scrollable Tab Content - takes remaining space */}
        <ScrollView style={styles.scrollableContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'text' && renderTextTab()}
          {activeTab === 'photos' && renderPhotosTab()}
          {activeTab === 'pdfs' && renderPdfsTab()}
        </ScrollView>

        {/* Bottom buttons - stays at bottom */}
        <View style={styles.bottomButtonContainer}>
          <SimpleAudioRecorderComponent onAudioRecorded={onAudioRecorded} repoName={repoName} /> 
          <TouchableOpacity
            style={[styles.saveButton, (!hasContent || !nostrPubkey.trim() || isCommitting) && styles.saveButtonDisabled]}
            onPress={addRecord}
            disabled={!hasContent || !nostrPubkey.trim() || isCommitting}
          >
            <Text style={styles.saveButtonIcon}>💾</Text>
            <Text style={styles.saveButtonText}>
              {isCommitting ? 'Saving Medical Record...' : 'Save Medical Record'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  scrollableContent: {
    flex: 1
  },
  textTabContent: {
    flex: 1
  },
  expandableTextArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    height: '100%',
    textAlignVertical: 'top',
  },
  textInputContainer: {
    flex: 1,
    minHeight: 300,
  },
  bottomButtonContainer: {
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  tabContainer: {
    marginBottom: 16,
  },
  tabList: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabIconActive: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  tabContent: {
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 180,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  nostrInput: {
    color: '#e1e1e1',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoUploadButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  photoUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoUploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  pdfUploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  pdfUploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pdfUploadTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  pdfUploadSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  uploadedFiles: {
    marginTop: 16,
  },
  uploadedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fileIcon: {
    fontSize: 20,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
  },
  fileBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pdfBadge: {
    backgroundColor: '#fee2e2',
  },
  fileBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
    color: '#ef4444',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  summaryContent: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIcon: {
    fontSize: 16,
    color: '#2563eb',
  },
  summaryText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    margin: 8
  },
  switchLabel: {
    margin: 8
  }
});