export interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
}

export interface PastSpeedTestResult {
  id: number;
  location: string;
  location_tag: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  timestamp: string;
  latitude: number | null; // Added latitude
  longitude: number | null; // Added longitude
}