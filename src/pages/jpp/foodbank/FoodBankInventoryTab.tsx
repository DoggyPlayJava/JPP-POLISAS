import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Search,
  ArrowLeftRight,
  Boxes,
  FileSpreadsheet,
  Plus,
  Package,
  Edit2,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodBankDistributionLocation, FoodBankItem } from '@/types';
import { FOODBANK_CATEGORY_CONFIG, getFoodBankStockBadge } from '@/lib/foodbankDefaults';
import { FB_CARD, FB_INPUT, FB_PRIMARY_BTN } from './foodbankAdminUtils';

interface FoodBankInventoryTabProps {
  itemCategoryFilter: string;
  onItemCategoryFilterChange: (cat: string) => void;
  selectedInventoryLocationId: string;
  onSelectInventoryLocationId: (locId: string) => void;
  isExecutiveAdmin: boolean;
  assignedLocationId: string | null;
  locations: FoodBankDistributionLocation[];
  itemSearch: string;
  onItemSearchChange: (q: string) => void;
  inventoryViewMode: 'grid' | 'table';
  onInventoryViewModeChange: (mode: 'grid' | 'table') => void;
  filteredItems: FoodBankItem[];
  getItemStockForLocation: (itemId: string, locationId: string) => number;
  onOpenTransferModal: (itemId?: string) => void;
  onOpenAddItemModal: () => void;
  onOpenEditItemModal: (item: FoodBankItem) => void;
  onQuickAdjustStock: (item: FoodBankItem, delta: number) => void;
  onToggleItemActive: (item: FoodBankItem) => void;
  onDeleteItem: (item: FoodBankItem) => void;
}

export const FoodBankInventoryTab: React.FC<FoodBankInventoryTabProps> = ({
  itemCategoryFilter,
  onItemCategoryFilterChange,
  selectedInventoryLocationId,
  onSelectInventoryLocationId,
  isExecutiveAdmin,
  assignedLocationId,
  locations,
  itemSearch,
  onItemSearchChange,
  inventoryViewMode,
  onInventoryViewModeChange,
  filteredItems,
  getItemStockForLocation,
  onOpenTransferModal,
  onOpenAddItemModal,
  onOpenEditItemModal,
  onQuickAdjustStock,
  onToggleItemActive,
  onDeleteItem,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  return (
    <motion.div
      key="tab-inventory"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      {/* Top Toolbar */}
      <div className={cn(FB_CARD, 'p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4')}>
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
          {(['SEMUA', 'MAKANAN', 'MINUMAN', 'KEBERSIHAN', 'KEPERLUAN_ASAS'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onItemCategoryFilterChange(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                itemCategoryFilter === cat
                  ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] dark:border dark:border-[#2DD4BF]/30'
                  : 'text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
              )}
            >
              {cat === 'SEMUA' ? t('jpp:foodbank_all_categories', 'Semua Kategori') : cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Location Selector */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <MapPin
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#0F766E] dark:text-[#2DD4BF] pointer-events-none"
              aria-hidden="true"
            />
            <select
              aria-label={t('jpp:foodbank_all_distribution_centers_aggregate', 'Semua Pusat Edaran (Agregat)')}
              value={selectedInventoryLocationId}
              onChange={(e) => onSelectInventoryLocationId(e.target.value)}
              disabled={!isExecutiveAdmin && !!assignedLocationId}
              className={cn(
                'w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] appearance-none cursor-pointer',
                !isExecutiveAdmin && !!assignedLocationId && 'opacity-75 cursor-not-allowed'
              )}
            >
              {isExecutiveAdmin && (
                <option value="SEMUA" className="bg-white dark:bg-[#13171D]">
                  {t('jpp:foodbank_all_distribution_centers_aggregate', 'Semua Pusat Edaran (Agregat)')}
                </option>
              )}
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-white dark:bg-[#13171D]">
                  {loc.name}{' '}
                  {!isExecutiveAdmin && loc.id === assignedLocationId
                    ? t('jpp:foodbank_your_assigned_location', '(Lokasi Jagaan Anda)')
                    : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
              aria-hidden="true"
            />
          </div>

          {/* Search Items */}
          <div className="relative w-full sm:w-48">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label={t('jpp:foodbank_search_items_placeholder', 'Cari barangan...')}
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              placeholder={t('jpp:foodbank_search_items_placeholder', 'Cari barangan...')}
              className={cn(FB_INPUT, 'pl-9')}
            />
          </div>

          {/* Transfer Stock CTA */}
          <button
            type="button"
            onClick={() => onOpenTransferModal()}
            className="px-3.5 py-2 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] hover:bg-[#B8E4DC]/50 dark:hover:bg-[#232933] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            {t('jpp:foodbank_stock_transfer_btn', 'Pindah Stok')}
          </button>

          {/* Grid / Table Toggle */}
          <div className="flex items-center gap-1 bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onInventoryViewModeChange('grid')}
              aria-pressed={inventoryViewMode === 'grid'}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1',
                inventoryViewMode === 'grid'
                  ? 'bg-white dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] shadow-surface-sm'
                  : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
              )}
              title={t('kebajikan:view_card_grid_title', 'Paparan Grid Kad')}
            >
              <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onInventoryViewModeChange('table')}
              aria-pressed={inventoryViewMode === 'table'}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1',
                inventoryViewMode === 'table'
                  ? 'bg-white dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] shadow-surface-sm'
                  : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
              )}
              title={t('jpp:foodbank_view_table_title', 'Paparan Jadual Inventori')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('jpp:foodbank_view_table', 'Jadual')}</span>
            </button>
          </div>

          {/* Add Item CTA */}
          <button
            type="button"
            onClick={onOpenAddItemModal}
            className={cn(
              FB_PRIMARY_BTN,
              'px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap'
            )}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {t('jpp:foodbank_add_item_btn', 'Tambah Item')}
          </button>
        </div>
      </div>

      {/* Grid or Table Content */}
      {inventoryViewMode === 'grid' ? (
        <div className="w-full max-w-full overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const catConfig = FOODBANK_CATEGORY_CONFIG[item.category] || {
                label: item.category,
                badge: 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border-[#B8E4DC] dark:border-[#252B35]',
                icon: '',
              };
              const displayStock = getItemStockForLocation(item.id, selectedInventoryLocationId);
              const stockBadge = getFoodBankStockBadge(displayStock, item.unit);

              return (
                <article
                  key={item.id}
                  className={cn(
                    FB_CARD,
                    'p-4 flex flex-col justify-between relative',
                    !item.is_active && 'opacity-65'
                  )}
                >
                  <div>
                    {/* Item Image */}
                    <div className="w-full h-32 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] overflow-hidden mb-3 relative flex items-center justify-center border border-[#B8E4DC]/60 dark:border-[#252B35]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-9 h-9 text-[#B8E4DC] dark:text-[#252B35]" aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          'absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-semibold border flex items-center gap-1',
                          catConfig.badge
                        )}
                      >
                        <Package className="w-3 h-3" aria-hidden="true" />
                        <span>{catConfig.label}</span>
                      </span>
                      {!item.is_active && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white">
                          {t('jpp:foodbank_status_inactive', 'Tidak Aktif')}
                        </span>
                      )}
                    </div>

                    {/* Title & Desc */}
                    <h3 className="font-bold text-sm text-[#0B2420] dark:text-[#F1F5F9] line-clamp-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    )}

                    {/* Unit Cost & Stock */}
                    <div className="mt-3 pt-2.5 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium block">Anggaran</span>
                        <p className="font-bold font-mono tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">
                          RM {Number(item.estimated_cost).toFixed(2)} /{item.unit}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium mb-0.5">
                          {selectedInventoryLocationId === 'SEMUA'
                            ? t('jpp:foodbank_balance_aggregate', 'Baki Agregat')
                            : t('jpp:foodbank_balance_location', 'Baki Lokasi')}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums',
                            stockBadge.badgeClass
                          )}
                        >
                          {stockBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Per-Location Stock Matrix */}
                    <div className="mt-3 pt-2.5 border-t border-[#B8E4DC]/50 dark:border-[#252B35] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
                          Pusat Edaran
                        </span>
                        <span className="font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
                          {selectedInventoryLocationId !== 'SEMUA'
                            ? t('jpp:foodbank_focus_location', 'Fokus Lokasi')
                            : t('jpp:foodbank_breakdown', 'Pecahan')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {locations.map((loc) => {
                          const locStock = getItemStockForLocation(item.id, loc.id);
                          const isCurrentSelected = selectedInventoryLocationId === loc.id;
                          const shortName =
                            loc.name.includes('Utama') || loc.name.includes('Student Centre')
                              ? t('jpp:foodbank_sc_main', 'SC Utama')
                              : loc.name.includes('Kamsis') || loc.name.includes('Al-Biruni')
                              ? t('jpp:foodbank_kamsis_ab', 'Kamsis AB')
                              : loc.name.includes('Pentadbiran')
                              ? 'Pentadbiran'
                              : loc.name.split(' ')[0];

                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => onSelectInventoryLocationId(isCurrentSelected ? 'SEMUA' : loc.id)}
                              title={t(
                                'kebajikan:tooltip_focus_location_stock',
                                `Klik untuk fokus ${loc.name} (Baki: ${locStock} ${item.unit})`,
                                { name: loc.name, stock: locStock, unit: item.unit }
                              )}
                              className={cn(
                                'p-1.5 rounded-lg border text-center transition-colors',
                                isCurrentSelected
                                  ? 'bg-[#EBF7F4] dark:bg-[#1B2028] border-[#0F766E] dark:border-[#2DD4BF] text-[#0F766E] dark:text-[#2DD4BF] font-semibold'
                                  : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/60 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
                              )}
                            >
                              <div className="text-xs font-semibold truncate">{shortName}</div>
                              <div className="text-xs font-bold font-mono tabular-nums">{locStock}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stock Controls */}
                  <div className="mt-3 pt-2.5 border-t border-[#B8E4DC]/50 dark:border-[#252B35] space-y-2">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] truncate">
                        {selectedInventoryLocationId !== 'SEMUA' ? (
                          <span className="text-[#0F766E] dark:text-[#2DD4BF] font-semibold">
                            {t('kebajikan:quick_update_location_label', 'Kemas Kini ({{loc}}):', {
                              loc:
                                locations.find((l) => l.id === selectedInventoryLocationId)?.name.split(' ')[0] ||
                                t('kebajikan:location_fallback', 'Lokasi'),
                            })}
                          </span>
                        ) : (
                          t('kebajikan:quick_update_label', 'Kemas Kini:')
                        )}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onQuickAdjustStock(item, -10)}
                          className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-semibold font-mono text-xs transition-colors"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickAdjustStock(item, 10)}
                          className="px-2 py-1 rounded-md bg-[#EBF7F4] dark:bg-[#1B2028] hover:bg-[#B8E4DC]/60 dark:hover:bg-[#232933] text-[#0F766E] dark:text-[#2DD4BF] font-semibold font-mono text-xs transition-colors"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickAdjustStock(item, 50)}
                          className="px-2 py-1 rounded-md bg-[#EBF7F4] dark:bg-[#1B2028] hover:bg-[#B8E4DC]/60 dark:hover:bg-[#232933] text-[#0F766E] dark:text-[#2DD4BF] font-semibold font-mono text-xs transition-colors"
                        >
                          +50
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => onToggleItemActive(item)}
                        className="text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]"
                      >
                        {item.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenTransferModal(item.id)}
                          aria-label={t('jpp:foodbank_transfer_item_stock_title', 'Pindah Stok Barangan Ini')}
                          title={t('jpp:foodbank_transfer_item_stock_title', 'Pindah Stok Barangan Ini')}
                          className="p-1.5 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] hover:bg-[#B8E4DC]/60 dark:hover:bg-[#232933] text-[#0F766E] dark:text-[#2DD4BF] transition-colors"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditItemModal(item)}
                          aria-label="Sunting Item"
                          title="Sunting Item"
                          className="p-1.5 rounded-lg bg-[#F6FBF9] dark:bg-[#1B2028] hover:bg-[#EBF7F4] dark:hover:bg-[#232933] text-[#3B635C] dark:text-[#94A0B2] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          aria-label={t('jpp:foodbank_item_deleted_title', 'Padam Item')}
                          title={t('jpp:foodbank_item_deleted_title', 'Padam Item')}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={cn(FB_CARD, 'overflow-hidden')}>
          <div className="w-full max-w-full overflow-x-auto scrollbar-hide">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="bg-[#F6FBF9] dark:bg-[#0E1116] border-b border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">{t('kebajikan:col_items', 'Barangan')}</th>
                  <th className="py-3 px-4">{t('kebajikan:col_category', 'Kategori')}</th>
                  <th className="py-3 px-4">{t('kebajikan:col_est_unit_cost', 'Anggaran Seunit')}</th>
                  <th className="py-3 px-4">{t('jpp:foodbank_col_stock_balance', 'Baki Stok')}</th>
                  <th className="py-3 px-4">
                    {t('jpp:foodbank_col_selected_distribution_center', 'Pusat Agihan Terpilih')}
                  </th>
                  <th className="py-3 px-4 text-center">{t('kebajikan:col_status', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('kebajikan:col_action', 'Tindakan')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#3B635C] dark:text-[#94A0B2] font-medium">
                      {t('jpp:foodbank_no_inventory_items_found', 'Tiada barangan inventori ditemui.')}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const displayStock = getItemStockForLocation(item.id, selectedInventoryLocationId);
                    const stockBadge = getFoodBankStockBadge(displayStock, item.unit);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                                className="w-9 h-9 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35]">
                                <Package className="w-4 h-4" aria-hidden="true" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                          RM {Number(item.estimated_cost).toFixed(2)} /{item.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums',
                              stockBadge.badgeClass
                            )}
                          >
                            {stockBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {locations.slice(0, 3).map((loc) => (
                              <span
                                key={loc.id}
                                className="text-xs font-medium font-mono tabular-nums text-[#3B635C] dark:text-[#94A0B2] bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/60 dark:border-[#252B35] px-2 py-0.5 rounded"
                              >
                                {loc.name.split(' ')[0]}: {getItemStockForLocation(item.id, loc.id)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-xs font-semibold',
                              item.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            )}
                          >
                            {item.is_active ? 'Aktif' : 'Nyahaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditItemModal(item)}
                              aria-label="Edit Item"
                              className="p-1.5 rounded-lg bg-[#F6FBF9] dark:bg-[#1B2028] hover:bg-[#EBF7F4] dark:hover:bg-[#232933] text-[#3B635C] dark:text-[#94A0B2]"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item)}
                              aria-label={t('jpp:foodbank_item_deleted_title', 'Padam Item')}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300"
                              title={t('jpp:foodbank_item_deleted_title', 'Padam Item')}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};
