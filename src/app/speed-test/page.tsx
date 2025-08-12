"use client";

import AuthDisplay from './components/AuthDisplay';
import SpeedTestView from './components/SpeedTestView';
import './styles.css';

export default function SpeedTestPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">WiFi Speed Test</h1>
        <AuthDisplay />
      </header>

      <main>
        <SpeedTestView showGlobe={true} />
      </main>

      <footer className="page-footer">
        <p>Powered by Chopin Framework</p>
      </footer>
    </div>
  );
}