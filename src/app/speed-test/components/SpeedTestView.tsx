"use client";

import { useState } from 'react';
import { useAddress } from '@chopinframework/react';
import { useLocation } from '../lib/location';
import SpeedTestRunner from './SpeedTestRunner';
import PastResultsSection from './PastResultsSection';
import Globe from './Globe';

interface SpeedTestViewProps {
  showGlobe?: boolean;
}

export default function SpeedTestView({ showGlobe = false }: SpeedTestViewProps) {
  const { location, coordinates, isLocationLoading } = useLocation();
  const { address: chopinAddress, login } = useAddress();
  const [refreshKey, setRefreshKey] = useState(0);
  const [locationTag, setLocationTag] = useState('');

  const handleSubmissionComplete = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setLocationTag(''); // Clear the location tag after successful submission
  };

  return (
    <>
      {showGlobe && (
        <Globe 
          coordinates={coordinates} 
          isLocationLoading={isLocationLoading} 
        />
      )}
      
      <div className="card location-bar">
        <div className="flex items-center">
          <p className="location-label">Location:</p>
          <p className="location-text">{isLocationLoading ? 'Determining...' : location}</p>
        </div>
      </div>

      <div className="card location-tag-input">
        <div className="flex flex-col gap-2">
          <label htmlFor="location-tag" className="location-label">
            Location Tag (e.g., "Coffee Shop XYZ", "Home Office"):
          </label>
          <input
            id="location-tag"
            type="text"
            value={locationTag}
            onChange={(e) => setLocationTag(e.target.value)}
            placeholder="Enter specific location description..."
            className="location-tag-input-field"
            maxLength={100}
          />
        </div>
      </div>

      {!chopinAddress ? (
        <div className="card login-prompt">
          <h2>Please Log In to Continue</h2>
          <p>You need to connect your Chopin wallet to perform a speed test.</p>
          <button
            onClick={login}
            className="btn btn-green login-button"
          >
            Login with Chopin
          </button>
        </div>
      ) : (
        <SpeedTestRunner
          location={location}
          locationTag={locationTag}
          coordinates={coordinates}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}

      {chopinAddress && <PastResultsSection key={refreshKey} coordinates={coordinates} />}
    </>
  );
} 