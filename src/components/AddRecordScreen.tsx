import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

const MGitModule = NativeModules.MGitModule;

interface AddRecordScreenProps {
  route: RouteProp<RootStackParamList, 'AddRecord'>;
}

export default function AddRecordScreen({ route }: AddRecordScreenProps) {
  console.log('AddRecordScreen route params:', route.params);
  const { repoPath, repoName } = route.params;
  const [recordText, setRecordText] = useState('');
  const [nostrPubkey, setNostrPubkey] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  // Print the full strings without truncation
  console.log('Full repoName length:', repoName?.length);
  console.log('Full repoName:', JSON.stringify(repoName));
  console.log('Full repoPath:', JSON.stringify(repoPath));

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

      // Step 4: MGit commit the changes
      const commitResult = await MGitModule.commit(
        repoPath,
        `Add medical record: ${recordText.substring(0, 50)}${recordText.length > 50 ? '...' : ''}`,
        'Patient', // author name - could be made configurable
        'patient@example.com', // author email - could be made configurable  
        nostrPubkey
      );

      if (commitResult.success) {
        Alert.alert(
          'Success! 🎉',
          `Medical record added and committed!\n\nCommit: ${commitResult.commitHash?.substring(0, 8)}`,
          [{ text: 'OK', onPress: () => {
            setRecordText('');
            setNostrPubkey('');
          }}]
        );
      } else {
        throw new Error(commitResult.error || 'Commit failed');
      }

    } catch (error) {
      console.error('Add record error:', error);
      Alert.alert('Error', `Failed to add record: ${error.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Medical Record</Text>
      
      <View style={styles.section}>
        <Text style={styles.info}>Repository: {repoPath}</Text>
        <Text style={styles.info}>Will append to: medical-history.json</Text>
      </View>

      <TouchableOpacity
        style={[styles.addButton, isCommitting && styles.buttonDisabled]}
        onPress={() => {
          // Just show the form - in a real app you might want a modal or navigation
        }}
        disabled={isCommitting}
      >
        <Text style={styles.addButtonText}>📝 Add Record</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.label}>Medical Record Content:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={recordText}
          onChangeText={setRecordText}
          placeholder="Enter your medical record content (e.g., 'Hello World - feeling great today!')"
          multiline={true}
          numberOfLines={8}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Your Nostr Public Key:</Text>
        <TextInput
          style={styles.input}
          value={nostrPubkey}
          onChangeText={setNostrPubkey}
          placeholder="npub... or hex format"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.saveButton, isCommitting && styles.buttonDisabled]}
          onPress={addRecord}
          disabled={isCommitting || !recordText.trim() || !nostrPubkey.trim()}
        >
          <Text style={styles.saveButtonText}>
            {isCommitting ? '⏳ Committing...' : '💾 Save & Commit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>What This Does</Text>
        <Text style={styles.info}>✓ Reads existing medical-history.json</Text>
        <Text style={styles.info}>✓ Appends your new record to the JSON array</Text>
        <Text style={styles.info}>✓ Writes updated file back to repository</Text>
        <Text style={styles.info}>✓ Creates MGit commit with Nostr pubkey</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});
