"use server";
import { createClient } from "redis";

const redis = createClient({
  // url: "redis://redis:6379",
});
redis.on("error", (err) => console.log("Redis Client Error", err));
await redis.connect();

// Types
export type Song = {
  id: string;
  name: string;
  artists: string[];
  imageUrl: string;
};

export type QueuedSong = Song & {
  votes: number;
};

// Mutations
function updateTimestamp() {
  redis.set("timestamp", new Date().toISOString());
}

export async function addToQueue(song: Song) {
  const existingSong = await redis.hGet("queue", song.id);
  if (existingSong) {
    await upvoteSong(song.id);
  } else {
    redis.hSet("queue", song.id, JSON.stringify({ ...song, votes: 0 }));
  }
}

export async function upvoteSong(id: string) {
  updateTimestamp();
  // get song from hashmap queue
  const song: QueuedSong | null = JSON.parse(
    (await redis.hGet("queue", id)) ?? "null"
  );
  if (!song) {
    return { success: false, error: "Song not found" };
  }

  song.votes++;
  redis.hSet("queue", id, JSON.stringify(song));

  return { success: true };
}

export async function downvoteSong(id: string) {
  updateTimestamp();
  // get song from hashmap queue
  const song: QueuedSong | null = JSON.parse(
    (await redis.hGet("queue", id)) ?? "null"
  );
  if (!song) {
    return { success: false, error: "Song not found" };
  }

  song.votes--;
  redis.hSet("queue", id, JSON.stringify(song));

  return { success: true };
}

// Queries
export async function getQueue() {
  updateTimestamp();
  const queue: QueuedSong[] = [];
  const keys = await redis.hKeys("queue");
  for (const key of keys) {
    queue.push(JSON.parse((await redis.hGet("queue", key)) ?? "null"));
  }
  return { queue, timestamp: await redis.get("timestamp") };
}

export async function searchSpotify(query: string) {
  if (!query) return;
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    console.log(response);
    throw new Error("Failed to search Spotify");
  }

  const data = await response.json();

  const songs: Song[] = [];
  for (const item of data.tracks.items) {
    const song = {
      id: item.id,
      name: item.name,
      artists: item.artists.map((artist: { name: string }) => artist.name),
      imageUrl: item.album.images[0]?.url,
    };

    songs.push(song);
  }
  return songs;
}

export async function checkQueueUpdates(lastTimestamp: string) {
  const timestamp = await redis.get("timestamp");
  if (timestamp && timestamp > lastTimestamp) {
    return true;
  }
  return false;
}
