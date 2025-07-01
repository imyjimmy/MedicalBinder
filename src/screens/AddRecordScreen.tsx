import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Image
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const MGitModule = NativeModules.MGitModule;

interface AddRecordScreenProps {
  route: RouteProp<RootStackParamList, 'AddRecord'>;
}

type TabType = 'text' | 'photos' | 'pdfs';

export const AddRecordScreen: React.FC<AddRecordScreenProps> = ({ route }) => {
  const { repoPath, repoName } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [recordText, setRecordText] = useState('');
  const [nostrPubkey, setNostrPubkey] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  const addRecord = async () => {
    if (!recordText.trim() && photos.length === 0 && pdfs.length === 0) {
      Alert.alert('Error', 'Please add some content to your medical record');
      return;
    }

    if (!nostrPubkey.trim()) {
      Alert.alert('Error', 'Please enter your Nostr public key');
      return;
    }

    setIsCommitting(true);

    try {
      // Step 1: Read existing medical-history.json
      const medicalHistoryPath = `${repoPath}/medical-history.json`;
      let existingData = [];
      
      try {
        const fileContent = await RNFS.readFile(medicalHistoryPath, 'utf8');
        existingData = JSON.parse(fileContent);
        
        if (!Array.isArray(existingData)) {
          existingData = [];
        }
      } catch (error) {
        console.log('No existing medical-history.json or invalid JSON, starting fresh');
        existingData = [];
      }

      // Step 2: Append new record
      const newRecord = {
        id: `record-${Date.now()}`,
        timestamp: new Date().toISOString(),
        content: recordText,
        photos: photos,
        pdfs: pdfs,
        author: {
          nostrPubkey: nostrPubkey
        }
      };

      existingData.push(newRecord);

      // Step 3: Write updated JSON back to file
      await RNFS.writeFile(
        medicalHistoryPath, 
        JSON.stringify(existingData, null, 2), 
        'utf8'
      );

      // Step 4: Stage the file with MGit Add
      console.log('Staging file with MGit add...');
      const addResult = await MGitModule.add(repoPath, 'medical-history.json');
      if (!addResult.success) {
        throw new Error(addResult.error || 'Failed to stage file');
      }
      console.log('File staged successfully:', addResult.message);

      // Step 5: Create MCommit with Nostr signature
      console.log('Creating MCommit with Nostr signature...');
      const commitResult = await MGitModule.commit(
        repoPath,
        'added_medical_record',
        'Patient',
        'patient@example.com',  
        nostrPubkey
      );

      if (commitResult.success) {
        console.log('MCommit success:', commitResult);
        Alert.alert(
          'Success! 🎉',
          `Medical record added and committed!\n\nGit Hash: ${commitResult.gitHash?.substring(0, 8)}\nMGit Hash: ${commitResult.mGitHash?.substring(0, 8)}\nNostr Signed: ✓`,
          [{ text: 'OK', onPress: () => {
            setRecordText('');
            setPhotos([]);
            setPdfs([]);
          }}]
        );
      } else {
        throw new Error(commitResult.message || 'Commit failed');
      }

    } catch (error) {
      console.error('Add record error:', error);
      Alert.alert('Error', `Failed to add record: ${error.message}`);
    } finally {
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
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📝 Text Notes</Text>
          <Text style={styles.cardDescription}>
            Write down your medical information, symptoms, or observations
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.label}>Medical Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter your medical notes here... (e.g., symptoms, medications, doctor visits, test results)"
            value={recordText}
            onChangeText={setRecordText}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          {recordText && (
            <Text style={styles.characterCount}>{recordText.length} characters</Text>
          )}
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

  const hasContent = recordText.trim() || photos.length > 0 || pdfs.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Medical Record</Text>
          <Text style={styles.subtitle}>
            Add your medical information using any of the methods below
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <View style={styles.tabList}>
            {renderTabButton('text', '📝', 'Notes')}
            {renderTabButton('photos', '📷', 'Photos')}
            {renderTabButton('pdfs', '📄', 'PDFs')}
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === 'text' && renderTextTab()}
        {activeTab === 'photos' && renderPhotosTab()}
        {activeTab === 'pdfs' && renderPdfsTab()}

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

        {/* Nostr Public Key Input */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.label}>Nostr Public Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Nostr public key..."
              value={nostrPubkey}
              onChangeText={setNostrPubkey}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Save Button */}
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
      </ScrollView>
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
    padding: 16,
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
    marginBottom: 24,
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
  },
  cardContent: {
    padding: 16,
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
    minHeight: 120,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 32,
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
});