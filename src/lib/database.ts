import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

// The SpeedTestResult from the client/oracle
export interface SpeedTestPayload {
  location: string;
  location_tag: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  timestamp: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  submission_minute: string;
  submission_id: string;
}

// The result structure when retrieved from the DB
export interface SpeedTestResult extends SpeedTestPayload {
  id: number;
}

export const isSqliteError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const SEED_DB_PATH = path.join(process.cwd(), 'src', 'lib', 'seed.db');
const RUNTIME_DB_PATH = '/tmp/speed-tests.db';

// Initialize SQLite database using a copy-on-write strategy for Vercel
export const initDB = async () => {
  if (db) return db;
  
  // When seeding, we connect directly to the seed path to create the file.
  if (process.env.IS_SEEDING) {
    db = await open({
      filename: SEED_DB_PATH,
      driver: sqlite3.Database
    });
  } else {
    // In a serverless environment, copy the seed DB to a writable location on first run.
    if (process.env.VERCEL && fs.existsSync(SEED_DB_PATH) && !fs.existsSync(RUNTIME_DB_PATH)) {
      const seedData = fs.readFileSync(SEED_DB_PATH);
      fs.writeFileSync(RUNTIME_DB_PATH, seedData);
    }

    const dbPath = process.env.VERCEL ? RUNTIME_DB_PATH : SEED_DB_PATH;

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }


  await db.exec(`
    PRAGMA journal_mode = WAL;
  `);

  // Create table if it doesn't exist (useful for local dev without seeding)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS speed_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id TEXT NOT NULL UNIQUE,
      location TEXT NOT NULL,
      location_tag TEXT NOT NULL,
      download_speed REAL NOT NULL,
      upload_speed REAL NOT NULL,
      ping REAL NOT NULL,
      timestamp DATETIME NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL
    )
  `);

  // Migration: Add location_tag column if it doesn't exist
  try {
    await db.exec(`ALTER TABLE speed_tests ADD COLUMN location_tag TEXT`);
    console.log('Added location_tag column to existing table');
  } catch (error) {
    // Column probably already exists, which is fine
    // SQLite throws an error if the column already exists
  }

  // Update any existing records that have NULL location_tag
  await db.exec(`
    UPDATE speed_tests 
    SET location_tag = 'Legacy Entry' 
    WHERE location_tag IS NULL
  `);

  return db;
};

export const insertSpeedTest = async (result: SpeedTestPayload) => {
  const db = await initDB();
  const { 
    submission_id,
    location,
    location_tag,
    download_speed, 
    upload_speed, 
    ping, 
    timestamp, 
    address, 
    latitude, 
    longitude 
  } = result;

  await db.run(
    'INSERT INTO speed_tests (submission_id, location, location_tag, download_speed, upload_speed, ping, timestamp, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [submission_id, location.trim(), location_tag.trim(), download_speed, upload_speed, ping, new Date(timestamp), address, latitude, longitude]
  );
};


export const getSpeedTests = async (whereClause: string, params: (string | number)[]): Promise<SpeedTestResult[]> => {
    const db = await initDB();
    const results = await db.all<SpeedTestResult[]>(
        `SELECT * FROM speed_tests ${whereClause} ORDER BY timestamp DESC`,
        params
    );
    return results;
}

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }; 