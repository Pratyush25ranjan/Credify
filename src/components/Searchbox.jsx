import { useState } from "react";
import { analyzeNewsAPI } from "../services/api";

export default function SearchBox({ setResult, setLoading }) {
  const [input, setInput] = useState("");
  const [loadingLocal, setLoadingLocal] = useState(false);

  const analyzeNews = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setLoadingLocal(true);

    try {
      const data = await analyzeNewsAPI(input);
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        status: "Error ❌",
        reason: "Something went wrong. Please try again.",
        trustedMatches: [],
        otherMatches: [],
      });
    }

    setLoading(false);
    setLoadingLocal(false);
  };

  return (
    <div className="relative">

      {/* Glass Card */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200 p-6 rounded-2xl shadow-xl">

        {/* Label */}
        <label className="block text-gray-700 font-semibold mb-2">
          Enter News Content
        </label>

        {/* Textarea */}
        <textarea
          className="w-full p-4 border border-gray-300 rounded-xl mb-4 
          focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 transition duration-200 resize-none"
          rows="5"
          placeholder="Paste news article, headline, or claim..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={analyzeNews}
          disabled={loadingLocal}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300
          ${
            loadingLocal
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
          }`}
        >
          {loadingLocal ? "Analyzing..." : "Analyze News 🔍"}
        </button>

      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-blue-200 opacity-20 blur-2xl -z-10"></div>

    </div>
  );
}