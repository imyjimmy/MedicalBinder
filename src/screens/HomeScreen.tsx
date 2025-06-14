import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { QRScanner } from '../components/QRScanner';

export const HomeScreen: React.FC = () => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [clonedRepos, setClonedRepos] = useState<Array<{url: string, path: string}>>([]);

  const handleScanSuccess = (repoUrl: string, localPath: string) => {
    setClonedRepos(prev => [...prev, { url: repoUrl, path: localPath }]);
    setShowQRScanner(false);
  };

  const handleScanError = (error: string) => {
    console.error('QR Scan Error:', error);
    // Keep scanner open for retry
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Git Repository Manager</Text>
        
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowQRScanner(true)}
        >
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>

        {clonedRepos.length > 0 && (
          <View style={styles.reposList}>
            <Text style={styles.reposTitle}>Cloned Repositories:</Text>
            {clonedRepos.map((repo, index) => (
              <View key={index} style={styles.repoItem}>
                <Text style={styles.repoUrl}>{repo.url}</Text>
                <Text style={styles.repoPath}>{repo.path}</Text>
              </View>
            ))}
          </View>
        )}
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
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
  reposList: {
    flex: 1,
  },
  reposTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  repoItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  repoUrl: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 5,
  },
  repoPath: {
    fontSize: 12,
    color: '#666',
  },
});