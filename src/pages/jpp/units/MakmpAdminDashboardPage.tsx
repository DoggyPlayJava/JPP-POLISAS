import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  KeyRound,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Shield,
  Layers,
  Calendar,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  AlertTriangle,
  FileText,
  Settings,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveJuryReview,
  calculateSuggestedMerit,
  PERINGKAT_OPTIONS,
  PENCAPAIAN_TYPE_OPTIONS,
  getJabatanLabel,
} from '@/lib/makmp';
import type {
  MakmpEdition,
  MakmpCategory,
  MakmpAwardDefinition,
  MakmpJuryPin,
  MakmpSubmission,
  MakmpSubmissionStatus,
  MakmpPeringkat,
  MakmpPencapaianType,
} from '@/types';

export const PRESET_CATEGORY_GROUPS = [
  'ANUGERAH UTAMA',
  'ANUGERAH AKADEMIK',
  'ANUGERAH SUKAN',
  'ANUGERAH KEUSAHAWANAN',
  'ANUGERAH KELAB DAN PERSATUAN',
  'ANUGERAH JPP',
  'ANUGERAH PROGRAM',
  'ANUGERAH KOLEJ KEDIAMAN',
  'ANUGERAH KHAS',
];

export default function MakmpAdminDashboardPage() {
  const { user, profile } = useAuth();
  const isJppOrAdmin = profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'JPP';

  // Active Tab: 'submissions' | 'categories' | 'pins' | 'editions'
  const [tab, setTab] = useState<'submissions' | 'categories' | 'pins' | 'editions'>('submissions');

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [editions, setEditions] = useState<MakmpEdition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [categories, setCategories] = useState<MakmpCategory[]>([]);
  const [awards, setAwards] = useState<MakmpAwardDefinition[]>([]);
  const [pins, setPins] = useState<MakmpJuryPin[]>([]);
  const [submissions, setSubmissions] = useState<MakmpSubmission[]>([]);

  // Submissions filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Actions
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // Award Definition CRUD Modal
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<MakmpAwardDefinition | null>(null);
  const [awardName, setAwardName] = useState('');
  const [awardCategoryGroup, setAwardCategoryGroup] = useState('ANUGERAH UTAMA');
  const [customCategoryGroup, setCustomCategoryGroup] = useState('');
  const [awardTargetType, setAwardTargetType] = useState<'INDIVIDUAL' | 'ENTITY'>('INDIVIDUAL');
  const [awardDocRequirementType, setAwardDocRequirementType] = useState<'CERTIFICATES' | 'REPORT_AND_EVIDENCE'>('CERTIFICATES');
  const [awardMaxCertificates, setAwardMaxCertificates] = useState(5);
  const [awardMaxMerit, setAwardMaxMerit] = useState(50);
  const [awardDocInstructions, setAwardDocInstructions] = useState('');
  const [awardTemplateName, setAwardTemplateName] = useState('');
  const [awardTemplateUrl, setAwardTemplateUrl] = useState('');
  const [awardSortOrder, setAwardSortOrder] = useState(1);
  const [awardIsActive, setAwardIsActive] = useState(true);

  // Category Modal (Create & Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MakmpCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catScope, setCatScope] = useState('UMUM');
  const [catMaxCert, setCatMaxCert] = useState(5);
  const [catMaxMerit, setCatMaxMerit] = useState(50);
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);

  // Jury PIN Modal (Create & Edit) with Multi-Select Categories
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<MakmpJuryPin | null>(null);
  const [juryName, setJuryName] = useState('');
  const [juryOrg, setJuryOrg] = useState('');
  const [selectedJuryCategories, setSelectedJuryCategories] = useState<string[]>(['ALL']);
  const [juryCategorySearch, setJuryCategorySearch] = useState('');

  // Detail / Review Modal
  const [activeSub, setActiveSub] = useState<MakmpSubmission | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch editions
      const { data: edData } = await supabase
        .from('makmp_editions')
        .select('*')
        .order('year', { ascending: false });

      const edList = edData || [];
      setEditions(edList);

      const activeEd = edList.find((e) => e.is_active) || edList[0];
      if (activeEd) {
        setSelectedEditionId(activeEd.id);
        await loadEditionDetails(activeEd.id);
      }
    } catch (err) {
      console.error('Failed to load MAKMP admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEditionDetails = async (edId: string) => {
    const [catRes, pinRes, subRes, awRes] = await Promise.all([
      supabase
        .from('makmp_categories')
        .select('*')
        .eq('edition_id', edId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('makmp_jury_pins')
        .select('*')
        .eq('edition_id', edId)
        .order('created_at', { ascending: false }),
      supabase
        .from('makmp_submissions')
        .select(`
          *,
          category:makmp_categories(*),
          items:makmp_submission_items(*),
          awards:makmp_submission_awards(
            *,
            award:makmp_award_definitions(*),
            items:makmp_submission_items(*)
          )
        `)
        .eq('edition_id', edId)
        .order('created_at', { ascending: false }),
      supabase
        .from('makmp_award_definitions')
        .select('*')
        .eq('edition_id', edId)
        .order('sort_order', { ascending: true }),
    ]);

    setCategories(catRes.data || []);
    setPins(pinRes.data || []);
    setSubmissions((subRes.data as MakmpSubmission[]) || []);
    setAwards((awRes.data as MakmpAwardDefinition[]) || []);
  };

  const handleEditionChange = async (edId: string) => {
    setSelectedEditionId(edId);
    setLoading(true);
    await loadEditionDetails(edId);
    setLoading(false);
  };

  // ============================================================================
  // PIN JURI HANDLERS (Multi-Category Assignment)
  // ============================================================================
  // Kumpulan anugerah berhierarki mengikut category_group
  const groupedAwards = useMemo(() => {
    const map = new Map<string, MakmpAwardDefinition[]>();

    // Initialise dengan urutan preset group
    for (const group of PRESET_CATEGORY_GROUPS) {
      map.set(group, []);
    }

    for (const a of awards) {
      const g = a.category_group || 'LAIN-LAIN';
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(a);
    }

    return Array.from(map.entries())
      .filter(([_, groupAwards]) => groupAwards.length > 0)
      .map(([groupName, groupAwards]) => ({
        groupName,
        awards: groupAwards.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }));
  }, [awards]);

  // Carian anugerah dalam modal PIN juri
  const filteredGroupedAwards = useMemo(() => {
    if (!juryCategorySearch.trim()) return groupedAwards;
    const q = juryCategorySearch.toLowerCase().trim();

    return groupedAwards
      .map(({ groupName, awards: groupAwards }) => {
        const groupMatches = groupName.toLowerCase().includes(q);
        const matchingAwards = groupAwards.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q) ||
            a.target_type.toLowerCase().includes(q)
        );

        if (groupMatches) {
          return { groupName, awards: groupAwards };
        } else if (matchingAwards.length > 0) {
          return { groupName, awards: matchingAwards };
        }
        return null;
      })
      .filter(Boolean) as Array<{ groupName: string; awards: MakmpAwardDefinition[] }>;
  }, [groupedAwards, juryCategorySearch]);

  // Semak status pilihan anugerah khusus
  const isAwardSelected = (award: MakmpAwardDefinition) => {
    if (selectedJuryCategories.includes('ALL')) return true;
    if (selectedJuryCategories.includes(award.name)) return true;
    if (selectedJuryCategories.includes(award.category_group)) return true;
    return false;
  };

  // Semak jika seluruh kumpulan kategori telah dipilih
  const isGroupFullySelected = (catGroup: string, groupAwards: MakmpAwardDefinition[]) => {
    if (selectedJuryCategories.includes('ALL')) return true;
    if (selectedJuryCategories.includes(catGroup)) return true;
    if (
      groupAwards.length > 0 &&
      groupAwards.every((a) => selectedJuryCategories.includes(a.name))
    ) {
      return true;
    }
    return false;
  };

  // Toggle satu anugerah secara khusus
  const handleToggleAward = (award: MakmpAwardDefinition) => {
    setSelectedJuryCategories((prev) => {
      // Jika sebelum ini 'ALL', kembangkan menjadi semua anugerah KECUALI yang ini
      if (prev.includes('ALL')) {
        const allAwardNames = awards.map((a) => a.name);
        return allAwardNames.filter((name) => name !== award.name);
      }

      const groupAwards = awards.filter((a) => a.category_group === award.category_group);
      const isGroupTagged = prev.includes(award.category_group);

      if (isGroupTagged) {
        // Nyahbungkus tag kumpulan kepada anugerah-anugerah lain kecuali anugerah ini
        const withoutGroup = prev.filter((c) => c !== award.category_group);
        const otherSiblings = groupAwards
          .filter((a) => a.name !== award.name)
          .map((a) => a.name);
        return Array.from(new Set([...withoutGroup, ...otherSiblings]));
      }

      if (prev.includes(award.name)) {
        return prev.filter((c) => c !== award.name);
      } else {
        const next = [...prev, award.name];
        // Jika kini SEMUA anugerah dalam kumpulan ini telah dipilih, padatkan dengan tag kumpulan
        const allSiblingNames = groupAwards.map((a) => a.name);
        if (groupAwards.length > 0 && allSiblingNames.every((n) => next.includes(n))) {
          const withoutSiblings = next.filter((c) => !allSiblingNames.includes(c));
          return [...withoutSiblings, award.category_group];
        }
        return next;
      }
    });
  };

  // Toggle semua anugerah dalam sesuatu kumpulan
  const handleToggleGroup = (catGroup: string) => {
    setSelectedJuryCategories((prev) => {
      const groupAwards = awards.filter((a) => a.category_group === catGroup);
      const groupAwardNames = groupAwards.map((a) => a.name);

      if (prev.includes('ALL')) {
        // Tukar 'ALL' kepada semua anugerah selain kumpulan ini
        const otherAwards = awards
          .filter((a) => a.category_group !== catGroup)
          .map((a) => a.name);
        return otherAwards;
      }

      const isGroupSelected =
        prev.includes(catGroup) ||
        (groupAwards.length > 0 && groupAwardNames.every((n) => prev.includes(n)));

      if (isGroupSelected) {
        // Buang tag kumpulan dan semua nama anugerah dalam kumpulan ini
        return prev.filter((c) => c !== catGroup && !groupAwardNames.includes(c));
      } else {
        // Bersihkan nama anugerah individu dalam kumpulan ini, dan letakkan tag kumpulan
        const cleanPrev = prev.filter(
          (c) => c !== catGroup && !groupAwardNames.includes(c)
        );
        return [...cleanPrev, catGroup];
      }
    });
  };

  // Toggle item kategori klasik (jika berkenaan)
  const handleToggleClassicCategory = (catName: string) => {
    setSelectedJuryCategories((prev) => {
      const withoutAll = prev.filter((c) => c !== 'ALL');
      if (withoutAll.includes(catName)) {
        return withoutAll.filter((c) => c !== catName);
      } else {
        return [...withoutAll, catName];
      }
    });
  };

  const handleOpenCreatePin = () => {
    setEditingPin(null);
    setJuryName('');
    setJuryOrg('Jawatankuasa MAKMP POLISAS');
    setSelectedJuryCategories(['ALL']);
    setJuryCategorySearch('');
    setIsPinModalOpen(true);
  };

  const handleOpenEditPin = (pin: MakmpJuryPin) => {
    setEditingPin(pin);
    setJuryName(pin.jury_name);
    setJuryOrg(pin.organization || 'Jawatankuasa MAKMP POLISAS');
    setSelectedJuryCategories(
      Array.isArray(pin.assigned_categories) && pin.assigned_categories.length > 0
        ? pin.assigned_categories
        : ['ALL']
    );
    setJuryCategorySearch('');
    setIsPinModalOpen(true);
  };

  const handleToggleAllJuryCategories = () => {
    if (selectedJuryCategories.includes('ALL')) {
      setSelectedJuryCategories([]);
    } else {
      setSelectedJuryCategories(['ALL']);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juryName.trim() || !selectedEditionId) return;

    if (!user) {
      alert(
        'Akses Ditolak (RLS): Anda belum log masuk ke portal.\n\nPangkalan data memerlukan sesi log masuk Pentadbir JPP yang sah untuk menjana atau mengemas kini kod PIN juri.\n\nSila log masuk di /login terlebih dahulu.'
      );
      return;
    }

    if (!isJppOrAdmin) {
      alert(
        `Akses Ditolak (RLS): Akaun anda (${profile?.email || user.email}) mempunyai peranan "${profile?.role || 'Pelajar'}".\n\nUntuk menjana atau mengemas kini PIN juri, akaun anda mestilah mempunyai peranan 'JPP' atau 'SUPER_ADMIN_JPP' dalam pangkalan data.`
      );
      return;
    }

    const assigned = selectedJuryCategories.length === 0 ? ['ALL'] : selectedJuryCategories;

    if (editingPin) {
      const { data, error } = await supabase
        .from('makmp_jury_pins')
        .update({
          jury_name: juryName.trim(),
          organization: juryOrg.trim() || 'Jawatankuasa MAKMP POLISAS',
          assigned_categories: assigned,
        })
        .eq('id', editingPin.id)
        .select()
        .single();

      if (error) {
        alert('Gagal mengemas kini PIN: ' + error.message);
        return;
      }

      setPins((prev) => prev.map((p) => (p.id === editingPin.id ? data : p)));
      setIsPinModalOpen(false);
      setEditingPin(null);
    } else {
      const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { data, error } = await supabase
        .from('makmp_jury_pins')
        .insert([
          {
            edition_id: selectedEditionId,
            pin_code: pinCode,
            jury_name: juryName.trim(),
            organization: juryOrg.trim() || 'Jawatankuasa MAKMP POLISAS',
            assigned_categories: assigned,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        alert('Gagal menjana PIN: ' + error.message);
        return;
      }

      setPins((prev) => [data, ...prev]);
      setIsPinModalOpen(false);
    }
  };

  const handleDeletePin = async (pin: MakmpJuryPin) => {
    const confirmDelete = window.confirm(
      `Adakah anda pasti mahu memadam PIN juri "${pin.jury_name}" (${pin.pin_code})?`
    );
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('makmp_jury_pins')
      .delete()
      .eq('id', pin.id);

    if (error) {
      alert('Gagal memadam PIN: ' + error.message);
      return;
    }

    setPins((prev) => prev.filter((p) => p.id !== pin.id));
  };

  // Toggle Status Aktif PIN Juri
  const handleTogglePin = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('makmp_jury_pins')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setPins((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
      );
    }
  };

  // Salin pautan terus juri
  const handleCopyJuryLink = (pinCode: string) => {
    const url = `${window.location.origin}/makmp/juri?pin=${pinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedPin(pinCode);
    setTimeout(() => setCopiedPin(null), 2500);
  };

  // ============================================================================
  // KATEGORI ASAS HANDLERS (makmp_categories CRUD)
  // ============================================================================
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatScope('UMUM');
    setCatMaxCert(5);
    setCatMaxMerit(50);
    setCatDesc('');
    setCatIsActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: MakmpCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatScope(cat.department_scope || 'UMUM');
    setCatMaxCert(cat.max_certificates ?? 5);
    setCatMaxMerit(cat.max_merit ?? 50);
    setCatDesc(cat.description || '');
    setCatIsActive(cat.is_active ?? true);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !selectedEditionId) return;

    const payload = {
      edition_id: selectedEditionId,
      name: catName.trim(),
      department_scope: catScope,
      max_certificates: Number(catMaxCert),
      max_merit: Number(catMaxMerit),
      description: catDesc.trim() || null,
      is_active: catIsActive,
      sort_order: editingCategory ? editingCategory.sort_order : categories.length + 1,
    };

    if (editingCategory) {
      const { data, error } = await supabase
        .from('makmp_categories')
        .update(payload)
        .eq('id', editingCategory.id)
        .select()
        .single();

      if (error) {
        alert('Gagal mengemas kini kategori: ' + error.message);
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? data : c)));
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } else {
      const { data, error } = await supabase
        .from('makmp_categories')
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert('Gagal menambah kategori: ' + error.message);
        return;
      }
      setCategories((prev) => [...prev, data]);
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = async (cat: MakmpCategory) => {
    const confirmDelete = window.confirm(
      `Adakah anda pasti mahu memadam kategori asas "${cat.name}"?\n\nTindakan ini tidak boleh diundur.`
    );
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('makmp_categories')
      .delete()
      .eq('id', cat.id);

    if (error) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        alert(
          `Tidak dapat memadam "${cat.name}" kerana terdapat rekod permohonan yang merujuk kepada kategori ini.`
        );
      } else {
        alert('Gagal memadam kategori: ' + error.message);
      }
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  };

  const handleToggleCategoryActive = async (cat: MakmpCategory) => {
    const newStatus = !cat.is_active;
    const { error } = await supabase
      .from('makmp_categories')
      .update({ is_active: newStatus })
      .eq('id', cat.id);

    if (error) {
      alert('Gagal menukar status: ' + error.message);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, is_active: newStatus } : c)));
  };

  // ============================================================================
  // ANUGERAH RASMI HANDLERS (makmp_award_definitions CRUD)
  // ============================================================================
  const handleOpenCreateAward = () => {
    setEditingAward(null);
    setAwardName('');
    setAwardCategoryGroup('ANUGERAH UTAMA');
    setCustomCategoryGroup('');
    setAwardTargetType('INDIVIDUAL');
    setAwardDocRequirementType('CERTIFICATES');
    setAwardMaxCertificates(5);
    setAwardMaxMerit(50);
    setAwardDocInstructions('');
    setAwardTemplateName('');
    setAwardTemplateUrl('');
    setAwardSortOrder(awards.length + 1);
    setAwardIsActive(true);
    setIsAwardModalOpen(true);
  };

  const handleOpenEditAward = (aw: MakmpAwardDefinition) => {
    setEditingAward(aw);
    setAwardName(aw.name);
    if (PRESET_CATEGORY_GROUPS.includes(aw.category_group)) {
      setAwardCategoryGroup(aw.category_group);
      setCustomCategoryGroup('');
    } else {
      setAwardCategoryGroup('CUSTOM');
      setCustomCategoryGroup(aw.category_group);
    }
    setAwardTargetType(aw.target_type || 'INDIVIDUAL');
    setAwardDocRequirementType(aw.doc_requirement_type || 'CERTIFICATES');
    setAwardMaxCertificates(aw.max_certificates ?? 5);
    setAwardMaxMerit(aw.max_merit ?? 50);
    setAwardDocInstructions(aw.doc_instructions || '');
    setAwardTemplateName(aw.template_name || '');
    setAwardTemplateUrl(aw.template_url || '');
    setAwardSortOrder(aw.sort_order ?? 1);
    setAwardIsActive(aw.is_active ?? true);
    setIsAwardModalOpen(true);
  };

  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardName.trim() || !selectedEditionId) return;

    const group = awardCategoryGroup === 'CUSTOM' ? customCategoryGroup.trim() : awardCategoryGroup;
    if (!group) {
      alert('Sila tentukan Kumpulan Kategori Anugerah.');
      return;
    }

    const payload = {
      edition_id: selectedEditionId,
      name: awardName.trim(),
      category_group: group,
      target_type: awardTargetType,
      doc_requirement_type: awardDocRequirementType,
      max_certificates: Number(awardMaxCertificates),
      max_merit: Number(awardMaxMerit),
      doc_instructions: awardDocInstructions.trim() || null,
      template_name: awardDocRequirementType === 'REPORT_AND_EVIDENCE' ? (awardTemplateName.trim() || null) : null,
      template_url: awardDocRequirementType === 'REPORT_AND_EVIDENCE' ? (awardTemplateUrl.trim() || null) : null,
      sort_order: Number(awardSortOrder),
      is_active: awardIsActive,
    };

    if (editingAward) {
      const { data, error } = await supabase
        .from('makmp_award_definitions')
        .update(payload)
        .eq('id', editingAward.id)
        .select()
        .single();

      if (error) {
        alert('Gagal mengemas kini anugerah: ' + error.message);
        return;
      }
      setAwards((prev) => prev.map((a) => (a.id === editingAward.id ? data : a)));
      setIsAwardModalOpen(false);
      setEditingAward(null);
    } else {
      const { data, error } = await supabase
        .from('makmp_award_definitions')
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert('Gagal menambah anugerah: ' + error.message);
        return;
      }
      setAwards((prev) => [...prev, data]);
      setIsAwardModalOpen(false);
    }
  };

  const handleDeleteAward = async (aw: MakmpAwardDefinition) => {
    const confirmDelete = window.confirm(
      `Adakah anda pasti mahu memadam anugerah "${aw.name}"?\n\nTindakan ini tidak boleh diundur.`
    );
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('makmp_award_definitions')
      .delete()
      .eq('id', aw.id);

    if (error) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        alert(
          `Tidak dapat memadam "${aw.name}" kerana anugerah ini sudah mempunyai rekod permohonan pelajar.\n\nSila gunakan fungsi Nyahaktif untuk menutup permohonan anugerah ini.`
        );
      } else {
        alert('Gagal memadam anugerah: ' + error.message);
      }
      return;
    }

    setAwards((prev) => prev.filter((a) => a.id !== aw.id));
  };

  const handleToggleAwardActive = async (aw: MakmpAwardDefinition) => {
    const newStatus = !aw.is_active;
    const { error } = await supabase
      .from('makmp_award_definitions')
      .update({ is_active: newStatus })
      .eq('id', aw.id);

    if (error) {
      alert('Gagal mengubah status anugerah: ' + error.message);
      return;
    }
    setAwards((prev) => prev.map((a) => (a.id === aw.id ? { ...a, is_active: newStatus } : a)));
  };

  // Export CSV Lengkap dengan Pecahan Berbilang Anugerah
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('Tiada data untuk dieksport.');
      return;
    }

    const headers = [
      'Kod Rujukan',
      'Nama Penuh',
      'No Matrik',
      'Telefon',
      'Emel',
      'Jabatan',
      'Program',
      'Semester',
      'Anugerah Dipohon',
      'Entiti / Kelab / Peranan',
      'Status Keseluruhan',
      'Jumlah Merit Diluluskan',
      'Pecahan Keputusan Anugerah',
      'Bil Dokumen',
      'Tarikh Hantar',
    ];

    const rows = submissions.map((s) => {
      const awardNames =
        s.awards && s.awards.length > 0
          ? s.awards.map((a) => a.award?.name || 'Anugerah').join('; ')
          : s.category?.name || '';

      const entityInfo =
        s.awards && s.awards.length > 0
          ? s.awards
              .filter((a) => a.entity_name)
              .map((a) => `${a.entity_name} (${a.applicant_role || 'Calon'})`)
              .join('; ')
          : '';

      const decisionBreakdown =
        s.awards && s.awards.length > 0
          ? s.awards.map((a) => `${a.award?.name}: ${a.status} (${a.total_merit_granted}m)`).join('; ')
          : `${s.status} (${s.total_merit_awarded}m)`;

      const docCount = s.items?.length || 0;

      return [
        `"${s.tracking_code}"`,
        `"${s.full_name}"`,
        `"${s.matric_no}"`,
        `"${s.phone}"`,
        `"${s.email || ''}"`,
        `"${getJabatanLabel(s.department)}"`,
        `"${s.programme_code || ''}"`,
        `"${s.semester || ''}"`,
        `"${awardNames}"`,
        `"${entityInfo}"`,
        `"${s.status}"`,
        `"${s.total_merit_awarded}"`,
        `"${decisionBreakdown}"`,
        `"${docCount}"`,
        `"${new Date(s.created_at).toLocaleDateString('ms-MY')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MAKMP_Submissions_${selectedEditionId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations
  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'MENUNGGU' || s.status === 'DALAM_SEMAKAN').length;
  const approvedCount = submissions.filter((s) => s.status === 'DISAHKAN').length;
  const rejectedCount = submissions.filter((s) => s.status === 'DITOLAK').length;
  const totalMeritGiven = submissions.reduce((acc, s) => acc + Number(s.total_merit_awarded || 0), 0);

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && s.category_id !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.matric_no.toLowerCase().includes(q) ||
        s.tracking_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Edisi Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pusat Kawalan MAKMP POLISAS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Pengurusan Anugerah
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi edisi tahunan, kuota kategori anugerah, kod PIN juri & semakan pencalonan pelajar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Edition Dropdown */}
          <select
            value={selectedEditionId}
            onChange={(e) => handleEditionChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 transition"
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.title} ({ed.year}) {ed.is_active ? '• Aktif' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => selectedEditionId && loadEditionDetails(selectedEditionId)}
            title="Muat Semula Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Not Logged In / Non-Admin Warning Banner */}
      {!user ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Mod Pratonton (Belum Log Masuk):</span> Anda sedang melihat data MAKMP sebagai tetamu. Tindakan menjana PIN juri atau mengurus anugerah memerlukan log masuk sebagai JPP / Pentadbir.
            </div>
          </div>
          <Link
            to="/login?redirect=/jpp/unit/akademik?tab=makmp"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 text-center transition shadow-md shadow-amber-500/20"
          >
            Log Masuk Pentadbir
          </Link>
        </div>
      ) : !isJppOrAdmin ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold">Akses Terhad (Bukan JPP):</span> Anda log masuk sebagai <strong className="text-white">{profile?.full_name || user.email}</strong> (Peranan: <code className="text-amber-300 font-mono">{profile?.role || 'Pelajar'}</code>). Tindakan menjana PIN dan mengurus anugerah dihadkan kepada akaun JPP / SUPER_ADMIN_JPP.
          </div>
        </div>
      ) : null}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Jumlah Pencalonan</div>
          <div className="text-2xl font-extrabold text-white">{totalSubmissions}</div>
          <div className="text-[10px] text-slate-500">{submissions.length} permohonan masuk</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
          <div className="text-[11px] text-amber-400 font-semibold uppercase">Menunggu Semakan</div>
          <div className="text-2xl font-extrabold text-amber-300">{pendingCount}</div>
          <div className="text-[10px] text-amber-500/80">Perlu tindakan pegawai/juri</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
          <div className="text-[11px] text-emerald-400 font-semibold uppercase">Diluluskan</div>
          <div className="text-2xl font-extrabold text-emerald-300">{approvedCount}</div>
          <div className="text-[10px] text-emerald-500/80">{rejectedCount} ditolak</div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
          <div className="text-[11px] text-indigo-400 font-semibold uppercase">Merit Dianugerah</div>
          <div className="text-2xl font-extrabold text-indigo-300">+{totalMeritGiven}</div>
          <div className="text-[10px] text-indigo-400/80">Diselaraskan ke e-akademik</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            tab === 'submissions'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Senarai Permohonan ({submissions.length})</span>
        </button>

        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            tab === 'categories'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Kategori Anugerah ({categories.length})</span>
        </button>

        <button
          onClick={() => setTab('pins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            tab === 'pins'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Kod PIN Juri ({pins.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SENARAI PERMOHONAN                                            */}
      {/* ==================================================================== */}
      {tab === 'submissions' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="MENUNGGU">Menunggu</option>
                <option value="DALAM_SEMAKAN">Dalam Semakan</option>
                <option value="DISAHKAN">Disahkan</option>
                <option value="DITOLAK">Ditolak</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white max-w-[200px]"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, matrik, kod..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Eksport CSV</span>
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Kod Rujukan</th>
                    <th className="py-3 px-4">Nama Pelajar</th>
                    <th className="py-3 px-4">No. Matrik</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Kategori Anugerah</th>
                    <th className="py-3 px-4">Sijil</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Merit</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Tiada rekod penyerahan ditemui.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {sub.tracking_code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white max-w-[180px] truncate">
                          {sub.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono">{sub.matric_no}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200">
                            {getJabatanLabel(sub.department)}
                          </span>
                          {sub.programme_code && (
                            <span className="block text-[10px] text-slate-400">
                              {sub.programme_code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          {sub.awards && sub.awards.length > 0 ? (
                            <div className="space-y-1">
                              {sub.awards.map((aw) => (
                                <div key={aw.id} className="flex flex-col">
                                  <span className="font-semibold text-white truncate" title={aw.award?.name}>
                                    {aw.award?.name}
                                  </span>
                                  {aw.entity_name && (
                                    <span className="text-[10px] text-purple-300 truncate">
                                      {aw.entity_name} ({aw.applicant_role || 'Calon'})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">{sub.category?.name || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {sub.items?.length || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'DISAHKAN'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sub.status === 'DITOLAK'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-400">
                          {sub.status === 'DISAHKAN' ? `+${sub.total_merit_awarded}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveSub(sub)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Perincian</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: KATEGORI & SENARAI ANUGERAH RASMI                            */}
      {/* ==================================================================== */}
      {tab === 'categories' && (
        <div className="space-y-6">
          {/* Section 1: Anugerah Rasmi MAKMP (Lampiran IV) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Senarai Anugerah Rasmi MAKMP ({awards.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pengurusan anugerah yang boleh dipohon oleh pelajar, syarat dokumen, merit maksimum dan templat laporan.
                </p>
              </div>

              <button
                onClick={handleOpenCreateAward}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0 self-start sm:self-auto shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Anugerah Baharu</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awards.map((aw) => (
                <div
                  key={aw.id}
                  className={`p-4 rounded-2xl bg-slate-900 border transition flex flex-col justify-between shadow-md ${
                    aw.is_active ? 'border-slate-800' : 'border-rose-900/40 opacity-70'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {aw.category_group}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            aw.target_type === 'ENTITY'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {aw.target_type === 'ENTITY' ? 'ENTITI / KELAB' : 'INDIVIDU'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleAwardActive(aw)}
                          title="Klik untuk ubah status aktif/nyahaktif"
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition ${
                            aw.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {aw.is_active ? 'Aktif' : 'Nyahaktif'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">#{aw.sort_order}</span>
                        <h4 className="font-bold text-sm text-white">{aw.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {aw.doc_instructions || 'Tiada arahan khusus.'}
                      </p>
                    </div>

                    {/* Badge Dokumen & Template Box */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Keperluan:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                            aw.doc_requirement_type === 'REPORT_AND_EVIDENCE'
                              ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}
                        >
                          {aw.doc_requirement_type === 'REPORT_AND_EVIDENCE'
                            ? 'Laporan Rasmi & Bukti'
                            : 'Sijil Pencapaian'}
                        </span>
                      </div>

                      {aw.doc_requirement_type === 'REPORT_AND_EVIDENCE' && (
                        <div className="pt-1 border-t border-slate-800/60 space-y-1">
                          <div className="text-[11px] text-sky-400 font-medium truncate">
                            Templat: {aw.template_name || 'Belum Ditetapkan'}
                          </div>
                          {aw.template_url ? (
                            <a
                              href={aw.template_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{aw.template_url}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic block">
                              Tiada pautan templat
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Maks. {aw.max_certificates} Dokumen</span>
                      <span className="font-bold text-amber-400">Had: {aw.max_merit} Merit</span>
                    </div>

                    {/* Award Card Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAward(aw)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Kemaskini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAward(aw)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1 transition border border-rose-500/20"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Padam</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Kategori Pangkalan Data Asas */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Kategori Pangkalan Data Asas ({categories.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kategori asas arkib dan klasifikasi lama sistem MAKMP.
                </p>
              </div>

              <button
                onClick={handleOpenCreateCategory}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Tambah Kategori Asas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-4 rounded-xl bg-slate-900 border space-y-2 text-xs flex flex-col justify-between ${
                    cat.is_active ? 'border-slate-800' : 'border-rose-900/40 opacity-70'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm">{cat.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {cat.department_scope || 'UMUM'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition ${
                            cat.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {cat.is_active ? 'Aktif' : 'Nyahaktif'}
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-400">{cat.description || 'Tiada penerangan.'}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Maks. Sijil: <strong className="text-white">{cat.max_certificates}</strong></span>
                      <span>Maks. Merit: <strong className="text-amber-400">{cat.max_merit}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/80 mt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(cat)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3 text-amber-400" />
                      <span>Kemaskini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1 transition border border-rose-500/20"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Padam</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================ */}
          {/* MODAL CRUD ANUGERAH RASMI                                         */}
          {/* ================================================================ */}
          {isAwardModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{editingAward ? 'Kemaskini Anugerah Rasmi' : 'Tambah Anugerah Baharu'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAwardModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveAward} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nama Rasmi Anugerah *</label>
                    <input
                      type="text"
                      required
                      value={awardName}
                      onChange={(e) => setAwardName(e.target.value)}
                      placeholder="cth: Anugerah Khas Pengarah"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Kumpulan Kategori *</label>
                      <select
                        value={awardCategoryGroup}
                        onChange={(e) => setAwardCategoryGroup(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      >
                        {PRESET_CATEGORY_GROUPS.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                        <option value="CUSTOM">+ Kategori Tersuai / Lain-lain...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Sasaran Pemohon *</label>
                      <select
                        value={awardTargetType}
                        onChange={(e) => setAwardTargetType(e.target.value as 'INDIVIDUAL' | 'ENTITY')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="INDIVIDUAL">INDIVIDU (Pelajar Sendiri)</option>
                        <option value="ENTITY">ENTITI / KELAB (Organisasi)</option>
                      </select>
                    </div>
                  </div>

                  {awardCategoryGroup === 'CUSTOM' && (
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nama Kategori Tersuai *</label>
                      <input
                        type="text"
                        required
                        value={customCategoryGroup}
                        onChange={(e) => setCustomCategoryGroup(e.target.value)}
                        placeholder="cth: ANUGERAH INOVASI DIGITAL"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Keperluan Dokumen *</label>
                      <select
                        value={awardDocRequirementType}
                        onChange={(e) => setAwardDocRequirementType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      >
                        <option value="CERTIFICATES">Sijil Pencapaian</option>
                        <option value="REPORT_AND_EVIDENCE">Laporan & Bukti</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Maks. Dokumen / Sijil</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={awardMaxCertificates}
                        onChange={(e) => setAwardMaxCertificates(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Had Maks. Merit</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={awardMaxMerit}
                        onChange={(e) => setAwardMaxMerit(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Arahan Dokumen / Syarat Khas</label>
                    <textarea
                      rows={2}
                      value={awardDocInstructions}
                      onChange={(e) => setAwardDocInstructions(e.target.value)}
                      placeholder="cth: Sertakan salinan sijil pencapaian peringkat antarabangsa atau kebangsaan..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  {awardDocRequirementType === 'REPORT_AND_EVIDENCE' && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/30 space-y-3">
                      <div className="text-[11px] font-bold text-sky-400">Konfigurasi Templat Laporan Rasmi</div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Tajuk Templat Laporan</label>
                        <input
                          type="text"
                          value={awardTemplateName}
                          onChange={(e) => setAwardTemplateName(e.target.value)}
                          placeholder="cth: Templat Laporan Inkubator Keusahawanan"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Pautan Muat Turun (Google Docs / Drive)</label>
                        <input
                          type="url"
                          value={awardTemplateUrl}
                          onChange={(e) => setAwardTemplateUrl(e.target.value)}
                          placeholder="https://docs.google.com/..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Urutan Susunan (Sort Order)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={awardSortOrder}
                        onChange={(e) => setAwardSortOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <label className="relative flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={awardIsActive}
                          onChange={(e) => setAwardIsActive(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500"
                        />
                        <span className="text-white font-semibold text-xs">Aktifkan untuk Permohonan</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAwardModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-md shadow-amber-500/20"
                    >
                      {editingAward ? 'Simpan Kemaskini' : 'Tambah Anugerah'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* MODAL CRUD KATEGORI ASAS                                          */}
          {/* ================================================================ */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">
                    {editingCategory ? 'Kemaskini Kategori Asas' : 'Tambah Kategori Asas'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nama Kategori *</label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="cth: Anugerah Tokoh Siswa"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Maks. Sijil</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={catMaxCert}
                        onChange={(e) => setCatMaxCert(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Maks. Merit</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={catMaxMerit}
                        onChange={(e) => setCatMaxMerit(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Skop Jabatan</label>
                    <select
                      value={catScope}
                      onChange={(e) => setCatScope(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="UMUM">UMUM (Semua Jabatan)</option>
                      <option value="AKADEMIK">AKADEMIK</option>
                      <option value="HEP">HEP</option>
                      <option value="KEUSAHAWANAN">KEUSAHAWANAN</option>
                      <option value="SUKAN">SUKAN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Penerangan / Syarat</label>
                    <textarea
                      rows={2}
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Syarat kelayakan kategori ini..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="relative flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={catIsActive}
                        onChange={(e) => setCatIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500"
                      />
                      <span className="text-white font-semibold text-xs">Aktif</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold"
                    >
                      {editingCategory ? 'Kemaskini Kategori' : 'Simpan Kategori'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: KOD PIN JURI (MULTI-CATEGORY ASSIGNMENT)                      */}
      {/* ==================================================================== */}
      {tab === 'pins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Kod PIN Akses Juri & Pegawai Penilai ({pins.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Juri boleh mengakses portal semakan pantas tanpa akaun login. Setiap juri boleh ditugaskan satu atau banyak kategori serentak.
              </p>
            </div>

            <button
              onClick={handleOpenCreatePin}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto shadow-md shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Jana PIN Juri Baharu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pins.map((pin) => {
              const isAll =
                !pin.assigned_categories ||
                pin.assigned_categories.length === 0 ||
                pin.assigned_categories.includes('ALL');

              return (
                <div
                  key={pin.id}
                  className={`p-5 rounded-2xl bg-slate-900 border space-y-4 shadow-md flex flex-col justify-between transition ${
                    pin.is_active ? 'border-slate-800' : 'border-rose-900/40 opacity-70'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-white">{pin.jury_name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">{pin.organization}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(pin.id, pin.is_active)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                          pin.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {pin.is_active ? 'Aktif' : 'Dinyahaktif'}
                      </button>
                    </div>

                    {/* Assigned Categories / Awards Badges */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                        <span>Tugasan Semakan:</span>
                        <span className="text-slate-400 font-mono">
                          {isAll
                            ? 'Akses Penuh'
                            : `${pin.assigned_categories.length} Ditugaskan`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {isAll ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ⭐ Semua Kategori & Anugerah (Akses Penuh)
                          </span>
                        ) : (
                          pin.assigned_categories.map((cat, i) => {
                            const isGroup =
                              PRESET_CATEGORY_GROUPS.includes(cat) ||
                              awards.some((a) => a.category_group === cat);
                            return (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border max-w-[220px] truncate ${
                                  isGroup
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 font-semibold'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                }`}
                                title={cat}
                              >
                                {isGroup ? `📁 ${cat}` : `🏆 ${cat}`}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* PIN Code Display Box */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Kod PIN</div>
                        <div className="font-mono text-xl font-extrabold text-amber-400 tracking-wider">
                          {pin.pin_code}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyJuryLink(pin.pin_code)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5"
                      >
                        {copiedPin === pin.pin_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* PIN Card Actions Footer */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPin(pin)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3 text-amber-400" />
                      <span>Kemaskini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePin(pin)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1 transition border border-rose-500/20"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Padam</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================================================================ */}
          {/* MODAL JANA / KEMASKINI PIN JURI (MULTI-CATEGORY)                   */}
          {/* ================================================================ */}
          {isPinModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>{editingPin ? 'Kemaskini Tugasan Juri & PIN' : 'Jana Kod PIN Juri MAKMP'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSavePin} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nama Pegawai / Juri *</label>
                    <input
                      type="text"
                      required
                      value={juryName}
                      onChange={(e) => setJuryName(e.target.value)}
                      placeholder="cth: Ts. Dr. Ahmad bin Zulkifli"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Organisasi / Jabatan / Unit</label>
                    <input
                      type="text"
                      value={juryOrg}
                      onChange={(e) => setJuryOrg(e.target.value)}
                      placeholder="cth: Jabatan Kejuruteraan Elektrik (JKE) / HEP"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Multi-Award / Multi-Category Assignment Component */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-300 font-semibold">
                        Tugasan Anugerah / Kategori Semakan *
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-amber-400 font-medium">
                          {selectedJuryCategories.includes('ALL')
                            ? 'Akses Penuh Semua Anugerah'
                            : `${selectedJuryCategories.length} Tugasan Dipilih`}
                        </span>
                        {!selectedJuryCategories.includes('ALL') && selectedJuryCategories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedJuryCategories([])}
                            className="text-[10px] text-slate-400 hover:text-rose-400 underline transition"
                          >
                            Kosongkan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Option 1: Full Access Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleAllJuryCategories}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                        selectedJuryCategories.includes('ALL')
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {selectedJuryCategories.includes('ALL') ? (
                          <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-white text-xs">
                            ⭐ SEMUA KATEGORI & ANUGERAH (Akses Penuh)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Pegawai ini boleh menyemak semua {awards.length || 18} anugerah rasmi tanpa had
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pilihan Utama
                      </span>
                    </button>

                    {/* Option 2: Hierarchical Award Checklist */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400 font-medium">
                          Atau peruntukkan anugerah / kategori spesifik bagi pegawai ini:
                        </div>
                      </div>

                      {/* Quick Search inside modal */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={juryCategorySearch}
                          onChange={(e) => setJuryCategorySearch(e.target.value)}
                          placeholder="Cari nama anugerah atau kumpulan... (cth: Keusahawanan, Siswa, Sukan)"
                          className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                        {juryCategorySearch && (
                          <button
                            type="button"
                            onClick={() => setJuryCategorySearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Grouped Awards Accordion / List */}
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {filteredGroupedAwards.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            Tiada anugerah sepadan dengan carian "{juryCategorySearch}".
                          </div>
                        ) : (
                          filteredGroupedAwards.map(({ groupName, awards: groupAwards }) => {
                            const isGroupSelected = isGroupFullySelected(groupName, groupAwards);
                            const isPartial = !isGroupSelected && groupAwards.some((a) => isAwardSelected(a));

                            return (
                              <div
                                key={groupName}
                                className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden"
                              >
                                {/* Group Header Bar */}
                                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleGroup(groupName)}
                                      className="flex items-center gap-2 text-left"
                                    >
                                      {isGroupSelected ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      ) : isPartial ? (
                                        <div className="w-3.5 h-3.5 rounded border border-amber-500/50 bg-amber-500/20 flex items-center justify-center shrink-0">
                                          <div className="w-2 h-0.5 bg-amber-400 rounded-full" />
                                        </div>
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                      )}
                                      <span className="font-bold text-xs text-slate-200 truncate">
                                        {groupName}
                                      </span>
                                    </button>
                                    <span className="text-[10px] text-slate-500 shrink-0">
                                      ({groupAwards.length} anugerah)
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleGroup(groupName)}
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition shrink-0 ${
                                      isGroupSelected
                                        ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                                    }`}
                                  >
                                    {isGroupSelected ? 'Nyahpilih Kumpulan' : 'Pilih Semua Kumpulan'}
                                  </button>
                                </div>

                                {/* List of Awards under this group */}
                                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-950/40">
                                  {groupAwards.map((aw) => {
                                    const isChecked = isAwardSelected(aw);
                                    return (
                                      <button
                                        type="button"
                                        key={aw.id}
                                        onClick={() => handleToggleAward(aw)}
                                        className={`p-2 rounded-lg border text-left flex items-start gap-2 transition ${
                                          isChecked
                                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                                            : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                        }`}
                                      >
                                        {isChecked ? (
                                          <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                        ) : (
                                          <Square className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[11px] font-medium leading-tight text-white truncate" title={aw.name}>
                                            {aw.name}
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500">
                                            <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                              {aw.target_type === 'ENTITY' ? 'ENTITI / KELAB' : 'INDIVIDU'}
                                            </span>
                                            <span>Maks {aw.max_merit || 50}m</span>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Fallback / Kategori Asas jika ada kategori yang belum dipetakan ke anugerah */}
                        {categories.length > 0 && groupedAwards.length === 0 && (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 space-y-2">
                            <div className="text-xs font-bold text-slate-300">
                              Kategori Asas (Klasik):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {categories.map((c) => {
                                const isChecked =
                                  selectedJuryCategories.includes('ALL') ||
                                  selectedJuryCategories.includes(c.name) ||
                                  selectedJuryCategories.includes(c.id);
                                return (
                                  <button
                                    type="button"
                                    key={c.id}
                                    onClick={() => handleToggleClassicCategory(c.name)}
                                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                                      isChecked
                                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                    )}
                                    <span className="text-[11px] font-medium truncate">{c.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isJppOrAdmin && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Peringatan: Anda belum log masuk sebagai Pentadbir JPP. Sila log masuk dengan akaun JPP di /login sebelum menjana PIN.
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsPinModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-md shadow-amber-500/20"
                    >
                      {editingPin ? 'Kemaskini Tugasan' : 'Jana PIN Automatik'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PERINCIAN SUBMISSION                                           */}
      {/* ==================================================================== */}
      {activeSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-amber-400 font-bold">
                  {activeSub.tracking_code}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activeSub.full_name}</h3>
              </div>
              <button
                onClick={() => setActiveSub(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">No. Matrik:</span>
                <div className="font-mono font-bold text-amber-400 mt-0.5">{activeSub.matric_no}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Jabatan & Sem:</span>
                <div className="font-bold text-white mt-0.5">
                  {getJabatanLabel(activeSub.department)} (Sem {activeSub.semester || 1})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Telefon:</span>
                <div className="font-bold text-white mt-0.5">{activeSub.phone}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Status Keseluruhan:</span>
                <div className="font-bold text-amber-400 mt-0.5">{activeSub.status} (+{activeSub.total_merit_awarded}m)</div>
              </div>
            </div>

            {/* Multi-Award Breakdown if available */}
            {activeSub.awards && activeSub.awards.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pecahan Anugerah Yang Dipohon ({activeSub.awards.length})
                </h4>
                <div className="space-y-3">
                  {activeSub.awards.map((awApp, idx) => {
                    const awItems = (awApp.items && awApp.items.length > 0)
                      ? awApp.items
                      : (activeSub.items || []).filter((it) => it.submission_award_id === awApp.id);

                    return (
                      <div
                        key={awApp.id || idx}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {awApp.award?.category_group}
                              </span>
                              <span className="font-bold text-sm text-white">{awApp.award?.name}</span>
                            </div>
                            {awApp.entity_name && (
                              <div className="text-xs text-purple-300 mt-1">
                                Entiti / Kelab: <strong>{awApp.entity_name}</strong> (Peranan: {awApp.applicant_role || 'Calon'})
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                awApp.status === 'DISAHKAN'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : awApp.status === 'DITOLAK'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                            >
                              {awApp.status}
                            </span>
                            {awApp.status === 'DISAHKAN' && (
                              <span className="text-xs font-bold text-emerald-400">
                                +{awApp.total_merit_granted} Merit
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Documents for this award */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-slate-400">
                            Dokumen / Laporan Disertakan ({awItems.length}):
                          </div>
                          {awItems.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Tiada dokumen dilampirkan.</p>
                          ) : (
                            awItems.map((doc, dIdx) => (
                              <div
                                key={doc.id || dIdx}
                                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    doc.document_type === 'LAPORAN'
                                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                      : doc.document_type === 'BUKTI_SOKONGAN'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {doc.document_type || 'SIJIL'}
                                  </span>
                                  <span className="text-white font-medium truncate">{doc.nama_pencapaian}</span>
                                </div>

                                <a
                                  href={doc.drive_view_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs flex items-center gap-1 shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Buka Dokumen</span>
                                </a>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">
                  Senarai Sijil Dikemukakan ({activeSub.items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {activeSub.items?.map((item, i) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {i + 1}. {item.nama_pencapaian}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.peringkat} • {item.pencapaian_type}
                        </div>
                      </div>

                      <a
                        href={item.drive_view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Sijil</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

