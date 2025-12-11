"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PlaylistRailData } from "@/lib/spotify/library";
import type { QueueData, QueueTrack } from "@/lib/spotify/queue";
const RIBBON_KEYS = ["S", "D", "F", "G", "H", "J", "K", "L"];

type ReviewStageProps = {
  playlistRailData: PlaylistRailData | null;
  queueData: QueueData | null;
  loading: boolean;
  error: string | null;
  onLoadMore?: () => void;
  loadingMore?: boolean;
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrackStates((queueData?.tracks ?? []).map(track => ({ ...track, action: "pending" })));
    setActiveIndex(0);
    historyRef.current = [];
    setSelectedPlaylists(new Set());
    setIsAddMode(false);
    setLastActionLabel("No actions yet.");
  }, [queueData]);

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
      setActiveIndex(index => Math.min(totalTracks - 1, index + 1));
    },
    [activeIndex, totalTracks],
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

  const confirmAdd = useCallback(() => {
    if (!isAddMode) {
      setIsAddMode(true);
      setLastActionLabel("Add mode enabled");
      return;
    }
    // Placeholder: record action to history (not persisted)
    if (selectedPlaylists.size > 0 && currentTrack) {
      historyRef.current = [
        ...historyRef.current,
        {
          trackId: currentTrack.id,
          previousAction: currentTrack.action,
          previousIndex: activeIndex,
        },
      ];
      setLastActionLabel(
        `Added to ${selectedPlaylists.size} playlist${selectedPlaylists.size > 1 ? "s" : ""}`,
      );
    }
    setSelectedPlaylists(new Set());
    setIsAddMode(false);
  }, [activeIndex, currentTrack, isAddMode, selectedPlaylists.size]);

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
        case "X":
          event.preventDefault();
          // repeat/restart placeholder; no-op for now
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [allPlaylists.length, confirmAdd, togglePlaylistSelection, setAction, undo, visiblePlaylists]);

  const renderRibbon = () => (
    <div className="mx-auto w-full max-w-5xl rounded-[20px] bg-[#0d0d0d] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRibbonOffset(offset => Math.max(0, offset - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-200"
        >
          &lt;
        </button>
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
                  "group relative flex min-w-[96px] max-w-[120px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-transparent bg-black/40 px-3 py-3 text-xs transition hover:border-emerald-500/60 hover:bg-white/5",
                  selected && "border-emerald-500 ring-2 ring-emerald-400/60",
                )}
              >
                <span className="relative block h-14 w-14 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900">
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
                <span className="line-clamp-1 w-full text-center text-sm font-medium text-zinc-100">
                  {p.name}
                </span>
                <span className="mt-1 flex items-center justify-center rounded-lg border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-200">
                  {hotkey}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() =>
            setRibbonOffset(offset =>
              Math.min(Math.max(0, allPlaylists.length - RIBBON_KEYS.length), offset + 1),
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-200"
        >
          &gt;
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 items-center text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        <span className="text-left">A / ; to scroll</span>
        <span className="text-center" />
        <span className="text-right">I to {isAddMode ? "Confirm" : "Add to Playlist"}</span>
      </div>
    </div>
  );

  const renderTrackCard = () => (
    <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-2 rounded-[24px] border border-zinc-800 bg-[#0d0d0d] px-5 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {loading ? (
        <div className="h-[280px] w-full rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900" />
      ) : error ? (
        <p className="text-sm text-amber-400">{error}</p>
      ) : currentTrack ? (
        <>
          <div className="flex w-full items-center justify-between text-xs text-zinc-400">
            <span>
              {queueData?.source.type === "playlist" ? queueData.source.name : "Liked Songs"}
            </span>
            <span>
              {activeIndex + 1}/{totalTracks}
            </span>
          </div>
          <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#5b4de1] to-[#d32c8d]">
            {currentTrack.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="block h-full w-full bg-gradient-to-br from-[#5b4de1] to-[#d32c8d]" />
            )}
          </div>
          <div className="w-full space-y-1">
            <p className="truncate text-lg font-semibold">{currentTrack.title}</p>
            <p className="truncate text-sm text-zinc-400">{currentTrack.artists}</p>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="text-[11px] text-zinc-500">0:00</span>
            <div className="h-1 flex-1 rounded-full bg-zinc-800">
              <div className="h-full w-1/6 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[11px] text-zinc-500">-0:30</span>
          </div>
          <div className="flex w-full items-center justify-center gap-6 text-xs text-zinc-200">
            <span className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1">
              <span className="text-[11px] uppercase tracking-wide">P</span> Play/Pause
            </span>
            <span className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1">
              <span className="text-[11px] uppercase tracking-wide">X</span> Repeat
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-400">No track selected.</p>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="min-w-[260px] rounded-[16px] border border-zinc-800 bg-[#0d0d0d] p-4 text-sm text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Track History</p>
        <div className="h-px bg-zinc-800" />
        <div className="min-h-[40px] text-xs text-zinc-400">{lastActionLabel}</div>
      </div>
      <div className="mt-4 space-y-2">
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
      <div className="mt-4 space-y-2">
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
        <div className="mt-4 flex justify-center">
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
    <div className="flex flex-col gap-6">
      {renderRibbon()}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {renderTrackCard()}
        {renderActions()}
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
    </div>
  );
}
