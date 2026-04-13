import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import StatsOverview from "../components/analytics/StatsOverview";
import VerdictChart from "../components/analytics/VerdictChart";
import TrendChart from "../components/analytics/TrendChart";

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export default function Analytics() {

  const fetchHistory = async () => {
    const q = query(
      collection(db, "verificationHistory"),
      orderBy("created_date"),
      limit(100)
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 py-4"
    >
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-gray-500">Overview of your activity</p>
      </div>

      <StatsOverview history={history} />
      <VerdictChart history={history} />
      <TrendChart history={history} />
    </motion.div>
  );
}