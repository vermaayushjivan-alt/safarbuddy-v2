// src/app/debug/room-availability/page.tsx
//
// TEMPORARY DIAGNOSTIC PAGE — ROOM-05. Delete this page (and
// src/app/actions/_debug-room-availability.actions.ts) once the
// empty-room-picker issue is root-caused and fixed. No auth guard
// intentionally kept minimal since this is temporary and read-only,
// but delete promptly once you're done — don't leave a debug route
// live in production longer than needed.

'use client';

import { useState } from 'react';
import {
  diagnoseRoomAvailability,
  type RoomAvailabilityDiagnosticReport,
} from '@/app/actions/_debug-room-availability.actions';

export default function RoomAvailabilityDebugPage() {
  const [hotelId, setHotelId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] =
    useState<RoomAvailabilityDiagnosticReport | null>(null);

  async function run() {
    setLoading(true);
    setReport(null);

    try {
      const result = await diagnoseRoomAvailability(
        hotelId.trim(),
        checkIn,
        checkOut
      );

      setReport(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        fontFamily: 'monospace',
        fontSize: 12,
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>
        ROOM-05 diagnostic (temporary — delete after use)
      </h1>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          hotel_id
        </label>
        <input
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          placeholder="hotel uuid"
          style={{
            display: 'block',
            width: '100%',
            padding: 8,
            marginBottom: 8,
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', marginBottom: 4 }}>
          check_in_date
        </label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: 8,
            marginBottom: 8,
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', marginBottom: 4 }}>
          check_out_date
        </label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: 8,
            marginBottom: 8,
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={run}
          disabled={loading || !hotelId || !checkIn || !checkOut}
          style={{
            padding: '8px 16px',
            background: '#111',
            color: '#fff',
            borderRadius: 8,
            border: 'none',
          }}
        >
          {loading ? 'Running…' : 'Run diagnostic'}
        </button>
      </div>

      {report && (
        <div style={{ marginTop: 16 }}>
          <p>
            <b>total_rooms_for_hotel:</b> {report.total_rooms_for_hotel}
          </p>
          <p>
            <b>active_rooms_count:</b> {report.active_rooms_count}
          </p>

          {report.error && (
            <p style={{ color: 'crimson' }}>
              <b>error:</b> {report.error}
            </p>
          )}

          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#f4f4f4',
              padding: 12,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
