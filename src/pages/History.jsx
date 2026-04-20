import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Card, CardContent } from '@/components/ui/card';
import VerdictBadge from '../components/verify/VerdictBadge';
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export default function History() {

  const fetchHistory = async () => {
    const q = query(
      collection(db, "verificationHistory"),
      orderBy("created_date", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  };

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["verification-history"],
    queryFn: fetchHistory,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verification History</h1>
        <p className="text-gray-500">All your past verifications</p>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No history yet</h3>
          <p className="text-gray-500 text-sm">
            Start analyzing news to see results here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, i) => {
            const isReal = item.status?.toLowerCase().includes("real");

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
              >
                {/* Top Row */}
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      isReal
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(item.created_date), "MMM d, yyyy · h:mm a")}
                  </div>
                </div>

                {/* Text */}
                <p className="text-gray-800 mb-2">{item.text}</p>

                {/* Confidence */}
                <p className="text-sm text-gray-500">
                  Confidence:{" "}
                  <strong className="text-gray-800">
                    {item.confidence}%
                  </strong>
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}