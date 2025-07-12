import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { open } from '@op-engineering/op-sqlite';

const SQLiteTest = () => {
  const [dbStatus, setDbStatus] = useState('Not initialized');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Open database
      const db = open({ name: 'test.db' });
      
      // Create a simple test table
      db.execute(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      setDbStatus('Database initialized successfully');
      console.log('SQLite database initialized');
    } catch (error) {
      console.error('Database initialization error:', error);
      setDbStatus(`Error: ${error.message}`);
    }
  };

  const testInsert = async () => {
    try {
      const db = open({ name: 'test.db' });
      
      const testName = `Test Entry ${Date.now()}`;
      
      db.execute(
        'INSERT INTO test_table (name) VALUES (?)',
        [testName]
      );

      setTestResults(prev => [...prev, `✅ Inserted: ${testName}`]);
      console.log('Insert successful:', testName);
    } catch (error) {
      console.error('Insert error:', error);
      Alert.alert('Error', `Insert failed: ${error.message}`);
    }
  };

  const testQuery = async () => {
    try {
      const db = open({ name: 'test.db' });
      
      const result = db.execute('SELECT * FROM test_table ORDER BY id DESC LIMIT 5');
      
      const rows = result.rows?._array || [];
      setTestResults(prev => [
        ...prev, 
        `📋 Found ${rows.length} rows:`,
        ...rows.map(row => `  ID: ${row.id}, Name: ${row.name}`)
      ]);
      
      console.log('Query results:', rows);
    } catch (error) {
      console.error('Query error:', error);
      Alert.alert('Error', `Query failed: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>op-sqlite Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Database Status:</Text>
        <Text style={[
          styles.statusText, 
          dbStatus.includes('Error') ? styles.errorText : styles.successText
        ]}>
          {dbStatus}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testInsert}>
          <Text style={styles.buttonText}>Insert Test Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testQuery}>
          <Text style={styles.buttonText}>Query Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default SQLiteTest;