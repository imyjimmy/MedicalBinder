import { NativeModules } from 'react-native';

const { SimpleAudioRecorder } = NativeModules;

export const generateSHA256FromFile = async (filePath: string): Promise<string> => {
  try {
    const hash = await SimpleAudioRecorder.generateSHA256(filePath);
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    throw error;
  }
};