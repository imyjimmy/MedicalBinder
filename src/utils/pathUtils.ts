import RNFS from 'react-native-fs';

export const PathUtils = {
  // Convert absolute path to relative path for storage
  toRelativePath: (absolutePath: string): string => {
    const documentsPath = RNFS.DocumentDirectoryPath;
    if (absolutePath.startsWith(documentsPath)) {
      return absolutePath.replace(documentsPath + '/', '');
    }
    return absolutePath;
  },

  // Convert relative path to current absolute path
  toAbsolutePath: (relativePath: string): string => {
    const documentsPath = RNFS.DocumentDirectoryPath;
    return `${documentsPath}/${relativePath}`;
  },

  // Check if a path is already relative
  isRelativePath: (path: string): boolean => {
    return !path.startsWith('/');
  }
};