import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type CallbackListener, type PlayerRef } from '@remotion/player';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import { useCampusStats } from '@/hooks/useCampusStats';
import { JppLaunchCinema } from '../../remotion/launch/JppLaunchCinema';
import {
  DEFAULT_LAUNCH_PROPS,
  LAUNCH_CHAPTERS,
  LAUNCH_TOTAL_FRAMES,
  type LaunchShowcaseProps,
} from '../../remotion/launch/schema';
import { LAUNCH_FPS, LAUNCH_HEIGHT, LAUNCH_WIDTH } from '../../remotion/launch/tokens';

export function LaunchVideo() {
  const navigate = useNavigate();
  const stats = useCampusStats();
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  const inputProps = useMemo<LaunchShowcaseProps>(() => {
    const isLocalHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]');

    const portalOrigin =
      typeof window !== 'undefined' &&
      !isLocalHost &&
      window.location.origin.startsWith('http')
        ? window.location.origin
        : DEFAULT_LAUNCH_PROPS.portalUrl;

    return {
      ...DEFAULT_LAUNCH_PROPS,
      portalUrl: portalOrigin,
      stats: {
        ...stats,
        studentsCount: Math.max(stats.studentsCount, DEFAULT_LAUNCH_PROPS.stats.studentsCount),
      },
    };
  }, [stats]);

  const activeChapterIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < LAUNCH_CHAPTERS.length; i++) {
      if (currentFrame >= LAUNCH_CHAPTERS[i].startFrame) {
        idx = i;
      }
    }
    return idx;
  }, [currentFrame]);

  const activeChapterIdxRef = useRef(activeChapterIdx);
  activeChapterIdxRef.current = activeChapterIdx;

  const jumpToChapter = useCallback((chapterIndex: number) => {
    const clamped = Math.max(0, Math.min(LAUNCH_CHAPTERS.length - 1, chapterIndex));
    playerRef.current?.seekTo(LAUNCH_CHAPTERS[clamped].startFrame);
    setCurrentFrame(LAUNCH_CHAPTERS[clamped].startFrame);
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, []);

  const replayFromStart = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(0);
    player.play();
    setCurrentFrame(0);
    setIsPlaying(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen();
        }
      } else if (typeof stage.requestFullscreen === 'function') {
        await stage.requestFullscreen();
      }
    } catch {
      // Ignore unsupported fullscreen in restricted browsers or iframes
    }
  }, []);

  // Sync frame & play state from Remotion Player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame: CallbackListener<'frameupdate'> = (e) => setCurrentFrame(e.detail.frame);
    const onPlay: CallbackListener<'play'> = () => setIsPlaying(true);
    const onPause: CallbackListener<'pause'> = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, []);

  // Auto-hide stage HUD after 2.5s of inactivity
  useEffect(() => {
    let hideTimer: number | undefined;
    const revealHud = () => {
      setHudVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setHudVisible(false), 2500);
    };
    revealHud();
    window.addEventListener('mousemove', revealHud);
    window.addEventListener('keydown', revealHud);
    window.addEventListener('touchstart', revealHud, { passive: true });
    return () => {
      window.removeEventListener('mousemove', revealHud);
      window.removeEventListener('keydown', revealHud);
      window.removeEventListener('touchstart', revealHud);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // Sync fullscreen state once on mount
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  // Keyboard stage shortcuts (Space, F, R, Arrows, 1-9)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        void toggleFullscreen();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        replayFromStart();
      } else if (e.key === 'ArrowRight') {
        jumpToChapter(activeChapterIdxRef.current + 1);
      } else if (e.key === 'ArrowLeft') {
        jumpToChapter(activeChapterIdxRef.current - 1);
      } else if (e.key >= '1' && e.key <= '9') {
        jumpToChapter(Number(e.key) - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [jumpToChapter, replayFromStart, toggleFullscreen, togglePlay]);

  const progressPct = (currentFrame / Math.max(1, LAUNCH_TOTAL_FRAMES - 1)) * 100;

  return (
    <div
      ref={stageRef}
      className="h-screen w-screen overflow-hidden bg-[#F6FBF9] text-[#0B2420] relative flex items-center justify-center select-none"
    >
      {/* Pure 16:9 Stage Cinema Container */}
      <div
        className="relative aspect-video w-full max-h-screen"
        style={{ maxWidth: 'calc(100vh * 16 / 9)' }}
      >
        <Player
          ref={playerRef}
          component={JppLaunchCinema}
          inputProps={inputProps}
          durationInFrames={LAUNCH_TOTAL_FRAMES}
          fps={LAUNCH_FPS}
          compositionWidth={LAUNCH_WIDTH}
          compositionHeight={LAUNCH_HEIGHT}
          style={{ width: '100%', height: '100%' }}
          autoPlay
          loop
          clickToPlay
        />
      </div>

      {/* Minimal Auto-Hide Stage HUD (Opaque surfaces — 100% GPU Baseline Compliant) */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(98vw,1420px)] rounded-2xl bg-[#FFFFFF] border border-[#B8E4DC] shadow-lg px-3 py-2.5 transition-opacity duration-300 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrub Progress Bar */}
        <div
          role="slider"
          aria-label="Garis masa tayangan pelancaran"
          aria-valuemin={0}
          aria-valuemax={LAUNCH_TOTAL_FRAMES - 1}
          aria-valuenow={currentFrame}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const target = Math.round(ratio * (LAUNCH_TOTAL_FRAMES - 1));
            playerRef.current?.seekTo(target);
            setCurrentFrame(target);
          }}
          className="h-1.5 w-full rounded-full bg-[#EBF7F4] cursor-pointer mb-2.5 overflow-hidden"
        >
          <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
          {/* Transport Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda tayangan' : 'Main tayangan'}
              className="h-8 w-8 rounded-xl bg-[#0B2420] text-[#FFFFFF] flex items-center justify-center hover:bg-[#061714]"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={replayFromStart}
              aria-label="Ulang dari mula"
              className="h-8 w-8 rounded-xl bg-[#EBF7F4] text-[#0B2420] border border-[#B8E4DC] flex items-center justify-center hover:bg-[#B8E4DC]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Keluar skrin penuh' : 'Skrin penuh'}
              className="h-8 w-8 rounded-xl bg-[#EBF7F4] text-[#0B2420] border border-[#B8E4DC] flex items-center justify-center hover:bg-[#B8E4DC]"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* 9 Chapter Jump Pills */}
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 max-w-full">
            {LAUNCH_CHAPTERS.map((ch, idx) => {
              const active = idx === activeChapterIdx;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jumpToChapter(idx)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-bold tracking-tight whitespace-nowrap border ${
                    active
                      ? 'bg-[#0D9488] text-[#FFFFFF] border-[#0D9488]'
                      : 'bg-[#FFFFFF] text-[#3B635C] border-[#B8E4DC] hover:text-[#0B2420]'
                  }`}
                >
                  {ch.indexLabel} {ch.title}
                </button>
              );
            })}
          </div>

          {/* Official Portal CTA */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D9488] text-[#FFFFFF] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#0B2420]"
          >
            <span>Masuk Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
