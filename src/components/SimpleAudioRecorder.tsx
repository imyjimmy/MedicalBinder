import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, NativeModules } from 'react-native';
import { AudioStorageService } from '../services/AudioStorageService';

const { SimpleAudioRecorder } = NativeModules;

interface SimpleAudioRecorderProps {
  onAudioRecorded?: (audioHash: string) => void;
  repoName: string;
}

const SimpleAudioRecorderComponent: React.FC<SimpleAudioRecorderProps> = ({ onAudioRecorded, repoName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize audio storage on component mount using singleton
    const initializeStorage = async () => {
      try {
        console.log('🚀 Initializing AudioStorageService...');
        const audioService = AudioStorageService.getInstance(repoName);
        await audioService.initialize();
        console.log('✅ AudioStorageService initialized successfully');
      } catch (error) {
        console.error('❌ AudioStorageService initialization failed:', error);
      }
    };

    initializeStorage();
  }, [repoName]);

  const startRecording = async () => {
    try {
      const filePath = await SimpleAudioRecorder.startRecording();
      setIsRecording(true);
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
      
      // Store in hash-based SQLite storage
      const audioService = AudioStorageService.getInstance(repoName); // get singleton instance
      const hash = await audioService.storeAudioFile(filePath, 'medical-recording.m4a');
      
      console.log('Recording processed:', { filePath, hash: hash.substring(0, 12) + '...' });
      
      // Auto-run debug functions (hidden from UI)
      try {
        // await AudioStorageService.debugDatabase();
        await audioService.testBinaryRetrieval(hash);
      } catch (debugError) {
        console.error('Debug functions failed:', debugError);
      }
      
      // Notify parent component
      if (onAudioRecorded) {
        onAudioRecorded(hash);
      }
      
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.recordButton,
        isRecording && styles.recordButtonActive,
        isProcessing && styles.recordButtonDisabled
      ]}
      onPress={handleRecordPress}
      disabled={isProcessing}
    >
      <View style={styles.recordIconContainer}>
        <View style={[
          styles.recordOuterRing,
          isRecording && styles.recordOuterRingActive
        ]}>
          <View style={[
            styles.recordInnerDot,
            isRecording && styles.recordInnerDotActive
          ]} />
        </View>
      </View>
      <Text style={[
        styles.buttonText,
        isRecording && styles.buttonTextActive
      ]}>
        {isProcessing ? 'Processing...' :
         isRecording ? 'Stop Recording' : 'Record Audio'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  recordButtonActive: {
    backgroundColor: '#dc3545',
    borderColor: '#c82333',
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordIconContainer: {
    marginRight: 12,
  },
  recordOuterRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordOuterRingActive: {
    backgroundColor: '#dc3545',
    borderColor: '#c82333',
  },
  recordInnerDot: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#dc3545',
  },
  recordInnerDotActive: {
    width: 18,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  buttonTextActive: {
    color: '#ffffff',
  },
});

export default SimpleAudioRecorderComponent;