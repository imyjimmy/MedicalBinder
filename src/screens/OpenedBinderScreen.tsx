import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { SharedElement } from 'react-native-shared-element';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

interface OpenedBinderScreenProps {
  route: RouteProp<RootStackParamList, 'OpenedBinder'>;
}

export const OpenedBinderScreen: React.FC<OpenedBinderScreenProps> = ({ route }) => {
  const { repoPath, repoName, sharedElementId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <SharedElement 
        id={sharedElementId}
        style={styles.expandedBinder}
        onNode={(node) => {}}
      >
        <View style={styles.binderContent}>
          <Text style={styles.title}>{repoName}</Text>
          <Text style={styles.subtitle}>Medical Records</Text>
          {/* Add your binder content here */}
        </View>
      </SharedElement>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  expandedBinder: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  binderContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});