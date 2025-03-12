"use client";
import React, { useState, useEffect } from "react";

const SpotifySearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  // This function would fetch a token from your backend
  // In a real app, you'd need a server that handles Spotify authentication
  const getToken = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be a fetch to your backend
      // that handles Spotify authentication
      setToken(
        "BQBsFilLtXzCcppI6a4OFK7xzpiTSTcht5FbHl3QnRT1A0iYCY9OCxTux1FC-vdkCdAErPZevbadAxZui7cwvVj89KkLAV0FpLlJg7e9LxvFURGxmeXaN4ObH4vWvT_dspntfW_J3R8"
      );
      setLoading(false);
    } catch (error) {
      setError("Failed to authenticate with Spotify");
      setLoading(false);
    }
  };

  useEffect(() => {
    getToken();
  }, []);

  const searchSpotify = async () => {
    if (!query) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search Spotify");
      }

      const data = await response.json();
      setResults(data.tracks.items);
      setLoading(false);
    } catch (error) {
      setError("Error searching for songs");
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchSpotify();
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Spotify Song Search</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song..."
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading || !token}
          >
            Search
          </button>
        </div>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {results.length > 0 ? (
            <ul className="divide-y">
              {results.map((track) => (
                <li key={track.id} className="py-4">
                  <div className="flex items-center gap-4">
                    {track.album.images.length > 0 && (
                      <img
                        src={track.album.images[0].url}
                        alt="Album cover"
                        className="w-16 h-16"
                      />
                    )}
                    <div>
                      <h3 className="font-bold">{track.name}</h3>
                      <p className="text-gray-600">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : query ? (
            <p>No results found</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SpotifySearch;
