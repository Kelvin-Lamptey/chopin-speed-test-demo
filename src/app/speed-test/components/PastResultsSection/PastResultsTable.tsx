"use client";

import { PastSpeedTestResult } from '../../lib/types';

interface PastResultsTableProps {
  pastResults: PastSpeedTestResult[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalResults: number;
  };
  fetchPastResults: (page: number) => void;
  isFetchingPastResults: boolean;
}

export default function PastResultsTable({
  pastResults,
  pagination,
  fetchPastResults,
  isFetchingPastResults
}: PastResultsTableProps) {
  return (
    <div className="table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Location</th>
            <th>Location Tag</th>
            <th>Download (Mbps)</th>
            <th>Upload (Mbps)</th>
            <th>Ping (ms)</th>
          </tr>
        </thead>
        <tbody>
          {pastResults.map((result) => (
            <tr key={result.id}>
              <td>{new Date(result.timestamp).toLocaleString()}</td>
              <td>
                {result.latitude && result.longitude ? (
                  <a
                    href={`https://www.google.com/maps?q=${result.latitude},${result.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.location}
                  </a>
                ) : (
                  result.location
                )}
              </td>
              <td>{result.location_tag}</td>
              <td>{result.download_speed.toFixed(2)}</td>
              <td>{result.upload_speed.toFixed(2)}</td>
              <td>{result.ping.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination-controls">
        <button
          onClick={() => fetchPastResults(pagination.page - 1)}
          disabled={pagination.page <= 1 || isFetchingPastResults}
          className="btn"
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => fetchPastResults(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || isFetchingPastResults}
          className="btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}