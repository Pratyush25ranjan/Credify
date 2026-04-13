import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, User, Phone, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

import { useNavigate } from "react-router-dom";

export default function ProfileSetup() {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const auth = getAuth();
  const navigate = useNavigate();

  // ✅ Load user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setForm({
          full_name: user.displayName || '',
          phone: '',
          email: user.email || '',
        });
      } else {
        // ❌ Not logged in → go back
        navigate("/");
      }

      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const user = auth.currentUser;

    if (!user) {
      setIsSaving(false);
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          full_name: form.full_name,
          email: form.email,
          profile_complete: true,
          ...(form.phone && { phone: form.phone }), // optional phone
        },
        { merge: true }
      );

      // ✅ redirect to dashboard
      navigate("/home");

    } catch (error) {
      console.error(error);
    }

    setIsSaving(false);
  };

  // ✅ Loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold">Credify</h1>
            </div>

            <h2 className="text-2xl font-bold">Complete Your Profile</h2>
            <p className="text-gray-500 text-sm">
              Just a few details to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Name (Editable) */}
            <div>
              <Label>Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label>Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={form.email}
                  readOnly
                  className="pl-10 bg-gray-100"
                />
              </div>
            </div>

            {/* Phone OPTIONAL */}
            <div>
              <Label>Phone (optional)</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gray-100 p-4 rounded-xl text-sm space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-4 h-4" />
                AI-powered news verification
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-4 h-4" />
                Source credibility scoring
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-4 h-4" />
                Analytics dashboard
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Saving..." : "Continue"}
            </Button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}