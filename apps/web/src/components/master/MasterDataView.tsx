import React, { useState } from 'react';
import {
  Mountain,
  Package,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  MapPin,
  FileCheck,
  Scale,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, Quarry } from '../../types';
import { formatIDR } from '../../lib/formatters';

export const MasterDataView: React.FC = () => {
  const { products, quarries, saveProduct, saveQuarry } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'quarries'>('quarries');
  const [searchTerm, setSearchTerm] = useState('');

  // Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Quarry Modal State
  const [editingQuarry, setEditingQuarry] = useState<Quarry | null>(null);
  const [isQuarryModalOpen, setIsQuarryModalOpen] = useState(false);
  const [quarryOverrides, setQuarryOverrides] = useState<{ productId: string; costPerM3: string }[]>([]);

  // Filtered lists
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuarries = quarries.filter(
    (q) =>
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.locationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Product Form Handler
  const handleProductSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      primaryUnit: 'm3',
      density: Number(formData.get('density')) || 1.6,
      qualitySpec: formData.get('qualitySpec') as string,
      abrasionSpec: (formData.get('abrasionSpec') as string) || undefined,
      defaultMaterialCost: Number(formData.get('defaultMaterialCost')) || 0,
      defaultSellingPrice: Number(formData.get('defaultSellingPrice')) || 0,
      isActive: formData.get('isActive') === 'on',
    };

    saveProduct(updated);
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Quarry Form Handler
  const handleQuarrySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated: Quarry = {
      id: editingQuarry ? editingQuarry.id : `quarry-${Date.now()}`,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      locationName: formData.get('locationName') as string,
      address: formData.get('address') as string,
      gpsLat: Number(formData.get('gpsLat')) || undefined,
      gpsLng: Number(formData.get('gpsLng')) || undefined,
      abrasionRating: (formData.get('abrasionRating') as string) || undefined,
      isActive: formData.get('isActive') === 'on',
      suppliedProductIds: editingQuarry?.suppliedProductIds || products.map((p) => p.id),
      materialCostOverrides: quarryOverrides
        .filter((o) => o.productId && Number(o.costPerM3) > 0)
        .map((o) => ({ productId: o.productId, costPerM3: Number(o.costPerM3) })),
    };

    saveQuarry(updated);
    setIsQuarryModalOpen(false);
    setEditingQuarry(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Sub Navigation & Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${
              activeSubTab === 'products'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" /> Katalog Produk Agregat ({products.length})
          </button>
          <button
            onClick={() => setActiveSubTab('quarries')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${
              activeSubTab === 'quarries'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Mountain className="w-4 h-4" /> Sumber Quarry & Tambang ({quarries.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari ${activeSubTab === 'products' ? 'Produk Material' : 'Lokasi Quarry'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
            />
          </div>

          {activeSubTab === 'products' ? (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <Plus className="w-4 h-4" /> Tambah Produk
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingQuarry(null);
                setQuarryOverrides([]);
                setIsQuarryModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <Plus className="w-4 h-4" /> Tambah Quarry
            </button>
          )}
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeSubTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {product.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{product.name}</h3>
                    <p className="text-[11px] text-slate-500">{product.category}</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsProductModalOpen(true);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-[#003C16] hover:bg-slate-100 transition-colors"
                    title="Edit Spesifikasi Produk"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-3 p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-700" /> Rasio Densitas Konversi:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {product.density.toFixed(2)} ton/m³
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-700" /> Uji Abrasi / Mutu:
                    </span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {product.abrasionSpec || 'Sesuai SNI 03-2417'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-700" /> Harga Dasar Material:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatIDR(product.defaultMaterialCost)}/m³
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Indikasi Harga Jual:
                    </span>
                    <span className="font-mono font-extrabold text-[#003C16]">
                      {formatIDR(product.defaultSellingPrice)}/m³
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-emerald-700" /> Harga Beli per Quarry:
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {quarries.map((quarry) => {
                        const override = quarry.materialCostOverrides?.find((o) => o.productId === product.id);
                        const price = override?.costPerM3 ?? product.defaultMaterialCost;
                        const isOverride = !!override;
                        return (
                          <div
                            key={quarry.id}
                            className={`flex items-center justify-between px-2 py-1 rounded border text-xs ${
                              isOverride ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <span className="font-medium">
                              {quarry.code} — {quarry.name}
                            </span>
                            <span className={`font-mono font-bold ${isOverride ? 'text-emerald-800' : 'text-slate-700'}`}>
                              {formatIDR(price)}/m³ {isOverride && <span className="text-[9px] bg-emerald-600 text-white px-1 rounded ml-1">Override</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-dashed border-slate-200">
                  Spesifikasi Teknis: {product.qualitySpec}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Satuan Dasar: Volume Baku ({product.primaryUnit})</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    product.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {product.isActive ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUARRIES TAB */}
      {activeSubTab === 'quarries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuarries.map((quarry) => (
            <div
              key={quarry.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {quarry.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{quarry.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-rose-500" /> {quarry.locationName}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingQuarry(quarry);
                      setQuarryOverrides(
                        (quarry.materialCostOverrides || []).map((o) => ({
                          productId: o.productId,
                          costPerM3: String(o.costPerM3),
                        }))
                      );
                      setIsQuarryModalOpen(true);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-[#003C16] hover:bg-slate-100 transition-colors"
                    title="Edit Data Quarry"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-3 p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Alamat / Akses Site:</span>
                    <p className="text-slate-800 text-[11px] mt-0.5">{quarry.address}</p>
                  </div>

                  {quarry.gpsLat && quarry.gpsLng && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-600">Koordinat GPS:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {quarry.gpsLat.toFixed(5)}, {quarry.gpsLng.toFixed(5)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-600">Rating Kualitas / Abrasi:</span>
                    <span className="font-semibold text-emerald-800">
                      {quarry.abrasionRating || 'Abrasi < 20% (Grade A)'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1.5">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-700" /> Harga Beli per Produk — {quarry.name} → Material:
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {products.map((prod) => {
                        const override = quarry.materialCostOverrides?.find((o) => o.productId === prod.id);
                        const price = override?.costPerM3 ?? prod.defaultMaterialCost;
                        const isOverride = !!override;
                        return (
                          <div
                            key={prod.id}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs ${
                              isOverride ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white border">
                                {prod.code}
                              </span>
                              <span className="font-medium text-slate-800">{prod.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold ${isOverride ? 'text-emerald-800' : 'text-slate-700'}`}>
                                {formatIDR(price)}/m³
                              </span>
                              {isOverride ? (
                                <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">Override</span>
                              ) : (
                                <span className="px-1 py-0.5 rounded text-[9px] bg-slate-200 text-slate-600">Default</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Edit Quarry → atur Harga Beli Material per Produk (Override) — kosong = pakai Harga Dasar Material produk.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {quarry.suppliedProductIds?.length || products.length} Jenis Produk Didukung
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    quarry.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {quarry.isActive ? 'Operasional Aktif' : 'Non-Aktif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Edit / Add Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingProduct ? 'Edit Spesifikasi Produk Agregat' : 'Tambah Produk Material Baru'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Produk *</label>
                  <input
                    name="code"
                    required
                    defaultValue={editingProduct?.code || 'SPLIT-2-3'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Material *</label>
                  <input
                    name="category"
                    required
                    defaultValue={editingProduct?.category || 'Batu Pecah / Agregat'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Material / Agregat *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingProduct?.name || 'Batu Split 2-3 cm (Agregat Kasar)'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Densitas Material (ton/m³) *
                  </label>
                  <input
                    name="density"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editingProduct?.density || 1.6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Uji Abrasi Los Angeles</label>
                  <input
                    name="abrasionSpec"
                    defaultValue={editingProduct?.abrasionSpec || 'Abrasi < 18.5% (SNI 03-2417)'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Harga Dasar Material (Rp/m³) *
                  </label>
                  <input
                    name="defaultMaterialCost"
                    type="number"
                    step="1000"
                    required
                    defaultValue={editingProduct?.defaultMaterialCost || 170000}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Indikasi Harga Jual (Rp/m³) *
                  </label>
                  <input
                    name="defaultSellingPrice"
                    type="number"
                    step="1000"
                    required
                    defaultValue={editingProduct?.defaultSellingPrice || 265000}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono font-bold text-[#003C16]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Spesifikasi Kualitas & Catatan</label>
                <textarea
                  name="qualitySpec"
                  rows={2}
                  defaultValue={
                    editingProduct?.qualitySpec ||
                    'Material batu andesit pecah mesin crusher, bebas lempung & debu berlebih.'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="prodActive"
                  defaultChecked={editingProduct ? editingProduct.isActive : true}
                  className="rounded text-[#003C16] focus:ring-[#003C16]"
                />
                <label htmlFor="prodActive" className="text-slate-700 font-medium cursor-pointer">
                  Status Produk Aktif untuk Operasional Pengiriman
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-2 rounded-md font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Data Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quarry Edit / Add Modal */}
      {isQuarryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingQuarry ? 'Edit Data Lokasi Quarry' : 'Tambah Lokasi Quarry Baru'}
              </h3>
              <button
                onClick={() => setIsQuarryModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuarrySubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Quarry *</label>
                  <input
                    name="code"
                    required
                    defaultValue={editingQuarry?.code || 'QRY-CRB-01'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Wilayah / Site *</label>
                  <input
                    name="locationName"
                    required
                    defaultValue={editingQuarry?.locationName || 'Cirebon Selatan'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Quarry / Tambang *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingQuarry?.name || 'Quarry Andesit Gunung Kuda'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap Site *</label>
                <input
                  name="address"
                  required
                  defaultValue={editingQuarry?.address || 'Jl. Tambang Galian C No. 12, Cirebon, Jawa Barat'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Koordinat GPS Latitude</label>
                  <input
                    name="gpsLat"
                    type="number"
                    step="0.000001"
                    defaultValue={editingQuarry?.gpsLat || -6.74512}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Koordinat GPS Longitude</label>
                  <input
                    name="gpsLng"
                    type="number"
                    step="0.000001"
                    defaultValue={editingQuarry?.gpsLng || 108.45123}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rating Kualitas & Abrasi</label>
                <input
                  name="abrasionRating"
                  defaultValue={editingQuarry?.abrasionRating || 'Abrasi 16.8% (Mutu Sangat Baik / Grade A)'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">
                    Harga Beli Material per Produk (Override)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuarryOverrides((prev) => [...prev, { productId: products[0]?.id || '', costPerM3: '' }])
                    }
                    className="text-[11px] font-bold text-[#003C16] hover:text-[#002B10]"
                  >
                    + Tambah Harga
                  </button>
                </div>
                <div className="space-y-1.5">
                  {quarryOverrides.map((o, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={o.productId}
                        onChange={(e) =>
                          setQuarryOverrides((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, productId: e.target.value } : p))
                          )
                        }
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder="Rp/m³"
                        value={o.costPerM3}
                        onChange={(e) =>
                          setQuarryOverrides((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, costPerM3: e.target.value } : p))
                          )
                        }
                        className="w-32 px-3 py-2 border border-slate-300 rounded-md font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuarryOverrides((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                        title="Hapus harga"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {quarryOverrides.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      Kosong = memakai harga default produk ({formatIDR(products[0]?.defaultMaterialCost || 0)}/m³).
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="quarryActive"
                  defaultChecked={editingQuarry ? editingQuarry.isActive : true}
                  className="rounded text-[#003C16] focus:ring-[#003C16]"
                />
                <label htmlFor="quarryActive" className="text-slate-700 font-medium cursor-pointer">
                  Status Quarry Aktif Melayani Loading Truk
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuarryModalOpen(false)}
                  className="px-3 py-2 rounded-md font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Data Quarry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
