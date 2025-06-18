import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GitRepoData {
  url: string;
  name: string;
  token?: string;
}

interface SimulatorDebugComponentProps {
  onScanSuccess?: (repoUrl: string, localPath: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  handleClone: (repoData: GitRepoData) => void;
}

export const SimulatorDebugComponent: React.FC<SimulatorDebugComponentProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  handleClone,
}) => {
  const [debugRepoName, setDebugRepoName] = useState('');
  const [debugToken, setDebugToken] = useState('');
  const [debugServerUrl, setDebugServerUrl] = useState('https://plebemr.com');
  
  const insets = useSafeAreaInsets();

  const handleDebugClone = () => {
    const serverUrl = debugServerUrl || 'https://plebemr.com';
    const repoData: GitRepoData = {
      url: `${serverUrl}/api/mgit/repos/${debugRepoName}`,
      name: debugRepoName,
      token: debugToken
    };
    
    handleClone(repoData);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.simulatorContainer}>
          <Text style={styles.simulatorTitle}>Simulator Debug Mode</Text>
          <Text style={styles.simulatorSubtitle}>
            Enter repository details manually for testing:
          </Text>
          
          <TextInput
            style={styles.debugInput}
            placeholder="Repository Name (e.g., test-health-records)"
            value={debugRepoName}
            onChangeText={setDebugRepoName}
            autoCapitalize="none"
            returnKeyType="next"
          />
          
          <TextInput
            style={styles.debugInput}
            placeholder="JWT Token"
            value={debugToken}
            onChangeText={setDebugToken}
            autoCapitalize="none"
            secureTextEntry={false}
            multiline={true}
            numberOfLines={3}
            returnKeyType="next"
          />
          
          <TextInput
            style={styles.debugInput}
            placeholder="Server URL (optional, defaults to plebemr.com)"
            value={debugServerUrl}
            onChangeText={setDebugServerUrl}
            autoCapitalize="none"
            returnKeyType="done"
          />
          
          <TouchableOpacity 
            style={[
              styles.debugButton, 
              (!debugRepoName || !debugToken) && styles.debugButtonDisabled
            ]} 
            onPress={handleDebugClone}
            disabled={!debugRepoName || !debugToken}
          >
            <Text style={styles.debugButtonText}>Start Clone</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {onClose && (
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]} 
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  simulatorContainer: {
    alignItems: 'center',
    minHeight: '80%', // Ensure minimum height
  },
  simulatorTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  simulatorSubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  debugInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    width: '100%',
    fontSize: 16,
  },
  debugButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40, // Extra bottom margin
  },
  debugButtonDisabled: {
    backgroundColor: '#666',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});