import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
export default function Dashboard() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

 const analyzeNews = async () => {
  if (!input.trim()) return;

  setLoading(true);

  try {
    const res = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input }),
    });

    const data = await res.json();
    setResult(data);

    // ✅ SAVE TO FIREBASE
    await addDoc(collection(db, "verificationHistory"), {
      text: input,
      status: data.label || data.status,
      confidence: data.confidence || 90,
      created_date: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error:", error);
  }

  setLoading(false);
};
  const isReal = result?.label?.toLowerCase().includes("real");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center p-6">

      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-gray-800">
            Credify 🔍
          </h1>
          <p className="text-gray-600 mt-2">
            AI-powered Fake News Detection
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl mb-6">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-xl mb-4 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Paste news article or headline..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            onClick={analyzeNews}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-semibold transition
              ${
                loading
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              }`}
          >
            {loading ? "Analyzing..." : "Analyze News 🔍"}
          </button>
        </div>

        {/* Result Card */}
        {result && (
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl mb-6">

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Result
              </h2>

              {/* Status Badge */}
              <span
                className={`px-4 py-1 rounded-full text-sm font-semibold
                  ${
                    isReal
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
              >
                {result.label}
              </span>
            </div>

            {/* Confidence Bar */}
            <div className="mb-4">
              <p className="text-gray-600 mb-1">
                Confidence: {result.confidence}%
              </p>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    isReal ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* History Card */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-semibold mb-3">History</h2>
          <p className="text-gray-500">No history yet...</p>
        </div>

      </div>
    </div>
  );
}