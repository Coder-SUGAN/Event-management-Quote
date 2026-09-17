import React, { useState } from 'react';
import { Package, Plus, Search, Edit2, CheckCircle, AlertCircle, X, Trash2, Loader2 } from 'lucide-react';
import type { Product } from '../types.ts';
import { formatCurrency, createProduct, updateProduct, deleteProduct } from '../lib/api.ts';

interface ProductsManagerProps {
  products: Product[];
  onRefresh: () => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({ products, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Bouncy Castles');
  const [totalQuantity, setTotalQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('15000');
  const [additionalHourlyRate, setAdditionalHourlyRate] = useState<string>('3000');
  const [description, setDescription] = useState<string>('');
  const [dimensions, setDimensions] = useState<string>('');
  const [powerRequired, setPowerRequired] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'maintenance'>('active');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Bouncy Castles');
    setTotalQuantity('1');
    setUnitPrice('15000');
    setAdditionalHourlyRate('3000');
    setDescription('');
    setDimensions('');
    setPowerRequired('');
    setStatus('active');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setTotalQuantity(String(p.total_quantity));
    setUnitPrice(String(p.unit_price));
    setAdditionalHourlyRate(String(p.additional_hourly_rate ?? Math.round(p.unit_price * 0.2)));
    setDescription(p.description || '');
    setDimensions(p.dimensions || '');
    setPowerRequired(p.power_required || '');
    setStatus(p.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to remove "${p.name}" from the equipment inventory?`)) {
      return;
    }
    try {
      setDeletingId(p.id);
      await deleteProduct(p.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete equipment item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Equipment name is required');
      return;
    }

    const parsedQty = parseInt(totalQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setError('Total warehouse units must be at least 1');
      return;
    }

    const parsedBasePrice = parseFloat(unitPrice);
    if (isNaN(parsedBasePrice) || parsedBasePrice < 0) {
      setError('Base price (up to 3 hours) must be a valid positive amount');
      return;
    }

    const parsedExtraRate = parseFloat(additionalHourlyRate);
    if (isNaN(parsedExtraRate) || parsedExtraRate < 0) {
      setError('Additional 1-hour charge must be a valid non-negative amount');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: cleanName,
        category,
        total_quantity: parsedQty,
        unit_price: parsedBasePrice,
        additional_hourly_rate: parsedExtraRate,
        description: description.trim(),
        dimensions: dimensions.trim(),
        power_required: powerRequired.trim(),
        status,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to save equipment item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Equipment Inventory & Pricing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Kids Jump 4 Joy equipment assets, rental rates, specifications, and total inventory pool.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Equipment Item</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search equipment by name or category..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing {filtered.length} of {products.length} items
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Item & Category</th>
                <th className="py-3 px-4 text-center">Warehouse Stock</th>
                <th className="py-3 px-4 text-right">Base Price (≤3h)</th>
                <th className="py-3 px-4 text-right">+Per Extra Hour</th>
                <th className="py-3 px-4">Specs & Power</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block text-sm">{p.name}</span>
                    <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-0.5">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg">
                      {p.total_quantity} Units
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-black text-slate-900 block">
                      {formatCurrency(p.unit_price)}
                    </span>
                    <span className="text-[10px] text-slate-400">up to 3 hours</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold text-rose-600 block">
                      +{formatCurrency(p.additional_hourly_rate || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">per extra hour</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                    <p>{p.dimensions || '—'}</p>
                    <p className="text-slate-400">{p.power_required || 'Standard 230V'}</p>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Edit Equipment"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        disabled={deletingId === p.id}
                        title="Delete Equipment Item"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-40"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No equipment found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Equipment Item' : 'Add New Equipment Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Butterfly Bouncy Castle"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden bg-white"
                  >
                    <option value="Bouncy Castles">Bouncy Castles</option>
                    <option value="Power & Generators">Power & Generators</option>
                    <option value="Tables & Chairs">Tables & Chairs</option>
                    <option value="Party Machines">Party Machines</option>
                    <option value="Sound & Audio">Sound & Audio</option>
                    <option value="Costumes">Costumes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Warehouse Units *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold">⏱️ 3-Hour Duration Pricing Policy</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Base prices cover up to 3 hours. Additional hours beyond 3 hours are billed per extra hour.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Price (Up to 3 Hours) (LKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Base rental price includes up to 3 hours.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional 1 Hour Charge (LKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={additionalHourlyRate}
                    onChange={(e) => setAdditionalHourlyRate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden font-semibold text-rose-600"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Additional charge applied for each hour beyond 3 hours.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden bg-white"
                  >
                    <option value="active">Active (Available for Rent)</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dimensions (LxWxH)
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 15ft x 15ft x 13ft"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Power Required
                </label>
                <input
                  type="text"
                  value={powerRequired}
                  onChange={(e) => setPowerRequired(e.target.value)}
                  placeholder="e.g. 1.5HP Blower (230V)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Suitable for ages 4-12, holds up to 10 children"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingProduct ? 'Update Equipment' : 'Add Equipment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
