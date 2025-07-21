# Audio Help and SQlite

working with rich media (audio) and sqlite db

## Useful Commands

### Basic DB Info

```bash
-- List all tables
.tables

-- Show table schema
.schema audio_files

-- Database info
PRAGMA database_list;
PRAGMA table_info(audio_files);
```

### Data Inspection

```bash
-- Count total records
SELECT COUNT(*) FROM audio_files;

-- List all records (without binary data)
SELECT hash, file_size, content_type, original_filename, created_at, 
       LENGTH(audio_data) as data_length 
FROM audio_files;

-- Find specific record
SELECT hash, file_size, original_filename, created_at,
       LENGTH(audio_data) as data_length
FROM audio_files 
WHERE hash = 'your_hash_here';

-- Show first few bytes of audio data (as hex)
SELECT hash, HEX(SUBSTR(audio_data, 1, 20)) as first_20_bytes
FROM audio_files;
```

### File Ops

```bash
-- Export audio data to file
.output audio_export.bin
SELECT audio_data FROM audio_files WHERE hash = 'your_hash';
.output stdout

-- Export as hex dump
.output hex_data.txt
SELECT HEX(audio_data) FROM audio_files WHERE hash = 'your_hash';
.output stdout
```

### DB Health

```bash
-- Check database integrity
PRAGMA integrity_check;

-- Database size info
PRAGMA page_count;
PRAGMA page_size;

-- Show database file location
PRAGMA database_list;
```

### Recovery commands

```bash
# Convert hex dump back to binary (from terminal)
xxd -r -p hex_data.txt > recovered_audio.m4a

# Compare files
diff original.m4a recovered_audio.m4a

# Check file sizes
ls -la *.m4a
```

### Useful Commands in sqlite

.help                    -- Show all commands
.exit                    -- Exit sqlite3
.quit                    -- Same as .exit
.headers on              -- Show column headers
.mode column             -- Pretty column output
.width 10 20 15          -- Set column widths