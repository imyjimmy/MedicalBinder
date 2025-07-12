import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { open } from '@op-engineering/op-sqlite';

const generateHash = async (data: Uint8Array): Promise<string> => {
  // Simple hash function for testing - in real app you'd use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

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

  const testBinaryStorage = async () => {
    try {
      const db = open({ name: 'test.db' });
      
      // Create binary storage table with hash-based keys
      db.execute(`
        CREATE TABLE IF NOT EXISTS binary_storage (
          hash TEXT PRIMARY KEY,
          data BLOB NOT NULL,
          content_type TEXT,
          file_size INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Create a test binary blob (simulating audio data)
      const testData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header as test
      const hash = await generateHash(testData);
      
      // Store binary data with hash as key
      db.execute(
        'INSERT OR REPLACE INTO binary_storage (hash, data, content_type, file_size) VALUES (?, ?, ?, ?)',
        [hash, Array.from(testData), 'application/octet-stream', testData.length]
      );

      setTestResults(prev => [...prev, `✅ Stored binary data with hash: ${hash.substring(0, 12)}...`]);
      
      // Retrieve and verify
      const result = db.execute('SELECT hash, file_size, content_type FROM binary_storage WHERE hash = ?', [hash]);
      const row = result.rows?._array?.[0];
      
      if (row) {
        setTestResults(prev => [...prev, `📁 Retrieved: ${row.file_size} bytes, ${row.content_type}`]);
      }
      
    } catch (error) {
      console.error('Binary storage test error:', error);
      Alert.alert('Error', `Binary storage test failed: ${error.message}`);
    }
  };
  
  const testHashBasedRetrieval = async () => {
    try {
      const db = open({ name: 'test.db' });
      
      // Get all stored hashes
      const result = db.execute('SELECT hash, file_size, created_at FROM binary_storage ORDER BY created_at DESC');
      const rows = result.rows?._array || [];
      
      if (rows.length === 0) {
        setTestResults(prev => [...prev, `⚠️ No binary data found. Run Binary Storage test first.`]);
        return;
      }
      
      setTestResults(prev => [
        ...prev, 
        `📋 Found ${rows.length} binary objects:`,
        ...rows.map(row => {
          const date = new Date(row.created_at * 1000).toLocaleTimeString();
          return `  ${row.hash.substring(0, 12)}... (${row.file_size} bytes) - ${date}`;
        })
      ]);
      
    } catch (error) {
      console.error('Hash retrieval test error:', error);
      Alert.alert('Error', `Hash retrieval test failed: ${error.message}`);
    }
  };

  const testContentAddressing = async () => {
    try {
      const db = open({ name: 'test.db' });
      
      // Test deduplication - store the same content twice
      const testData1 = new Uint8Array([1, 2, 3, 4, 5]);
      const testData2 = new Uint8Array([1, 2, 3, 4, 5]); // Same content
      const testData3 = new Uint8Array([1, 2, 3, 4, 6]); // Different content
      
      const hash1 = await generateHash(testData1);
      const hash2 = await generateHash(testData2);
      const hash3 = await generateHash(testData3);
      
      // Store all three
      db.execute('INSERT OR REPLACE INTO binary_storage (hash, data, content_type, file_size) VALUES (?, ?, ?, ?)',
        [hash1, Array.from(testData1), 'test/data', testData1.length]);
      db.execute('INSERT OR REPLACE INTO binary_storage (hash, data, content_type, file_size) VALUES (?, ?, ?, ?)',
        [hash2, Array.from(testData2), 'test/data', testData2.length]);
      db.execute('INSERT OR REPLACE INTO binary_storage (hash, data, content_type, file_size) VALUES (?, ?, ?, ?)',
        [hash3, Array.from(testData3), 'test/data', testData3.length]);
      
      // Check results
      const result = db.execute('SELECT COUNT(*) as count FROM binary_storage WHERE content_type = ?', ['test/data']);
      const count = result.rows?._array?.[0]?.count || 0;
      
      setTestResults(prev => [
        ...prev,
        `🔄 Content addressing test:`,
        `  Same content hashes: ${hash1 === hash2 ? 'IDENTICAL ✓' : 'DIFFERENT ✗'}`,
        `  Different content hashes: ${hash1 !== hash3 ? 'UNIQUE ✓' : 'SAME ✗'}`,
        `  Records in DB: ${count} (should be 2 due to deduplication)`
      ]);
      
    } catch (error) {
      console.error('Content addressing test error:', error);
      Alert.alert('Error', `Content addressing test failed: ${error.message}`);
    }
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
        <TouchableOpacity style={styles.button} onPress={testBinaryStorage}>
          <Text style={styles.buttonText}>Test Binary Storage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testHashBasedRetrieval}>
          <Text style={styles.buttonText}>Test Hash Retrieval</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testContentAddressing}>
          <Text style={styles.buttonText}>Test Content Addressing</Text>
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