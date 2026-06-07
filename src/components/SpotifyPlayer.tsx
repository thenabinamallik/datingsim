import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Music, Volume2, Send, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayerState } from "@/hooks/useRoomRealtime";

/* ── YouTube IFrame API types ── */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface SpotifyPlayerProps {
  playerState: PlayerState | null;
  updatePlayer: (
    newState: Partial<Omit<PlayerState, "updatedAt" | "updatedBy">>
  ) => Promise<void>;
  selfId: string | null;
}

/* ── Helpers ── */

function extractVideoId(url: string): string | null {
  if (!url) return null;
  // youtube.com/watch?v=ID
  const match1 = url.match(/[?&]v=([^&#]+)/);
  if (match1) return match1[1];
  // youtu.be/ID
  const match2 = url.match(/youtu\.be\/([^?&#]+)/);
  if (match2) return match2[1];
  // youtube.com/embed/ID
  const match3 = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (match3) return match3[1];
  // youtube.com/shorts/ID
  const match4 = url.match(/youtube\.com\/shorts\/([^?&#]+)/);
  if (match4) return match4[1];
  // might already be just an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Load the YT IFrame API script once globally */
let apiLoadPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

export default function SpotifyPlayer({
  playerState,
  updatePlayer,
  selfId,
}: SpotifyPlayerProps) {
  const [urlInput, setUrlInput] = useState("");
  const [localProgress, setLocalProgress] = useState(0);
  const [localUrl, setLocalUrl] = useState("");
  const [localPlaying, setLocalPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const ytPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ignoreRemoteUntilRef = useRef<number>(0);

  /* ── 1. Create / update YT player ── */
  useEffect(() => {
    const videoId = extractVideoId(localUrl);
    if (!videoId) return;

    let cancelled = false;

    const init = async () => {
      await loadYTApi();
      if (cancelled) return;

      // If player already exists, just cue new video
      if (ytPlayerRef.current) {
        setIsReady(false);
        ytPlayerRef.current.loadVideoById(videoId);
        return;
      }

      // Create a target div for the iframe
      if (!containerRef.current) return;
      const targetDiv = document.createElement("div");
      targetDiv.id = "yt-player-" + Date.now();
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(targetDiv);

      ytPlayerRef.current = new window.YT.Player(targetDiv.id, {
        height: "1",
        width: "1",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            if (cancelled) return;
            setIsReady(true);
            setDuration(event.target.getDuration() || 0);
            event.target.setVolume(volume[0]);
            if (localPlaying) event.target.playVideo();
          },
          onStateChange: (event: any) => {
            if (cancelled) return;
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
          },
          onError: (event: any) => {
            console.error("[YT Player] Error code:", event.data);
          },
        },
      });
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUrl]);

  /* ── 2. Sync play/pause state to YT player ── */
  useEffect(() => {
    if (!ytPlayerRef.current || !isReady) return;
    try {
      const state = ytPlayerRef.current.getPlayerState?.();
      // YT states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
      if (localPlaying && state !== 1 && state !== 3) {
        ytPlayerRef.current.playVideo();
      } else if (!localPlaying && state === 1) {
        ytPlayerRef.current.pauseVideo();
      }
    } catch {
      // player might not be ready yet
    }
  }, [localPlaying, isReady]);

  /* ── 3. Sync volume ── */
  useEffect(() => {
    if (!ytPlayerRef.current || !isReady) return;
    try {
      ytPlayerRef.current.setVolume(volume[0]);
    } catch { /* ignore */ }
  }, [volume, isReady]);

  /* ── 4. Progress tracking interval ── */
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isReady && localPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (!ytPlayerRef.current || isSeeking) return;
        try {
          const t = ytPlayerRef.current.getCurrentTime?.();
          if (typeof t === "number") setLocalProgress(t);
          const d = ytPlayerRef.current.getDuration?.();
          if (typeof d === "number" && d > 0) setDuration(d);
        } catch { /* ignore */ }
      }, 500);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isReady, localPlaying, isSeeking]);

  /* ── 5. Sync from remote (partner) state ── */
  useEffect(() => {
    if (!playerState) return;
    if (Date.now() < ignoreRemoteUntilRef.current) return;

    if (playerState.updatedBy !== selfId) {
      // URL changed
      if (playerState.url && playerState.url !== localUrl) {
        setLocalUrl(playerState.url);
        setIsReady(false);
        setLocalProgress(0);
      }
      setLocalPlaying(playerState.isPlaying);

      // Seek if drift > 3s
      if (ytPlayerRef.current && isReady) {
        try {
          const currentPos = ytPlayerRef.current.getCurrentTime?.() || 0;
          if (Math.abs(currentPos - playerState.position) > 3 && !isSeeking) {
            ytPlayerRef.current.seekTo(playerState.position, true);
          }
        } catch { /* ignore */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState]);

  /* ── 6. Cleanup ── */
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
        ytPlayerRef.current = null;
      }
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  /* ── Handlers ── */

  const handlePlayPause = useCallback(() => {
    const next = !localPlaying;
    setLocalPlaying(next);
    ignoreRemoteUntilRef.current = Date.now() + 1000;
    let pos = 0;
    try {
      pos = ytPlayerRef.current?.getCurrentTime?.() || 0;
    } catch { /* ignore */ }
    updatePlayer({ isPlaying: next, position: pos });
  }, [localPlaying, updatePlayer]);

  const handleSeekCommit = useCallback(
    (vals: number[]) => {
      setIsSeeking(false);
      const newPos = vals[0];
      ignoreRemoteUntilRef.current = Date.now() + 1000;
      try {
        ytPlayerRef.current?.seekTo?.(newPos, true);
      } catch { /* ignore */ }
      updatePlayer({ position: newPos, isPlaying: localPlaying });
    },
    [localPlaying, updatePlayer]
  );

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!urlInput.trim()) return;
      const raw = urlInput.trim();
      const vid = extractVideoId(raw);
      if (!vid) {
        console.warn("[SpotifyPlayer] Could not extract video ID from:", raw);
        return;
      }
      ignoreRemoteUntilRef.current = Date.now() + 2000;
      setLocalUrl(raw);
      setLocalPlaying(true);
      setLocalProgress(0);
      setDuration(0);
      setIsReady(false);
      updatePlayer({ url: raw, isPlaying: true, position: 0 });
      setUrlInput("");
    },
    [urlInput, updatePlayer]
  );

  const currentUrl = localUrl || playerState?.url || "";
  const hasTrack = !!extractVideoId(currentUrl);

  return (
    <div className="glass-card rounded-2xl p-3 flex flex-col gap-3 w-full border border-white/10 shadow-xl bg-background/60 backdrop-blur-md">
      {/* Hidden YT player container */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          width: 1,
          height: 1,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
        <Music className="w-4 h-4 text-primary/70 shrink-0 ml-1" />
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={
            hasTrack ? "Change YouTube URL..." : "Paste YouTube URL to play..."
          }
          className="h-7 text-xs bg-black/20 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-primary/70 hover:text-primary hover:bg-primary/10"
          disabled={!urlInput.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-32 p-3 bg-card border-border/50 backdrop-blur-md"
            align="end"
          >
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-full"
            />
          </PopoverContent>
        </Popover>
      </form>

      {/* Player Controls */}
      {hasTrack ? (
        <div className="flex gap-3 items-center">
          {/* Play / Pause button */}
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center shrink-0 ring-1 ring-white/10 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            {localPlaying ? (
              <Pause className="w-5 h-5 text-white fill-current" />
            ) : (
              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
            )}
          </button>

          {/* Progress */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pr-1">
            <div className="truncate text-xs font-medium text-foreground/80">
              {isReady ? "♫ Now Playing" : "⏳ Loading..."}
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                {formatTime(localProgress)}
              </span>
              <Slider
                value={[localProgress]}
                max={duration || 100}
                step={0.5}
                onValueChange={(vals) => {
                  setIsSeeking(true);
                  setLocalProgress(vals[0]);
                }}
                onValueCommit={handleSeekCommit}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center text-xs text-muted-foreground/50 italic border border-dashed border-white/10 rounded-lg bg-black/10">
          🎵 Paste a YouTube link above to play together
        </div>
      )}
    </div>
  );
}
