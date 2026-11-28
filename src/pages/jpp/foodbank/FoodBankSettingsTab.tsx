import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Lock,
  Sparkles,
  Save,
  Plus,
  MapPin,
  ExternalLink,
  Edit2,
  Users,
  UserPlus,
  Search,
  X,
  RefreshCw,
  ChevronRight,
  Check,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  FoodBankDistributionLocation,
  FoodBankOfficer,
  FoodBankSettings,
} from '@/types';
import {
  FB_CARD,
  FB_INSET,
  FB_INPUT,
  FB_PRIMARY_BTN,
  OFFICIAL_BASELINE_BUDGET,
  type SessionFormState,
} from './foodbankAdminUtils';

interface FoodBankSettingsTabProps {
  settings: FoodBankSettings | null;
  onToggleModuleStatus: () => void;
  sessionFormData: SessionFormState;
  onSessionFormDataChange: (next: SessionFormState) => void;
  isSavingSettings: boolean;
  onSaveSessionSettings: (e: React.FormEvent) => void;
  locations: FoodBankDistributionLocation[];
  onOpenAddLocationModal: () => void;
  onOpenEditLocationModal: (loc: FoodBankDistributionLocation) => void;
  officers: FoodBankOfficer[];
  officerSearchQuery: string;
  onOfficerSearchQueryChange: (q: string) => void;
  isSearchingCandidate: boolean;
  candidateProfiles: any[];
  selectedCandidate: any | null;
  onSelectCandidate: (candidate: any) => void;
  onClearCandidate: () => void;
  officerAssignLocationId: string;
  onOfficerAssignLocationIdChange: (id: string) => void;
  officerRoleTitle: string;
  onOfficerRoleTitleChange: (title: string) => void;
  isAssigningOfficer: boolean;
  onAssignOfficer: () => void;
  onToggleOfficerStatus: (officer: FoodBankOfficer) => void;
  onRemoveOfficer: (officer: FoodBankOfficer) => void;
}

export const FoodBankSettingsTab: React.FC<FoodBankSettingsTabProps> = ({
  settings,
  onToggleModuleStatus,
  sessionFormData,
  onSessionFormDataChange,
  isSavingSettings,
  onSaveSessionSettings,
  locations,
  onOpenAddLocationModal,
  onOpenEditLocationModal,
  officers,
  officerSearchQuery,
  onOfficerSearchQueryChange,
  isSearchingCandidate,
  candidateProfiles,
  selectedCandidate,
  onSelectCandidate,
  onClearCandidate,
  officerAssignLocationId,
  onOfficerAssignLocationIdChange,
  officerRoleTitle,
  onOfficerRoleTitleChange,
  isAssigningOfficer,
  onAssignOfficer,
  onToggleOfficerStatus,
  onRemoveOfficer,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  return (
    <motion.div
      key="tab-settings"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Master Module Launch Switch */}
      <section
        className={cn(
          'p-5 sm:p-6 rounded-2xl border shadow-surface-sm col-span-full bg-white dark:bg-[#13171D]',
          settings?.is_module_active
            ? 'border-[#0F766E]/40 dark:border-[#2DD4BF]/35'
            : 'border-amber-300 dark:border-amber-500/35'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                  settings?.is_module_active
                    ? 'bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E]'
                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                )}
              >
                {settings?.is_module_active
                  ? t('jpp:foodbank_module_active_caps', 'MODUL DIAKTIFKAN (RASMI)')
                  : t('jpp:foodbank_module_prep_caps', 'MODUL DALAM PERSEDIAAN (TUTUP)')}
              </span>
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium font-mono">
                /kebajikan/foodbank
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5">
              Suis Induk Pelancaran Modul Food Bank JPP
            </h3>
            <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] max-w-2xl mt-1 leading-relaxed">
              {t(
                'jpp:foodbank_module_prep_desc',
                'Kawal kebolehcapaian portal mahasiswa sebelum perasmian penuh. Apabila ditutup (default), mahasiswa boleh melihat info persediaan & katalog barangan, namun borang permohonan dikunci rapi dengan notis "Dalam Persediaan / Akan Datang".'
              )}
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onToggleModuleStatus}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-semibold transition-[transform,opacity,background-color] duration-200 active:scale-[0.98] flex items-center gap-2 shadow-surface-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                settings?.is_module_active
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : FB_PRIMARY_BTN
              )}
            >
              {settings?.is_module_active ? (
                <>
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  {t('jpp:foodbank_close_student_access_btn', 'Tutup Akses Siswa (Mod Persediaan)')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {t('jpp:foodbank_open_student_module_btn', 'Rasmikan & Buka Modul Siswa')}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Session Formula & Quota Config */}
      <section className={cn(FB_CARD, 'p-5 sm:p-6 space-y-5')}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
            {t('kebajikan:session_config_rules_title', 'Konfigurasi Sesi & Peraturan')}
          </span>
          <h2 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-0.5">
            {t('jpp:foodbank_quota_formula_title', 'Formula Kuota & Had Permohonan')}
          </h2>
        </div>

        <form onSubmit={onSaveSessionSettings} className="space-y-4 text-xs font-medium">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                {t('jpp:foodbank_quota_limit_monthly', 'Had Permohonan / Pelajar / Bulan')}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={sessionFormData.max_monthly_applications_per_student}
                onChange={(e) =>
                  onSessionFormDataChange({
                    ...sessionFormData,
                    max_monthly_applications_per_student: parseInt(e.target.value, 10) || 1,
                  })
                }
                className={FB_INPUT}
              />
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                {t('kebajikan:quota_default_monthly_desc', 'Default: 1 kali sebulan')}
              </p>
            </div>

            <div>
              <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
                {t('jpp:foodbank_quota_max_items', 'Had Maksimum Barangan Asas')}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={sessionFormData.max_items_per_application}
                onChange={(e) =>
                  onSessionFormDataChange({
                    ...sessionFormData,
                    max_items_per_application: parseInt(e.target.value, 10) || 5,
                  })
                }
                className={FB_INPUT}
              />
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                {t('kebajikan:quota_default_items_desc', 'Default: 5 barangan individu')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
              {t('kebajikan:budget_ceiling_allocation_lbl', 'Peruntukan Siling Belanjawan (RM)')}
            </label>
            <input
              type="number"
              min={100}
              step="any"
              value={sessionFormData.total_budget}
              onChange={(e) =>
                onSessionFormDataChange({
                  ...sessionFormData,
                  total_budget: parseFloat(e.target.value) || OFFICIAL_BASELINE_BUDGET,
                })
              }
              className={cn(FB_INPUT, 'font-mono tabular-nums')}
            />
          </div>

          <div>
            <label className={cn(FB_INSET, 'flex items-start gap-3 p-3.5 cursor-pointer')}>
              <input
                type="checkbox"
                checked={sessionFormData.allow_housemate}
                onChange={(e) =>
                  onSessionFormDataChange({
                    ...sessionFormData,
                    allow_housemate: e.target.checked,
                  })
                }
                className="w-4 h-4 mt-0.5 accent-[#0F766E] shrink-0"
              />
              <div>
                <span className="block text-sm font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  Benarkan Kuota Rakan Serumah
                </span>
                <span className="block text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5 leading-relaxed">
                  {t(
                    'jpp:foodbank_housemates_quota_desc',
                    'Jika aktif, pelajar boleh tambah rakan serumah untuk tingkatkan kuota barangan. Matikan untuk hadkan pelajar kepada kuota peribadi sahaja (one-off).'
                  )}
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
              {t('jpp:foodbank_instructions_guidelines_label', 'Teks Arahan & Panduan Permohonan')}
            </label>
            <textarea
              rows={3}
              value={sessionFormData.application_instructions}
              onChange={(e) =>
                onSessionFormDataChange({
                  ...sessionFormData,
                  application_instructions: e.target.value,
                })
              }
              className={FB_INPUT}
              placeholder={t('jpp:foodbank_instructions_placeholder', 'Masukkan arahan kepada mahasiswa...')}
            />
          </div>

          <div>
            <label className="block text-[#0B2420] dark:text-[#F1F5F9] font-semibold mb-1.5">
              {t('kebajikan:student_eligibility_criteria_lbl', 'Syarat Kelayakan Mahasiswa')}
            </label>
            <textarea
              rows={3}
              value={sessionFormData.eligibility_criteria}
              onChange={(e) =>
                onSessionFormDataChange({
                  ...sessionFormData,
                  eligibility_criteria: e.target.value,
                })
              }
              className={FB_INPUT}
              placeholder={t('jpp:foodbank_eligibility_placeholder', 'Syarat kelayakan bantuan...')}
            />
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className={cn(
              FB_PRIMARY_BTN,
              'w-full py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50'
            )}
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {isSavingSettings
              ? t('jpp:foodbank_saving_settings', 'Menyimpan…')
              : t('jpp:foodbank_save_settings_btn', 'Simpan Tetapan Sesi')}
          </button>
        </form>
      </section>

      {/* Distribution Locations Linked to PolyMaps 360 */}
      <section className={cn(FB_CARD, 'p-5 sm:p-6 space-y-4 flex flex-col justify-between')}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
                {t('jpp:foodbank_physical_location_polymaps', 'Lokasi Fizikal & PolyMaps 360°')}
              </span>
              <h2 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-0.5">
                {t('kebajikan:foodbank_dist_centers_heading', 'Pusat Pengagihan Food Bank')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenAddLocationModal}
              className={cn(
                FB_PRIMARY_BTN,
                'px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0'
              )}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('jpp:polymaps_add_location', 'Tambah Lokasi')}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={cn(
                  FB_INSET,
                  'p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-[#0B2420] dark:text-[#F1F5F9]">{loc.name}</h4>
                    {!loc.is_active && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300">
                        {t('jpp:foodbank_badge_closed', 'Ditutup')}
                      </span>
                    )}
                  </div>
                  <p className="text-[#3B635C] dark:text-[#94A0B2] text-xs mt-0.5">
                    {loc.room_detail} • {loc.operating_hours}
                  </p>
                  {loc.building && (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#0F766E] dark:text-[#2DD4BF] font-semibold">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {t('kebajikan:building_prefix', 'Bangunan:')} {loc.building.name} ({loc.building.code})
                      </span>
                      {loc.building.panorama_360_url && (
                        <Link
                          to="/jpp/polymaps"
                          className="text-xs font-semibold underline text-sky-700 dark:text-sky-400 hover:opacity-80 inline-flex items-center gap-1"
                        >
                          {t('kebajikan:view_polymaps_360', 'Papar PolyMaps 360°')}
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenEditLocationModal(loc)}
                    aria-label="Sunting Lokasi"
                    className="p-2 rounded-lg bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#EBF7F4] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-xs">
          <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
            Integrasi PolyMaps 360° Kampus
          </p>
          <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1 leading-relaxed">
            {t(
              'jpp:foodbank_polymaps_integration_desc',
              'Setiap pusat agihan dihubungkan secara terus ke sistem peta 360° POLISAS untuk membolehkan mahasiswa mencari arah kaunter fizikal tanpa sesat.'
            )}
          </p>
        </div>
      </section>

      {/* Counter Officers & RBAC Management */}
      <section className={cn(FB_CARD, 'col-span-full p-5 sm:p-6 space-y-6')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35]">
                  {t('jpp:foodbank_counter_access_rbac', 'Akses Kaunter & RBAC')}
                </span>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold font-mono tabular-nums">
                  {officers.length} {t('jpp:foodbank_officers_appointed_count', 'Pegawai Dilantik')} (
                  {officers.filter((o) => o.is_active).length} {t('jpp:foodbank_active_count', 'Aktif')})
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-1">
                {t('jpp:foodbank_officers_mgmt_title', 'Pengurusan & Pelantikan Pegawai Bertugas Kaunter')}
              </h2>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                {t(
                  'jpp:foodbank_officers_mgmt_desc',
                  'Lantik staf atau mahasiswa POLISAS bertugas bagi menguruskan imbasan pas QR dan stok edaran.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Appoint New Officer */}
          <div className={cn(FB_INSET, 'lg:col-span-5 space-y-4 p-5')}>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:foodbank_new_officer_form_title', 'Borang Lantikan Pegawai Baharu')}
              </h3>
            </div>

            {/* Candidate Search */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:foodbank_search_candidate_label', 'Cari Calon Pegawai (No. Matrik / Nama) *')}
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={officerSearchQuery}
                  onChange={(e) => {
                    onOfficerSearchQueryChange(e.target.value);
                    if (selectedCandidate) onClearCandidate();
                  }}
                  placeholder={t('jpp:foodbank_search_candidate_placeholder', "Cari '15DIT...' atau nama...")}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] placeholder-[#3B635C]/70 dark:placeholder-[#94A0B2]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                />
                {officerSearchQuery && (
                  <button
                    type="button"
                    onClick={onClearCandidate}
                    aria-label="Kosongkan carian"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {isSearchingCandidate && (
                <p className="text-xs text-[#0F766E] dark:text-[#2DD4BF] font-medium flex items-center gap-1.5 mt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  {t('jpp:foodbank_searching_profile', 'Mencari profil pelajar / staf POLISAS…')}
                </p>
              )}

              {/* Candidate Dropdown */}
              {!selectedCandidate && candidateProfiles.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto overscroll-contain bg-white dark:bg-[#13171D] rounded-xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-lg divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
                  {candidateProfiles.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => onSelectCandidate(candidate)}
                      className="w-full text-left p-2.5 hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors flex items-center gap-2.5 text-xs group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-bold flex items-center justify-center shrink-0 border border-[#B8E4DC] dark:border-[#252B35]">
                        {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] truncate">
                          {candidate.full_name}
                        </p>
                        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] truncate">
                          {candidate.matric_no ? `${candidate.matric_no} • ` : ''}
                          {candidate.department ||
                            candidate.email ||
                            t('jpp:foodbank_student_polisas_default', 'Pelajar POLISAS')}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Candidate Preview */}
              {selectedCandidate && (
                <div className="mt-2 p-3 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#0F766E]/30 dark:border-[#2DD4BF]/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] font-bold flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0B2420] dark:text-[#F1F5F9] truncate">
                        {selectedCandidate.full_name}
                      </p>
                      <p className="text-xs text-[#0F766E] dark:text-[#2DD4BF] font-medium truncate">
                        {selectedCandidate.matric_no || selectedCandidate.email}
                        {selectedCandidate.department ? ` • ${selectedCandidate.department}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearCandidate}
                    className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline shrink-0 ml-2"
                  >
                    {t('jpp:foodbank_btn_change', 'Tukar')}
                  </button>
                </div>
              )}
            </div>

            {/* Assigned Location */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:foodbank_assigned_distribution_center_req', 'Pusat Pengagihan Bertugas *')}
              </label>
              <select
                value={officerAssignLocationId}
                onChange={(e) => onOfficerAssignLocationIdChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-[#13171D]">
                  {t('jpp:foodbank_all_centers_floating_option', 'Semua Pusat Edaran (Floating / Merentas Lokasi)')}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} className="bg-white dark:bg-[#13171D]">
                    {loc.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                {t(
                  'jpp:foodbank_floating_officer_desc',
                  'Pegawai terapung (Floating) boleh menguruskan imbasan di mana-mana kaunter aktif.'
                )}
              </p>
            </div>

            {/* Role Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:foodbank_role_title_req', 'Gelaran Peranan / Jawatan *')}
              </label>
              <input
                type="text"
                value={officerRoleTitle}
                onChange={(e) => onOfficerRoleTitleChange(e.target.value)}
                placeholder={t(
                  'jpp:foodbank_officer_role_placeholder',
                  'cth: Petugas Kaunter Food Bank, Ketua Penyelaras'
                )}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
              />
            </div>

            <button
              type="button"
              onClick={onAssignOfficer}
              disabled={isAssigningOfficer || !selectedCandidate}
              className={cn(
                'w-full py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors',
                selectedCandidate && !isAssigningOfficer
                  ? FB_PRIMARY_BTN
                  : 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#3B635C]/60 dark:text-[#94A0B2]/60 cursor-not-allowed'
              )}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              {isAssigningOfficer
                ? t('kebajikan:officer_assign_processing', 'Memproses Lantikan…')
                : t('kebajikan:btn_appoint_officer_on_duty', 'Lantik Sebagai Pegawai Bertugas')}
            </button>
          </div>

          {/* Right List: Appointed Officers */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-2">
                {t('jpp:foodbank_officers_list_title', 'Senarai Pegawai Bertugas')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-semibold font-mono tabular-nums">
                  {officers.length}
                </span>
              </h3>
            </div>

            {officers.length === 0 ? (
              <div className={cn(FB_INSET, 'p-8 text-center border-dashed')}>
                <Users className="w-8 h-8 text-[#B8E4DC] dark:text-[#252B35] mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('jpp:foodbank_no_officers_appointed', 'Tiada pegawai bertugas dilantik setakat ini.')}
                </p>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                  {t(
                    'jpp:foodbank_use_search_form_desc',
                    'Gunakan borang carian di sebelah untuk melantik petugas kaunter Food Bank.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto overscroll-contain pr-1">
                {officers.map((officer) => {
                  const officerUser = officer.user || (officer as any).profile;
                  const assignedLoc = locations.find((l) => l.id === officer.location_id) || officer.location;

                  return (
                    <div
                      key={officer.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                        officer.is_active
                          ? 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC] dark:border-[#252B35]'
                          : 'bg-[#F6FBF9]/50 dark:bg-[#0E1116]/50 border-[#B8E4DC]/40 dark:border-[#252B35]/60 opacity-65'
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border relative',
                            officer.is_active
                              ? 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border-[#B8E4DC] dark:border-[#252B35]'
                              : 'bg-white dark:bg-[#13171D] text-[#3B635C] dark:text-[#94A0B2] border-transparent'
                          )}
                        >
                          {officerUser?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                          {officer.is_active && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0E1116] absolute -bottom-0.5 -right-0.5"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-[#0B2420] dark:text-[#F1F5F9] truncate">
                              {officerUser?.full_name || t('kebajikan:officer_on_duty_fallback', 'Pegawai Bertugas')}
                            </h4>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2] border border-[#B8E4DC]/60 dark:border-[#252B35]">
                              {officer.role_title}
                            </span>
                          </div>

                          <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                            {officerUser?.matric_no && (
                              <span className="font-mono font-semibold text-[#0B2420] dark:text-[#F1F5F9] mr-2">
                                {officerUser.matric_no}
                              </span>
                            )}
                            {officerUser?.email && <span>{officerUser.email}</span>}
                            {officerUser?.phone && <span className="ml-1.5 font-mono">• {officerUser.phone}</span>}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                            {assignedLoc ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {assignedLoc.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35]">
                                <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {t('jpp:foodbank_all_distribution_centers_floating', 'Semua Pusat Edaran (Floating)')}
                              </span>
                            )}

                            <span
                              className={cn(
                                'text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded',
                                officer.is_active
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              )}
                            >
                              {officer.is_active
                                ? t('kebajikan:status_active_short', 'Aktif')
                                : t('kebajikan:status_inactive_short', 'Nyahaktif')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleOfficerStatus(officer)}
                          title={
                            officer.is_active
                              ? t('kebajikan:action_deactivate_officer', 'Nyahaktifkan pegawai')
                              : t('kebajikan:action_activate_officer', 'Aktifkan semula pegawai')
                          }
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border flex items-center gap-1',
                            officer.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                              : 'bg-white dark:bg-[#13171D] border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF]'
                          )}
                        >
                          {officer.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {t('jpp:foodbank_badge_active', 'Aktif')}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              {t('jpp:foodbank_badge_inactive', 'Nyahaktif')}
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveOfficer(officer)}
                          aria-label={t('kebajikan:action_delete_officer_title', 'Hapus lantikan pegawai')}
                          title={t('kebajikan:action_delete_officer_title', 'Hapus lantikan pegawai')}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
