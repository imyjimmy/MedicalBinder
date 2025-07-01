import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const MGitModule = NativeModules.MGitModule;

interface ActiveBinderScreenProps {
  route: RouteProp<RootStackParamList, 'ActiveBinder'>;
}

export const ActiveBinderScreen: React.FC<ActiveBinderScreenProps> = ({ route }) => {
  const { repoPath, repoName } = route.params;
  const [recordText, setRecordText] = useState('');
  const [nostrPubkey, setNostrPubkey] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const addRecord = async () => {
    if (!recordText.trim()) {
      Alert.alert('Error', 'Please enter some text for your medical record');
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
        
        // Ensure it's an array
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
            setNostrPubkey('');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{repoName}</Text>
        <Text style={styles.subtitle}>Medical Records</Text>
        
        <View style={styles.addRecordSection}>
          <Text style={styles.sectionTitle}>Add New Record</Text>
          
          <Text style={styles.label}>Medical Record Content</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your medical record details..."
            value={recordText}
            onChangeText={setRecordText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Nostr Public Key</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your Nostr public key..."
            value={nostrPubkey}
            onChangeText={setNostrPubkey}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.addButton, isCommitting && styles.addButtonDisabled]}
            onPress={addRecord}
            disabled={isCommitting}
          >
            <Text style={styles.addButtonText}>
              {isCommitting ? 'Adding Record...' : 'Add Medical Record'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  addRecordSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});