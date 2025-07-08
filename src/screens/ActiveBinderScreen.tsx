import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import type { StackNavigationProp } from '@react-navigation/stack';

interface ActiveBinderScreenProps {
  route: RouteProp<RootStackParamList, 'ActiveBinder'>;
}

type ActiveBinderNavigationProp = StackNavigationProp<RootStackParamList, 'ActiveBinder'>;

export const ActiveBinderScreen: React.FC<ActiveBinderScreenProps> = ({ route }) => {
  const { repoPath, repoName, token } = route.params;
  const navigation = useNavigation<ActiveBinderNavigationProp>();

  const handleAddRecord = () => {
    navigation.navigate('AddRecord', { 
      repoPath,
      repoName,
      token,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Main Viewing Area - Binder Cover */}
        <View style={styles.binderCover}>
          <View style={styles.binderSpine}>
            <View style={styles.binderRings}>
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
              <View style={styles.ring} />
            </View>
          </View>
          <View style={styles.binderFront}>
            <Text style={styles.binderTitle}>{repoName}</Text>
            <Text style={styles.binderSubtitle}>Medical Records</Text>
          </View>
        </View>

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
    justifyContent: 'flex-end',
    alignItems: 'center',
    // borderRadius: 12,
    // borderWidth: 1,
    // borderColor: '#757575',
    // borderStyle: 'solid',
  },
  binderCover: {
    flexGrow: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#757575',
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  binderSpine: {
    width: 40,
    backgroundColor: '#6b7280', // Changed from dark to grayish
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30, // Increased padding for more holes
  },
  binderRings: {
    gap: 20, // Increased gap between holes
  },
  ring: {
    width: 12, // Reduced from 20 to 12 (smaller holes)
    height: 12, // Reduced from 20 to 12 (smaller holes)
    borderRadius: 6, // Reduced from 10 to 6
    backgroundColor: '#9ca3af', // Lighter gray for holes
    borderWidth: 1, // Reduced border width
    borderColor: '#d1d5db', // Lighter border color
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
});