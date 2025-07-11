import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface FolderSection {
  id: string;
  name: string;
  itemCount?: number;
  color?: string;
}

interface FolderScreenProps {
  onFolderPress?: (folderId: string) => void;
}

export const FolderScreen: React.FC<FolderScreenProps> = ({ onFolderPress }) => {
  const folders: FolderSection[] = [
    { id: '1', name: 'Lab Results', itemCount: 12, color: '#4CAF50' },
    { id: '2', name: 'Prescriptions', itemCount: 8, color: '#2196F3' },
    { id: '3', name: 'Imaging', itemCount: 5, color: '#FF9800' },
    { id: '4', name: 'Allergies', itemCount: 3, color: '#F44336' },
    { id: '5', name: 'Vaccines', itemCount: 7, color: '#9C27B0' },
    { id: '6', name: 'Insurance', itemCount: 4, color: '#795548' },
    { id: '7', name: 'Emergency Contacts', itemCount: 2, color: '#607D8B' },
    { id: '8', name: 'Specialists', itemCount: 6, color: '#009688' },
    { id: '9', name: 'More Specialists', itemCount: 4, color: '#795548' },
    { id: '10', name: 'more stuff', itemCount: 2, color: '#607D8B' },
    { id: '11', name: 'haha', itemCount: 6, color: '#009688' },
  ];

  const handleFolderPress = (folderId: string) => {
    onFolderPress?.(folderId);
  };

  const renderFolder = (folder: FolderSection) => (
    <TouchableOpacity
      key={folder.id}
      style={[styles.folderContainer, { borderLeftColor: folder.color }]}
      onPress={() => handleFolderPress(folder.id)}
      activeOpacity={0.7}
    >
      <View style={styles.folderTab}>
        <View style={[styles.folderTabInner, { backgroundColor: folder.color }]} />
      </View>
      <View style={styles.folderBody}>
        <View style={styles.folderContent}>
          <Text style={styles.folderName}>{folder.name}</Text>
          {folder.itemCount !== undefined && (
            <Text style={styles.itemCount}>
              {folder.itemCount} item{folder.itemCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.folderIcon}>
          <Text style={styles.folderIconText}>📁</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medical Records</Text>
          <Text style={styles.headerSubtitle}>Organized by Category</Text>
        </View>
      </SafeAreaView>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {folders.map(renderFolder)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  folderContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    marginTop: 10,
  },
  folderTab: {
    height: 20,
    width: 80,
    alignSelf: 'flex-start',
    marginLeft: -4,
    marginTop: -10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  folderTabInner: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  folderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  folderContent: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },
  folderIcon: {
    marginLeft: 12,
  },
  folderIconText: {
    fontSize: 24,
  },
});