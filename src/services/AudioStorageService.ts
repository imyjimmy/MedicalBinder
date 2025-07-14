import { open } from '@op-engineering/op-sqlite';
import { generateSHA256FromFile } from '../utils/hashUtils';
import { base64ToUint8Array } from '../utils/base64Utils';
import RNFS from 'react-native-fs';

export class AudioStorageService {
  private static db = open({ 
    name: 'medical_audio.db',
    location: RNFS.DocumentDirectoryPath  // Explicitly set location
  });

  static async initialize() {
    try {
      const dbPath = `${RNFS.DocumentDirectoryPath}/medical_audio.db`;
      console.log('🗄️ Database should be created at:', dbPath);
      // Create audio storage table with hash-based keys (BINARY STORAGE)
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS audio_files (
          hash TEXT PRIMARY KEY,
          audio_data BLOB NOT NULL,
          file_size INTEGER NOT NULL,
          content_type TEXT DEFAULT 'audio/aac',
          original_filename TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);
      
      console.log('✅ Audio binary storage table created');
      
      // Force a write to ensure file creation
      this.db.execute(`INSERT OR IGNORE INTO audio_files (hash, audio_data, file_size) VALUES ('test', 'test', 0);`);
      this.db.execute(`DELETE FROM audio_files WHERE hash = 'test';`);
      
      console.log('✅ Database initialization complete');
      
      // Check if file exists now
      const fileExists = await RNFS.exists(dbPath);
      console.log('📁 Database file exists:', fileExists);
    } catch (error) {
      console.error('❌ Failed to initialize audio storage:', error);
      throw error;
    }
  }

  static async storeAudioFile(filePath: string, originalFilename?: string): Promise<string> {
    try {
      console.log('🎵 Starting to store audio file:', filePath);
      
      // Generate hash using your native module
      const hash = await generateSHA256FromFile(filePath);
      console.log('🔑 Generated hash:', hash);
      
      // Read file as binary data
      const fileDataBase64 = await RNFS.readFile(filePath, 'base64');
      console.log('📁 Read file, base64 length:', fileDataBase64.length);
      
      const binaryData = base64ToUint8Array(fileDataBase64);
      console.log('🔢 Binary data length:', binaryData.length);
      
      // Get file stats
      const stats = await RNFS.stat(filePath);
      console.log('📊 File stats:', stats.size);
      
      // Store BINARY DATA in SQLite (content-addressable)
      console.log('💾 Inserting into database...');
      this.db.execute(
        `INSERT OR REPLACE INTO audio_files 
        (hash, audio_data, file_size, original_filename) 
        VALUES (?, ?, ?, ?)`,
        [hash, binaryData.buffer, stats.size, originalFilename || 'recording.m4a']
      );

      console.log(`✅ Audio BINARY stored in SQLite with hash: ${hash.substring(0, 12)}...`);

      // const verifyResult = this.db.execute('SELECT COUNT(*) as count FROM audio_files WHERE hash = ?', [hash]);
      // // Immediately verify it was stored
      // console.log('🔍 Raw verification result:', verifyResult);
      // console.log('🔍 Verification rows:', verifyResult.rows);
      // // console.log('🔍 Verification count:', verifyResult.rows?.[0]?.count);
      // console.log('🔍 Verification count:', verifyResult._z?.rows?.[0]?.count);
      const verifyResult = this.db.execute('SELECT COUNT(*) as count FROM audio_files WHERE hash = ?', [hash]);
      console.log('🔍 Raw verification result:', verifyResult);
      console.log('🔍 Verification rows:', verifyResult.rows);
      console.log('🔍 Verification count:', verifyResult.rows?.[0]?.count);

      // Fix verification in storeAudioFile:
      return hash;
    } catch (error) {
      console.error('❌ Failed to store audio file:', error);
      throw error;
    }
  }

  static async getAudioByHash(hash: string): Promise<{ data: Uint8Array; metadata: any } | null> {
    try {
      const result = this.db.execute(
        'SELECT audio_data, file_size, content_type, original_filename, created_at FROM audio_files WHERE hash = ?',
        [hash]
      );
      
      const rows = result._z?.rows || [];
      const row = rows[0];
      if (!row) return null;

      return {
        data: new Uint8Array(row.audio_data),
        metadata: {
          fileSize: row.file_size,
          contentType: row.content_type,
          originalFilename: row.original_filename,
          createdAt: row.created_at
        }
      };
    } catch (error) {
      console.error('Failed to retrieve audio:', error);
      throw error;
    }
  }

  static async getAllAudioHashes(): Promise<Array<{hash: string; metadata: any}>> {
    try {
      const result = this.db.execute(
        'SELECT hash, file_size, original_filename, created_at FROM audio_files ORDER BY created_at DESC'
      );
      
      const rows = result._z?.rows || [];
      return rows.map(row => ({
        hash: row.hash,
        metadata: {
          fileSize: row.file_size,
          originalFilename: row.original_filename,
          createdAt: row.created_at
        }
      }));
    } catch (error) {
      console.error('Failed to get audio hashes:', error);
      throw error;
    }
  }

  static async testBinaryRetrieval(hash: string): Promise<boolean> {
  try {
    console.log(`Testing binary retrieval for hash: ${hash.substring(0, 12)}...`);
    
    // Get binary data from SQLite
    const audioData = await this.getAudioByHash(hash);
    if (!audioData) {
      console.log('❌ No data found in SQLite for this hash');
      return false;
    }
    
    console.log(`✅ Retrieved ${audioData.data.length} bytes from SQLite`);
    console.log(`📊 Metadata:`, audioData.metadata);
    
    // Write SQLite data to a test file to verify it works
    const testFilePath = RNFS.DocumentDirectoryPath + '/test_from_sqlite.m4a';
    
    // Convert Uint8Array back to base64 for file writing
    let binaryString = '';
    for (let i = 0; i < audioData.data.length; i++) {
      binaryString += String.fromCharCode(audioData.data[i]);
    }
    const base64Data = btoa(binaryString);
    
    await RNFS.writeFile(testFilePath, base64Data, 'base64');
    console.log(`✅ Test file written to: ${testFilePath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Binary retrieval test failed:', error);
    return false;
  }
  }

  static async debugDatabase(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking database contents...');
      
      // Check if table exists - fix the query result access
      const tableCheck = this.db.execute(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='audio_files';
      `);
      console.log('📋 Raw table check result:', tableCheck);
      console.log('📋 Table exists rows:', tableCheck.rows);
      
      // Try different ways to access the data
      if (tableCheck.rows) {
        console.log('📋 Table rows length:', tableCheck.rows.length);
        console.log('📋 First row:', tableCheck.rows[0]);
      }
      
      // Get all rows (without binary data)
      const allRows = this.db.execute(`
        SELECT hash, file_size, original_filename, created_at, 
              LENGTH(audio_data) as data_length 
        FROM audio_files;
      `);
      console.log('📊 Raw all rows result:', allRows);
      console.log('📊 All rows:', allRows.rows);
      
    } catch (error) {
      console.error('🚨 Database debug failed:', error);
    }
  }

}