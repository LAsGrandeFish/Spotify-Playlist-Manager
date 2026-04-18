"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import clsx from "clsx";

import type { PlaylistRailData } from "@/lib/spotify/library";

type PlaylistRailClientProps = {
  data: PlaylistRailData;
  appearance?: "workspace" | "card";
  activeId?: string;
  onSelect?: (item: ListItem) => void;
};

type ListItem =
  | { type: "liked"; id: "liked-songs"; name: string; subtitle: string; artworkUrl: string | null }
  | {
      type: "playlist";
      id: string;
      name: string;
      subtitle: string;
      artworkUrl: string | null;
      meta: {
        totalTracks: number;
        ownerName?: string | null;
        isCollaborative: boolean;
      };
    };

const DEFAULT_ACTIVE_ID = "liked-songs";

const formatCount = (count: number) => {
  if (count < 1_000) return String(count);
  if (count < 1_000_000) return `${Math.round(count / 100) / 10}k`;
  return `${Math.round(count / 100_000) / 10}m`;
};

const colorPalette = [
  "#e87467",
  "#819af7",
  "#a384ff",
  "#f4b860",
  "#74d3ae",
  "#ee6352",
  "#5cc8ff",
  "#ff6dc8",
  "#9be564",
  "#ff9a62",
  "#c17dff",
];

const getColorForId = (id: string, index: number) => {
  if (id === "liked-songs") {
    return null;
  }
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + index * 3;
  return colorPalette[hash % colorPalette.length];
};

export default function PlaylistRailClient({
  data,
  appearance = "card",
  activeId: controlledActiveId,
  onSelect,
}: PlaylistRailClientProps) {
  const isWorkspace = appearance === "workspace";
  const listHeightClass = isWorkspace ? "lg:flex-1 lg:min-h-0 max-h-[75vh]" : "max-h-[24rem]";
  const playlistCount = data.playlists.length;

  const items = useMemo<ListItem[]>(() => {
    const likedArtwork = data.likedSongs.artwork?.url ?? null;
    const playlistItems: ListItem[] = data.playlists.map(playlist => ({
      type: "playlist",
      id: playlist.id,
      name: playlist.name,
      subtitle: `${playlist.totalTracks} tracks`,
      artworkUrl: playlist.images[0]?.url ?? null,
      meta: {
        totalTracks: playlist.totalTracks,
        ownerName: playlist.ownerName,
        isCollaborative: playlist.isCollaborative,
      },
    }));

    return [
      {
        type: "liked",
        id: "liked-songs",
        name: "Liked Songs",
        subtitle: `${formatCount(data.likedSongs.total)} saved`,
        artworkUrl: likedArtwork,
      },
      ...playlistItems,
    ];
  }, [data]);

  const [internalActiveId, setInternalActiveId] = useState<string>(DEFAULT_ACTIVE_ID);
  const activeId = controlledActiveId ?? internalActiveId;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === "INPUT") {
        return;
      }

      const currentIndex = items.findIndex(item => item.id === activeId);
      if (currentIndex === -1) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextItem = items[Math.min(items.length - 1, currentIndex + 1)];
        if (!controlledActiveId) {
          setInternalActiveId(nextItem.id);
        }
        onSelect?.(nextItem);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevItem = items[Math.max(0, currentIndex - 1)];
        if (!controlledActiveId) {
          setInternalActiveId(prevItem.id);
        }
        onSelect?.(prevItem);
      }
    },
    [activeId, controlledActiveId, items, onSelect],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={clsx(
        "flex flex-col",
        isWorkspace ? "text-zinc-200 lg:h-full lg:min-h-0" : "text-zinc-700",
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-[22px]",
          isWorkspace && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
          isWorkspace
            ? "border border-[#141414] bg-[#121212]"
            : "border border-zinc-200 bg-white/70 shadow-sm",
        )}
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <span
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-2xl text-sm",
              isWorkspace ? "bg-[#1f1f1f] text-zinc-400" : "bg-zinc-200 text-zinc-600",
            )}
          >
            ≡
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Your Library</p>
            <div className="flex items-center gap-2">
              <p
                className={clsx(
                  "text-base font-semibold",
                  isWorkspace ? "text-zinc-100" : "text-zinc-800",
                )}
              >
                Playlists
              </p>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isWorkspace ? "bg-[#1a1a1a] text-zinc-400" : "bg-zinc-200 text-zinc-600",
                )}
              >
                {playlistCount}
              </span>
            </div>
          </div>
        </div>
        <ul
          className={clsx(
            "custom-scrollbar overflow-y-auto px-1 pb-4 pr-1",
            listHeightClass,
            isWorkspace ? "divide-y divide-[#151515]" : "divide-y divide-zinc-100",
          )}
        >
          {items.map((item, index) => {
            const isActive = item.id === activeId;
            const badgeColor = getColorForId(item.id, index);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!controlledActiveId) {
                    setInternalActiveId(item.id);
                  }
                  onSelect?.(item);
                }}
                className={clsx(
                  "flex w-full items-center gap-4 px-4 py-3 text-left transition",
                  isWorkspace
                    ? isActive
                      ? "bg-[#1a1a1a]"
                      : "hover:bg-[#0f0f0f]"
                    : isActive
                      ? "bg-emerald-50"
                      : "hover:bg-zinc-50",
                )}
              >
                <span
                  className={clsx(
                    "flex h-12 w-12 min-w-[3rem] overflow-hidden rounded-2xl border",
                    isWorkspace ? "border-[#1f1f1f] bg-[#0a0a0a]" : "border-zinc-200 bg-zinc-50",
                  )}
                  style={
                    item.artworkUrl
                      ? undefined
                      : badgeColor
                        ? { backgroundColor: badgeColor }
                        : undefined
                  }
                >
                  {item.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.artworkUrl}
                      alt=""
                      className="block h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                      {item.id === "liked-songs" ? "♥" : item.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className={clsx(
                      "text-sm font-semibold",
                      isWorkspace ? "text-zinc-100" : "text-zinc-800",
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-500">{item.subtitle}</span>
                </span>
              </button>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
