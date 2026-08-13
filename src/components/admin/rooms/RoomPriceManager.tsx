'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getRoomPricesAction,
  createRoomPriceAction,
  updateRoomPriceAction,
  deleteRoomPriceAction,
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

export function RoomPriceManager({ hotelId, roomId, roomName }: RoomPriceManagerProps) {
  const [prices, setPrices] = useState<RoomPrice[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<RoomPrice | null>(null);

  // Form State
  const [currencyId, setCurrencyId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');

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
        setError(pricesRes.error.message);
      }

      if (currRes.success) {
        const currList = currRes.data || [];
        setCurrencies(currList);
        if (currList.length > 0 && !currencyId) {
          const inr = currList.find((c) => c.code === 'INR') || currList[0];
          setCurrencyId(inr.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [hotelId, roomId, currencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingPrice(null);
    setBasePrice('');
    setDiscountAmount('0');
    setTaxAmount('0');
    setStartDate('');
    setEndDate('');
    setIsDefault(prices.length === 0);
    setStatus('active');
    if (currencies.length > 0) {
      const inr = currencies.find((c) => c.code === 'INR') || currencies[0];
      setCurrencyId(inr.id);
    }
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (price: RoomPrice) => {
    setEditingPrice(price);
    setCurrencyId(price.currency_id);
    setBasePrice(String(price.base_price));
    setDiscountAmount(String(price.discount_amount ?? 0));
    setTaxAmount(String(price.tax_amount ?? 0));
    setStartDate(price.start_date || '');
    setEndDate(price.end_date || '');
    setIsDefault(price.is_default);
    setStatus(price.status as 'active' | 'inactive' | 'archived');
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

    try {
      if (editingPrice) {
        const res = await updateRoomPriceAction({
          id: editingPrice.id,
          hotelId,
          roomId,
          currencyId,
          basePrice: base,
          discountAmount: disc,
          taxAmount: tax,
          startDate: startDate || null,
          endDate: endDate || null,
          isDefault,
          status,
        });

        if (!res.success) {
          setError(res.error.message);
          setSaving(false);
          return;
        }
      } else {
        const res = await createRoomPriceAction({
          hotelId,
          roomId,
          currencyId,
          basePrice: base,
          discountAmount: disc,
          taxAmount: tax,
          startDate: startDate || null,
          endDate: endDate || null,
          isDefault,
          status,
        });

        if (!res.success) {
          setError(res.error.message);
          setSaving(false);
          return;
        }
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
        alert(res.error.message);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Room Rates & Pricing</h3>
          <p className="text-xs text-slate-500">Manage base rates, seasonal pricing, and default rates for {roomName}</p>
        </div>
        <button
          onClick={openCreateModal}
          type="button"
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          + Add Rate
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-xs text-slate-500">Loading pricing details...</div>
      ) : prices.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
          No room rates configured for this room. Click &quot;Add Rate&quot; to set up pricing.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-medium">
              <tr>
                <th className="px-3 py-2">Type / Period</th>
                <th className="px-3 py-2">Base Price</th>
                <th className="px-3 py-2">Discount</th>
                <th className="px-3 py-2">Tax</th>
                <th className="px-3 py-2 font-semibold">Effective Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
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
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {p.is_default ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 mr-1.5">
                            Default Rate
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 mr-1.5">
                            Seasonal / Tier
                          </span>
                        )}
                      </div>
                      {(p.start_date || p.end_date) && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {p.start_date ? p.start_date : 'Start'} to {p.end_date ? p.end_date : 'Ongoing'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{symbol}{Number(p.base_price).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{symbol}{Number(p.discount_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{symbol}{Number(p.tax_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{symbol}{effective.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          p.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'inactive'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
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
                <span className="font-medium">Calculated Effective Price:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {getCurrencySymbol(currencyId)}
                  {calculateEffective(
                    parseFloat(basePrice || '0'),
                    parseFloat(discountAmount || '0'),
                    parseFloat(taxAmount || '0')
                  ).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isDefault" className="text-slate-700 font-medium">
                  Set as Default Room Rate
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'archived')}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
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
    </div>
  );
}
