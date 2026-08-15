'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getRoomPricesAction,
  createRoomPriceAction,
  updateRoomPriceAction,
  deleteRoomPriceAction,
  bulkSetRoomPriceAction,
  getCurrenciesAction,
} from '@/app/actions/room-price.actions';
import type { RoomPrice } from '@/lib/repositories/room-price.repository';

interface RoomPriceManagerProps {
  hotelId: string;
  roomId: string;
  roomName: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RoomPriceManager({ hotelId, roomId, roomName }: RoomPriceManagerProps) {
  const [prices, setPrices] = useState<RoomPrice[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<RoomPrice | null>(null);

  // Single-date form state
  const [currencyId, setCurrencyId] = useState('');
  const [priceDate, setPriceDate] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');

  // Bulk date-range form state
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkCurrencyId, setBulkCurrencyId] = useState('');
  const [bulkBasePrice, setBulkBasePrice] = useState('');
  const [bulkDiscount, setBulkDiscount] = useState('0');
  const [bulkTax, setBulkTax] = useState('0');
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricesRes, currRes] = await Promise.all([
        getRoomPricesAction({ hotelId, roomId }),
        getCurrenciesAction(),
      ]);

      if (pricesRes.success) {
        setPrices(pricesRes.data || []);
      } else {
        setError(pricesRes.error || 'Failed to fetch room prices');
      }

      if (currRes.success) {
        const currList = currRes.data || [];
        setCurrencies(currList);
        const inr = currList.find((c) => c.code === 'INR') || currList[0];
        if (inr) {
          setCurrencyId((prev) => prev || inr.id);
          setBulkCurrencyId((prev) => prev || inr.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [hotelId, roomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingPrice(null);
    setPriceDate('');
    setBasePrice('');
    setDiscountAmount('0');
    setTaxAmount('0');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (price: RoomPrice) => {
    setEditingPrice(price);
    setCurrencyId(price.currency_id);
    setPriceDate(price.price_date);
    setBasePrice(String(price.base_price));
    setDiscountAmount(String(price.discount_amount ?? 0));
    setTaxAmount(String(price.tax_amount ?? 0));
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const base = parseFloat(basePrice);
    const disc = parseFloat(discountAmount || '0');
    const tax = parseFloat(taxAmount || '0');

    if (isNaN(base) || base <= 0) {
      setError('Base price must be a valid number greater than 0');
      setSaving(false);
      return;
    }

    if (!editingPrice && !priceDate) {
      setError('A date is required for a new rate');
      setSaving(false);
      return;
    }

    try {
      const res = editingPrice
        ? await updateRoomPriceAction({
            id: editingPrice.id,
            hotelId,
            roomId,
            currencyId,
            basePrice: base,
            discountAmount: disc,
            taxAmount: tax,
          })
        : await createRoomPriceAction({
            hotelId,
            roomId,
            priceDate,
            currencyId,
            basePrice: base,
            discountAmount: disc,
            taxAmount: tax,
          });

      if (!res.success) {
        setError(res.error || 'Failed to save rate');
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

  const handleDelete = async (priceId: string) => {
    if (!confirm('Are you sure you want to delete this room rate?')) return;

    try {
      const res = await deleteRoomPriceAction({ id: priceId, hotelId, roomId });
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to delete room rate');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openBulkModal = () => {
    setBulkStartDate('');
    setBulkEndDate('');
    setBulkBasePrice('');
    setBulkDiscount('0');
    setBulkTax('0');
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

    const base = parseFloat(bulkBasePrice);
    if (isNaN(base) || base <= 0) {
      setBulkError('Base price must be a valid number greater than 0');
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
      const res = await bulkSetRoomPriceAction({
        hotelId,
        roomId,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        currencyId: bulkCurrencyId,
        basePrice: parseFloat(bulkBasePrice),
        discountAmount: parseFloat(bulkDiscount || '0'),
        taxAmount: parseFloat(bulkTax || '0'),
      });

      if (!res.success) {
        setBulkError(res.error || 'Failed to apply rate to date range');
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

  const getCurrencySymbol = (currId: string) => {
    const c = currencies.find((item) => item.id === currId);
    return c ? c.symbol || c.code : '₹';
  };

  const calculateEffective = (base: number, disc: number, tax: number) => {
    return Math.max(0, base - disc + tax);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Room Rates & Pricing</h3>
          <p className="text-xs text-slate-500">Per-day rates for {roomName}</p>
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
            + Add Rate
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 text-xs py-6">Loading rates…</div>
      ) : prices.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-6 border border-dashed border-slate-200 rounded">
          No rates set yet. Add a rate for a specific date, or apply one across a date range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Base</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium">Tax</th>
                <th className="px-3 py-2 font-medium">Final Price</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prices.map((p) => {
                const symbol = getCurrencySymbol(p.currency_id);
                const effective = calculateEffective(
                  Number(p.base_price),
                  Number(p.discount_amount || 0),
                  Number(p.tax_amount || 0)
                );

                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-slate-700 font-medium">
                      {formatDate(p.price_date)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{symbol}{Number(p.base_price).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{symbol}{Number(p.discount_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{symbol}{Number(p.tax_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{symbol}{effective.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-900 font-medium text-[11px]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingPrice ? 'Edit Room Rate' : 'Create Room Rate'}
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
                  value={priceDate}
                  onChange={(e) => setPriceDate(e.target.value)}
                  disabled={!!editingPrice}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  required
                />
                {editingPrice && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    The date of an existing rate can&apos;t be changed — delete and re-add it instead.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Currency</label>
                <select
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.symbol || c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Base Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 2500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Discount Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tax Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 flex justify-between items-center">
                <span className="font-medium">Final Price:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {getCurrencySymbol(currencyId)}
                  {calculateEffective(
                    parseFloat(basePrice || '0'),
                    parseFloat(discountAmount || '0'),
                    parseFloat(taxAmount || '0')
                  ).toFixed(2)}
                </span>
              </div>

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
                  {saving ? 'Saving...' : editingPrice ? 'Update Rate' : 'Create Rate'}
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
              <h3 className="text-base font-semibold text-slate-900">Apply Rate to Date Range</h3>
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
                  <label className="block text-slate-700 font-medium mb-1">Currency</label>
                  <select
                    value={bulkCurrencyId}
                    onChange={(e) => setBulkCurrencyId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} ({c.symbol || c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Base Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={bulkBasePrice}
                    onChange={(e) => setBulkBasePrice(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Discount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkDiscount}
                      onChange={(e) => setBulkDiscount(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkTax}
                      onChange={(e) => setBulkTax(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {dayCount > 0 && (
                  <p className="text-[11px] text-slate-500">
                    This will set the rate for <strong>{dayCount}</strong> day{dayCount === 1 ? '' : 's'}.
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
                  <p className="font-medium">Confirm bulk rate update</p>
                  <p className="mt-1">
                    This will set the rate to <strong>{getCurrencySymbol(bulkCurrencyId)}{calculateEffective(parseFloat(bulkBasePrice || '0'), parseFloat(bulkDiscount || '0'), parseFloat(bulkTax || '0')).toFixed(2)}</strong> (final price)
                    for every day from <strong>{formatDate(bulkStartDate)}</strong> to <strong>{formatDate(bulkEndDate)}</strong> ({dayCount} day{dayCount === 1 ? '' : 's'}).
                    Existing rates on those dates will be overwritten.
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
