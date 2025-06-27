import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

interface OpenedBinderScreenProps {
  route: RouteProp<RootStackParamList, 'OpenedBinder'>;
}

export const OpenedBinderScreen: React.FC<OpenedBinderScreenProps> = ({ route }) => {
  const { repoPath, repoName } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{repoName}</Text>
        <Text style={styles.subtitle}>Opened Binder</Text>
        {/* Add your binder content here */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});