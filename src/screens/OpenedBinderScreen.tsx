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
        onNode={(node) => {
          console.log('📖 OpenedBinderScreen SharedElement registered:', sharedElementId, !!node);
        }}
      >
        <View style={styles.expandedBinderCard}>
          <Text style={styles.title}>{repoName}</Text>
          <Text style={styles.subtitle}>Medical Records</Text>
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
  expandedBinderCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#757575',
    margin: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
});