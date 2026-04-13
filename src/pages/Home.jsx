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
      // 🔥 Call your backend
      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: claim }),
      });

      const data = await res.json();

      // ✅ Normalize result (important for UI)
      const formattedResult = {
        status: data.label || data.status || "Unknown",
        confidence: data.confidence || 90,
        explanation: data.reason || "No explanation available",
        trustedMatches: data.trustedMatches || [],
        otherMatches: data.otherMatches || [],
      };

      setResult(formattedResult);

      // ✅ Save to Firebase
      await addDoc(collection(db, "verificationHistory"), {
        text: claim,
        status: formattedResult.status,
        confidence: formattedResult.confidence,
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