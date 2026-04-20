import { Shield, CheckCircle2, BarChart3, Search, ArrowRight, Sparkles, Globe, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
const features = [
  {
    icon: Search,
    title: 'News Verification',
    desc: 'Cross-check any claim against trusted global sources like Reuters, BBC, and AP in seconds.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'Source Credibility',
    desc: "Evaluate any news outlet's trustworthiness with a detailed credibility score.",
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Visual Analytics',
    desc: 'Explore charts and dashboards showing verification trends and distribution.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Brain,
    title: 'AI Reasoning',
    desc: 'Powered by advanced AI that explains why a claim is reliable or misleading.',
    color: 'bg-violet-100 text-violet-600',
  },
];

const stats = [
  { label: 'Claims Verified', value: '10K+' },
  { label: 'Sources Tracked', value: '500+' },
  { label: 'Accuracy Rate', value: '94%' },
];

export default function Landing() {
const navigate = useNavigate();
const [loading, setLoading] = useState(true);
const handleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists() && snap.data().profile_complete) {
      navigate("/home");
    } else {
      navigate("/profile-setup");
    }

  } catch (error) {
    console.error(error);
  }
};
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists() && snap.data().profile_complete) {
        navigate("/home");
      } else {
        navigate("/profile-setup");
      }
    } else {
      setLoading(false); 
    }
  });

  return () => unsub();
}, [navigate]);
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">Credify</span>
          </div>
          <Button onClick={handleSignIn} className="rounded-xl px-6 font-semibold shadow-md shadow-primary/20">
            Sign In / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4">
        {/* Background blobs */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Fake News Detection
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Don't believe everything
              <span className="text-primary block">you read.</span>
            </h1>

            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Credify uses AI and cross-source verification to instantly check if a news claim is reliable — and tells you exactly why.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-sm mx-auto">
              <Button
                onClick={handleSignIn}
                size="lg"
                className="rounded-xl px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 w-full"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or continue with</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-3 w-full">

  {/* Google */}
  <button
    onClick={handleSignIn}
    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-border/60 bg-card hover:bg-secondary transition-colors text-sm font-medium text-foreground shadow-sm"
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Google
  </button>

  {/* GitHub */}
  <button
    onClick={handleSignIn}
    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-border/60 bg-card hover:bg-secondary transition-colors text-sm font-medium text-foreground shadow-sm"
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
    GitHub
  </button>

  {/* Facebook */}
  <button
    onClick={handleSignIn}
    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-border/60 bg-card hover:bg-secondary transition-colors text-sm font-medium text-foreground shadow-sm"
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
    Facebook
  </button>

</div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-10 mt-16"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything you need to fight misinformation</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">A complete toolkit for verifying news in the age of information overload.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-card rounded-2xl p-6 border border-border/50 shadow-md shadow-black/5 hover:shadow-lg transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Globe className="w-12 h-12 text-primary mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to verify the truth?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">Join Credify and start checking news claims in seconds.</p>
          <Button
            onClick={handleSignIn}
            size="lg"
            className="rounded-xl px-10 h-13 text-base font-semibold shadow-lg shadow-primary/25"
          >
            Sign Up — It's Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-foreground">Credify</span>
        </div>
        <p>© 2026 Credify. AI-powered fake news detection.</p>
      </footer>
    </div>
  );
}