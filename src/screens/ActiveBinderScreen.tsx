import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import type { StackNavigationProp } from '@react-navigation/stack';
import RNFS from 'react-native-fs';

interface ActiveBinderScreenProps {
  route: RouteProp<RootStackParamList, 'ActiveBinder'>;
}

type ActiveBinderNavigationProp = StackNavigationProp<RootStackParamList, 'ActiveBinder'>;

interface MedicalRecord {
  id: string;
  timestamp: string;
  content: string;
  photos: string[];
  pdfs: string[];
  author: {
    nostrPubkey: string;
  };
}

const { width: screenWidth } = Dimensions.get('window');

export const ActiveBinderScreen: React.FC<ActiveBinderScreenProps> = ({ route }) => {
  const { repoPath, repoName, token } = route.params;
  const navigation = useNavigation<ActiveBinderNavigationProp>();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Add header back button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home', {
            currentPage: currentPage,
            repoName: repoName
          })}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentPage, repoName]);

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      const medicalHistoryPath = `${repoPath}/medical-history.json`;
      const fileContent = await RNFS.readFile(medicalHistoryPath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (Array.isArray(data)) {
        // Sort records by timestamp, oldest first (chronological order)
        const sortedRecords = data.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setRecords(sortedRecords);
      }
    } catch (error) {
      console.log('No medical records found or error reading file:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = () => {
    navigation.navigate('AddRecord', { 
      repoPath,
      repoName,
      token
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentPage(page);
    navigation.setParams({ currentPage: page, repoName: repoName});
  };

  const renderBinderCover = () => (
    <View style={[styles.page, styles.binderCover]}>
      <View style={styles.binderSpine}>
        <View style={styles.binderRings}>
          {Array.from({ length: 14 }, (_, i) => (
            <View key={i} style={styles.ring} />
          ))}
        </View>
      </View>
      <View style={styles.binderFront}>
        <Text style={styles.binderTitle}>{repoName}</Text>
        <Text style={styles.binderSubtitle}>Medical Records</Text>
        <View style={styles.recordCount}>
          <Text style={styles.recordCountText}>
            {records.length} Record{records.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRecordPage = (record: MedicalRecord, index: number) => {
    // Now that records are in chronological order, index + 1 = record number
    const recordNumber = index + 1;
    
    return (
      <View key={record.id} style={[styles.page, styles.recordPage]}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordTitle}>Medical Record #{recordNumber}</Text>
          <Text style={styles.recordDate}>{formatDate(record.timestamp)}</Text>
        </View>
      
      <ScrollView style={styles.recordContent} showsVerticalScrollIndicator={false}>
        {record.content && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>📝 Notes</Text>
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>{record.content}</Text>
            </View>
          </View>
        )}
        
        {record.photos && record.photos.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>📷 Photos</Text>
            <View style={styles.contentBox}>
              <Text style={styles.attachmentText}>
                {record.photos.length} photo{record.photos.length !== 1 ? 's' : ''} attached
              </Text>
            </View>
          </View>
        )}
        
        {record.pdfs && record.pdfs.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>📄 PDFs</Text>
            <View style={styles.contentBox}>
              <Text style={styles.attachmentText}>
                {record.pdfs.length} PDF{record.pdfs.length !== 1 ? 's' : ''} attached
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.authorSection}>
          <Text style={styles.authorLabel}>Signed by:</Text>
          <Text style={styles.authorPubkey}>
            {record.author?.nostrPubkey?.substring(0, 16)}...
          </Text>
        </View>
      </ScrollView>
    </View>
  )};

  const renderPageIndicator = () => {
    const totalPages = records.length + 1; // +1 for binder cover
    
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.pageIndicator}>
        {Array.from({ length: totalPages }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pageIndicatorDot,
              currentPage === i && styles.pageIndicatorDotActive
            ]}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading medical records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Horizontal ScrollView for binder pages */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.pageScrollView}
          directionalLockEnabled={true}
          contentInsetAdjustmentBehavior="never"
        >
          {/* Binder Cover (First Page) */}
          {renderBinderCover()}
          
          {/* Record Pages */}
          {records.map((record, index) => renderRecordPage(record, index))}
        </ScrollView>
        
        {/* Page Indicator */}
        {renderPageIndicator()}
        
        {/* Add Record Button */}
        <TouchableOpacity
          style={styles.addRecordButton}
          onPress={handleAddRecord}
        >
          <Text style={styles.addRecordButtonText}>📝 Add Record</Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  pageScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  page: {
    width: screenWidth - 32, // Account for padding
    flex: 1,
  },
  binderCover: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#757575',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  binderSpine: {
    width: 40,
    backgroundColor: '#6b7280',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  binderRings: {
    gap: 20,
  },
  ring: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9ca3af',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  binderFront: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    minWidth: 220,
  },
  binderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  binderSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  recordCount: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recordCountText: {
    fontSize: 14,
    color: '#2c5aa0',
    fontWeight: '500',
  },
  recordPage: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    padding: 20,
  },
  recordHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
    marginBottom: 20,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
  },
  recordContent: {
    flex: 1,
  },
  contentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contentBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  contentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  attachmentText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  authorSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  authorLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  authorPubkey: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  pageIndicatorDotActive: {
    backgroundColor: '#007AFF',
    transform: [{ scale: 1.2 }],
  },
  addRecordButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'center',
  },
  addRecordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});