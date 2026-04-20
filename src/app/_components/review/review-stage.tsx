"use client";

import clsx from "clsx";
import { Range, getTrackBackground } from "react-range";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PlaylistRailData } from "@/lib/spotify/library";
import type { QueueData, QueueTrack } from "@/lib/spotify/queue";

const PLAYER_NAME = "Spotify Playlist Manager";

type SpotifyPlayerState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track?: {
      uri?: string;
    };
  };
};

type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: <TPayload = unknown>(event: string, cb: (payload: TPayload) => void) => void;
  removeListener: <TPayload = unknown>(event: string, cb?: (payload: TPayload) => void) => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
};

type SpotifySdk = {
  Player: new (config: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }) => SpotifyPlayer;
};

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
const RIBBON_KEYS = ["S", "D", "F", "G", "H", "J", "K", "L"];

type ReviewStageProps = {
  playlistRailData: PlaylistRailData | null;
  queueData: QueueData | null;
  loading: boolean;
  error: string | null;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  playlistMeta: {
    title: string;
    artworkUrl: string | null;
  };
  spotifyUser: {
    spotifyId: string;
    displayName: string | null;
    email: string | null;
  } | null;
  onFinish?: (summary: ReviewSummaryData) => void;
};

type TrackAction = "pending" | "keep" | "remove";

type TrackState = QueueTrack & {
  action: TrackAction;
};

type HistoryEntry = {
  trackId: string;
  previousAction: TrackAction;
  previousIndex: number;
};

export type SummaryTrack = {
  id: string;
  title: string;
  artists: string;
  artworkUrl: string | null;
  addCount?: number;
};

export type ReviewSummaryData = {
  sessionId: string | null;
  playlistTitle: string;
  artworkUrl: string | null;
  removed: SummaryTrack[];
  kept: SummaryTrack[];
  added: SummaryTrack[];
  pendingCount: number;
};

const gradients = [
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-purple-500",
  "from-blue-500 to-cyan-400",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-violet-500",
  "from-fuchsia-500 to-pink-500",
  "from-green-500 to-lime-400",
  "from-sky-500 to-blue-700",
];

const randomGradient = () => gradients[Math.floor(Math.random() * gradients.length)];

export default function ReviewStage({
  playlistRailData,
  queueData,
  loading,
  error,
  onLoadMore,
  loadingMore = false,
  playlistMeta,
  spotifyUser,
  onFinish,
}: ReviewStageProps) {
  const [trackStates, setTrackStates] = useState<TrackState[]>(() =>
    (queueData?.tracks ?? []).map(track => ({ ...track, action: "pending" as TrackAction })),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const historyRef = useRef<HistoryEntry[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [ribbonOffset, setRibbonOffset] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [newPlaylistModal, setNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [localPlaylists, setLocalPlaylists] = useState<
    { id: string; name: string; artworkUrl: string | null }[]
  >([]);
  const [lastActionLabel, setLastActionLabel] = useState<string>("No actions yet.");
  const [playlistTrackCache, setPlaylistTrackCache] = useState<Record<string, string[]>>({});
  const [addCounts, setAddCounts] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const playbackSourceRef = useRef<"none" | "preview" | "full">("none");
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [playbackTokenError, setPlaybackTokenError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackSource, setPlaybackSource] = useState<"none" | "preview" | "full">("none");
  const [activeTrackUri, setActiveTrackUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isSeeking, setIsSeeking] = useState(false);
  const isSeekingRef = useRef(false);
  const lastAutoPlayTrackIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const persistedTrackIdsRef = useRef<Set<string>>(new Set());
  const persistedActionsRef = useRef<Record<string, TrackAction>>({});
  const persistedAddCountsRef = useRef<Record<string, number>>({});
  const sessionLookupKeyRef = useRef<string | null>(null);
  const [sessionLookupDone, setSessionLookupDone] = useState(false);
  const lastSourceKeyRef = useRef<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{
    sessionId: string;
    pendingCount: number;
    reviewedCount: number;
  } | null>(null);

  useEffect(() => {
    const nextSourceKey = queueData
      ? queueData.source.type === "playlist"
        ? `playlist:${queueData.source.id}`
        : "liked"
      : null;
    const sourceChanged = nextSourceKey !== lastSourceKeyRef.current;
    lastSourceKeyRef.current = nextSourceKey;

    const persistedActions = persistedActionsRef.current;
    setTrackStates(prevTracks => {
      const previousActions = new Map(prevTracks.map(track => [track.id, track.action]));
      return (queueData?.tracks ?? []).map(track => ({
        ...track,
        action: previousActions.get(track.id) ?? persistedActions[track.id] ?? "pending",
      }));
    });

    setAddCounts(prevAddCounts => ({
      ...persistedAddCountsRef.current,
      ...prevAddCounts,
    }));

    if (sourceChanged) {
      setActiveIndex(0);
      historyRef.current = [];
      setSelectedPlaylists(new Set());
      setIsAddMode(false);
      setLastActionLabel("No actions yet.");
      setPlaybackSource("none");
      setActiveTrackUri(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(30);
      lastAutoPlayTrackIdRef.current = null;
      setReviewSessionId(null);
      persistedTrackIdsRef.current = new Set();
      persistedActionsRef.current = {};
      persistedAddCountsRef.current = {};
      sessionLookupKeyRef.current = null;
      setSessionLookupDone(false);
    }
  }, [queueData]);

  useEffect(() => {
    playbackSourceRef.current = playbackSource;
  }, [playbackSource]);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  const allPlaylists = useMemo(() => {
    const base =
      playlistRailData?.playlists.map(p => ({
        id: p.id,
        name: p.name,
        artworkUrl: p.images?.[0]?.url ?? null,
      })) ?? [];
    return [...localPlaylists, ...base];
  }, [playlistRailData, localPlaylists]);

  const visiblePlaylists = allPlaylists.slice(ribbonOffset, ribbonOffset + RIBBON_KEYS.length);

  const currentTrack = trackStates[activeIndex] ?? null;
  const totalTracks = trackStates.length;
  const previewUrl = currentTrack?.previewUrl ?? null;
  const canUseFullPlayback = Boolean(currentTrack?.uri && playbackToken && deviceId);
  const playbackUnavailable = !previewUrl && !canUseFullPlayback;

  const findFirstPendingIndex = useCallback(
    (actionMap: Record<string, TrackAction>, tracks: QueueTrack[]) => {
      const index = tracks.findIndex(track => (actionMap[track.id] ?? "pending") === "pending");
      return index === -1 ? null : index;
    },
    [],
  );

  const applyPersistedState = useCallback(
    (sessionId: string) => {
      const actionMap = persistedActionsRef.current;
      const addCountMap = persistedAddCountsRef.current;
      setReviewSessionId(sessionId);
      setTrackStates(prev =>
        prev.map(track => ({
          ...track,
          action: actionMap[track.id] ?? track.action,
        })),
      );
      setAddCounts(addCountMap);
      if (queueData) {
        const firstPendingIndex = findFirstPendingIndex(actionMap, queueData.tracks);
        if (firstPendingIndex !== null) {
          setActiveIndex(firstPendingIndex);
        }
      }
    },
    [findFirstPendingIndex, queueData],
  );

  useEffect(() => {
    if (currentTrack?.durationMs) {
      setDuration(currentTrack.durationMs / 1000);
    } else {
      setDuration(30);
    }
  }, [currentTrack?.durationMs]);

  useEffect(() => {
    if (!queueData || !spotifyUser) return;
    const sourceKey =
      queueData.source.type === "playlist" ? `playlist:${queueData.source.id}` : "liked";
    if (sessionLookupKeyRef.current === sourceKey) return;
    sessionLookupKeyRef.current = sourceKey;
    setSessionLookupDone(false);
    const fetchSession = async () => {
      try {
        const params = new URLSearchParams({
          spotifyId: spotifyUser.spotifyId,
          sourceType: queueData.source.type,
        });
        if (queueData.source.type === "playlist") {
          params.set("sourceId", queueData.source.id);
        }
        const response = await fetch(`/api/review/sessions/active?${params.toString()}`);
        if (!response.ok) {
          setSessionLookupDone(true);
          return;
        }
        const data: {
          sessionId: string | null;
          tracks?: { trackId: string; action: string; addCount: number }[];
        } = await response.json();
        if (data.sessionId) {
          setReviewSessionId(data.sessionId);
          const actionMap: Record<string, TrackAction> = {};
          const addCountMap: Record<string, number> = {};
          (data.tracks ?? []).forEach(track => {
            const normalized = track.action?.toLowerCase?.() ?? "pending";
            actionMap[track.trackId] =
              normalized === "keep" || normalized === "remove" || normalized === "pending"
                ? (normalized as TrackAction)
                : "pending";
            if (track.addCount > 0) {
              addCountMap[track.trackId] = track.addCount;
            }
          });
          persistedActionsRef.current = actionMap;
          persistedAddCountsRef.current = addCountMap;
          const pendingCount = Object.values(actionMap).filter(
            action => action === "pending",
          ).length;
          const reviewedCount = Object.values(actionMap).filter(
            action => action !== "pending",
          ).length;
          if (reviewedCount > 0 || Object.keys(addCountMap).length > 0) {
            setResumePrompt({
              sessionId: data.sessionId,
              pendingCount,
              reviewedCount,
            });
          } else {
            applyPersistedState(data.sessionId);
          }
        }
        setSessionLookupDone(true);
      } catch (err) {
        console.error("Failed to load review session:", err);
        setSessionLookupDone(true);
      }
    };
    fetchSession();
  }, [applyPersistedState, queueData, spotifyUser]);

  const createSession = useCallback(async () => {
    if (!queueData || !spotifyUser) return;
    try {
      const response = await fetch("/api/review/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: spotifyUser,
          source: queueData.source,
          tracks: queueData.tracks,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create review session.");
      }
      const data: { sessionId: string } = await response.json();
      setReviewSessionId(data.sessionId);
      persistedTrackIdsRef.current = new Set(queueData.tracks.map(track => track.id));
    } catch (err) {
      console.error("Failed to create review session:", err);
    }
  }, [queueData, spotifyUser]);

  useEffect(() => {
    if (!queueData || !spotifyUser || reviewSessionId || !sessionLookupDone) return;
    if (!resumePrompt) {
      createSession();
    }
  }, [createSession, queueData, resumePrompt, reviewSessionId, sessionLookupDone, spotifyUser]);

  useEffect(() => {
    if (!queueData || !reviewSessionId) return;
    if (!spotifyUser) return;
    const existing = persistedTrackIdsRef.current;
    const newTracks = queueData.tracks.filter(track => !existing.has(track.id));
    if (newTracks.length === 0) return;
    const startIndex = queueData.tracks.length - newTracks.length;
    const appendTracks = async () => {
      try {
        const response = await fetch(`/api/review/sessions/${reviewSessionId}/tracks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-spotify-id": spotifyUser.spotifyId,
          },
          body: JSON.stringify({
            tracks: newTracks,
            startIndex,
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to append review tracks.");
        }
        newTracks.forEach(track => existing.add(track.id));
      } catch (err) {
        console.error("Failed to append review tracks:", err);
      }
    };
    appendTracks();
  }, [queueData, reviewSessionId, spotifyUser]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
    if (!isPlaying || playbackSource !== "full" || isSeeking) {
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTickRef.current == null) {
        lastTickRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTickRef.current) / 1000;
      lastTickRef.current = timestamp;
      setCurrentTime(prev => Math.min(prev + deltaSeconds, duration));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      lastTickRef.current = null;
    };
  }, [duration, isPlaying, isSeeking, playbackSource]);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const fetchPlaybackToken = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/token");
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error ??
          (response.status === 403
            ? "Missing required Spotify scopes. Log out and re-authorize."
            : "Failed to fetch Spotify token.");
        if (response.status === 403 && Array.isArray(errorBody?.missingScopes)) {
          setPlaybackTokenError(
            `Missing scopes: ${errorBody.missingScopes.join(", ")}. Log out and re-authorize.`,
          );
        } else {
          setPlaybackTokenError(message);
        }
        setPlaybackToken(null);
        return;
      }
      const data: { accessToken: string } = await response.json();
      setPlaybackToken(data.accessToken);
      setPlaybackTokenError(null);
    } catch (err) {
      console.error("Failed to load Spotify playback token:", err);
      setPlaybackTokenError("Spotify playback token unavailable.");
    }
  }, []);

  useEffect(() => {
    fetchPlaybackToken();
  }, [fetchPlaybackToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Spotify) {
      setSdkReady(true);
      return;
    }
    if (document.querySelector("script[data-spotify-player]")) {
      window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifyPlayer = "true";
    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!sdkReady || !playbackToken) return;
    if (!window.Spotify || playerRef.current) return;
    const player = new window.Spotify.Player({
      name: PLAYER_NAME,
      getOAuthToken: cb => cb(playbackToken),
      volume: 0.7,
    });

    const handleReady = ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
    };

    const handleNotReady = () => {
      setDeviceId(null);
    };

    const handleStateChanged = (state: SpotifyPlayerState | null) => {
      if (!state || playbackSourceRef.current === "preview") return;
      if (isSeekingRef.current) return;
      setPlaybackSource("full");
      setIsPlaying(!state.paused);
      setCurrentTime(state.position / 1000);
      setDuration(state.duration / 1000);
      setActiveTrackUri(state.track_window.current_track?.uri ?? null);
    };

    const handleAuthError = (payload: { message?: string }) => {
      setPlaybackTokenError(payload.message ?? "Spotify authentication error.");
    };

    const handleAccountError = (payload: { message?: string }) => {
      setPlaybackTokenError(payload.message ?? "Spotify playback error.");
    };

    player.addListener("ready", handleReady);
    player.addListener("not_ready", handleNotReady);
    player.addListener("player_state_changed", handleStateChanged);
    player.addListener("authentication_error", handleAuthError);
    player.addListener("account_error", handleAccountError);
    player.addListener("initialization_error", handleAccountError);

    player.connect().catch(err => {
      console.error("Failed to connect Spotify player:", err);
    });
    playerRef.current = player;

    return () => {
      player.removeListener("ready", handleReady);
      player.removeListener("not_ready", handleNotReady);
      player.removeListener("player_state_changed", handleStateChanged);
      player.removeListener("authentication_error", handleAuthError);
      player.removeListener("account_error", handleAccountError);
      player.removeListener("initialization_error", handleAccountError);
      player.disconnect();
      playerRef.current = null;
    };
  }, [playbackToken, sdkReady]);

  const fetchPlaybackDeviceId = useCallback(async () => {
    if (!playbackToken) return null;
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: {
          Authorization: `Bearer ${playbackToken}`,
        },
      });
      if (!response.ok) {
        return null;
      }
      const data: { devices?: { id: string; name: string }[] } = await response.json();
      const devices = data.devices ?? [];
      const named = devices.find(device => device.name === PLAYER_NAME);
      const resolvedId = named?.id ?? devices[0]?.id ?? null;
      if (resolvedId) {
        setDeviceId(resolvedId);
      }
      return resolvedId;
    } catch (err) {
      console.error("Failed to fetch playback devices:", err);
      return null;
    }
  }, [playbackToken]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    setPlaybackSource("none");
    if (previewUrl) {
      audio.src = previewUrl;
      audio.load();
    } else {
      audio.removeAttribute("src");
    }
  }, [previewUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (playbackSourceRef.current !== "preview") return;
      if (isSeekingRef.current) return;
      setCurrentTime(audio.currentTime);
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        setDuration(30);
      }
    };

    const handleEnded = () => {
      if (playbackSourceRef.current !== "preview") return;
      setIsPlaying(false);
      setCurrentTime(audio.duration || 30);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const startPreviewPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return false;
    setPlaybackTokenError(null);
    setPlaybackSource("preview");
    try {
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, [previewUrl]);

  const startFullPlayback = useCallback(
    async (uri: string) => {
      if (!playbackToken) return false;
      let targetDeviceId = deviceId;
      if (!targetDeviceId) {
        targetDeviceId = await fetchPlaybackDeviceId();
      }
      if (!targetDeviceId) {
        setPlaybackTokenError("Playback device unavailable. Try restarting the player.");
        return false;
      }
      try {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        const transferResponse = await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${playbackToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [targetDeviceId],
            play: false,
          }),
        });

        if (!transferResponse.ok) {
          const errorText = await transferResponse.text();
          if (transferResponse.status === 404) {
            const refreshedDeviceId = await fetchPlaybackDeviceId();
            if (refreshedDeviceId) {
              targetDeviceId = refreshedDeviceId;
            } else {
              setPlaybackTokenError(`Playback device error: ${errorText}`);
              return false;
            }
          } else {
            setPlaybackTokenError(`Playback device error: ${errorText}`);
            return false;
          }
        }

        const playResponse = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${targetDeviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${playbackToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: [uri], position_ms: 0 }),
          },
        );

        if (!playResponse.ok) {
          const errorText = await playResponse.text();
          setPlaybackTokenError(`Playback failed: ${errorText}`);
          return false;
        }
        setPlaybackTokenError(null);
        setPlaybackSource("full");
        setActiveTrackUri(uri);
        setIsPlaying(true);
        return true;
      } catch (err) {
        console.error("Failed to start full playback:", err);
        return false;
      }
    },
    [deviceId, fetchPlaybackDeviceId, playbackToken],
  );

  useEffect(() => {
    if (!currentTrack) return;
    if (lastAutoPlayTrackIdRef.current === currentTrack.id) return;
    let cancelled = false;

    const autoPlay = async () => {
      if (currentTrack.uri && playbackToken) {
        const startedFullPlayback = await startFullPlayback(currentTrack.uri);
        if (cancelled) return;
        if (startedFullPlayback) {
          lastAutoPlayTrackIdRef.current = currentTrack.id;
          return;
        }
      }

      if (!previewUrl) return;
      const startedPreviewPlayback = await startPreviewPlayback();
      if (cancelled || !startedPreviewPlayback) return;
      lastAutoPlayTrackIdRef.current = currentTrack.id;
    };

    void autoPlay();

    return () => {
      cancelled = true;
    };
  }, [currentTrack, playbackToken, previewUrl, startFullPlayback, startPreviewPlayback]);

  const togglePlayback = useCallback(async () => {
    if (currentTrack?.uri && playbackToken) {
      if (
        playbackSourceRef.current === "full" &&
        activeTrackUri === currentTrack.uri &&
        playerRef.current
      ) {
        await playerRef.current.togglePlay();
        return;
      }
      const startedFullPlayback = await startFullPlayback(currentTrack.uri);
      if (startedFullPlayback) {
        return;
      }
    }

    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    if (playbackSourceRef.current !== "preview") {
      await startPreviewPlayback();
      return;
    }
    if (audio.paused) {
      await startPreviewPlayback();
    } else {
      audio.pause();
      setPlaybackSource("preview");
      setIsPlaying(false);
    }
  }, [
    activeTrackUri,
    currentTrack?.uri,
    playbackToken,
    previewUrl,
    startFullPlayback,
    startPreviewPlayback,
  ]);

  const restartPlayback = useCallback(async () => {
    if (canUseFullPlayback && playbackToken && deviceId) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/seek?position_ms=0&device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${playbackToken}`,
            },
          },
        );
        if (!isPlaying && playerRef.current) {
          await playerRef.current.togglePlay();
        }
        setPlaybackSource("full");
        setIsPlaying(true);
        return;
      } catch (err) {
        console.error("Failed to restart full playback:", err);
      }
    }
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    setPlaybackSource("preview");
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [canUseFullPlayback, deviceId, isPlaying, playbackToken, previewUrl]);

  const handleSeek = useCallback(
    async (value: number) => {
      const nextTime = Math.max(0, Math.min(value, duration));
      setCurrentTime(nextTime);
      if (canUseFullPlayback && playbackToken && deviceId) {
        try {
          await fetch(
            `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
              nextTime * 1000,
            )}&device_id=${deviceId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${playbackToken}`,
              },
            },
          );
        } catch (err) {
          console.error("Failed to seek full playback:", err);
        }
        return;
      }
      const audio = audioRef.current;
      if (!audio || !previewUrl) return;
      setPlaybackSource("preview");
      audio.currentTime = nextTime;
    },
    [canUseFullPlayback, deviceId, duration, playbackToken, previewUrl],
  );

  const setAction = useCallback(
    (action: TrackAction) => {
      setTrackStates(prev => {
        const next = [...prev];
        const current = next[activeIndex];
        if (!current || current.action === action) return prev;
        historyRef.current = [
          ...historyRef.current,
          { trackId: current.id, previousAction: current.action, previousIndex: activeIndex },
        ];
        setLastActionLabel(`Set to ${action}`);
        next[activeIndex] = { ...current, action };
        return next;
      });
      if (reviewSessionId && currentTrack && spotifyUser) {
        fetch(`/api/review/sessions/${reviewSessionId}/tracks/${currentTrack.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-spotify-id": spotifyUser.spotifyId,
          },
          body: JSON.stringify({
            action: action.toUpperCase(),
          }),
        }).catch(err => {
          console.error("Failed to persist track action:", err);
        });
      }
      setActiveIndex(index => Math.min(totalTracks - 1, index + 1));
    },
    [activeIndex, currentTrack, reviewSessionId, spotifyUser, totalTracks],
  );

  const undo = useCallback(() => {
    if (selectedPlaylists.size > 0) {
      setSelectedPlaylists(new Set());
      setIsAddMode(false);
      setLastActionLabel("Cleared selections");
      return;
    }
    const last = historyRef.current.at(-1);
    if (!last) return;
    setTrackStates(prev => {
      const next = [...prev];
      const idx = next.findIndex(t => t.id === last.trackId);
      if (idx !== -1) {
        next[idx] = { ...next[idx], action: last.previousAction };
      }
      setActiveIndex(last.previousIndex);
      return next;
    });
    historyRef.current = historyRef.current.slice(0, -1);
    setLastActionLabel("Undid last action");
  }, [selectedPlaylists.size]);

  const togglePlaylistSelection = useCallback((id: string) => {
    setSelectedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsAddMode(true);
  }, []);

  const closeSession = useCallback(
    async (sessionId: string) => {
      if (!spotifyUser) return;
      try {
        await fetch(`/api/review/sessions/${sessionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-spotify-id": spotifyUser.spotifyId,
          },
          body: JSON.stringify({ status: "COMPLETED" }),
        });
      } catch (err) {
        console.error("Failed to close review session:", err);
      }
    },
    [spotifyUser],
  );

  const discardPersistedState = useCallback(async () => {
    if (!resumePrompt) return;
    await closeSession(resumePrompt.sessionId);
    persistedActionsRef.current = {};
    persistedAddCountsRef.current = {};
    setAddCounts({});
    setResumePrompt(null);
    setReviewSessionId(null);
    setSessionLookupDone(true);
    await createSession();
  }, [closeSession, createSession, resumePrompt]);

  const resumePersistedState = useCallback(() => {
    if (!resumePrompt) return;
    setResumePrompt(null);
    applyPersistedState(resumePrompt.sessionId);
  }, [applyPersistedState, resumePrompt]);

  const fetchPlaylistTrackIds = useCallback(
    async (playlistId: string) => {
      if (playlistTrackCache[playlistId]) {
        return playlistTrackCache[playlistId];
      }
      try {
        const response = await fetch(`/api/playlists/${playlistId}/tracks`);
        if (!response.ok) {
          throw new Error("Failed to fetch playlist tracks.");
        }
        const data: { ids: string[] } = await response.json();
        setPlaylistTrackCache(prev => ({ ...prev, [playlistId]: data.ids }));
        return data.ids;
      } catch (err) {
        console.error("Failed to fetch playlist ids", err);
        setLastActionLabel("Could not load playlist tracks for add check.");
        return [];
      }
    },
    [playlistTrackCache],
  );

  const confirmAdd = useCallback(async () => {
    if (!isAddMode) {
      setIsAddMode(true);
      setLastActionLabel("Add mode enabled");
      return;
    }
    // Placeholder: record action to history (not persisted)
    if (selectedPlaylists.size > 0 && currentTrack) {
      const targets = Array.from(selectedPlaylists);
      const targetPayload = targets
        .map(targetId => {
          const match = allPlaylists.find(playlist => playlist.id === targetId);
          return match
            ? { playlistId: match.id, playlistName: match.name }
            : { playlistId: targetId, playlistName: null };
        })
        .filter(Boolean);
      const membershipResults = await Promise.all(
        targets.map(async playlistId => {
          const ids = await fetchPlaylistTrackIds(playlistId);
          const has = new Set(ids).has(currentTrack.id);
          return { playlistId, has };
        }),
      );

      const duplicates = membershipResults.filter(r => r.has).length;
      const adds = membershipResults.length - duplicates;

      historyRef.current = [
        ...historyRef.current,
        {
          trackId: currentTrack.id,
          previousAction: currentTrack.action,
          previousIndex: activeIndex,
        },
      ];

      if (adds > 0 && duplicates > 0) {
        setLastActionLabel(`Added to ${adds}, skipped ${duplicates} (already there)`);
      } else if (adds > 0) {
        setLastActionLabel(
          `Added to ${adds} playlist${adds > 1 ? "s" : ""}${
            duplicates ? " (duplicates skipped)" : ""
          }`,
        );
      } else {
        setLastActionLabel("Skipped (already in selected playlists)");
      }

      if (adds > 0) {
        setAddCounts(prev => ({
          ...prev,
          [currentTrack.id]: (prev[currentTrack.id] ?? 0) + adds,
        }));
      }
      if (reviewSessionId && targetPayload.length > 0 && spotifyUser) {
        fetch(`/api/review/sessions/${reviewSessionId}/tracks/${currentTrack.id}/targets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-spotify-id": spotifyUser.spotifyId,
          },
          body: JSON.stringify({ targets: targetPayload }),
        }).catch(err => {
          console.error("Failed to persist playlist targets:", err);
        });
      }
    }
    setSelectedPlaylists(new Set());
    setIsAddMode(false);
  }, [
    activeIndex,
    allPlaylists,
    currentTrack,
    fetchPlaylistTrackIds,
    isAddMode,
    reviewSessionId,
    spotifyUser,
    selectedPlaylists,
  ]);

  const handleNewPlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) return;
    const id = `local-${Date.now()}`;
    setLocalPlaylists(prev => [{ id, name: newPlaylistName.trim(), artworkUrl: null }, ...prev]);
    setNewPlaylistName("");
    setNewPlaylistModal(false);
    setLastActionLabel("Created new playlist");
  }, [newPlaylistName]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === "INPUT") return;
      const key = event.key.toUpperCase();
      if (key === "A") {
        event.preventDefault();
        setRibbonOffset(offset => Math.max(0, offset - 1));
        return;
      }
      if (key === ";") {
        event.preventDefault();
        setRibbonOffset(offset => {
          const maxOffset = Math.max(0, allPlaylists.length - RIBBON_KEYS.length);
          return Math.min(maxOffset, offset + 1);
        });
        return;
      }
      const idx = RIBBON_KEYS.findIndex(k => k === key);
      if (idx !== -1 && visiblePlaylists[idx]) {
        event.preventDefault();
        togglePlaylistSelection(visiblePlaylists[idx].id);
        return;
      }
      switch (key) {
        case "V":
          event.preventDefault();
          setAction("keep");
          break;
        case "R":
          event.preventDefault();
          setAction("remove");
          break;
        case "Z":
          event.preventDefault();
          undo();
          break;
        case "I":
          event.preventDefault();
          confirmAdd();
          break;
        case "N":
          event.preventDefault();
          setNewPlaylistModal(true);
          break;
        case "P":
          event.preventDefault();
          togglePlayback();
          break;
        case "X":
          event.preventDefault();
          restartPlayback();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    allPlaylists.length,
    confirmAdd,
    restartPlayback,
    togglePlayback,
    togglePlaylistSelection,
    setAction,
    undo,
    visiblePlaylists,
  ]);

  const renderRibbon = () => (
    <div className="w-full rounded-[20px] border border-[#141414] bg-[#121212] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-stretch gap-3">
        <div className="flex min-w-[52px] flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setRibbonOffset(offset => Math.max(0, offset - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            &lt;
          </button>
          <span className="flex items-center justify-center rounded-lg border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-200">
            A
          </span>
        </div>
        <div className="flex flex-1 items-stretch gap-3 overflow-hidden">
          {visiblePlaylists.map((p, idx) => {
            const hotkey = RIBBON_KEYS[idx];
            const selected = selectedPlaylists.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlaylistSelection(p.id)}
                className={clsx(
                  "group relative flex min-h-[156px] min-w-[92px] max-w-[132px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs transition",
                  selected
                    ? "border-emerald-500 bg-[#1a1a1a] ring-2 ring-emerald-400/60"
                    : "border-[#202020] bg-gradient-to-b from-[#1b1b1b] to-[#151515] hover:border-emerald-500/40 hover:bg-[#1a1a1a]",
                )}
              >
                <span className="relative block h-14 w-14 overflow-hidden rounded-2xl border border-[#262626] bg-gradient-to-br from-zinc-700 to-zinc-900">
                  {p.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.artworkUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className={clsx("block h-full w-full bg-gradient-to-br", randomGradient())}
                    />
                  )}
                </span>
                <span className="flex min-h-[2rem] w-full items-center justify-center px-1 text-center text-[15px] font-medium leading-normal text-zinc-100">
                  <span className="block w-full truncate">{p.name}</span>
                </span>
                <span className="flex items-center justify-center rounded-lg border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-200">
                  {hotkey}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-[52px] flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRibbonOffset(offset =>
                Math.min(Math.max(0, allPlaylists.length - RIBBON_KEYS.length), offset + 1),
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            &gt;
          </button>
          <span className="flex items-center justify-center rounded-lg border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-200">
            ;
          </span>
        </div>
      </div>
    </div>
  );

  const renderTrackCard = () => (
    <div className="mx-auto flex w-full max-w-[288px] self-start flex-col items-center gap-1.5 rounded-[24px] border border-[#141414] bg-[#121212] px-3.5 py-3.5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {loading ? (
        <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900" />
      ) : error ? (
        <p className="text-sm text-amber-400">{error}</p>
      ) : currentTrack ? (
        <>
          <div className="flex w-full items-center justify-between text-[11px] text-zinc-400">
            <span>
              {queueData?.source.type === "playlist" ? queueData.source.name : "Liked Songs"}
            </span>
            <span>
              {activeIndex + 1}/{totalTracks}
            </span>
          </div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#0f0f0f]">
            {currentTrack.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="block h-full w-full bg-gradient-to-br from-[#5b4de1] to-[#d32c8d]" />
            )}
          </div>
          <div className="w-full space-y-1">
            <p className="truncate text-base font-semibold">{currentTrack.title}</p>
            <p className="truncate text-sm text-zinc-400">{currentTrack.artists}</p>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="text-[11px] text-zinc-500">{formatTime(currentTime)}</span>
            <div className="flex-1">
              <Range
                values={[currentTime]}
                step={1}
                min={0}
                max={Math.max(duration, 1)}
                disabled={playbackUnavailable}
                onChange={values => {
                  setIsSeeking(true);
                  setCurrentTime(values[0]);
                }}
                onFinalChange={values => {
                  setIsSeeking(false);
                  handleSeek(values[0]);
                }}
                renderTrack={({ props, children }) => (
                  <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    className="flex h-6 w-full items-center"
                  >
                    <div
                      ref={props.ref}
                      className="h-1 w-full rounded-full"
                      style={{
                        background: getTrackBackground({
                          values: [currentTime],
                          colors: ["#10b981", "#27272a"],
                          min: 0,
                          max: Math.max(duration, 1),
                        }),
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ props }) => {
                  const { key, ...rest } = props;
                  return (
                    <div
                      key={key}
                      {...rest}
                      className="h-3 w-3 rounded-full border border-emerald-200 bg-emerald-500 shadow"
                    />
                  );
                }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">
              {!playbackUnavailable
                ? `-${formatTime(Math.max(duration - currentTime, 0))}`
                : "-0:00"}
            </span>
          </div>
          <div className="flex w-full items-center justify-center gap-3 text-xs text-zinc-200">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={playbackUnavailable}
              className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-[11px] uppercase tracking-wide">P</span>{" "}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={restartPlayback}
              disabled={playbackUnavailable}
              className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-[11px] uppercase tracking-wide">X</span> Restart
            </button>
          </div>
          {playbackUnavailable ? (
            <p className="text-[11px] text-zinc-500">Playback unavailable for this track.</p>
          ) : playbackTokenError ? (
            <p className="text-[11px] text-amber-400">{playbackTokenError}</p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-zinc-400">No track selected.</p>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="w-full rounded-[16px] border border-[#141414] bg-[#121212] p-3.5 text-sm text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] lg:max-w-[272px]">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Track History</p>
        <div className="h-px bg-zinc-800" />
        <div className="min-h-[40px] text-xs text-zinc-400">{lastActionLabel}</div>
      </div>
      <div className="mt-3.5 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Track Actions</p>
        <div className="h-px bg-zinc-800" />
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={undo}
            className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:border-emerald-500 hover:text-emerald-200"
          >
            <span className="text-[11px] uppercase tracking-wide">Z</span> Undo
          </button>
          <button
            type="button"
            onClick={() => setAction("remove")}
            className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:border-emerald-500 hover:text-emerald-200"
          >
            <span className="text-[11px] uppercase tracking-wide">R</span> Remove
          </button>
          <button
            type="button"
            onClick={() => setAction("keep")}
            className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:border-emerald-500 hover:text-emerald-200"
          >
            <span className="text-[11px] uppercase tracking-wide">V</span> Keep
          </button>
        </div>
      </div>
      <div className="mt-3.5 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Playlist Actions</p>
        <div className="h-px bg-zinc-800" />
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setNewPlaylistModal(true)}
            className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:border-emerald-500 hover:text-emerald-200"
          >
            <span className="text-[11px] uppercase tracking-wide">N</span> New Playlist
          </button>
          <button
            type="button"
            onClick={confirmAdd}
            className={clsx(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-zinc-200 hover:border-emerald-500 hover:text-emerald-200",
              isAddMode ? "border-emerald-500" : "border-zinc-700",
            )}
          >
            <span className="text-[11px] uppercase tracking-wide">I</span>{" "}
            {isAddMode ? "Confirm" : "Add to Playlist"}
          </button>
        </div>
      </div>
      {onLoadMore && queueData?.nextOffset != null && (
        <div className="mt-3.5 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Loading more..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {renderRibbon()}
      <div className="grid items-start gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_272px]">
        {renderTrackCard()}
        {renderActions()}
      </div>
      <div className="flex justify-end lg:flex-none">
        <button
          type="button"
          onClick={() => {
            if (!queueData) return;
            const removed = trackStates
              .filter(t => t.action === "remove")
              .map(t => ({
                id: t.id,
                title: t.title,
                artists: t.artists,
                artworkUrl: t.artworkUrl,
              }));
            const kept = trackStates
              .filter(t => t.action === "keep")
              .map(t => ({
                id: t.id,
                title: t.title,
                artists: t.artists,
                artworkUrl: t.artworkUrl,
              }));
            const addedIds = Object.keys(addCounts);
            const added = trackStates
              .filter(t => addedIds.includes(t.id))
              .map(t => ({
                id: t.id,
                title: t.title,
                artists: t.artists,
                artworkUrl: t.artworkUrl,
                addCount: addCounts[t.id],
              }));
            const pendingCount = trackStates.filter(t => t.action === "pending").length;
            onFinish?.({
              sessionId: reviewSessionId,
              playlistTitle: playlistMeta.title,
              artworkUrl: playlistMeta.artworkUrl,
              removed,
              kept,
              added,
              pendingCount,
            });
          }}
          className="rounded-full border border-emerald-500 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Finish
        </button>
      </div>

      {newPlaylistModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-5 text-white shadow-xl">
            <h3 className="text-lg font-semibold">New Playlist</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Name your playlist. A solid color cover will be generated.
            </p>
            <input
              type="text"
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              className="mt-3 w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Playlist name"
            />
            <div className="mt-4 flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setNewPlaylistModal(false);
                  setNewPlaylistName("");
                }}
                className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-emerald-500 hover:text-emerald-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNewPlaylist}
                className="rounded-full border border-emerald-500 bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resumePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-6 text-white shadow-xl">
            <h3 className="text-lg font-semibold">Resume review?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              You have an in-progress review with {resumePrompt.reviewedCount} reviewed and{" "}
              {resumePrompt.pendingCount} pending tracks.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={discardPersistedState}
                className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-emerald-500 hover:text-emerald-200"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={resumePersistedState}
                className="rounded-full border border-emerald-500 bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
