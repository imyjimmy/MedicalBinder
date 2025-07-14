import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, NativeModules } from 'react-native';
import { AudioStorageService } from '../services/AudioStorageService';

const { SimpleAudioRecorder } = NativeModules;

const SimpleAudioRecorderComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioPath, setAudioPath] = useState('');
  const [audioHash, setAudioHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize audio storage on component mount
    const initializeStorage = async () => {
      try {
        console.log('🚀 Initializing AudioStorageService...');
        await AudioStorageService.initialize();
        console.log('✅ AudioStorageService initialized successfully');
      } catch (error) {
        console.error('❌ AudioStorageService initialization failed:', error);
      }
    };
    
    initializeStorage();
  }, []);

  const startRecording = async () => {
    try {
      const filePath = await SimpleAudioRecorder.startRecording();
      setIsRecording(true);
      setAudioPath('');
      setAudioHash('');
      console.log('Recording started, will save to:', filePath);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      setIsProcessing(true);
      
      // Stop recording and get file path
      const filePath = await SimpleAudioRecorder.stopRecording();
      setIsRecording(false);
      setAudioPath(filePath);
      
      // Store in hash-based SQLite storage
      const hash = await AudioStorageService.storeAudioFile(filePath, 'medical-recording.m4a');
      setAudioHash(hash);
      
      console.log('Recording processed:', { filePath, hash: hash.substring(0, 12) + '...' });
      
      Alert.alert(
        'Success! 🎉', 
        `Audio recorded and stored!\n\nHash: ${hash.substring(0, 12)}...`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const testSQLiteRetrieval = async () => {
    if (!audioHash) {
      Alert.alert('Error', 'No audio hash available. Record something first.');
      return;
    }
    
    try {
      setIsProcessing(true);
      const success = await AudioStorageService.testBinaryRetrieval(audioHash);
      
      if (success) {
        Alert.alert(
          'SQLite Test Success! 🎉',
          'Binary data retrieved from SQLite and written to test file. Check console for details.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Test Failed', 'Could not retrieve binary data from SQLite');
      }
    } catch (error) {
      console.error('SQLite test error:', error);
      Alert.alert('Error', 'SQLite test failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const debugDatabase = async () => {
  try {
    setIsProcessing(true);
    await AudioStorageService.debugDatabase();
    Alert.alert('Debug Complete', 'Check console for database contents');
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Audio → SQLite Pipeline</Text>
      
      <TouchableOpacity
        style={[
          styles.button, 
          isRecording ? styles.stopButton : styles.startButton,
          isProcessing && styles.disabledButton
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : 
           isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
      
      {audioPath ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>📁 File:</Text>
          <Text style={styles.pathText}>{audioPath}</Text>
        </View>
      ) : null}
      
      {audioHash ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>🔗 Hash:</Text>
          <Text style={styles.hashText}>{audioHash.substring(0, 16)}...</Text>
        </View>
      ) : null}

      {audioHash ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6f42c1' }]}
          onPress={testSQLiteRetrieval}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Test SQLite Binary</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#fd7e14' }]}
        onPress={debugDatabase}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>Debug Database</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    margin: 10,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007bff',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#28a745',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  pathText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  hashText: {
    fontSize: 12,
    color: '#007bff',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});

export default SimpleAudioRecorderComponent;