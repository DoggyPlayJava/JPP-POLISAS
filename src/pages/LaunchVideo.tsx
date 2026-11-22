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
    const portalOrigin =
      typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : DEFAULT_LAUNCH_PROPS.portalUrl;

    return {
      ...DEFAULT_LAUNCH_PROPS,
      portalUrl: portalOrigin,
      stats,
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
    if (!stageRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stageRef.current.requestFullscreen();
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
    return () => {
      window.removeEventListener('mousemove', revealHud);
      window.removeEventListener('keydown', revealHud);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // Fullscreen & keyboard stage shortcuts (Space, F, R, Arrows, 1-8)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onKeyDown = (e: KeyboardEvent) => {
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
        jumpToChapter(activeChapterIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        jumpToChapter(activeChapterIdx - 1);
      } else if (e.key >= '1' && e.key <= '8') {
        jumpToChapter(Number(e.key) - 1);
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeChapterIdx, jumpToChapter, replayFromStart, toggleFullscreen, togglePlay]);

  const progressPct = (currentFrame / Math.max(1, LAUNCH_TOTAL_FRAMES - 1)) * 100;

  return (
    <div
      ref={stageRef}
      className="h-screen w-screen overflow-hidden bg-[#F8F6EE] text-[#2E3A2F] relative flex items-center justify-center select-none"
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
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,1120px)] rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2] shadow-lg px-4 py-3 transition-opacity duration-300 ${
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
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const target = Math.round(ratio * (LAUNCH_TOTAL_FRAMES - 1));
            playerRef.current?.seekTo(target);
            setCurrentFrame(target);
          }}
          className="h-1.5 w-full rounded-full bg-[#F2EDE4] cursor-pointer mb-3 overflow-hidden"
        >
          <div className="h-full bg-[#C96F4F] rounded-full" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Transport Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda tayangan' : 'Main tayangan'}
              className="h-9 w-9 rounded-xl bg-[#2E3A2F] text-[#F8F6EE] flex items-center justify-center hover:bg-[#232C24]"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={replayFromStart}
              aria-label="Ulang dari mula"
              className="h-9 w-9 rounded-xl bg-[#F2EDE4] text-[#2E3A2F] border border-[#D9C9B2] flex items-center justify-center hover:bg-[#D9C9B2]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Keluar skrin penuh' : 'Skrin penuh'}
              className="h-9 w-9 rounded-xl bg-[#F2EDE4] text-[#2E3A2F] border border-[#D9C9B2] flex items-center justify-center hover:bg-[#D9C9B2]"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* 8 Chapter Jump Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            {LAUNCH_CHAPTERS.map((ch, idx) => {
              const active = idx === activeChapterIdx;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jumpToChapter(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wide whitespace-nowrap border ${
                    active
                      ? 'bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F]'
                      : 'bg-[#FFFFFF] text-[#556453] border-[#D9C9B2] hover:text-[#2E3A2F]'
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C96F4F] text-[#F8F6EE] text-xs font-extrabold uppercase tracking-wider hover:bg-[#2E3A2F]"
          >
            <span>Masuk Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
