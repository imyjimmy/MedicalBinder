import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, NativeModules } from 'react-native';

const { SimpleAudioRecorder } = NativeModules;

const SimpleAudioRecorderComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioPath, setAudioPath] = useState('');

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
      const filePath = await SimpleAudioRecorder.stopRecording();
      setIsRecording(false);
      setAudioPath(filePath);
      console.log('Recording stopped, saved to:', filePath);
      Alert.alert('Success', `Audio saved to: ${filePath}`);
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Custom Audio Recorder</Text>
      
      <TouchableOpacity
        style={[styles.button, isRecording ? styles.stopButton : styles.startButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
      
      {audioPath ? (
        <Text style={styles.pathText}>Last recording: {audioPath}</Text>
      ) : null}
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pathText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default SimpleAudioRecorderComponent;