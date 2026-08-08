import { supabase } from '@/lib/supabase';

export interface ProvisionEmsBusinessParams {
  eventId: string;
  teamName?: string;
  leaderName: string;
  leaderUserId?: string;
  leaderEmail?: string;
  leaderMatrixNo?: string;
  members?: Array<{ name: string; matrix_no_or_ic: string; email?: string }>;
}

export interface ProvisionEmsBusinessResult {
  success: boolean;
  businessId?: string;
  registrationNo?: string;
  error?: string;
}

/**
 * Auto-provisions an active Siswapreneur business profile when participants
 * register for a Siswapreneur-linked EMS event.
 * Bypasses PUSKEP interview approval, generates an EMS-2026-XXXXX registration number,
 * and grants full OWNER role access to all team members during the event phase.
 */
export async function provisionEmsSiswapreneurBusiness(
  params: ProvisionEmsBusinessParams
): Promise<ProvisionEmsBusinessResult> {
  try {
    // 1. Determine business name
    const bizName = params.teamName?.trim() || `${params.leaderName.trim()} Siswapreneur Enterprise`;

    // 2. Generate unique registration number EMS-2026-XXXXX
    let regNo = `EMS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `EMS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: existing } = await supabase
        .from('keusahawanan_businesses')
        .select('id')
        .or(`registration_no.eq.${candidate},ssm_registration_number.eq.${candidate}`)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        regNo = candidate;
        break;
      }
    }

    // 3. Fetch first category ID from keusahawanan_categories or null
    const { data: categoryData } = await supabase
      .from('keusahawanan_categories')
      .select('id')
      .limit(1)
      .maybeSingle();

    const categoryId = categoryData?.id || null;

    // 4. Resolve leader user_id if not provided
    let resolvedLeaderUserId: string | null = params.leaderUserId || null;
    if (!resolvedLeaderUserId) {
      const leaderMatrix = params.leaderMatrixNo?.trim();
      const leaderEmail = params.leaderEmail?.trim().toLowerCase();

      if (leaderMatrix) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .or(`matric_no.eq.${leaderMatrix}`)
          .limit(1)
          .maybeSingle();

        if (profile?.id) {
          resolvedLeaderUserId = profile.id;
        }
      }

      if (!resolvedLeaderUserId && leaderEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', leaderEmail)
          .limit(1)
          .maybeSingle();

        if (profile?.id) {
          resolvedLeaderUserId = profile.id;
        }
      }
    }

    // 5. Insert business into keusahawanan_businesses
    const businessPayload: Record<string, any> = {
      name: bizName,
      registration_no: regNo,
      ssm_registration_number: regNo,
      registration_type: 'EMS',
      status: 'APPROVED',
      is_active: true,
      is_ems_siswapreneur: true,
      ems_event_id: params.eventId,
      puskep_upgrade_status: 'NONE',
    };

    if (categoryId) {
      businessPayload.category_id = categoryId;
    }
    if (resolvedLeaderUserId) {
      businessPayload.owner_id = resolvedLeaderUserId;
    }

    const { data: biz, error: bizError } = await supabase
      .from('keusahawanan_businesses')
      .insert([businessPayload])
      .select('id, registration_no, ssm_registration_number')
      .single();

    if (bizError || !biz) {
      console.error('Failed to provision Siswapreneur business:', bizError);
      return {
        success: false,
        error: bizError?.message || 'Gagal mendaftar perniagaan Siswapreneur.',
      };
    }

    // 6. Resolve team member user_ids and grant full OWNER access to all members
    const memberResolutions = (params.members || []).map(async (member) => {
      const matrixNo = member.matrix_no_or_ic?.trim();
      const email = member.email?.trim().toLowerCase();

      if (matrixNo) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .or(`matric_no.eq.${matrixNo}`)
          .limit(1)
          .maybeSingle();

        if (profile?.id) return profile.id;
      }

      if (email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        if (profile?.id) return profile.id;
      }

      return null;
    });

    const resolvedMemberUserIds = await Promise.all(memberResolutions);

    // 7. Add leader and team members into membership table (granting OWNER role)
    const userIdsToInsert = new Set<string>();
    if (resolvedLeaderUserId) {
      userIdsToInsert.add(resolvedLeaderUserId);
    }
    resolvedMemberUserIds.forEach((uid) => {
      if (uid) {
        userIdsToInsert.add(uid);
      }
    });

    if (userIdsToInsert.size > 0) {
      const membershipRows = Array.from(userIdsToInsert).map((uid) => ({
        business_id: biz.id,
        user_id: uid,
        role: 'OWNER' as const,
        status: 'ACTIVE' as const,
      }));

      const { error: memError } = await supabase
        .from('student_business_memberships')
        .insert(membershipRows);

      if (memError) {
        console.warn('Notice inserting student_business_memberships:', memError);
        try {
          await supabase.from('keusahawanan_business_members').insert(membershipRows);
        } catch {}
      }
    }

    const assignedRegNo = biz.registration_no || biz.ssm_registration_number || regNo;

    return {
      success: true,
      businessId: biz.id,
      registrationNo: assignedRegNo,
    };
  } catch (err: any) {
    console.error('Error provisioning Siswapreneur business:', err);
    return {
      success: false,
      error: err.message || 'Error provisioning Siswapreneur business.',
    };
  }
}

/**
 * Requests a PUSKEP Upgrade for an EMS Siswapreneur business.
 * Updates puskep_upgrade_status = 'PENDING' in keusahawanan_businesses
 * and sends a push notification to Keusahawanan Exco.
 */
export async function requestPuskepUpgrade(businessId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: biz, error: fetchErr } = await supabase
      .from('keusahawanan_businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    if (fetchErr || !biz) {
      return { success: false, error: fetchErr?.message || 'Perniagaan tidak dijumpai.' };
    }

    const { error: updateErr } = await supabase
      .from('keusahawanan_businesses')
      .update({ puskep_upgrade_status: 'PENDING' })
      .eq('id', businessId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    try {
      const { sendNotificationToKeusahawananExco } = await import('@/lib/notifications');
      await sendNotificationToKeusahawananExco({
        title: 'Permohonan No. Siri PUSKEP Baru',
        message: `Perniagaan ${biz.name} (EMS) memohon No. Siri PUSKEP rasmi.`,
        type: 'PUSKEP_UPGRADE_REQUEST',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan/dashboard',
      });
    } catch (notifErr) {
      console.error('Failed to send notification to Exco:', notifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error requesting PUSKEP upgrade:', err);
    return { success: false, error: err.message || 'Gagal memohon No. Siri PUSKEP.' };
  }
}

/**
 * Checks active EMS Siswapreneur businesses that have exceeded 7 days past event end date
 * and auto-archives them if they have not upgraded to PUSKEP membership.
 * Protects any business with puskep_upgrade_status === 'APPROVED' or registration_no starting with 'PUSKEP-'.
 */
export async function autoArchiveExpiredEmsBusinesses(): Promise<{
  success: boolean;
  archivedCount: number;
  error?: string;
}> {
  try {
    const { data: businesses, error: fetchErr } = await supabase
      .from('keusahawanan_businesses')
      .select('id, registration_no, ssm_registration_number, puskep_upgrade_status, ems_event_id, ems_events(event_date, start_date, end_date)')
      .eq('is_ems_siswapreneur', true)
      .eq('puskep_upgrade_status', 'NONE')
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;
    if (!businesses || businesses.length === 0) {
      return { success: true, archivedCount: 0 };
    }

    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const toArchiveIds: string[] = [];

    for (const biz of businesses) {
      const regNum = biz.registration_no || biz.ssm_registration_number || '';
      if (biz.puskep_upgrade_status === 'APPROVED' || biz.puskep_upgrade_status === 'PENDING' || regNum.startsWith('PUSKEP-')) {
        continue;
      }

      const eventData = biz.ems_events as any;
      const eventDateStr = eventData?.event_date || eventData?.end_date || eventData?.start_date;
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        if (!isNaN(eventDate.getTime()) && now.getTime() - eventDate.getTime() > sevenDaysMs) {
          toArchiveIds.push(biz.id);
        }
      }
    }

    if (toArchiveIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('keusahawanan_businesses')
        .update({
          is_active: false,
          archived_reason: 'EXPIRED_EMS_SISWAPRENEUR',
        })
        .in('id', toArchiveIds);

      if (updateErr) throw updateErr;
    }

    return { success: true, archivedCount: toArchiveIds.length };
  } catch (err: any) {
    console.error('Error in autoArchiveExpiredEmsBusinesses:', err);
    return { success: false, archivedCount: 0, error: err.message || 'Auto-archive failed' };
  }
}
