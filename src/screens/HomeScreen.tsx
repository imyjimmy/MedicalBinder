import { NativeModules } from 'react-native';
import React, {useState} from 'react';
import {
  Button,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MGitService from '../services/MGitService';

const testMGitIntegration = () => {
  try {
    if (NativeModules.MGitModule) {
      // Test the actual setupMgitBinary method (the one that calls the real binary setup)
      NativeModules.MGitModule.setupMgitBinary()
        .then(result => {
          Alert.alert('Real Setup Success!', JSON.stringify(result));
          
          // If that works, test clone method too
          const testClone = () => {
            NativeModules.MGitModule.clone(
              'https://example.com/test.git',
              '/tmp/test',
              { token: 'test-token' }
            )
            .then(cloneResult => {
              Alert.alert('Clone Test Result', JSON.stringify(cloneResult));
            })
            .catch(cloneError => {
              Alert.alert('Clone Test Error', cloneError.toString());
            });
          };
          
          // Call clone test after a delay
          setTimeout(testClone, 1000);
        })
        .catch(error => {
          Alert.alert('Real Setup Error', error.toString());
        });
    }
  } catch (error) {
    Alert.alert('Error', error.toString());
  }
};

const HomeScreen: React.FC = () => {
  const [mgitStatus, setMgitStatus] = useState<string>('Not tested');
  const [isLoading, setIsLoading] = useState(false);

  const testMGitConnection = async () => {
    setIsLoading(true);
    try {
      const result = await MGitService.testConnection();
      setMgitStatus(result ? 'MGit module connected!' : 'MGit module not available');
    } catch (error) {
      console.error('MGit test failed:', error);
      setMgitStatus('MGit test failed');
      Alert.alert('Error', `MGit test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <Text style={styles.title}>MedicalBinder MVP</Text>
          <Text style={styles.subtitle}>Hello World with MGit!!!</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>MGit Status:</Text>
            <Text style={[
              styles.statusText,
              mgitStatus.includes('connected') ? styles.statusSuccess : styles.statusDefault
            ]}>
              {mgitStatus}
            </Text>
          </View>
          {/* <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testMGitConnection}
            disabled={isLoading}
          > */}
            {/* <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test MGit Module'}
            </Text> */}
          <Button title="Test MGit Integration" onPress={testMGitIntegration} />
          {/* </TouchableOpacity> */}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>About MGit</Text>
            <Text style={styles.infoText}>
              MGit is a specialized Git implementation for secure, self-custodial 
              medical data management using Nostr public keys for authentication.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusDefault: {
    color: '#666',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default HomeScreen;
