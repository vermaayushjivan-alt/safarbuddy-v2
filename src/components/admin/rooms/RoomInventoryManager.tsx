'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getInventoryForRangeAction,
  setInventoryForDateAction,
  deleteInventoryForDateAction,
  bulkSetInventoryAction,
} from '@/app/actions/room-inventory.actions';
import type { RoomInventoryRow } from '@/lib/repositories/room-inventory.repository';

interface RoomInventoryManagerProps {
  hotelId: string;
  roomId: string;
  roomName: string;
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RoomInventoryManager({ hotelId, roomId, roomName }: RoomInventoryManagerProps) {
  const [rows, setRows] = useState<RoomInventoryRow[]>([]);
  const [rangeStart, setRangeStart] = useState(todayISO());
  const [rangeEnd, setRangeEnd] = useState(addDaysISO(todayISO(), 29));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingRow, setEditingRow] = useState<RoomInventoryRow | null>(null);

  // Single-date form state
  const [inventoryDate, setInventoryDate] = useState('');
  const [totalRooms, setTotalRooms] = useState('');
  const [blockedRooms, setBlockedRooms] = useState('0');

  // Bulk date-range form state
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkTotalRooms, setBulkTotalRooms] = useState('');
  const [bulkBlockedRooms, setBulkBlockedRooms] = useState('0');
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInventoryForRangeAction({
        hotelId,
        roomId,
        startDate: rangeStart,
        endDate: rangeEnd,
      });

      if (res.success) {
        setRows(res.data || []);
      } else {
        setError(res.error || 'Failed to fetch room availability');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [hotelId, roomId, rangeStart, rangeEnd]);

  useEffect(() => {
    // fetch-on-mount / on-range-change: loadData syncs component state
    // with data fetched via server actions (an external source), which
    // is the documented use case for this rule, not an accidental
    // cascading update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingRow(null);
    setInventoryDate('');
    setTotalRooms('');
    setBlockedRooms('0');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (row: RoomInventoryRow) => {
    setEditingRow(row);
    setInventoryDate(row.inventory_date);
    setTotalRooms(String(row.total_rooms));
    setBlockedRooms(String(row.blocked_rooms));
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const total = parseInt(totalRooms, 10);
    const blocked = parseInt(blockedRooms || '0', 10);

    if (isNaN(total) || total < 0) {
      setError('Total rooms must be a valid number, 0 or greater');
      setSaving(false);
      return;
    }

    if (isNaN(blocked) || blocked < 0) {
      setError('Blocked rooms must be a valid number, 0 or greater');
      setSaving(false);
      return;
    }

    if (!inventoryDate) {
      setError('A date is required');
      setSaving(false);
      return;
    }

    try {
      const res = await setInventoryForDateAction({
        hotelId,
        roomId,
        inventoryDate,
        totalRooms: total,
        blockedRooms: blocked,
      });

      if (!res.success) {
        setError(res.error || 'Failed to save availability');
        setSaving(false);
        return;
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RoomInventoryRow) => {
    if (!confirm(`Clear availability for ${formatDate(row.inventory_date)}?`)) return;

    try {
      const res = await deleteInventoryForDateAction({
        hotelId,
        roomId,
        inventoryDate: row.inventory_date,
      });
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to clear availability');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openBulkModal = () => {
    setBulkStartDate('');
    setBulkEndDate('');
    setBulkTotalRooms('');
    setBulkBlockedRooms('0');
    setBulkError(null);
    setBulkConfirming(false);
    setShowBulkModal(true);
  };

  const dayCount = (() => {
    if (!bulkStartDate || !bulkEndDate) return 0;
    const start = new Date(`${bulkStartDate}T00:00:00Z`);
    const end = new Date(`${bulkEndDate}T00:00:00Z`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  })();

  const handleBulkReview = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    const total = parseInt(bulkTotalRooms, 10);
    const blocked = parseInt(bulkBlockedRooms || '0', 10);

    if (isNaN(total) || total < 0) {
      setBulkError('Total rooms must be a valid number, 0 or greater');
      return;
    }
    if (isNaN(blocked) || blocked < 0) {
      setBulkError('Blocked rooms must be a valid number, 0 or greater');
      return;
    }
    if (!bulkStartDate || !bulkEndDate) {
      setBulkError('Start and end date are required');
      return;
    }
    if (dayCount <= 0) {
      setBulkError('End date must be on or after start date');
      return;
    }

    setBulkConfirming(true);
  };

  const handleBulkConfirm = async () => {
    setBulkError(null);
    setBulkSaving(true);
    try {
      const res = await bulkSetInventoryAction({
        hotelId,
        roomId,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        totalRooms: parseInt(bulkTotalRooms, 10),
        blockedRooms: parseInt(bulkBlockedRooms || '0', 10),
      });

      if (!res.success) {
        setBulkError(res.error || 'Failed to apply availability to date range');
        setBulkConfirming(false);
        return;
      }

      setShowBulkModal(false);
      await loadData();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk update failed');
      setBulkConfirming(false);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Room Availability</h3>
          <p className="text-xs text-slate-500">Day-by-day room counts for {roomName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openBulkModal}
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            Apply to Date Range
          </button>
          <button
            onClick={openCreateModal}
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            + Set Availability
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-sm text-xs">
        <div>
          <label className="block text-slate-700 font-medium mb-1">View from</label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-1">To</label>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 text-xs py-6">Loading availability…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-6 border border-dashed border-slate-200 rounded">
          No availability set for this range yet. Set availability for a specific date, or apply one across a date range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Blocked</th>
                <th className="px-3 py-2 font-medium">Booked</th>
                <th className="px-3 py-2 font-medium">Available</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-slate-700 font-medium">
                    {formatDate(row.inventory_date)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.total_rooms}</td>
                  <td className="px-3 py-2 text-slate-500">{row.blocked_rooms}</td>
                  <td className="px-3 py-2 text-slate-500">{row.booked_rooms}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.available_rooms}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(row)}
                      className="text-blue-600 hover:text-blue-900 font-medium text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="text-red-600 hover:text-red-900 font-medium text-[11px]"
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingRow ? 'Edit Availability' : 'Set Availability'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={inventoryDate}
                  onChange={(e) => setInventoryDate(e.target.value)}
                  disabled={!!editingRow}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  required
                />
                {editingRow && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    The date of an existing entry can&apos;t be changed — clear and re-add it instead.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Total Rooms *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 10"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Blocked Rooms</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={blockedRooms}
                  onChange={(e) => setBlockedRooms(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Rooms held back from sale (maintenance, owner use, etc.) — not counted as available.
                </p>
              </div>

              {editingRow && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-600 text-[11px]">
                  <strong>{editingRow.booked_rooms}</strong> room(s) already booked for this date. Total rooms cannot be set below this.
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-semibold text-slate-900">Apply Availability to Date Range</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {bulkError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded">
                {bulkError}
              </div>
            )}

            {!bulkConfirming ? (
              <form onSubmit={handleBulkReview} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">From *</label>
                    <input
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">To *</label>
                    <input
                      type="date"
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Total Rooms *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={bulkTotalRooms}
                    onChange={(e) => setBulkTotalRooms(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Blocked Rooms</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={bulkBlockedRooms}
                    onChange={(e) => setBulkBlockedRooms(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {dayCount > 0 && (
                  <p className="text-[11px] text-slate-500">
                    This will set availability for <strong>{dayCount}</strong> day{dayCount === 1 ? '' : 's'}.
                  </p>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded">
                  <p className="font-medium">Confirm bulk availability update</p>
                  <p className="mt-1">
                    This will set <strong>{bulkTotalRooms} total room(s)</strong> ({bulkBlockedRooms} blocked)
                    for every day from <strong>{formatDate(bulkStartDate)}</strong> to <strong>{formatDate(bulkEndDate)}</strong> ({dayCount} day{dayCount === 1 ? '' : 's'}).
                    Existing entries on those dates will be overwritten. Dates with existing bookings that would exceed the new total will fail and stop the update.
                  </p>
                </div>
                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setBulkConfirming(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    disabled={bulkSaving}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    disabled={bulkSaving}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                  >
                    {bulkSaving ? 'Applying...' : 'Confirm & Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
