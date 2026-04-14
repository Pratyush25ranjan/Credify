import { useState } from "react";
import VerificationForm from "../components/verify/VerificationForm";
import VerificationResult from "../components/verify/VerificationResult";

import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (claim) => {
    if (!claim.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        "https://credify-eg2e.onrender.com/verify-news",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: claim }),
        }
      );

      const data = await res.json();

      const score = data.credibilityScore;

      // 🔥 FIXED + IMPROVED LOGIC
      const formattedResult = {
       verdict:
  score >= 0.75
    ? "true"
    : score >= 0.4
    ? "partial"
    : "not_reliable",

        confidence_score: Math.round(score * 100),

        explanation: `Matched with ${data.articles.length} news sources`,

        trusted_matches: data.articles.length,

        total_sources_checked: data.articles.length,

        sources: data.articles.map((a) => ({
          title: a.title,
          url: a.url,
          is_trusted: true, // upgrade later
        })),
      };

      setResult(formattedResult);

      // ✅ Save to Firebase
      await addDoc(collection(db, "verificationHistory"), {
        text: claim,
        verdict: formattedResult.verdict,
        confidence: formattedResult.confidence_score,
        created_date: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error:", error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center p-6">
      
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800">
            Credify 🔍
          </h1>
          <p className="text-gray-500">
            AI-powered Fake News Detection
          </p>
        </div>

        {/* Form */}
        <VerificationForm onSubmit={handleVerify} isLoading={isLoading} />

        {/* Result */}
        {result && <VerificationResult result={result} />}

      </div>
    </div>
  );
}