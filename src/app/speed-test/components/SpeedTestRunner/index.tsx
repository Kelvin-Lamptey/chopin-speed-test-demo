"use client";

import { useState, useEffect, useRef } from 'react';
import { SpeedTestResult } from '../../lib/types';
import { submitSpeedTestResults } from '../../lib/api';
import { setupMessageListener } from '../../lib/iframe';
import { SPEED_TEST_CONFIG } from '../../lib/config';
import ResultsDisplay from './ResultsDisplay';

interface SpeedTestRunnerProps {
  location: string;
  locationTag: string;
  coordinates: { lat: number; lng: number } | null;
  onSubmissionComplete: () => void;
}

export default function SpeedTestRunner({ location, locationTag, coordinates, onSubmissionComplete }: SpeedTestRunnerProps) {
  const [speedTestResults, setSpeedTestResults] = useState<SpeedTestResult | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [aspectRatio, setAspectRatio] = useState(getAspectRatio());

  function getAspectRatio() {
    if (typeof window === 'undefined') {
      return 9 / 16; // Default for SSR
    }
    return window.innerHeight > window.innerWidth ? 16 / 9 : 9 / 16;
  }

  useEffect(() => {
    const handleResize = () => {
      setAspectRatio(getAspectRatio());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const cleanup = setupMessageListener({
      setSpeedTestResults: (results) => {
        setSpeedTestResults(results);
      },
      setError,
      setIsTestRunning,
    });
    return cleanup;
  }, []);

  const handleSubmit = async () => {
    if (!speedTestResults) return;

    // Generate a fresh submission ID for each submit attempt to prevent duplicates
    const freshSubmissionId = crypto.randomUUID();

    setIsSubmitting(true);
    setSubmissionMessage(null);

    const result = await submitSpeedTestResults({
      location,
      locationTag,
      speedTestResults,
      coordinates,
      submissionId: freshSubmissionId,
    });

    setSubmissionMessage(result.message);

    if (result.success) {
      onSubmissionComplete();
    }

    setIsSubmitting(false);
  };

  return (
    <>
      {!speedTestResults && (
        <div className="iframe-container-outer">
          <div className="iframe-container-inner" style={{ paddingTop: `${aspectRatio * 100}%` }}>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={`${SPEED_TEST_CONFIG.server}/index.html`}
              className="iframe-element"
              title="OpenSpeedTest"
            ></iframe>
          </div>
        </div>
      )}

      {error && (
        <div className="runner-message runner-error">
          {error}
        </div>
      )}

      {isTestRunning && (
        <div className="runner-message runner-in-progress">
          <p>Test in progress, waiting for results...</p>
        </div>
      )}

      {speedTestResults && (
        <ResultsDisplay
          speedTestResults={speedTestResults}
          locationTag={locationTag}
          setSpeedTestResults={setSpeedTestResults}
          setIsTestRunning={setIsTestRunning}
          setSubmissionMessage={setSubmissionMessage}
          setIframeKey={setIframeKey}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submissionMessage={submissionMessage}
        />
      )}
    </>
  );
} 