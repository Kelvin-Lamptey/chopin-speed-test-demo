import { SpeedTestResult } from './types';

export interface SubmitSpeedTestParams {
  location: string;
  locationTag: string;
  speedTestResults: SpeedTestResult;
  coordinates: { lat: number; lng: number } | null;
  submissionId: string;
}

export const submitSpeedTestResults = async (params: SubmitSpeedTestParams) => {
  if (!params.coordinates) {
    return { success: false, message: 'Cannot submit results without coordinates.' };
  }

  try {
    const response = await fetch('/api/speed-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: params.location,
        location_tag: params.locationTag,
        download_speed: params.speedTestResults.download,
        upload_speed: params.speedTestResults.upload,
        ping: params.speedTestResults.ping,
        latitude: params.coordinates?.lat ?? null,
        longitude: params.coordinates?.lng ?? null,
        submission_id: params.submissionId,
      }),
    });

    // Handle empty or invalid JSON responses
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      data = { error: 'Invalid response from server' };
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit results');
    }

    return { success: true, message: 'Results submitted successfully!' };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, message: `Error: ${err.message}` };
    }
    return { success: false, message: 'An unknown error occurred during submission.' };
  }
}; 