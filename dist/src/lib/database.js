import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
let db = null;
export const isSqliteError = (error) => {
    return typeof error === 'object' && error !== null && 'code' in error;
};
const SEED_DB_PATH = path.join(process.cwd(), 'src', 'lib', 'seed.db');
const RUNTIME_DB_PATH = '/tmp/speed-tests.db';
// Initialize SQLite database using a copy-on-write strategy for Vercel
export const initDB = async () => {
    if (db)
        return db;
    // When seeding, we connect directly to the seed path to create the file.
    if (process.env.IS_SEEDING) {
        db = await open({
            filename: SEED_DB_PATH,
            driver: sqlite3.Database
        });
    }
    else {
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
      download_speed REAL NOT NULL,
      upload_speed REAL NOT NULL,
      ping REAL NOT NULL,
      timestamp DATETIME NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL
    )
  `);
    return db;
};
export const insertSpeedTest = async (result) => {
    const db = await initDB();
    const { submission_id, location, download_speed, upload_speed, ping, timestamp, address, latitude, longitude } = result;
    await db.run('INSERT INTO speed_tests (submission_id, location, download_speed, upload_speed, ping, timestamp, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [submission_id, location.trim(), download_speed, upload_speed, ping, new Date(timestamp), address, latitude, longitude]);
};
export const getSpeedTests = async (whereClause, params) => {
    const db = await initDB();
    const results = await db.all(`SELECT * FROM speed_tests ${whereClause} ORDER BY timestamp DESC`, params);
    return results;
};
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
