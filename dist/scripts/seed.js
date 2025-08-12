import { faker } from '@faker-js/faker';
import { initDB, insertSpeedTest } from '../src/lib/database.js';
import { randomUUID } from 'crypto';
const locations = [
    { city: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917 },
    { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
    { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 },
    { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
    { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
    { city: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357 },
    { city: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729 },
    { city: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173 },
    { city: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074 },
    { city: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792 },
    { city: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816 },
    { city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777 },
];
async function seedDatabase() {
    console.log('Seeding database with consistent locations...');
    try {
        const db = await initDB();
        const placeholderAddress = '0x0000000000000000000000000000000000000001';
        for (let i = 0; i < 100; i++) {
            const locationData = faker.helpers.arrayElement(locations);
            const testResult = {
                location: `${locationData.city}, ${locationData.country}`,
                download_speed: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
                upload_speed: faker.number.float({ min: 5, max: 500, fractionDigits: 2 }),
                ping: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
                timestamp: faker.date.recent({ days: 30 }).getTime(),
                address: placeholderAddress,
                latitude: locationData.latitude + faker.number.float({ min: -0.1, max: 0.1 }), // Add jitter
                longitude: locationData.longitude + faker.number.float({ min: -0.1, max: 0.1 }), // Add jitter
                submission_minute: new Date().toISOString().slice(0, 16),
                submission_id: randomUUID(),
            };
            await insertSpeedTest(testResult);
        }
        console.log('Database seeded successfully with 100 entries.');
        // // Optional: Log a few entries to verify
        // const results = await db.all('SELECT * FROM speed_tests ORDER BY timestamp DESC LIMIT 5');
        // console.log('Sample entries:', results);
    }
    catch (error) {
        console.error('Error seeding database:', error);
    }
}
seedDatabase();
