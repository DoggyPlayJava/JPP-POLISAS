import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowLeftRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  FoodBankApplication,
  FoodBankDistributionLocation,
  FoodBankItem,
  PolyMapsBuildingWith360,
} from '@/types';
import {
  FB_INSET,
  FB_INPUT,
  FB_PRIMARY_BTN,
  effectiveName,
  effectiveMatric,
  type BudgetFormState,
  type ItemFormState,
  type LocationFormState,
  type TransferFormState,
} from './foodbankAdminUtils';

const MODAL_OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60';
const MODAL_CARD =
  'w-full bg-white dark:bg-[#13171D] rounded-2xl p-5 sm:p-6 border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-lg max-h-[88dvh] overflow-y-auto overscroll-contain';

interface FoodBankModalsProps {
  // Rejection modal
  rejectionModalApp: FoodBankApplication | null;
  rejectionReason: string;
  onRejectionReasonChange: (val: string) => void;
  onCloseRejectionModal: () => void;
  onConfirmReject: () => void;
  isProcessingAction: boolean;
  // Application detail modal
  selectedAppForDetail: FoodBankApplication | null;
  onCloseDetailModal: () => void;
  // Item modal
  itemModalOpen: boolean;
  editingItem: FoodBankItem | null;
  itemFormData: ItemFormState;
  onItemFormDataChange: (next: ItemFormState) => void;
  imageFile: File | null;
  onImageFileChange: (f: File | null) => void;
  isSavingItem: boolean;
  isUploadingImage: boolean;
  onCloseItemModal: () => void;
  onSaveItem: (e: React.FormEvent) => void;
  // Transfer modal
  transferModalOpen: boolean;
  transferFormData: TransferFormState;
  onTransferFormDataChange: React.Dispatch<React.SetStateAction<TransferFormState>>;
  items: FoodBankItem[];
  locations: FoodBankDistributionLocation[];
  getItemStockForLocation: (itemId: string, locationId: string) => number;
  isSubmittingTransfer: boolean;
  onCloseTransferModal: () => void;
  onExecuteStockTransfer: (e: React.FormEvent) => void;
  // Budget modal
  budgetModalOpen: boolean;
  budgetFormData: BudgetFormState;
  onBudgetFormDataChange: (next: BudgetFormState) => void;
  isSubmittingBudget: boolean;
  onCloseBudgetModal: () => void;
  onSaveBudgetAdjustment: (e: React.FormEvent) => void;
  // Location modal
  locationModalOpen: boolean;
  editingLocation: FoodBankDistributionLocation | null;
  locationFormData: LocationFormState;
  onLocationFormDataChange: (next: LocationFormState) => void;
  buildings: PolyMapsBuildingWith360[];
  isSavingLocation: boolean;
  onCloseLocationModal: () => void;
  onSaveLocation: (e: React.FormEvent) => void;
}

export const FoodBankModals: React.FC<FoodBankModalsProps> = ({
  rejectionModalApp,
  rejectionReason,
  onRejectionReasonChange,
  onCloseRejectionModal,
  onConfirmReject,
  isProcessingAction,
  selectedAppForDetail,
  onCloseDetailModal,
  itemModalOpen,
  editingItem,
  itemFormData,
  onItemFormDataChange,
  imageFile,
  onImageFileChange,
  isSavingItem,
  isUploadingImage,
  onCloseItemModal,
  onSaveItem,
  transferModalOpen,
  transferFormData,
  onTransferFormDataChange,
  items,
  locations,
  getItemStockForLocation,
  isSubmittingTransfer,
  onCloseTransferModal,
  onExecuteStockTransfer,
  budgetModalOpen,
  budgetFormData,
  onBudgetFormDataChange,
  isSubmittingBudget,
  onCloseBudgetModal,
  onSaveBudgetAdjustment,
  locationModalOpen,
  editingLocation,
  locationFormData,
  onLocationFormDataChange,
  buildings,
  isSavingLocation,
  onCloseLocationModal,
  onSaveLocation,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  const anyModalOpen = Boolean(
    rejectionModalApp ||
      selectedAppForDetail ||
      itemModalOpen ||
      transferModalOpen ||
      budgetModalOpen ||
      locationModalOpen
  );

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (rejectionModalApp) onCloseRejectionModal();
      else if (selectedAppForDetail) onCloseDetailModal();
      else if (itemModalOpen) onCloseItemModal();
      else if (transferModalOpen) onCloseTransferModal();
      else if (budgetModalOpen) onCloseBudgetModal();
      else if (locationModalOpen) onCloseLocationModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    anyModalOpen,
    rejectionModalApp,
    selectedAppForDetail,
    itemModalOpen,
    transferModalOpen,
    budgetModalOpen,
    locationModalOpen,
    onCloseRejectionModal,
    onCloseDetailModal,
    onCloseItemModal,
    onCloseTransferModal,
    onCloseBudgetModal,
    onCloseLocationModal,
  ]);

  return (
    <>
      {/* ── 1. Rejection Modal ── */}
      {rejectionModalApp && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseRejectionModal}
        >
          <div className={cn(MODAL_CARD, 'max-w-md')} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              {t('jpp:foodbank_reject_dialog_title', 'Tolak Permohonan Food Bank')}
            </h3>
            <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
              {t('jpp:foodbank_application', 'Permohonan')}{' '}
              <strong className="text-[#0B2420] dark:text-[#F1F5F9] font-mono">
                {rejectionModalApp.application_no}
              </strong>{' '}
              {t('jpp:foodbank_for_student', 'bagi pelajar')}{' '}
              <strong className="text-[#0B2420] dark:text-[#F1F5F9]">
                {rejectionModalApp.applicant?.full_name}
              </strong>
              .
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:foodbank_reject_reason_label', 'Sebab Penolakan Rasmi:')}
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                placeholder={t(
                  'jpp:foodbank_reject_reason_placeholder',
                  'Nyatakan sebab penolakan permohonan...'
                )}
                className={FB_INPUT}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCloseRejectionModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
              >
                {t('common:cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={onConfirmReject}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white uppercase tracking-wider disabled:opacity-50"
              >
                {isProcessingAction ? 'Memproses…' : t('common:confirm', 'Sahkan Penolakan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Application Details Modal ── */}
      {selectedAppForDetail && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseDetailModal}
        >
          <div
            className={cn(MODAL_CARD, 'max-w-2xl space-y-4')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#B8E4DC]/60 dark:border-[#252B35] pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
                  {t('jpp:foodbank_application_details_title', 'Butiran Permohonan')}
                </span>
                <h3 className="text-lg font-bold font-mono text-[#0B2420] dark:text-[#F1F5F9]">
                  {selectedAppForDetail.application_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseDetailModal}
                aria-label={t('common:close', 'Tutup')}
                className="p-1.5 rounded-lg text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className={cn(FB_INSET, 'p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs')}>
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('jpp:foodbank_full_name_label', 'Nama Penuh')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {effectiveName(selectedAppForDetail)}
                </p>
                {selectedAppForDetail.applicant_name_override && (
                  <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] line-through">
                    {selectedAppForDetail.applicant?.full_name}
                  </p>
                )}
              </div>
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('kebajikan:header_matric_no', 'No. Matrik')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] font-mono">
                  {effectiveMatric(selectedAppForDetail)}
                </p>
                {selectedAppForDetail.applicant_matric_override &&
                  selectedAppForDetail.applicant?.matric_no && (
                    <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] line-through font-mono">
                      {selectedAppForDetail.applicant.matric_no}
                    </p>
                  )}
              </div>
              {selectedAppForDetail.requires_counter_verification && (
                <div>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                    {t('jpp:foodbank_counter_verification_label', 'Pengesahan Kaunter')}
                  </span>
                  <p
                    className={cn(
                      'font-semibold text-xs flex items-center gap-1.5 mt-0.5',
                      selectedAppForDetail.counter_verified
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {selectedAppForDetail.counter_verified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('kebajikan:counter_verified_text', 'Disahkan (kad matrik disemak)')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('kebajikan:counter_verification_needed_text', 'Perlu sahkan kad matrik')}</span>
                      </>
                    )}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('kebajikan:header_phone_no', 'No. Telefon')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] font-mono">
                  {selectedAppForDetail.applicant?.phone || '-'}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('jpp:foodbank_financial_category_label', 'Kategori Kewangan')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {selectedAppForDetail.financial_category || 'B40'}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('jpp:foodbank_household_income_label', 'Pendapatan Isi Rumah')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {selectedAppForDetail.household_income
                    ? `RM ${selectedAppForDetail.household_income}`
                    : t('jpp:foodbank_no_info', 'Tiada maklumat')}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('jpp:foodbank_residence_type_label', 'Jenis Kediaman')}
                </span>
                <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {selectedAppForDetail.housing_type}
                </p>
              </div>
            </div>

            <div className="text-xs">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                {t('jpp:foodbank_reason_application_label', 'Sebab / Alasan Permohonan:')}
              </span>
              <p className={cn(FB_INSET, 'p-3 mt-1.5 text-[#0B2420] dark:text-[#F1F5F9] font-normal')}>
                {selectedAppForDetail.reason}
              </p>
            </div>

            {selectedAppForDetail.housemates && selectedAppForDetail.housemates.length > 0 && (
              <div className="text-xs">
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                  {t('kebajikan:housemates_count_title', 'Rakan Serumah Ditanggung ({{count}}):', {
                    count: selectedAppForDetail.housemates.length,
                  })}
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {selectedAppForDetail.housemates.map((hm, idx) => (
                    <div
                      key={idx}
                      className={cn(FB_INSET, 'p-2.5 flex items-center justify-between text-xs')}
                    >
                      <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">{hm.name}</span>
                      <span className="text-[#3B635C] dark:text-[#94A0B2] font-mono">{hm.ic_or_matric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] uppercase font-semibold">
                {t('kebajikan:items_applied_label_colon', 'Barangan Yang Dipohon:')}
              </span>
              <div className="mt-1.5 border border-[#B8E4DC] dark:border-[#252B35] rounded-xl overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left text-xs min-w-[320px]">
                    <thead className="bg-[#F6FBF9] dark:bg-[#0E1116] text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase">
                      <tr>
                        <th className="py-2 px-3">{t('kebajikan:col_item', 'Item')}</th>
                        <th className="py-2 px-3">{t('kebajikan:col_quantity', 'Kuantiti')}</th>
                        <th className="py-2 px-3 text-right">
                          {t('kebajikan:col_est_cost_myr', 'Kos Anggaran (RM)')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
                      {selectedAppForDetail.selected_items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-[#0B2420] dark:text-[#F1F5F9]">
                            {it.item_name}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-[#3B635C] dark:text-[#94A0B2]">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                            {(it.estimated_cost * it.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#EBF7F4] dark:bg-[#1B2028] font-bold text-[#0F766E] dark:text-[#2DD4BF]">
                        <td colSpan={2} className="py-2.5 px-3">
                          {t('jpp:foodbank_total_estimated_value', 'Jumlah Nilai Anggaran')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          RM {Number(selectedAppForDetail.total_estimated_value || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedAppForDetail.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-800 dark:text-rose-200">
                <span className="font-semibold">
                  {t('kebajikan:rejection_reason_label_colon', 'Sebab Penolakan:')}{' '}
                </span>
                {selectedAppForDetail.rejection_reason}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onCloseDetailModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F6FBF9] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] hover:bg-[#EBF7F4] dark:hover:bg-[#232933]"
              >
                {t('common:close', 'Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Add / Edit Inventory Item Modal ── */}
      {itemModalOpen && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseItemModal}
        >
          <div className={cn(MODAL_CARD, 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mb-4">
              {editingItem
                ? t('jpp:foodbank_edit_item_title', 'Sunting Item Food Bank')
                : t('jpp:foodbank_add_item_title', 'Tambah Item Inventori Baharu')}
            </h3>

            <form onSubmit={onSaveItem} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('kebajikan:item_name_label_required', 'Nama Barangan *')}
                </label>
                <input
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={(e) => onItemFormDataChange({ ...itemFormData, name: e.target.value })}
                  placeholder={t('kebajikan:item_name_placeholder', 'cth: Beras Super Spesial (5kg)')}
                  className={FB_INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('kebajikan:item_category_label', 'Kategori')}
                  </label>
                  <select
                    value={itemFormData.category}
                    onChange={(e) => onItemFormDataChange({ ...itemFormData, category: e.target.value })}
                    className={FB_INPUT}
                  >
                    <option value="MAKANAN" className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_cat_basic_food', 'Makanan Asas')}
                    </option>
                    <option value="MINUMAN" className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_cat_beverages', 'Minuman')}
                    </option>
                    <option value="KEBERSIHAN" className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_cat_hygiene', 'Kebersihan Diri')}
                    </option>
                    <option value="KEPERLUAN_ASAS" className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_cat_basic_needs', 'Keperluan Asas')}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('kebajikan:item_unit_label', 'Unit Sukatan')}
                  </label>
                  <input
                    type="text"
                    required
                    value={itemFormData.unit}
                    onChange={(e) => onItemFormDataChange({ ...itemFormData, unit: e.target.value })}
                    placeholder={t('kebajikan:item_unit_placeholder', 'cth: pek, tin, kampit')}
                    className={FB_INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('jpp:foodbank_current_stock_label', 'Stok Semasa')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemFormData.current_stock}
                    onChange={(e) =>
                      onItemFormDataChange({
                        ...itemFormData,
                        current_stock: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className={cn(FB_INPUT, 'font-mono tabular-nums')}
                  />
                </div>
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('kebajikan:est_cost_per_unit_myr_label', 'Anggaran Kos Seunit (RM)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={itemFormData.estimated_cost}
                    onChange={(e) =>
                      onItemFormDataChange({
                        ...itemFormData,
                        estimated_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={cn(FB_INPUT, 'font-mono tabular-nums')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('kebajikan:item_description_label', 'Penerangan Ringkas')}
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => onItemFormDataChange({ ...itemFormData, description: e.target.value })}
                  placeholder={t(
                    'jpp:foodbank_packaging_desc_placeholder',
                    'Keterangan kandungan atau pembungkusan...'
                  )}
                  className={FB_INPUT}
                />
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_product_image_label', 'Gambar Produk')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageFileChange(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#3B635C] dark:text-[#94A0B2] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EBF7F4] dark:file:bg-[#1B2028] file:text-[#0F766E] dark:file:text-[#2DD4BF]"
                />
                {itemFormData.image_url && !imageFile && (
                  <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1 truncate">
                    {t('kebajikan:current_image_label', 'Gambar semasa: {{url}}', {
                      url: itemFormData.image_url,
                    })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="item_active"
                  checked={itemFormData.is_active}
                  onChange={(e) => onItemFormDataChange({ ...itemFormData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#0F766E]"
                />
                <label
                  htmlFor="item_active"
                  className="text-xs text-[#0B2420] dark:text-[#F1F5F9] font-semibold"
                >
                  {t('jpp:foodbank_active_catalog_checkbox', 'Katalog Aktif (Mahasiswa boleh mohon item ini)')}
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
                <button
                  type="button"
                  onClick={onCloseItemModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
                >
                  {t('common:cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem || isUploadingImage}
                  className={cn(
                    FB_PRIMARY_BTN,
                    'px-5 py-2 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50'
                  )}
                >
                  {isSavingItem || isUploadingImage
                    ? t('common:saving', 'Menyimpan…')
                    : t('jpp:foodbank_save_item_btn', 'Simpan Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. Inter-Location Stock Transfer Modal ── */}
      {transferModalOpen && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseTransferModal}
        >
          <div className={cn(MODAL_CARD, 'max-w-lg space-y-4')} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                    {t('jpp:foodbank_stock_transfer_title', 'Pindahan Stok Antara Lokasi')}
                  </h3>
                  <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                    {t(
                      'kebajikan:transfer_stock_atomic_desc',
                      'Pindahkan baki barangan fizikal antara pusat pengagihan secara atomik'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseTransferModal}
                aria-label={t('common:close', 'Tutup')}
                className="p-1.5 rounded-lg text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={onExecuteStockTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9] mb-1.5">
                  {t('kebajikan:foodbank_items_required_label', 'Barangan Food Bank *')}
                </label>
                <select
                  value={transferFormData.item_id}
                  onChange={(e) => {
                    const newItemId = e.target.value;
                    onTransferFormDataChange((prev) => ({
                      ...prev,
                      item_id: newItemId,
                      quantity: 1,
                    }));
                  }}
                  required
                  className={FB_INPUT}
                >
                  <option value="" disabled className="bg-white dark:bg-[#13171D]">
                    {t('jpp:foodbank_select_item_option', 'Pilih Barangan...')}
                  </option>
                  {items
                    .filter((i) => i.is_active)
                    .map((it) => (
                      <option key={it.id} value={it.id} className="bg-white dark:bg-[#13171D]">
                        {it.name} ({it.unit}) — {t('jpp:foodbank_total_stock_label', 'Jumlah Stok:')}{' '}
                        {getItemStockForLocation(it.id, 'SEMUA')} {it.unit}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9] mb-1.5">
                    {t('jpp:foodbank_from_source_location', 'Dari Lokasi (Sumber) *')}
                  </label>
                  <select
                    value={transferFormData.from_location_id}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      onTransferFormDataChange((prev) => ({
                        ...prev,
                        from_location_id: newFrom,
                        quantity: 1,
                      }));
                    }}
                    required
                    className={FB_INPUT}
                  >
                    <option value="AGREGAT" className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_aggregate_unallocated_stock', 'Agregat (Stok Belum Agih) — Baki:')}{' '}
                      {transferFormData.item_id
                        ? getItemStockForLocation(transferFormData.item_id, 'AGREGAT')
                        : 0}
                    </option>
                    <option value="" disabled className="bg-white dark:bg-[#13171D]">
                      ─────────────
                    </option>
                    {locations.map((loc) => {
                      const stockHere = transferFormData.item_id
                        ? getItemStockForLocation(transferFormData.item_id, loc.id)
                        : 0;
                      const selectedItem = items.find((i) => i.id === transferFormData.item_id);
                      return (
                        <option key={loc.id} value={loc.id} className="bg-white dark:bg-[#13171D]">
                          {loc.name} ({t('kebajikan:balance_prefix', 'Baki:')} {stockHere}{' '}
                          {selectedItem?.unit || 'unit'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9] mb-1.5">
                    {t('jpp:foodbank_to_destination_location', 'Ke Lokasi (Destinasi) *')}
                  </label>
                  <select
                    value={transferFormData.to_location_id}
                    onChange={(e) =>
                      onTransferFormDataChange((prev) => ({
                        ...prev,
                        to_location_id: e.target.value,
                      }))
                    }
                    required
                    className={FB_INPUT}
                  >
                    <option value="" disabled className="bg-white dark:bg-[#13171D]">
                      {t('jpp:foodbank_select_destination_center_option', 'Pilih Pusat Destinasi...')}
                    </option>
                    {locations.map((loc) => {
                      const isSame = loc.id === transferFormData.from_location_id;
                      const stockHere = transferFormData.item_id
                        ? getItemStockForLocation(transferFormData.item_id, loc.id)
                        : 0;
                      const selectedItem = items.find((i) => i.id === transferFormData.item_id);
                      return (
                        <option
                          key={loc.id}
                          value={loc.id}
                          disabled={isSame}
                          className="bg-white dark:bg-[#13171D]"
                        >
                          {loc.name}{' '}
                          {isSame
                            ? t('jpp:foodbank_same_as_source', '(Sama dengan Sumber)')
                            : t(
                                'kebajikan:current_stock_bracket',
                                `(Semasa: ${stockHere} ${selectedItem?.unit || 'unit'})`,
                                { stock: stockHere, unit: selectedItem?.unit || 'unit' }
                              )}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {transferFormData.item_id &&
                transferFormData.from_location_id &&
                (() => {
                  const sourceStock = getItemStockForLocation(
                    transferFormData.item_id,
                    transferFormData.from_location_id
                  );
                  const selectedItem = items.find((i) => i.id === transferFormData.item_id);
                  const fromLoc = locations.find((l) => l.id === transferFormData.from_location_id);
                  const toLoc = locations.find((l) => l.id === transferFormData.to_location_id);

                  return (
                    <div className={cn(FB_INSET, 'p-3.5 text-xs space-y-1.5')}>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-[#3B635C] dark:text-[#94A0B2]">
                          {t('jpp:foodbank_current_balance_at', 'Baki Semasa di')}{' '}
                          {fromLoc?.name || t('jpp:foodbank_source_default', 'Sumber')}:
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded font-bold font-mono tabular-nums',
                            sourceStock > 10
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : sourceStock > 0
                              ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          )}
                        >
                          {sourceStock} {selectedItem?.unit || 'unit'}
                        </span>
                      </div>
                      {toLoc && (
                        <div className="flex items-center justify-between text-[#3B635C] dark:text-[#94A0B2]">
                          <span>
                            {t('kebajikan:destination_balance_label', 'Baki Destinasi ({{loc}}):', {
                              loc: toLoc.name,
                            })}
                          </span>
                          <span className="font-semibold font-mono tabular-nums">
                            {getItemStockForLocation(transferFormData.item_id, toLoc.id)}{' '}
                            {selectedItem?.unit || 'unit'}
                            {transferFormData.quantity > 0 && sourceStock >= transferFormData.quantity && (
                              <span className="text-[#0F766E] dark:text-[#2DD4BF] ml-1.5 font-bold">
                                →{' '}
                                {getItemStockForLocation(transferFormData.item_id, toLoc.id) +
                                  Number(transferFormData.quantity)}{' '}
                                {selectedItem?.unit}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9]">
                    Kuantiti Pindahan *
                  </label>
                  {transferFormData.item_id && transferFormData.from_location_id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onTransferFormDataChange((p) => ({ ...p, quantity: 1 }))}
                        className="px-2 py-0.5 rounded text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]"
                      >
                        Min (1)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const srcStock = getItemStockForLocation(
                            transferFormData.item_id,
                            transferFormData.from_location_id
                          );
                          onTransferFormDataChange((p) => ({
                            ...p,
                            quantity: Math.max(1, Math.floor(srcStock / 2)),
                          }));
                        }}
                        className="px-2 py-0.5 rounded text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const srcStock = getItemStockForLocation(
                            transferFormData.item_id,
                            transferFormData.from_location_id
                          );
                          onTransferFormDataChange((p) => ({
                            ...p,
                            quantity: Math.max(1, srcStock),
                          }));
                        }}
                        className="px-2 py-0.5 rounded text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]"
                      >
                        {t('jpp:foodbank_all_max', 'Semua (Max)')}
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={
                    transferFormData.item_id && transferFormData.from_location_id
                      ? Math.max(
                          1,
                          getItemStockForLocation(
                            transferFormData.item_id,
                            transferFormData.from_location_id
                          )
                        )
                      : undefined
                  }
                  value={transferFormData.quantity}
                  onChange={(e) =>
                    onTransferFormDataChange((p) => ({
                      ...p,
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                  required
                  className={cn(FB_INPUT, 'font-mono tabular-nums font-bold')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9] mb-1.5">
                  {t('jpp:foodbank_transfer_notes_audit', 'Catatan Pindahan (Untuk Rekod Audit)')}
                </label>
                <textarea
                  rows={2}
                  value={transferFormData.notes}
                  onChange={(e) => onTransferFormDataChange((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t(
                    'jpp:foodbank_transfer_notes_placeholder',
                    'Cth: Penambahan stok Hab Kamsis Al-Biruni sempena minggu peperiksaan akhir...'
                  )}
                  className={cn(FB_INPUT, 'resize-none')}
                />
              </div>

              {transferFormData.from_location_id &&
                transferFormData.to_location_id &&
                transferFormData.from_location_id === transferFormData.to_location_id && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('jpp:foodbank_transfer_same_location', 'Lokasi sumber dan destinasi tidak boleh sama.')}
                    </span>
                  </div>
                )}

              {transferFormData.item_id &&
                transferFormData.from_location_id &&
                (() => {
                  const sourceStock = getItemStockForLocation(
                    transferFormData.item_id,
                    transferFormData.from_location_id
                  );
                  if (sourceStock <= 0) {
                    return (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {t(
                            'jpp:foodbank_transfer_source_zero',
                            'Baki stok di lokasi sumber adalah 0. Pindahan tidak dapat dijalankan.'
                          )}
                        </span>
                      </div>
                    );
                  }
                  if (transferFormData.quantity > sourceStock) {
                    return (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {t(
                            'jpp:foodbank_transfer_insufficient_stock_msg',
                            'Baki stok tidak mencukupi di lokasi sumber (Baki tersedia: {{balance}}).',
                            { balance: sourceStock }
                          )}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
                <button
                  type="button"
                  onClick={onCloseTransferModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
                >
                  {t('common:cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingTransfer ||
                    !transferFormData.item_id ||
                    !transferFormData.from_location_id ||
                    !transferFormData.to_location_id ||
                    transferFormData.from_location_id === transferFormData.to_location_id ||
                    transferFormData.quantity < 1 ||
                    transferFormData.quantity >
                      getItemStockForLocation(
                        transferFormData.item_id,
                        transferFormData.from_location_id
                      ) ||
                    getItemStockForLocation(
                      transferFormData.item_id,
                      transferFormData.from_location_id
                    ) <= 0
                  }
                  className={cn(
                    FB_PRIMARY_BTN,
                    'px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                  )}
                >
                  {isSubmittingTransfer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Memindahkan…
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                      Laksanakan Pindahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Budget Adjustment Modal ── */}
      {budgetModalOpen && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseBudgetModal}
        >
          <div className={cn(MODAL_CARD, 'max-w-md')} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mb-4">
              {t('jpp:foodbank_budget_adjustment_title', 'Pelarasan / Suntikan Bajet Food Bank')}
            </h3>

            <form onSubmit={onSaveBudgetAdjustment} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  Jenis Pelarasan
                </label>
                <select
                  value={budgetFormData.transaction_type}
                  onChange={(e) =>
                    onBudgetFormDataChange({
                      ...budgetFormData,
                      transaction_type: e.target.value as 'BUDGET_ADDITION' | 'ADJUSTMENT',
                    })
                  }
                  className={FB_INPUT}
                >
                  <option value="BUDGET_ADDITION" className="bg-white dark:bg-[#13171D]">
                    {t('jpp:foodbank_budget_injection', 'Suntikan Dana / Penambahan Bajet (+)')}
                  </option>
                  <option value="ADJUSTMENT" className="bg-white dark:bg-[#13171D]">
                    {t('jpp:foodbank_budget_adjustment', 'Pelarasan Kira-Kira Audit')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_amount_rm_req', 'Amaun (RM) *')}
                </label>
                <input
                  type="number"
                  min={1}
                  step={10}
                  required
                  value={budgetFormData.amount}
                  onChange={(e) =>
                    onBudgetFormDataChange({
                      ...budgetFormData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={cn(FB_INPUT, 'font-mono tabular-nums')}
                />
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_desc_reason_req', 'Perihal / Sebab *')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={budgetFormData.description}
                  onChange={(e) =>
                    onBudgetFormDataChange({
                      ...budgetFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t(
                    'jpp:foodbank_budget_reason_placeholder',
                    'cth: Sumbangan Alumni POLISAS, Geran Kebajikan Sesi...'
                  )}
                  className={FB_INPUT}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseBudgetModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
                >
                  {t('common:cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBudget}
                  className={cn(
                    FB_PRIMARY_BTN,
                    'px-5 py-2 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50'
                  )}
                >
                  {isSubmittingBudget
                    ? t('common:saving', 'Menyimpan…')
                    : t('jpp:foodbank_save_transaction_btn', 'Simpan Transaksi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Add / Edit Distribution Location Modal ── */}
      {locationModalOpen && (
        <div
          className={MODAL_OVERLAY}
          role="dialog"
          aria-modal="true"
          onClick={onCloseLocationModal}
        >
          <div className={cn(MODAL_CARD, 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mb-4">
              {editingLocation
                ? `${t('common:edit', 'Sunting')} ${t('jpp:foodbank_pickup_location', 'Lokasi Pengagihan')}`
                : `${t('common:add_new', 'Tambah Baharu')} ${t('jpp:foodbank_pickup_location', 'Lokasi Pengagihan')}`}
            </h3>

            <form onSubmit={onSaveLocation} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_location_name_req_label', 'Nama Lokasi *')}
                </label>
                <input
                  type="text"
                  required
                  value={locationFormData.name}
                  onChange={(e) => onLocationFormDataChange({ ...locationFormData, name: e.target.value })}
                  placeholder={t(
                    'jpp:foodbank_location_name_placeholder',
                    'cth: Pusat Edaran Utama JPP (Blok Pentadbiran)'
                  )}
                  className={FB_INPUT}
                />
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_polymaps_link_label', 'Pautan Bangunan PolyMaps (Peta Kampus)')}
                </label>
                <select
                  value={locationFormData.polymaps_building_id}
                  onChange={(e) =>
                    onLocationFormDataChange({
                      ...locationFormData,
                      polymaps_building_id: e.target.value,
                    })
                  }
                  className={FB_INPUT}
                >
                  <option value="" className="bg-white dark:bg-[#13171D]">
                    {t('jpp:foodbank_select_polymaps_building_option', '-- Pilih Bangunan PolyMaps --')}
                  </option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-[#13171D]">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_room_detail_label', 'Perincian Bilik / Aras')}
                </label>
                <input
                  type="text"
                  value={locationFormData.room_detail}
                  onChange={(e) =>
                    onLocationFormDataChange({ ...locationFormData, room_detail: e.target.value })
                  }
                  placeholder={t('jpp:foodbank_room_detail_placeholder', 'cth: Bilik Gerakan JPP, Tingkat 1')}
                  className={FB_INPUT}
                />
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  Waktu Operasi
                </label>
                <input
                  type="text"
                  value={locationFormData.operating_hours}
                  onChange={(e) =>
                    onLocationFormDataChange({ ...locationFormData, operating_hours: e.target.value })
                  }
                  placeholder="cth: Isnin - Khamis: 10:00 AM - 4:00 PM"
                  className={FB_INPUT}
                />
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_pickup_time_slot_label', 'Slot Masa Pengambilan')}{' '}
                  <span className="text-[#3B635C] dark:text-[#94A0B2] font-normal">
                    {t('jpp:foodbank_separate_with_comma', '(pisahkan dengan koma)')}
                  </span>
                </label>
                <input
                  type="text"
                  value={locationFormData.time_slots}
                  onChange={(e) =>
                    onLocationFormDataChange({ ...locationFormData, time_slots: e.target.value })
                  }
                  placeholder="cth: 10:00 AM - 11:30 AM, 11:30 AM - 01:00 PM"
                  className={FB_INPUT}
                />
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                  {t(
                    'jpp:foodbank_slot_display_hint',
                    'Slot ini akan dipaparkan kepada pelajar apabila mereka memilih pusat ini.'
                  )}
                </p>
              </div>

              <div>
                <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                  {t('jpp:foodbank_operating_days_label', 'Hari Beroperasi (Tarikh Pengambilan)')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'].map((day) => {
                    const checked = locationFormData.operating_days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = checked
                            ? locationFormData.operating_days.filter((d) => d !== day)
                            : [...locationFormData.operating_days, day];
                          onLocationFormDataChange({ ...locationFormData, operating_days: next });
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                          checked
                            ? 'bg-[#EBF7F4] dark:bg-[#1B2028] border-[#0F766E] dark:border-[#2DD4BF] text-[#0F766E] dark:text-[#2DD4BF]'
                            : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                  {t(
                    'jpp:foodbank_operating_days_hint',
                    'Kosongkan = guna lalai (Isnin - Jumaat). Tarikh pengambilan pelajar akan dijana ikut hari ini.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('kebajikan:responsible_officer_label', 'Pegawai Bertanggungjawab')}
                  </label>
                  <input
                    type="text"
                    value={locationFormData.contact_person}
                    onChange={(e) =>
                      onLocationFormDataChange({ ...locationFormData, contact_person: e.target.value })
                    }
                    className={FB_INPUT}
                  />
                </div>
                <div>
                  <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                    {t('kebajikan:officer_phone_label', 'No. Telefon Pegawai')}
                  </label>
                  <input
                    type="text"
                    value={locationFormData.contact_phone}
                    onChange={(e) =>
                      onLocationFormDataChange({ ...locationFormData, contact_phone: e.target.value })
                    }
                    placeholder="cth: 012-3456789"
                    className={FB_INPUT}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc_active"
                  checked={locationFormData.is_active}
                  onChange={(e) =>
                    onLocationFormDataChange({ ...locationFormData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#0F766E]"
                />
                <label
                  htmlFor="loc_active"
                  className="text-xs text-[#0B2420] dark:text-[#F1F5F9] font-semibold"
                >
                  {t('jpp:foodbank_location_active_label', 'Lokasi Aktif & Buka untuk Temujanji')}
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
                <button
                  type="button"
                  onClick={onCloseLocationModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
                >
                  {t('common:cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingLocation}
                  className={cn(
                    FB_PRIMARY_BTN,
                    'px-5 py-2 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50'
                  )}
                >
                  {isSavingLocation
                    ? t('common:saving', 'Menyimpan…')
                    : t('jpp:foodbank_save_location_btn', 'Simpan Lokasi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
