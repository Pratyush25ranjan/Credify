import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import SourceCredibility from "./pages/SourceCredibility";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import Profile from "./pages/Profile";
import TrendingNews from "./pages/TrendingNews";
import Landing from "./pages/Landing";
import ProfileSetup from "./pages/ProfileSetup";

// ✅ Simple 404 (NO react-query here)
function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">404 - Page Not Found</h1>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>

        {/* 🔓 Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* 🔐 App Routes (with Layout) */}
        <Route element={<Layout />}>

          <Route path="/home" element={<Home />} />
          <Route path="/credibility" element={<SourceCredibility />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trending" element={<TrendingNews />} />

        </Route>

        {/* ❌ 404 */}
        <Route path="*" element={<PageNotFound />} />

      </Routes>
    </Router>
  );
}

export default App;