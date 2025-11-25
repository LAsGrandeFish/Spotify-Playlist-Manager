"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";

import type { QueueTrack } from "@/lib/spotify/queue";
import { formatAddedAt, formatDuration } from "@/lib/spotify/queue";

type ReviewQueueClientProps = {
  tracks: QueueTrack[];
  appearance?: "workspace" | "card";
};

type TrackAction = "pending" | "keep" | "remove" | "add";

type TrackState = QueueTrack & {
  action: TrackAction;
};

type HistoryEntry = {
  trackId: string;
  previousAction: TrackAction;
};

export default function ReviewQueueClient({ tracks, appearance = "card" }: ReviewQueueClientProps) {
  const isWorkspace = appearance === "workspace";
  const [trackStates, setTrackStates] = useState<TrackState[]>(() =>
    tracks.map(track => ({ ...track, action: "pending" as TrackAction })),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const historyRef = useRef<HistoryEntry[]>([]);

  const counts = useMemo(() => {
    return trackStates.reduce(
      (acc, track) => {
        acc[track.action] += 1;
        return acc;
      },
      { pending: 0, keep: 0, remove: 0, add: 0 },
    );
  }, [trackStates]);

  const applyAction = useCallback(
    (action: TrackAction) => {
      setTrackStates(prev => {
        const next = [...prev];
        const current = next[activeIndex];
        if (!current || current.action === action) {
          return prev;
        }

        historyRef.current = [
          ...historyRef.current,
          { trackId: current.id, previousAction: current.action },
        ];

        next[activeIndex] = { ...current, action };
        return next;
      });

      setActiveIndex(index => Math.min(trackStates.length - 1, index + 1));
    },
    [activeIndex, trackStates.length],
  );

  const undoLast = useCallback(() => {
    const last = historyRef.current.at(-1);
    if (!last) return;

    setTrackStates(states => {
      const next = [...states];
      const restoredIndex = next.findIndex(state => state.id === last.trackId);
      if (restoredIndex === -1) return states;

      next[restoredIndex] = { ...next[restoredIndex], action: last.previousAction };
      setActiveIndex(restoredIndex);
      return next;
    });

    historyRef.current = historyRef.current.slice(0, -1);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === "INPUT") {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "j":
        case "arrowdown":
          event.preventDefault();
          setActiveIndex(index => Math.min(trackStates.length - 1, index + 1));
          break;
        case "k":
        case "arrowup":
          event.preventDefault();
          setActiveIndex(index => Math.max(0, index - 1));
          break;
        case "v":
          event.preventDefault();
          applyAction("keep");
          break;
        case "r":
          event.preventDefault();
          applyAction("remove");
          break;
        case "i":
          event.preventDefault();
          applyAction("add");
          break;
        case "z":
          event.preventDefault();
          undoLast();
          break;
        default:
          break;
      }
    },
    [applyAction, trackStates.length, undoLast],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div
        className={clsx(
          "flex items-center justify-between text-xs",
          isWorkspace ? "text-zinc-500" : "text-zinc-500",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "rounded-full border px-2 py-0.5",
              isWorkspace ? "border-[#1f1f1f] text-zinc-300" : "border-zinc-300 text-zinc-600",
            )}
          >
            Pending: {counts.pending}
          </span>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
            Keep: {counts.keep}
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
            Remove: {counts.remove}
          </span>
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-300">
            Add: {counts.add}
          </span>
        </div>
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
          V • Keep &nbsp; R • Remove &nbsp; I • Add &nbsp; J/K • Navigate &nbsp; Z • Undo
        </div>
      </div>
      <div
        className={clsx(
          "custom-scrollbar flex-1 overflow-y-auto rounded-3xl",
          isWorkspace ? "bg-[#050505]" : "border border-zinc-100 bg-white/80 shadow-sm",
        )}
      >
        <ul>
          {trackStates.map((track, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={track.id}
                className={clsx(
                  "flex items-center gap-4 border-b px-4 py-3 text-sm last:border-none",
                  isWorkspace
                    ? [
                        "border-[#111111]",
                        isActive ? "bg-[#101010]" : "hover:bg-[#0d0d0d]",
                        "text-zinc-200",
                      ]
                    : [
                        "border-zinc-100",
                        isActive ? "bg-emerald-50" : "hover:bg-zinc-50",
                        "text-zinc-700",
                      ],
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "relative h-12 w-12 overflow-hidden rounded-2xl border",
                      isWorkspace ? "border-[#1f1f1f] bg-[#0f0f0f]" : "border-zinc-200 bg-zinc-50",
                    )}
                  >
                    {track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artworkUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                        ♫
                      </span>
                    )}
                  </span>
                  <div>
                    <p className="font-medium text-zinc-50">{track.title}</p>
                    <p className="text-xs text-zinc-400">{track.artists}</p>
                    <p className="text-[11px] text-zinc-500">{track.album}</p>
                  </div>
                </div>
                <div className="ml-auto flex flex-col items-end text-xs text-zinc-400">
                  <span>{formatDuration(track.durationMs)}</span>
                  <span>{formatAddedAt(track.addedAt)}</span>
                  <span
                    className={clsx(
                      "mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      {
                        "bg-zinc-800 text-zinc-200": track.action === "pending",
                        "bg-emerald-500/20 text-emerald-200": track.action === "keep",
                        "bg-amber-500/20 text-amber-200": track.action === "remove",
                        "bg-sky-500/20 text-sky-200": track.action === "add",
                      },
                    )}
                  >
                    {track.action}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
