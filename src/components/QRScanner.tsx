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
import RNFS from 'react-native-fs';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Camera,
  useCameraDevices,
  useCodeScanner,
} from 'react-native-vision-camera';
import { NativeModules } from 'react-native';

import { SimulatorDebugComponent } from './SimulatorDebugComponent';

interface QRScannerProps {
  onScanSuccess?: (repoUrl: string, localPath: string, name: string) => void;
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
  const [isCloning, setIsCloning] = useState(false);

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

  // remember: Usage: mgit clone [-jwt <token>] <url> [destination]
  const handleClone = async (repoData: GitRepoData) => {
    if (isCloning) { // Prevents multiple clicks
      console.log('Clone in Progress', 'Please wait for the current clone operation to complete.');
      return;
    }

    const localPath = `${RNFS.DocumentDirectoryPath}/repos/${repoData.name}`;
    const options = repoData.token ? { token: repoData.token } : {};
    
    let commandString = `mgit mockClone`;
    if (repoData.token) {
      commandString += ` -jwt ${repoData.token}`;
    }
    commandString += ` "${repoData.url}" "${localPath}"`;
    
    console.log(
      '==== QR Code Detected ====',
      `Parsed Repository Data:\n\nName: ${repoData.name}\nURL: ${repoData.url}\n${repoData.token ? `Token: ${repoData.token}\n` : ''}\nCommand: ${commandString}\n\nSafe Path: ${localPath}`,
    );

    executeClone(repoData, localPath, options);
  };

  const executeClone = async (repoData: GitRepoData, localPath: string, options: any) => {
    // Set cloning state to prevent multiple executions
    setIsCloning(true);
  
    try {
      console.log('=== Starting MGit Clone Operation ===');
      
      // Show loading alert
      console.log('Clone Starting', '🔄 Initializing clone operation...');
      
      // Run diagnostic tests first
      console.log('🧪 Running framework diagnostics...');
      const helpResult = await NativeModules.MGitModule.help();
      const logResult = await NativeModules.MGitModule.testLogging();
      const mathResult = await NativeModules.MGitModule.simpleAdd(2, 2);
      
      console.log('✅ Diagnostics completed');
      
      // Prepare clone paths
      const documentsPath = RNFS.DocumentDirectoryPath;
      const repoName = repoData.name || 'test-repo';
      const mgitLocalPath = `${documentsPath}/mgit-repos/${repoName}`;
      
      // Check if directory already exists
      const existsBefore = await RNFS.exists(mgitLocalPath);
      if (existsBefore) {
        console.log('📁 Directory exists, removing for fresh clone...');
        try {
          await RNFS.unlink(mgitLocalPath);
          console.log('✅ Old directory removed');
        } catch (error) {
          console.log('⚠️ Could not remove existing directory:', error.message);
          // Continue anyway - let MGit handle it
        }
      }
      
      // Ensure parent directory exists
      await RNFS.mkdir(`${documentsPath}/mgit-repos`);
      
      const cloneConfig = {
        url: repoData.url,
        localPath: mgitLocalPath,
        token: options.token || "default-token"
      };
      
      console.log('🚀 Starting clone with config:', cloneConfig);
      
      // Execute the clone
      const cloneResult = await NativeModules.MGitModule.clone(
        cloneConfig.url,
        cloneConfig.localPath,
        cloneConfig.token
      );
      
      console.log('🎉 Clone operation completed:', cloneResult);
      
      // Verify results by checking filesystem
      const repoExists = await RNFS.exists(mgitLocalPath);
      const gitExists = await RNFS.exists(`${mgitLocalPath}/.git`);
      const mgitExists = await RNFS.exists(`${mgitLocalPath}/.mgit`);
      
      let fileCount = 0;
      try {
        const files = await RNFS.readDir(mgitLocalPath);
        fileCount = files.length;
      } catch (error) {
        console.log('Could not count files:', error.message);
      }
      
      // Show comprehensive results
      if (cloneResult.success && repoExists) {
        // SUCCESS CASE
        console.log(
          '🎉 Clone Successful!',
          `✅ Repository cloned successfully!\n\n` +
          `📁 Repository: ${cloneResult.repoName || repoName}\n` +
          `🆔 Repo ID: ${cloneResult.repoID || 'N/A'}\n` +
          `📍 Local Path: ${mgitLocalPath}\n\n` +
          `📊 File System Verification:\n` +
          `📂 Repository directory: ${repoExists ? '✅ EXISTS' : '❌ MISSING'}\n` +
          `🔧 .git directory: ${gitExists ? '✅ EXISTS' : '❌ MISSING'}\n` +
          `⚙️ .mgit directory: ${mgitExists ? '✅ EXISTS' : '❌ MISSING'}\n` +
          `📄 Files count: ${fileCount}\n\n` +
          `🔗 Source: ${cloneConfig.url}\n` +
          `💬 Message: ${cloneResult.message}`
        );
        
        onScanSuccess?.(repoData.url, mgitLocalPath, repoName);
        
      } else if (cloneResult.success && !repoExists) {
        // PARTIAL SUCCESS - clone reported success but directory doesn't exist
        console.log(
          '⚠️ Clone Partially Successful',
          `🤔 Clone reported success but verification failed\n\n` +
          `📊 Clone Result:\n` +
          `✅ MGit Status: ${cloneResult.success ? 'SUCCESS' : 'FAILED'}\n` +
          `💬 Message: ${cloneResult.message}\n\n` +
          `📊 File System Check:\n` +
          `📂 Directory exists: ${repoExists ? 'YES' : 'NO'}\n` +
          `📍 Expected path: ${mgitLocalPath}\n\n` +
          `This might be a path mapping issue between Go and iOS.`
        );
        
      } else {
        // FAILURE CASE
        console.error(
          '❌ Clone Failed',
          `💥 Repository clone failed\n\n` +
          `📊 Error Details:\n` +
          `💬 Message: ${cloneResult.message || 'Unknown error'}\n` +
          `🔗 URL: ${cloneConfig.url}\n` +
          `📍 Path: ${mgitLocalPath}\n\n` +
          `📊 Diagnostics (these worked):\n` +
          `📄 Help: ${helpResult.success ? '✅' : '❌'}\n` +
          `📝 Logging: ${logResult.success ? '✅' : '❌'}\n` +
          `🧮 Math: ${mathResult.success ? '✅' : '❌'}\n\n` +
          `The framework is working, but the clone operation failed.`
        );
        
        onScanError?.(cloneResult.message || 'Clone operation failed');
      }
      
    } catch (error) {
      console.error('❌ Clone operation failed with exception:', error);
      
      // Handle specific error cases
      let errorTitle = '❌ Clone Error';
      let errorMessage = '';
      
      if (error.message?.includes('already exists')) {
        errorTitle = '📁 Directory Already Exists';
        errorMessage = `⚠️ The target directory already exists!\n\n` +
          `This usually means a previous clone succeeded.\n\n` +
          `📍 Path: ${mgitLocalPath}\n\n` +
          `The directory should have been removed automatically. ` +
          `This might be a permission issue.`;
      } else if (error.code === 'CLONE_ERROR') {
        errorMessage = `💥 MGit clone operation failed\n\n` +
          `📝 Error: ${error.message}\n` +
          `🔍 Code: ${error.code}\n\n` +
          `This could be due to:\n` +
          `• Network connectivity issues\n` +
          `• Invalid authentication token\n` +
          `• Server not accessible\n` +
          `• Repository doesn't exist`;
      } else {
        errorMessage = `🔧 Unexpected error occurred\n\n` +
          `📝 Error: ${error.message}\n` +
          `🔍 Code: ${error.code || 'UNKNOWN'}\n` +
          `🏷️ Domain: ${error.domain || 'N/A'}\n\n` +
          `This might be a framework integration issue.`;
      }
      
      console.error(errorTitle, errorMessage);
      onScanError?.(error.message || 'Unknown clone error');
      
    } finally {
      // Always reset the cloning state
      setIsCloning(false);
      console.log('🏁 Clone operation completed, state reset');
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
      <SimulatorDebugComponent
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        onClose={onClose}
        handleClone={handleClone}
      />
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