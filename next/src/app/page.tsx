"use client";

import {
  ThumbsUp,
  ThumbsDown,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getQueue,
  upvoteSong as upvote,
  downvoteSong as downvote,
  searchSpotify,
  Song,
  addToQueue,
  checkQueueUpdates, // Assume this exists now
} from "@/actions";
import { queryClient } from "@/components/providers";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [addedSongIds, setAddedSongIds] = useState<Set<string>>(new Set());

  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [lastQueueTimestamp, setLastQueueTimestamp] = useState<string | null>(
    null
  );

  // Main queue query - no longer polls automatically
  const { data: queue } = useQuery({
    queryKey: ["queue"],
    queryFn: async () => {
      const response = await getQueue();
      // Assuming getQueue now returns { songs: Song[], timestamp: string }
      if (response && response.timestamp) {
        setLastQueueTimestamp(response.timestamp);
      }
      return response?.queue || [];
    },
  });

  // New query that polls for updates every 2 seconds with the timestamp
  useQuery({
    queryKey: ["queueUpdates", lastQueueTimestamp],
    queryFn: async () => {
      if (lastQueueTimestamp) {
        const hasUpdates = await checkQueueUpdates(lastQueueTimestamp);
        if (hasUpdates) {
          queryClient.invalidateQueries({ queryKey: ["queue"] });
        }
      }
      return false;
    },
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    enabled: !!lastQueueTimestamp, // Only run this query if we have a timestamp
  });

  const { mutate: searchMutation, isPending: isSearching } = useMutation({
    mutationFn: () => searchSpotify(searchQuery),
    onSuccess: (data) => {
      if (data) {
        setSearchResults(data);
      }
    },
  });

  // Update addedSongIds when queue changes
  useEffect(() => {
    if (queue) {
      const queueIds = new Set(queue.map((song) => song.id));
      setAddedSongIds(queueIds);
    }
  }, [queue]);

  const { mutate: upvoteMutation } = useMutation({
    mutationFn: (id: string) => upvote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const { mutate: downvoteMutation } = useMutation({
    mutationFn: (id: string) => downvote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const { mutate: addToQueueMutation } = useMutation({
    mutationFn: (song: Song) => {
      setAddingSongId(song.id);
      return addToQueue(song);
    },
    onSuccess: (_, song) => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      setAddingSongId(null);
      // Add the song ID to the set of added songs
      setAddedSongIds((prev) => new Set([...prev, song.id]));
    },
    onError: () => {
      setAddingSongId(null);
    },
  });

  // Sort the main song list by votes
  const sortedQueue = queue?.sort((a, b) => b.votes - a.votes);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchMutation();
  };

  const isSongInQueue = (songId: string) => {
    return addedSongIds.has(songId);
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <form className="relative flex gap-2" onSubmit={handleSubmit}>
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchResults([]);
                  setSearchQuery("");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Input
          className="transition-all duration-300 bg-background"
          placeholder="Search for songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {/* Show spinner if searching */}
        <Button type="submit" disabled={isSearching} className="w-20">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      <div className="mt-3 relative">
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.3 } }}
              exit={{ opacity: 0, transition: { delay: 0 } }}
              className="flex gap-3 flex-col absolute top-0 left-0 w-full"
            >
              <div className="text-sm text-muted-foreground">
                search results
              </div>

              {searchResults?.map((song) => {
                const isAdded = isSongInQueue(song.id);
                const isAdding = addingSongId === song.id;

                return (
                  <SongCard key={song.id} song={song}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 ${
                          isAdded
                            ? "bg-green-50 text-green-600 border-green-200"
                            : ""
                        }`}
                        disabled={isAdding || isAdded}
                        onClick={() => addToQueueMutation(song)}
                      >
                        {isAdding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isAdded ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </SongCard>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {searchResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.3 } }}
              exit={{ opacity: 0, transition: { delay: 0 } }}
              className="flex gap-3 flex-col absolute top-0 left-0 w-full"
            >
              <div className="text-sm text-muted-foreground">queue</div>

              {sortedQueue?.map((song) => (
                <SongCard key={song.id} song={song}>
                  <div className="flex items-center gap-2">
                    <motion.span
                      className="text-sm font-medium"
                      key={`votes-${song.id}-${song.votes}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {song.votes}
                    </motion.span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => upvoteMutation(song.id)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downvoteMutation(song.id)}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </SongCard>
              ))}

              {sortedQueue?.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  no songs in queue
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SongCard({
  song,
  children: actions,
}: {
  song: Song;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={song.id}
      layout
      className="flex items-center justify-between border rounded-lg p-2 bg-background gap-2"
    >
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <div className="size-10 border rounded-xs overflow-clip flex-shrink-0">
          {song.imageUrl ? (
            <Image
              src={song.imageUrl}
              alt={song.name}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <div className="bg-neutral-200 size-10"></div>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-medium truncate">{song.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {song.artists.join(", ")}
          </p>
        </div>
      </div>
      {actions}
    </motion.div>
  );
}
