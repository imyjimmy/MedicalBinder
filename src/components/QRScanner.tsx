import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Camera,
  useCameraDevices,
  useCodeScanner,
} from 'react-native-vision-camera';
import { NativeModules } from 'react-native';

interface QRScannerProps {
  onScanSuccess?: (repoUrl: string, localPath: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
}

interface GitRepoData {
  url: string;
  name: string;
  token?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isSimulator, setIsSimulator] = useState(false);

  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');
  const insets = useSafeAreaInsets(); // Add this line

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    // Detect if running on simulator
    const checkIfSimulator = async () => {
      try {
        const devices = await Camera.getAvailableCameraDevices();
        setIsSimulator(devices.length === 0);
      } catch (error) {
        setIsSimulator(true);
      }
    };
    checkIfSimulator();
  }, []);


  const checkCameraPermission = async () => {
    try {
      const currentStatus = await Camera.getCameraPermissionStatus();
      
      if (currentStatus === 'granted') {
        setHasPermission(true);
        return;
      }
      
      const requestResult = await Camera.requestCameraPermission();
      const finalStatus = requestResult === 'granted';
      setHasPermission(finalStatus);
      
      if (!finalStatus) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings > MedicalBinder > Camera'
        );
      }
    } catch (error) {
      Alert.alert('Permission Error', `Failed to request camera permission: ${error.message}`);
      setHasPermission(false);
    }
  };

  const parseQRData = (data: string): GitRepoData | null => {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(data);
      
      // Handle mgit-repo-server QR format
      if (parsed.action === 'mgit_clone' && parsed.clone_url && parsed.repo_name) {
        return {
          url: parsed.clone_url,
          name: parsed.repo_name,
          token: parsed.jwt_token
        };
      }
      
      // Handle legacy format with url and name
      if (parsed.url && parsed.name) {
        return parsed;
      }
      
      // Handle format with repoId instead of name
      if (parsed.repoId) {
        return {
          url: parsed.url || `http://localhost:3003/api/mgit/repos/${parsed.repoId}`,
          name: parsed.repoId,
          token: parsed.token
        };
      }
    } catch {
      // If not JSON, check if it's a direct mgit URL
      if (data.includes('/api/mgit/repos/')) {
        const match = data.match(/\/api\/mgit\/repos\/([^/?]+)/);
        if (match) {
          const repoId = match[1];
          return {
            url: data,
            name: repoId,
          };
        }
      }
      
      // Check for direct git URLs
      if (data.includes('github.com') || data.includes('gitlab.com') || data.includes('.git')) {
        const name = data.split('/').pop()?.replace('.git', '') || 'repo';
        return { url: data, name };
      }
    }
    return null;
  };

  const handleClone = async (repoData: GitRepoData) => {
    const localPath = `/tmp/repos/${repoData.name}`;
    const options = repoData.token ? { token: repoData.token } : {};
    
    // Build the command string for display
    let commandString = `mgit clone "${repoData.url}" "${localPath}"`;
    if (repoData.token) {
      commandString += ` --token="${repoData.token}"`;
    }
    
    // Show the command in an alert
    Alert.alert(
      'QR Code Detected',
      `Parsed Repository Data:\n\nName: ${repoData.name}\nURL: ${repoData.url}\n${repoData.token ? `Token: ${repoData.token}\n` : ''}\nCommand: ${commandString}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Execute Clone', 
          onPress: () => executeClone(repoData, localPath, options)
        }
      ]
    );
  };

  const executeClone = async (repoData: GitRepoData, localPath: string, options: any) => {
    try {
      await NativeModules.MGitModule.clone(repoData.url, localPath, options);
      onScanSuccess?.(repoData.url, localPath);
      Alert.alert('Success', `Repository ${repoData.name} cloned successfully!`);
    } catch (error) {
      const errorMessage = `Failed to clone repository: ${error}`;
      onScanError?.(errorMessage);
      Alert.alert('Clone Error', errorMessage);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!isScanning || codes.length === 0) return;
      
      setIsScanning(false);
      const qrData = codes[0].value;
      
      const repoData = parseQRData(qrData);
      if (repoData) {
        handleClone(repoData);
      } else {
        const errorMessage = 'Invalid QR code format. Expected git repository data.';
        onScanError?.(errorMessage);
        Alert.alert('Invalid QR Code', errorMessage);
      }
      
      // Re-enable scanning after 2 seconds
      setTimeout(() => setIsScanning(true), 2000);
    },
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={checkCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isSimulator) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera not available in simulator</Text>
        <Text style={styles.instructionsText}>
          Please test QR scanning on a physical device
        </Text>
        {onClose && (
          <TouchableOpacity 
            style={[styles.closeButton, { top: insets.top + 10 }]} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instructionsText}>
          Scan QR code containing git repository information
        </Text>
        
        {onClose && (
          <TouchableOpacity 
            style={[styles.closeButton, { top: insets.top + 10 }]} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');
const scanAreaSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionsText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 20, // Add top padding
  },
  closeButton: {
    position: 'absolute',
    top: 50, // This will be updated dynamically
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
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingTop: 60, // Add top padding for notch
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
    paddingTop: 60, // Add top padding for notch
  },
});