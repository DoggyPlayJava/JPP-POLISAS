import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Flame,
  Heart,
  HeartHandshake,
  HelpCircle,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pin,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PolySuaraPoll } from '@/pages/polyservices/PolySuaraPoll';
import { PolySuaraReactions } from '@/components/polysuara/PolySuaraReactions';
import { PolySuaraCivicProgress } from '@/components/polysuara/PolySuaraOverlays';
import {
  aggregateReactions,
  cleanConfessionText,
  detectPostIntent,
  extractCampusLocations,
  getAnimalAvatarFromCodename,
  getFriendlyAnonName,
  hasSpoilerImageToken,
  isWithin1Hour,
} from '@/lib/polySuaraHelpers';

export interface PolySuaraConfessionCardProps {
  confession: any;
  index: number;
  profileId?: string;
  canReplyJpp: boolean;
  isMine: boolean;
  isBookmarked: boolean;
  isDownvoted: boolean;
  isSpoilerRevealed: boolean;
  activeTag: string | null;
  reactions: Array<{ reaction_type: string; user_id?: string }>;
  topComment?: any;
  shareLoading: boolean;
  onRevealSpoiler: (confessionId: string) => void;
  onOpenMedia: (confession: any) => void;
  onToggleReaction: (confessionId: string, reactionType: string) => void;
  onDownvote: (confessionId: string) => void;
  onOpenComments: (confession: any) => void;
  onCopyLink: (confessionId: string) => void;
  onShareImage: (confessionId: string) => void;
  onToggleBookmark: (confessionId: string) => void;
  onDeleteConfession: (confessionId: string) => void;
  onOpenReport: (confessionId: string) => void;
  onOpenJppReply: (confession: any) => void;
  onOpenAuthorReply: (confessionId: string) => void;
  onTogglePin: (confessionId: string, currentPinned: boolean) => void;
  onSelectTag: (tag: string | null) => void;
  onNavigatePolyMaps: (roomQuery: string) => void;
}

export function PolySuaraConfessionCard({
  confession,
  index,
  profileId,
  canReplyJpp,
  isMine,
  isBookmarked,
  isDownvoted,
  isSpoilerRevealed,
  activeTag,
  reactions,
  topComment,
  shareLoading,
  onRevealSpoiler,
  onOpenMedia,
  onToggleReaction,
  onDownvote,
  onOpenComments,
  onCopyLink,
  onShareImage,
  onToggleBookmark,
  onDeleteConfession,
  onOpenReport,
  onOpenJppReply,
  onOpenAuthorReply,
  onTogglePin,
  onSelectTag,
  onNavigatePolyMaps,
}: PolySuaraConfessionCardProps): React.ReactElement {
  const { t } = useTranslation(['services', 'common']);
  const [isTallMedia, setIsTallMedia] = useState(false);

  const isTrending =
    (confession.upvotes || 0) > 30 &&
    Date.now() - new Date(confession.created_at).getTime() < 24 * 60 * 60 * 1000;
  const avatar = getAnimalAvatarFromCodename(confession.codename);
  const isConfessionDeleted = Boolean(
    confession.is_deleted_by_author || confession.content === '[deleted]'
  );
  const canDeleteConfession =
    isMine && !isConfessionDeleted && isWithin1Hour(confession.created_at);
  const intent = detectPostIntent(confession);
  const campusLocations = isConfessionDeleted
    ? []
    : extractCampusLocations(confession.content);
  const hasSpoiler = hasSpoilerImageToken(confession.content);
  const isCivicIssue =
    confession.category === 'FASILITI' || confession.category === 'KAMSIS';
  const isFactCheck = confession.status === 'FACT_CHECK';
  const isOfficialNote = confession.status === 'OFFICIAL_NOTE';

  const getCategoryLabel = (cat?: string) => {
    switch ((cat || '').toUpperCase()) {
      case 'UMUM':
        return t('services:suara_category_umum', 'Umum');
      case 'AKADEMIK':
        return t('services:suara_cat_akademik', 'Akademik');
      case 'FASILITI':
        return t('services:suara_cat_fasiliti', 'Fasiliti');
      case 'KAMSIS':
        return t('services:suara_cat_kamsis', 'Kamsis');
      case 'KAUNSELING':
        return t('services:suara_cat_kaunseling', 'Kaunseling');
      default:
        return cat || 'UMUM';
    }
  };

  return (
    <motion.div
      id={`confession-${confession.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
      onDoubleClick={(e) => {
        if (isConfessionDeleted || (e.target as HTMLElement).closest('button, a, img')) return;
        onToggleReaction(confession.id, 'heart');
      }}
      className={cn(
        'bg-white dark:bg-[#0B2420] border border-[#B8E4DC]/80 dark:border-[#1E4D45] shadow-[0_4px_24px_rgba(11,36,32,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-[2rem] p-4 sm:p-6 mb-4 transition-[border-color,box-shadow] duration-200 relative overflow-hidden',
        isTrending && 'border-[#0F766E]/45 dark:border-[#2DD4BF]/40'
      )}
    >
      {/* Author & Context Header */}
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#0F766E] via-[#14B8A6] to-[#2DD4BF] shrink-0">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-lg bg-white dark:bg-[#0B2420]',
                isMine ? 'text-[#0F766E] dark:text-[#2DD4BF]' : ''
              )}
            >
              {isMine ? (
                <UserCircle2 className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
              ) : (
                avatar.emoji
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-[#0B2420] dark:text-[#F6FBF9] truncate">
                {confession.codename || t('services:anon_student', 'Pelajar Anon')}
              </h4>
              <span
                className="w-4 h-4 rounded-full bg-[#EBF7F4] dark:bg-[#11322C] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center text-[10px] font-black shrink-0"
                title={t('services:anon_verified_tooltip', 'Identiti Anon Sah Disahkan')}
              >
                ✓
              </span>
              {isMine && (
                <span
                  className="bg-[#EBF7F4] dark:bg-[#11322C] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC]/80 dark:border-[#1E4D45] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  data-html2canvas-ignore
                >
                  {t('services:you_label', 'Anda')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#3B635C] dark:text-[#99CBC2] mt-0.5">
              {formatDistanceToNow(new Date(confession.created_at), {
                addSuffix: true,
                locale: ms,
              })}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 flex-wrap justify-end shrink-0"
          data-html2canvas-ignore
        >
          {intent === 'QNA' && (
            <span className="bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <HelpCircle className="w-3 h-3" />
              {t('services:suara_intent_qna', 'Tanya Kampus')}
            </span>
          )}
          {intent === 'SHOUTOUT' && (
            <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <HeartHandshake className="w-3 h-3" />
              {t('services:suara_intent_shoutout', 'Apresiasi')}
            </span>
          )}
          {intent === 'DEBATE' && (
            <span className="bg-teal-500/15 text-[#0F766E] dark:text-[#2DD4BF] text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" />
              {t('services:suara_intent_debate', 'Debat Setuju/Tidak')}
            </span>
          )}
          {isTrending && (
            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3" />
              {t('services:trending_badge', 'Hangat')}
            </span>
          )}
          {confession.is_pinned && (
            <span className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {confession.status === 'ACKNOWLEDGED' && (
            <span className="bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" />
              {t('services:status_acknowledged', 'Diterima')}
            </span>
          )}
          {confession.status === 'INVESTIGATING' && (
            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {t('services:status_investigating', 'Disiasat')}
            </span>
          )}
          {confession.status === 'RESOLVED' && (
            <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" />
              {t('services:status_resolved', 'Selesai')}
            </span>
          )}
          {isFactCheck && (
            <span className="bg-[#0F766E]/15 text-[#0F766E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF] text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3" />
              {t('services:status_fact_check', 'Semak Fakta')}
            </span>
          )}
          {isOfficialNote && (
            <span className="bg-[#EBF7F4] text-[#0F766E] dark:bg-[#11322C] dark:text-[#2DD4BF] text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Shield className="w-3 h-3" />
              {t('services:status_official_note', 'Nota JPP')}
            </span>
          )}

          <span className="text-[11px] font-bold px-3 py-1 rounded-full text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#11322C] border border-[#B8E4DC]/80 dark:border-[#1E4D45] shrink-0">
            {getCategoryLabel(confession.category)}
          </span>

          {canDeleteConfession && (
            <button
              type="button"
              onClick={() => onDeleteConfession(confession.id)}
              title={t('services:delete_confession_tooltip', 'Padam luahan anda')}
              aria-label={t('services:delete_confession', 'Padam Luahan')}
              className="text-[#3B635C] hover:text-rose-500 dark:text-[#99CBC2] dark:hover:text-rose-400 transition-colors p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer flex items-center gap-1 text-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-medium">
                {t('services:delete_confession', 'Padam Luahan')}
              </span>
            </button>
          )}

          {!isConfessionDeleted && (
            <button
              type="button"
              onClick={() => onOpenReport(confession.id)}
              title={t('services:report_content_tooltip', 'Laporkan kandungan ini')}
              aria-label={t('services:report_content_tooltip', 'Laporkan kandungan ini')}
              className="text-[#3B635C] dark:text-[#99CBC2] hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-1.5 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#11322C] cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Editorial Content */}
      {isConfessionDeleted ? (
        <div className="py-2 mb-3.5">
          <span className="text-[#3B635C] dark:text-[#99CBC2] italic text-sm flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 opacity-70" />{' '}
            {t(
              'services:author_deleted_post',
              '{{author}} telah memadamkan ruangan ini',
              { author: confession.codename || t('services:author', 'Penulis') }
            ).replace(
              '{{author}}',
              confession.codename || t('services:author', 'Penulis')
            )}
          </span>
        </div>
      ) : (
        <p className="text-[15px] sm:text-base leading-relaxed text-[#0B2420] dark:text-[#F6FBF9] whitespace-pre-wrap font-normal mb-3.5">
          {cleanConfessionText(confession.content)}
        </p>
      )}

      {!isConfessionDeleted && (
        <PolySuaraCivicProgress
          status={confession.status}
          category={confession.category}
          upvotes={confession.upvotes || 0}
        />
      )}

      {!isConfessionDeleted &&
        confession.polysuara_polls &&
        confession.polysuara_polls.length > 0 && (
          <div className="mb-4">
            <PolySuaraPoll
              poll={confession.polysuara_polls[0]}
              currentUserId={profileId || ''}
            />
          </div>
        )}

      {/* Standardized Social Media Aspect-Ratio Frame */}
      {!isConfessionDeleted && confession.image_url && (
        <div
          className={cn(
            'mb-4 rounded-2xl overflow-hidden border border-[#B8E4DC]/80 dark:border-[#1E4D45] relative group/media',
            isTallMedia
              ? 'bg-[#0B2420]/[0.04] dark:bg-[#040F0D]'
              : 'bg-[#EBF7F4] dark:bg-[#081A17]'
          )}
        >
          {hasSpoiler && !isSpoilerRevealed ? (
            <div className="relative">
              <img
                src={confession.image_url}
                alt={t('services:attachment_proof', 'Bukti Lampiran')}
                className="w-full max-h-[420px] object-cover blur-xl scale-105 select-none pointer-events-none"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-[#061714]/50 p-4">
                <button
                  type="button"
                  onClick={() => onRevealSpoiler(confession.id)}
                  className="px-4 py-2.5 rounded-full bg-white dark:bg-[#0B2420] text-[#0B2420] dark:text-[#F6FBF9] border border-[#B8E4DC] dark:border-[#1E4D45] text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                  <span>
                    {t(
                      'services:suara_spoiler_overlay_label',
                      'Gambar dikaburkan • tekan untuk lihat'
                    )}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMedia(confession)}
              aria-label={t('services:attachment_proof', 'Bukti Lampiran')}
              className="block w-full text-left cursor-zoom-in focus:outline-none"
            >
              <img
                src={confession.image_url}
                alt={t('services:attachment_proof', 'Bukti Lampiran')}
                loading="lazy"
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setIsTallMedia(naturalWidth / naturalHeight < 0.78);
                  }
                }}
                className={cn(
                  'max-h-[460px] transition-transform duration-200 group-hover/media:scale-[1.01]',
                  isTallMedia ? 'w-auto mx-auto object-contain' : 'w-full object-cover'
                )}
              />
            </button>
          )}
        </div>
      )}

      {!isConfessionDeleted && campusLocations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" data-html2canvas-ignore>
          {campusLocations.map((loc) => (
            <button
              key={loc.roomQuery}
              type="button"
              onClick={() => onNavigatePolyMaps(loc.roomQuery)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F6FBF9] dark:bg-[#081A17] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC]/80 dark:border-[#1E4D45] hover:bg-[#EBF7F4] dark:hover:bg-[#11322C] transition-colors cursor-pointer"
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{loc.label}</span>
            </button>
          ))}
        </div>
      )}

      {!isConfessionDeleted &&
        confession.hashtags &&
        confession.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {confession.hashtags.map((tag: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectTag(activeTag === tag ? null : tag)}
                className="text-[11px] font-semibold text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#11322C] border border-[#B8E4DC]/60 dark:border-[#1E4D45] px-2.5 py-0.5 rounded-full hover:bg-[#D5EFEA] dark:hover:bg-[#18443C] transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

      {/* Official JPP Community Note / Response Callout */}
      {confession.official_reply && (
        <div className="mb-4 rounded-2xl border border-[#0F766E]/25 dark:border-[#2DD4BF]/25 bg-[#EBF7F4]/75 dark:bg-[#11322C]/65 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
            <span className="text-xs font-bold text-[#0F766E] dark:text-[#2DD4BF] tracking-wide">
              {isFactCheck
                ? t(
                    'services:suara_fact_check_banner',
                    'Nota Konteks Rasmi JPP (Semak Fakta)'
                  )
                : isOfficialNote
                ? t('services:suara_official_note_banner', 'Maklum Balas Rasmi JPP')
                : t(
                    'services:suara_action_feedback_banner',
                    'Maklum Balas Tindakan JPP'
                  )}
            </span>
          </div>
          <div className="text-[#0B2420] dark:text-[#EBF7F4] text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-5 mb-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-5 mb-2" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                strong: ({ node, ...props }) => (
                  <strong
                    className="font-extrabold text-[#0F766E] dark:text-[#2DD4BF]"
                    {...props}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-[#0F766E] dark:text-[#2DD4BF] underline hover:opacity-80 transition-opacity"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {confession.official_reply}
            </ReactMarkdown>
          </div>
          <div className="mt-2 text-[11px] text-[#3B635C] dark:text-[#99CBC2] font-semibold">
            {t('services:by_responder', 'Oleh: {{name}}', {
              name: confession.responder?.full_name || t('services:jpp_rep', 'Wakil JPP'),
            })}
            {confession.official_reply_at
              ? ` • ${formatDistanceToNow(new Date(confession.official_reply_at), {
                  addSuffix: true,
                  locale: ms,
                })}`
              : ''}
          </div>
        </div>
      )}

      {confession.author_reply && (
        <div className="mb-4 rounded-2xl border border-[#B8E4DC] dark:border-[#1E4D45] bg-[#F6FBF9] dark:bg-[#081A17] p-3.5 ml-4 sm:ml-6">
          <div className="flex items-center gap-2 mb-1.5">
            <UserCircle2 className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
            <span className="text-xs font-bold text-[#0F766E] dark:text-[#2DD4BF]">
              {t('services:author_reply_badge', 'Balasan Pengarang')}
            </span>
          </div>
          <p className="text-[#0B2420] dark:text-[#F6FBF9] text-sm leading-relaxed">
            {cleanConfessionText(confession.author_reply)}
          </p>
          {confession.author_reply_at && (
            <div className="mt-1.5 text-[11px] text-[#3B635C] dark:text-[#99CBC2] font-medium">
              {formatDistanceToNow(new Date(confession.author_reply_at), {
                addSuffix: true,
                locale: ms,
              })}
            </div>
          )}
        </div>
      )}

      {!isConfessionDeleted && topComment && (
        <button
          type="button"
          onClick={() => onOpenComments(confession)}
          data-html2canvas-ignore
          className="w-full text-left mb-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#081A17] border border-[#B8E4DC]/70 dark:border-[#1E4D45] px-3.5 py-2.5 hover:border-[#0F766E]/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[11px] font-bold text-[#0F766E] dark:text-[#2DD4BF] flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {t('services:suara_top_comment_label', 'Ulasan Teratas')}
            </span>
            <span className="text-[11px] font-semibold text-[#3B635C] dark:text-[#99CBC2] truncate">
              {topComment.is_jpp_official
                ? t('services:jpp_official_badge', 'JPP RASMI')
                : getFriendlyAnonName(topComment.codename).displayName}
            </span>
          </div>
          <p className="text-xs text-[#0B2420] dark:text-[#F6FBF9] line-clamp-1">
            {cleanConfessionText(topComment.content)}
          </p>
        </button>
      )}

      {/* Action Bar */}
      <div
        className="flex items-center justify-between gap-1.5 sm:gap-2 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#1E4D45] flex-nowrap overflow-x-auto scrollbar-none"
        data-html2canvas-ignore
      >
        {isConfessionDeleted ? (
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap text-[#3B635C]/60 dark:text-[#99CBC2]/60">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F6FBF9] dark:bg-[#081A17] border border-[#B8E4DC]/60 dark:border-[#1E4D45] text-[#3B635C]/40 dark:text-[#99CBC2]/40 cursor-not-allowed select-none"
              aria-label={t('services:like_disabled', 'Suka (Dinyahdayakan)')}
            >
              <Heart className="w-3.5 h-3.5" />
              <span className="tabular-nums font-mono text-[11px] leading-none">0</span>
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#F6FBF9] dark:bg-[#081A17] border border-[#B8E4DC]/60 dark:border-[#1E4D45] text-[#3B635C]/40 dark:text-[#99CBC2]/40 cursor-not-allowed select-none"
              aria-label={t(
                'services:disagree_disabled',
                'Tidak setuju (Dinyahdayakan)'
              )}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] leading-none">0</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenComments(confession)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#EBF7F4] dark:bg-[#11322C] border border-[#B8E4DC]/80 dark:border-[#1E4D45] text-[#0B2420] dark:text-[#F6FBF9] hover:border-[#0F766E]/40 transition-colors shrink-0 flex-nowrap cursor-pointer"
              title={t('services:student_comments', 'Ulasan Pelajar')}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-[11px] leading-none">
                {confession.comments_count || 0}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <PolySuaraReactions
              confessionId={confession.id}
              reactions={aggregateReactions(reactions || [], profileId)}
              onToggleReaction={onToggleReaction}
              totalUpvotes={confession.upvotes}
              isCivicIssue={isCivicIssue}
            />
            <button
              type="button"
              onClick={() => onDownvote(confession.id)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-colors shrink-0 flex-nowrap cursor-pointer',
                isDownvoted
                  ? 'bg-[#0B2420] text-white dark:bg-[#2DD4BF] dark:text-[#061714]'
                  : 'bg-[#F6FBF9] dark:bg-[#081A17] border border-[#B8E4DC]/80 dark:border-[#1E4D45] text-[#3B635C] dark:text-[#99CBC2] hover:text-[#0B2420] dark:hover:text-[#F6FBF9]'
              )}
              title={t('services:disagree_tooltip', 'Tidak setuju (Auto-moderasi)')}
            >
              <ThumbsDown className={cn('w-3.5 h-3.5', isDownvoted && 'fill-current')} />
              <span className="font-mono text-[11px] leading-none">
                {confession.downvotes || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenComments(confession)}
              className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium bg-[#F6FBF9] dark:bg-[#081A17] border border-[#B8E4DC]/80 dark:border-[#1E4D45] text-[#0B2420] dark:text-[#F6FBF9] hover:border-[#0F766E]/40 transition-colors shrink-0 flex-nowrap cursor-pointer"
              title={t('services:student_comments', 'Ulasan Pelajar')}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-[#0F766E] dark:text-[#2DD4BF]" />
              <span className="font-mono text-[11px] leading-none">
                {confession.comments_count || 0}
              </span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={() => onCopyLink(confession.id)}
            className="min-w-[36px] min-h-[36px] p-2 rounded-full text-[#3B635C] dark:text-[#99CBC2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF] hover:bg-[#EBF7F4] dark:hover:bg-[#11322C] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title={t('services:suara_copy_link_tooltip', 'Salin pautan post')}
            aria-label={t('services:suara_copy_link_tooltip', 'Salin pautan post')}
          >
            <Link2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onShareImage(confession.id)}
            className="min-w-[36px] min-h-[36px] p-2 rounded-full text-[#3B635C] dark:text-[#99CBC2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF] hover:bg-[#EBF7F4] dark:hover:bg-[#11322C] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title={t('services:share_graphic_tooltip', 'Kongsi Grafik')}
            aria-label={t('services:share_graphic_tooltip', 'Kongsi Grafik')}
          >
            {shareLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(confession.id)}
            className={cn(
              'min-w-[36px] min-h-[36px] p-2 rounded-full transition-colors shrink-0 flex items-center justify-center cursor-pointer',
              isBookmarked
                ? 'text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#11322C]'
                : 'text-[#3B635C] dark:text-[#99CBC2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF] hover:bg-[#EBF7F4] dark:hover:bg-[#11322C]'
            )}
            title={
              isBookmarked
                ? t('services:remove_bookmark_tooltip', 'Padam Penanda Buku')
                : t('services:save_bookmark_tooltip', 'Simpan Penanda Buku')
            }
            aria-label={
              isBookmarked
                ? t('services:remove_bookmark_tooltip', 'Padam Penanda Buku')
                : t('services:save_bookmark_tooltip', 'Simpan Penanda Buku')
            }
          >
            <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-current')} />
          </button>

          {canReplyJpp && !confession.official_reply && (
            <button
              type="button"
              onClick={() => onOpenJppReply(confession)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EBF7F4] dark:bg-[#11322C] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#1E4D45] hover:bg-[#D5EFEA] dark:hover:bg-[#18443C] transition-colors shrink-0 flex-nowrap cursor-pointer flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              {t('services:reply_jpp', 'Balas JPP')}
            </button>
          )}

          {isMine && confession.official_reply && !confession.author_reply && (
            <button
              type="button"
              onClick={() => onOpenAuthorReply(confession.id)}
              className="text-[11px] font-bold text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#11322C] hover:bg-[#D5EFEA] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 shrink-0 flex-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              {t('services:reply_jpp', 'Balas JPP')}
            </button>
          )}

          {canReplyJpp && (
            <button
              type="button"
              onClick={() => onTogglePin(confession.id, !!confession.is_pinned)}
              className={cn(
                'p-1.5 rounded-full transition-colors shrink-0 cursor-pointer',
                confession.is_pinned
                  ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
                  : 'text-[#3B635C] dark:text-[#99CBC2] hover:text-yellow-600 hover:bg-[#EBF7F4] dark:hover:bg-[#11322C]'
              )}
              title={
                confession.is_pinned
                  ? t('services:unpin_confession_tooltip', 'Nyah-pin luahan')
                  : t('services:pin_confession_tooltip', 'Pin ke atas suapan')
              }
            >
              <Pin className={cn('w-4 h-4', confession.is_pinned && 'fill-yellow-500')} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
