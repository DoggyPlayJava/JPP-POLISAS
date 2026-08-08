// ============================================================
// JPP POLISAS — EMS (Event Management System) Supabase Helpers
// ============================================================

import { supabase } from './supabase';
import { sendNotificationToUser } from './notifications';
import type {
  EmsEvent,
  EmsFormField,
  EmsParticipant,
  EmsJuryCode,
  EmsRubricCriteria,
  EmsScore,
  EmsCertificate,
} from '../types';

export interface EmsLeaderboardItem {
  participant: EmsParticipant;
  total_score: number;
  average_score: number;
  jury_count: number;
  rank: number;
  is_tied?: boolean;
  is_tie_winner?: boolean;
  scores_breakdown?: Record<string, number>;
  category_name?: string | null;
}

export interface EmsEventDetail extends EmsEvent {
  form_fields: EmsFormField[];
  rubrics: EmsRubricCriteria[];
  participants: EmsParticipant[];
  jury_codes: EmsJuryCode[];
  leaderboard: EmsLeaderboardItem[];
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  is_siswapreneur?: boolean;
}

/**
 * Fetches list of EMS events with optional status filter, including form_fields, rubrics, and creator details.
 */
export async function fetchEmsEvents(
  statusFilter?: string
): Promise<(EmsEvent & { form_fields?: EmsFormField[]; rubrics?: EmsRubricCriteria[]; creator?: any })[]> {
  let query = supabase
    .from('ems_events')
    .select(`
      *,
      form_fields:ems_form_fields(*),
      rubrics:ems_rubrics(*),
      creator:profiles!created_by(id, full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[EMS] Error fetching events with creator relation, using fallback:', error.message);
    let fallbackQuery = supabase
      .from('ems_events')
      .select(`
        *,
        form_fields:ems_form_fields(*),
        rubrics:ems_rubrics(*)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      fallbackQuery = fallbackQuery.eq('status', statusFilter);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }

  return data || [];
}

/**
 * Fetches a single event with form fields, rubrics, participants, jury codes, and calculated leaderboard.
 * Uses Promise.all for parallel fetching.
 */
export async function fetchEmsEventById(eventId: string): Promise<EmsEventDetail | null> {
  const [eventRes, participantsRes, juryCodesRes, leaderboard] = await Promise.all([
    supabase
      .from('ems_events')
      .select(`
        *,
        form_fields:ems_form_fields(*),
        rubrics:ems_rubrics(*),
        creator:profiles!created_by(id, full_name, email)
      `)
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('ems_participants')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    supabase
      .from('ems_jury_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    fetchEmsLeaderboard(eventId),
  ]);

  if (eventRes.error || !eventRes.data) {
    // Fallback if creator relation hint fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('ems_events')
      .select(`
        *,
        form_fields:ems_form_fields(*),
        rubrics:ems_rubrics(*)
      `)
      .eq('id', eventId)
      .maybeSingle();

    if (fallbackError || !fallbackData) return null;

    return {
      ...fallbackData,
      form_fields: fallbackData.form_fields || [],
      rubrics: fallbackData.rubrics || [],
      participants: participantsRes.data || [],
      jury_codes: juryCodesRes.data || [],
      leaderboard: leaderboard || [],
    };
  }

  const eventData = eventRes.data;
  return {
    ...eventData,
    form_fields: eventData.form_fields || [],
    rubrics: eventData.rubrics || [],
    participants: participantsRes.data || [],
    jury_codes: juryCodesRes.data || [],
    leaderboard: leaderboard || [],
  };
}

/**
 * Inserts event into ems_events, and uses Promise.all to batch insert form fields and rubrics.
 */
export async function createEmsEvent(
  eventData: Partial<EmsEvent>,
  formFields: Partial<EmsFormField>[] = [],
  rubrics: Partial<EmsRubricCriteria>[] = []
): Promise<EmsEvent> {
  const { data: event, error: eventError } = await supabase
    .from('ems_events')
    .insert([eventData])
    .select()
    .single();

  if (eventError || !event) {
    throw new Error(`Gagal mencipta acara: ${eventError?.message || 'Tiada data'}`);
  }

  const fieldInserts = formFields.map((field, idx) => ({
    ...field,
    event_id: event.id,
    sort_order: field.sort_order ?? idx + 1,
  }));

  const rubricInserts = rubrics.map((rubric, idx) => ({
    ...rubric,
    event_id: event.id,
    sort_order: rubric.sort_order ?? idx + 1,
  }));

  const promises: Promise<any>[] = [];

  if (fieldInserts.length > 0) {
    promises.push(Promise.resolve(supabase.from('ems_form_fields').insert(fieldInserts)));
  }

  if (rubricInserts.length > 0) {
    promises.push(Promise.resolve(supabase.from('ems_rubrics').insert(rubricInserts)));
  }

  if (promises.length > 0) {
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res.error) {
        console.error('[EMS] Error batch inserting form_fields or rubrics:', res.error);
      }
    }
  }

  return event;
}

/**
 * Updates event details, form fields, and rubrics.
 */
export async function updateEmsEvent(
  eventId: string,
  eventData: Partial<EmsEvent>,
  formFields?: Partial<EmsFormField>[],
  rubrics?: Partial<EmsRubricCriteria>[]
): Promise<EmsEvent> {
  const { data: event, error: eventError } = await supabase
    .from('ems_events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single();

  if (eventError || !event) {
    throw new Error(`Gagal mengemaskini acara: ${eventError?.message || 'Tiada data'}`);
  }

  const updateTasks: Promise<any>[] = [];

  if (formFields !== undefined) {
    updateTasks.push(
      (async () => {
        await supabase.from('ems_form_fields').delete().eq('event_id', eventId);
        if (formFields.length > 0) {
          const fieldInserts = formFields.map((field, idx) => ({
            ...field,
            event_id: eventId,
            sort_order: field.sort_order ?? idx + 1,
          }));
          return supabase.from('ems_form_fields').insert(fieldInserts);
        }
      })()
    );
  }

  if (rubrics !== undefined) {
    updateTasks.push(
      (async () => {
        await supabase.from('ems_rubrics').delete().eq('event_id', eventId);
        if (rubrics.length > 0) {
          const rubricInserts = rubrics.map((rubric, idx) => ({
            ...rubric,
            event_id: eventId,
            sort_order: rubric.sort_order ?? idx + 1,
          }));
          return supabase.from('ems_rubrics').insert(rubricInserts);
        }
      })()
    );
  }

  if (updateTasks.length > 0) {
    await Promise.all(updateTasks);
  }

  return event;
}

/**
 * Updates event status by Super Admin ('APPROVED' | 'REJECTED').
 * Sends automated notification to the event creator.
 */
export async function approveEmsEvent(
  eventId: string,
  status: 'APPROVED' | 'REJECTED',
  note?: string
): Promise<EmsEvent> {
  const updatePayload: Record<string, any> = { status };
  if (note) {
    updatePayload.description = note;
  }

  const { data, error } = await supabase
    .from('ems_events')
    .update(updatePayload)
    .eq('id', eventId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal mengubah status acara: ${error?.message || 'Tiada data'}`);
  }

  // Send automated notification to event creator
  if (data.created_by) {
    const isApproved = status === 'APPROVED';
    sendNotificationToUser(data.created_by, {
      title: isApproved ? 'Acara Diluluskan 🎉' : 'Acara Ditolak ⚠️',
      message: isApproved
        ? `Acara "${data.title}" telah diluluskan oleh JPP HQ.`
        : `Acara "${data.title}" telah ditolak.${note ? ' Sebab: ' + note : ''}`,
      type: isApproved ? 'EMS_EVENT_APPROVED' : 'EMS_EVENT_REJECTED',
      module: 'JPP',
      link: '/ems/dashboard',
      reference_id: data.id,
    }).catch((err) => console.error('[EMS] Error sending creator notification:', err));
  }

  return data;
}

/**
 * Inserts participant into ems_participants.
 * Sends automated notification to the registrant with link to their Pass QR code.
 */
export async function registerEmsParticipant(
  participantData: Partial<EmsParticipant>
): Promise<EmsParticipant> {
  // Prevent duplicate registration: same event + same matrix_no/email
  if (participantData.event_id && (participantData.matrix_no || participantData.email)) {
    const dupConds: string[] = [];
    if (participantData.matrix_no) dupConds.push(`matrix_no.eq.${participantData.matrix_no}`);
    if (participantData.email) dupConds.push(`email.eq.${participantData.email}`);
    const { data: existing } = await supabase
      .from('ems_participants')
      .select('id')
      .eq('event_id', participantData.event_id)
      .or(dupConds.join(','))
      .limit(1)
      .maybeSingle();
    if (existing) {
      throw new Error('Anda telah mendaftar untuk acara ini. Sila gunakan Pass sedia ada.');
    }
  }

  const { data, error } = await supabase
    .from('ems_participants')
    .insert([participantData])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal mendaftar peserta: ${error?.message || 'Sila cuba lagi'}`);
  }

  // Send automated notification to registrant with link to Pass QR code
  (async () => {
    try {
      let targetUserId = (data.custom_responses as Record<string, any>)?.user_id;

      if (!targetUserId && (data.matrix_no || data.email)) {
        let query = supabase.from('profiles').select('id');
        if (data.matrix_no && data.email) {
          query = query.or(`matric_no.eq.${data.matrix_no},email.eq.${data.email}`);
        } else if (data.matrix_no) {
          query = query.eq('matric_no', data.matrix_no);
        } else if (data.email) {
          query = query.eq('email', data.email);
        }
        const { data: prof } = await query.maybeSingle();
        if (prof?.id) {
          targetUserId = prof.id;
        }
      }

      if (!targetUserId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          targetUserId = authData.user.id;
        }
      }

      if (targetUserId) {
        await sendNotificationToUser(targetUserId, {
          title: 'Pendaftaran Acara Berjaya 🎟️',
          message: `Pendaftaran anda untuk acara telah berjaya. Pas QR anda sedia untuk digunakan.`,
          type: 'EMS_REGISTRATION_SUCCESS',
          module: 'JPP',
          link: `/ems/checkin/${data.event_id}`,
          reference_id: data.id,
        });
      }
    } catch (notifErr) {
      console.error('[EMS] Error sending participant registration notification:', notifErr);
    }
  })();

  return data;
}

/**
 * Manually creates a participant record by Program Director / Admin.
 */
export async function createEmsParticipantManual(participantData: {
  event_id: string;
  participant_type?: string;
  entity_mode?: string;
  team_name?: string;
  booth_no?: string;
  category_name?: string;
  leader_name: string;
  matrix_no?: string;
  email?: string;
  phone?: string;
}): Promise<EmsParticipant> {
  const { data, error } = await supabase
    .from('ems_participants')
    .insert([
      {
        event_id: participantData.event_id,
        participant_type: participantData.participant_type || 'STUDENT',
        entity_mode: participantData.entity_mode || 'INDIVIDUAL',
        team_name: participantData.team_name || null,
        booth_no: participantData.booth_no || null,
        category_name: participantData.category_name || null,
        leader_name: participantData.leader_name.trim(),
        matrix_no: participantData.matrix_no || null,
        email: participantData.email || null,
        phone: participantData.phone || null,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal mendaftar peserta secara manual: ${error?.message || 'Ralat tidak diketahui'}`);
  }

  return data;
}


/**
 * Toggles active state of a jury code.
 */
export async function toggleJuryCodeActive(
  codeId: string,
  isActive: boolean
): Promise<EmsJuryCode> {
  const { data, error } = await supabase
    .from('ems_jury_codes')
    .update({ is_active: isActive })
    .eq('id', codeId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal mengemaskini status kod juri: ${error?.message || 'Ralat sistem'}`);
  }

  return data;
}

/**
 * Deletes a jury code.
 */
export async function deleteJuryCode(codeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ems_jury_codes')
    .delete()
    .eq('id', codeId);

  if (error) {
    throw new Error(`Gagal memadam kod juri: ${error.message}`);
  }

  return true;
}

/**
 * Sets event status to COMPLETED, locking jury grading, and generates certificates.
 */
export async function completeEmsEvent(eventId: string): Promise<EmsEvent> {
  const { data, error } = await supabase
    .from('ems_events')
    .update({ status: 'COMPLETED' })
    .eq('id', eventId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal menandakan acara selesai: ${error?.message || 'Ralat sistem'}`);
  }

  // Automatically trigger certificate generation
  await generateEmsCertificates(eventId);

  return data;
}

/**
 * Finds participant by matrix_no, id, or email, sets is_checked_in: true, checked_in_at: now().
 */
export async function checkinEmsParticipant(
  eventId: string,
  searchInput: string
): Promise<EmsParticipant> {
  const cleanInput = searchInput.trim();
  if (!cleanInput) {
    throw new Error('Sila masukkan No. Matrik, ID, atau Emel peserta.');
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);

  let query = supabase
    .from('ems_participants')
    .select('*')
    .eq('event_id', eventId);

  if (isUuid) {
    query = query.or(`id.eq.${cleanInput},matrix_no.ilike.${cleanInput},email.ilike.${cleanInput},booth_no.ilike.${cleanInput}`);
  } else {
    query = query.or(`matrix_no.ilike.${cleanInput},email.ilike.${cleanInput},booth_no.ilike.${cleanInput},leader_name.ilike.%${cleanInput}%`);
  }

  const { data: participants, error: findError } = await query;

  if (findError || !participants || participants.length === 0) {
    throw new Error(`Peserta dengan carian "${cleanInput}" tidak dijumpai.`);
  }

  const participant = participants[0];

  const { data: updated, error: updateError } = await supabase
    .from('ems_participants')
    .update({
      is_checked_in: true,
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', participant.id)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Gagal daftar masuk peserta: ${updateError?.message || 'Ralat sistem'}`);
  }

  return updated;
}

/**
 * Inserts jury code into ems_jury_codes.
 */
export async function createJuryCode(
  eventId: string,
  codeData: {
    code: string;
    jury_name?: string;
    organization?: string;
    assigned_categories?: string[];
    assigned_booths?: string[];
  }
): Promise<EmsJuryCode> {
  const { data, error } = await supabase
    .from('ems_jury_codes')
    .insert([
      {
        event_id: eventId,
        code: codeData.code.trim().toUpperCase(),
        jury_name: codeData.jury_name || null,
        organization: codeData.organization || null,
        assigned_categories: codeData.assigned_categories || null,
        assigned_booths: codeData.assigned_booths || null,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal mencipta kod juri: ${error?.message || 'Ralat sistem'}`);
  }

  return data;
}

/**
 * Queries ems_jury_codes by code, returns jury code record along with associated event and rubrics.
 * Uses Promise.all for parallel fetches.
 */
export async function verifyJuryCode(
  code: string
): Promise<{ juryCode: EmsJuryCode; event: EmsEvent; rubrics: EmsRubricCriteria[] } | null> {
  const cleanCode = code.trim().toUpperCase();

  const { data: juryCode, error: juryError } = await supabase
    .from('ems_jury_codes')
    .select('*')
    .eq('code', cleanCode)
    .maybeSingle();

  if (juryError || !juryCode) {
    return null;
  }

  const [eventRes, rubricsRes] = await Promise.all([
    supabase.from('ems_events').select('*').eq('id', juryCode.event_id).maybeSingle(),
    supabase
      .from('ems_rubrics')
      .select('*')
      .eq('event_id', juryCode.event_id)
      .order('sort_order', { ascending: true }),
  ]);

  if (eventRes.error || !eventRes.data) {
    return null;
  }

  return {
    juryCode,
    event: eventRes.data,
    rubrics: rubricsRes.data || [],
  };
}

/**
 * Upserts scores in ems_scores for a jury submission.
 */
export async function submitJuryScore(
  scores: Array<{
    event_id: string;
    participant_id: string;
    jury_code_id: string;
    rubric_id: string;
    score: number;
    comments?: string;
  }>
): Promise<boolean> {
  if (!scores || scores.length === 0) return true;

  // Upsert (insert on conflict update) to allow jury to edit/submit multiple times.
  // RLS blocks anon-key DELETE (requires auth), so delete+insert fails silently and
  // scores would duplicate. Upsert avoids the need for DELETE entirely.
  const { error } = await supabase
    .from('ems_scores')
    .upsert(
      scores.map((s) => ({
        event_id: s.event_id,
        participant_id: s.participant_id,
        jury_code_id: s.jury_code_id,
        rubric_id: s.rubric_id,
        score: s.score,
        comments: s.comments || null,
      })),
      { onConflict: 'participant_id,jury_code_id,rubric_id' }
    );

  if (error) {
    throw new Error(`Gagal menyimpan markah juri: ${error.message}`);
  }

  return true;
}

/**
 * Allows Program Director / Admin to override jury scores.
 */
export async function overrideJuryScore(
  scores: Array<{
    event_id: string;
    participant_id: string;
    jury_code_id: string;
    rubric_id: string;
    score: number;
    comments?: string;
  }>
): Promise<boolean> {
  if (!scores || scores.length === 0) return true;

  const { error } = await supabase
    .from('ems_scores')
    .upsert(
      scores.map((s) => ({
        event_id: s.event_id,
        participant_id: s.participant_id,
        jury_code_id: s.jury_code_id,
        rubric_id: s.rubric_id,
        score: s.score,
        comments: s.comments || null,
      })),
      { onConflict: 'participant_id,jury_code_id,rubric_id' }
    );

  if (error) {
    throw new Error(`Gagal meminda markah juri: ${error.message}`);
  }

  return true;
}


/**
 * Fetches participants and scores, calculates average jury score for each participant/team, orders descending by score.
 * Uses Promise.all for parallel fetches.
 */
export async function fetchEmsLeaderboard(eventId: string): Promise<EmsLeaderboardItem[]> {
  const [participantsRes, rubricsRes, scoresRes] = await Promise.all([
    supabase.from('ems_participants').select('*').eq('event_id', eventId),
    supabase.from('ems_rubrics').select('*').eq('event_id', eventId),
    supabase.from('ems_scores').select('*').eq('event_id', eventId),
  ]);

  if (participantsRes.error) throw participantsRes.error;

  const participants: EmsParticipant[] = participantsRes.data || [];
  const rubrics: EmsRubricCriteria[] = rubricsRes.data || [];
  const scores: EmsScore[] = scoresRes.data || [];

  const leaderboard: EmsLeaderboardItem[] = participants.map((participant) => {
    const categoryName =
      participant.category_name ||
      (participant.custom_responses as Record<string, any>)?.category ||
      (participant.custom_responses as Record<string, any>)?.category_name ||
      null;

    const pScores = scores.filter((s) => s.participant_id === participant.id);

    const juryMap: Record<string, EmsScore[]> = {};
    pScores.forEach((s) => {
      if (!juryMap[s.jury_code_id]) juryMap[s.jury_code_id] = [];
      juryMap[s.jury_code_id].push(s);
    });

    const juryIds = Object.keys(juryMap);
    const juryCount = juryIds.length;

    let totalJurySum = 0;
    const scoresBreakdown: Record<string, number> = {};

    if (juryCount > 0) {
      juryIds.forEach((jId) => {
        const jScores = juryMap[jId];
        let juryWeightedTotal = 0;
        jScores.forEach((scoreObj) => {
          const rubric = rubrics.find((r) => r.id === scoreObj.rubric_id);
          if (rubric) {
            const maxScore = Number(rubric.max_score) > 0 ? Number(rubric.max_score) : 10;
            const weight = rubric.weight !== undefined && rubric.weight !== null ? Number(rubric.weight) : 1;
            const weightedScore = (Number(scoreObj.score) / maxScore) * weight;
            juryWeightedTotal += weightedScore;
          } else {
            juryWeightedTotal += Number(scoreObj.score);
          }
        });
        totalJurySum += juryWeightedTotal;
      });

      rubrics.forEach((r) => {
        const rScores = pScores.filter((s) => s.rubric_id === r.id);
        if (rScores.length > 0) {
          const avgR = rScores.reduce((acc, curr) => acc + Number(curr.score), 0) / rScores.length;
          scoresBreakdown[r.id] = Number(avgR.toFixed(2));
        } else {
          scoresBreakdown[r.id] = 0;
        }
      });
    }

    const averageScore = juryCount > 0 ? Number((totalJurySum / juryCount).toFixed(2)) : 0;
    const isTieWinner = Boolean(participant.custom_responses?.is_tie_winner);

    const updatedParticipant: EmsParticipant = {
      ...participant,
      category_name: categoryName || participant.category_name,
    };

    return {
      participant: updatedParticipant,
      total_score: averageScore,
      average_score: averageScore,
      jury_count: juryCount,
      rank: 0,
      is_tied: false,
      is_tie_winner: isTieWinner,
      scores_breakdown: scoresBreakdown,
      category_name: categoryName,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    if (a.is_tie_winner && !b.is_tie_winner) return -1;
    if (!a.is_tie_winner && b.is_tie_winner) return 1;
    return a.participant.leader_name.localeCompare(b.participant.leader_name);
  });

  leaderboard.forEach((item, index) => {
    item.rank = index + 1;
    if (index > 0 && leaderboard[index - 1].total_score === item.total_score && item.total_score > 0) {
      item.is_tied = true;
      leaderboard[index - 1].is_tied = true;
    }
  });

  return leaderboard;
}

/**
 * Helper to record/mark tied winner selection by Program Director.
 */
export async function resolveTieWinner(
  eventId: string,
  winnerParticipantId: string
): Promise<boolean> {
  const { data: participants, error: fetchErr } = await supabase
    .from('ems_participants')
    .select('id, custom_responses')
    .eq('event_id', eventId);

  if (fetchErr || !participants) {
    throw new Error(`Gagal memproses penentuan pemenang seret: ${fetchErr?.message}`);
  }

  const updateTasks = participants.map((p) => {
    const existing = (p.custom_responses as Record<string, any>) || {};
    const isWinner = p.id === winnerParticipantId;
    const updatedResponses = {
      ...existing,
      is_tie_winner: isWinner,
      tie_resolved_at: isWinner ? new Date().toISOString() : null,
    };
    return supabase
      .from('ems_participants')
      .update({ custom_responses: updatedResponses })
      .eq('id', p.id);
  });

  await Promise.all(updateTasks);
  return true;
}

/**
 * Generates certificate records in ems_certificates for all participants and juries with unique serial numbers.
 * Uses Promise.all for parallel fetches.
 */
export async function generateEmsCertificates(eventId: string): Promise<EmsCertificate[]> {
  const [participantsRes, juriesRes, existingCertsRes] = await Promise.all([
    supabase.from('ems_participants').select('*').eq('event_id', eventId),
    supabase.from('ems_jury_codes').select('*').eq('event_id', eventId),
    supabase.from('ems_certificates').select('*').eq('event_id', eventId),
  ]);

  if (participantsRes.error) throw participantsRes.error;
  if (juriesRes.error) throw juriesRes.error;

  const participants: EmsParticipant[] = participantsRes.data || [];
  const juries: EmsJuryCode[] = juriesRes.data || [];
  const existingCerts: EmsCertificate[] = existingCertsRes.data || [];

  const existingParticipantIds = new Set(
    existingCerts.filter((c) => c.participant_id).map((c) => c.participant_id)
  );
  const existingJuryIds = new Set(
    existingCerts.filter((c) => c.jury_code_id).map((c) => c.jury_code_id)
  );

  const year = new Date().getFullYear();
  const certInserts: Partial<EmsCertificate>[] = [];

  participants.forEach((p, idx) => {
    if (!existingParticipantIds.has(p.id)) {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const certSerial = `CERT-EMS-${year}-P${idx + 1}-${randomSuffix}`;
      certInserts.push({
        event_id: eventId,
        participant_id: p.id,
        cert_type: 'PARTICIPANT',
        cert_serial: certSerial,
      });
    }
  });

  juries.forEach((j, idx) => {
    if (!existingJuryIds.has(j.id)) {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const certSerial = `CERT-EMS-${year}-J${idx + 1}-${randomSuffix}`;
      certInserts.push({
        event_id: eventId,
        jury_code_id: j.id,
        cert_type: 'JURY',
        cert_serial: certSerial,
      });
    }
  });

  if (certInserts.length > 0) {
    const { error } = await supabase.from('ems_certificates').insert(certInserts);
    if (error) {
      throw new Error(`Gagal menjana sijil: ${error.message}`);
    }
  }

  const { data: updatedCerts, error: fetchErr } = await supabase
    .from('ems_certificates')
    .select('*')
    .eq('event_id', eventId);

  if (fetchErr) throw fetchErr;
  return updatedCerts || [];
}

/**
 * Fetches all certificates for a specific event with associated participant and event details.
 */
export async function fetchEventCertificates(eventId: string): Promise<Array<EmsCertificate & { participant?: EmsParticipant | null; jury?: EmsJuryCode | null; event_title?: string }>> {
  const [certsRes, eventRes, participantsRes, juriesRes] = await Promise.all([
    supabase.from('ems_certificates').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
    supabase.from('ems_events').select('title').eq('id', eventId).maybeSingle(),
    supabase.from('ems_participants').select('*').eq('event_id', eventId),
    supabase.from('ems_jury_codes').select('*').eq('event_id', eventId),
  ]);

  if (certsRes.error) throw certsRes.error;
  const certs = certsRes.data || [];
  const eventTitle = eventRes.data?.title || 'Acara EMS';
  const participantsMap = new Map((participantsRes.data || []).map((p) => [p.id, p]));
  const juriesMap = new Map((juriesRes.data || []).map((j) => [j.id, j]));

  return certs.map((c) => ({
    ...c,
    event_title: eventTitle,
    participant: c.participant_id ? participantsMap.get(c.participant_id) || null : null,
    jury: c.jury_code_id ? juriesMap.get(c.jury_code_id) || null : null,
  }));
}

/**
 * Fetches all certificates for a user matching email or matrix_no.
 */
export async function fetchUserCertificates(email?: string, matrixNo?: string): Promise<Array<EmsCertificate & { event_title?: string; recipient_name?: string }>> {
  if (!email && !matrixNo) return [];

  // 1. Find participant records matching email or matrix_no
  let query = supabase.from('ems_participants').select('id, event_id, leader_name, team_name, email, matrix_no');
  if (email && matrixNo) {
    query = query.or(`email.ilike.${email},matrix_no.ilike.${matrixNo}`);
  } else if (email) {
    query = query.ilike('email', email);
  } else if (matrixNo) {
    query = query.ilike('matrix_no', matrixNo);
  }

  const { data: participants, error: pErr } = await query;
  if (pErr || !participants || participants.length === 0) return [];

  const participantIds = participants.map((p) => p.id);

  // 2. Fetch certificates matching participant_ids
  const { data: certs, error: cErr } = await supabase
    .from('ems_certificates')
    .select('*')
    .in('participant_id', participantIds)
    .order('created_at', { ascending: false });

  if (cErr || !certs || certs.length === 0) return [];

  // 3. Fetch event titles
  const eventIds = Array.from(new Set(certs.map((c) => c.event_id)));
  const { data: events } = await supabase.from('ems_events').select('id, title').in('id', eventIds);
  const eventsMap = new Map((events || []).map((e) => [e.id, e.title]));
  const participantsMap = new Map(participants.map((p) => [p.id, p.team_name || p.leader_name]));

  return certs.map((c) => ({
    ...c,
    event_title: eventsMap.get(c.event_id) || 'Acara EMS',
    recipient_name: c.participant_id ? participantsMap.get(c.participant_id) : 'Peserta',
  }));
}

