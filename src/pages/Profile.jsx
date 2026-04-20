import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  LogOut,
  Loader2,
  Camera,
} from "lucide-react";
import { motion } from "framer-motion";

import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db} from "../firebase";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photoInputRef = useRef(null);

  const auth = getAuth();
  const navigate = useNavigate();

  // ✅ LOAD USER + FIRESTORE DATA
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (u) => {
    if (!u) {
      navigate("/");
      return;
    }

    try {
      const docRef = doc(db, "users", u.uid);
      const snap = await getDoc(docRef);

      let data = {};

      if (snap.exists()) {
        data = snap.data();
      }

      // ✅ set form
      setForm({
        full_name: data.full_name || u.displayName || "",
        phone: data.phone || "",
        email: data.email || u.email || "",
      });

      // ✅ set user (INCLUDING profile_picture)
      setUser({
        ...u,
        profile_picture: data.profile_picture || null,
      });

    } catch (err) {
      console.error(err);
    }
  });

  return () => unsub();
}, [navigate]);
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
  // ✅ PHOTO UPLOAD
  const handlePhotoChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !user) return;

  setUploadingPhoto(true);

  try {
    // ✅ compress image
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.2, // VERY IMPORTANT (keep small)
      maxWidthOrHeight: 300,
      useWebWorker: true,
    });

    // ✅ convert to base64
    const base64 = await convertToBase64(compressedFile);

    // ⚠️ check size before saving
    if (base64.length > 800000) {
      alert("Image too large even after compression ❌");
      setUploadingPhoto(false);
      return;
    }

    // ✅ save to firestore
    await setDoc(doc(db, "users", user.uid), {
      profile_picture: base64,
    }, { merge: true });

    // update UI
   setUser((prev) => ({ ...prev, profile_picture: base64 }));

  } catch (err) {
    console.error(err);
  }

  setUploadingPhoto(false);
};

  // ✅ SAVE PROFILE
  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    try {
      // update firebase auth name
      await updateProfile(user, {
        displayName: form.full_name,
      });

      // save to firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          full_name: form.full_name,
          email: form.email,
          ...(form.phone && { phone: form.phone }),
        },
        { merge: true }
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

    } catch (err) {
      console.error(err);
    }

    setIsSaving(false);
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const initials =
    form.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto py-6"
    >
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {/* Avatar */}
      <Card className="mb-6">
        <CardContent className="p-6 flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center text-white font-bold">
            {user.profile_picture ? (
  <img
  src={user.profile_picture}
  className="w-full h-full object-cover"
  onError={(e) => (e.target.style.display = "none")}
/>
) : (
  initials
)}
            </div>

            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            <input
             ref={photoInputRef}
             type="file"
             accept="image/*" 
             className="hidden"
             onChange={handlePhotoChange}
            />
          </div>

          <div>
            <p className="font-semibold">{form.full_name || "User"}</p>
            <p className="text-sm text-gray-500">{form.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">

          {/* Editable Name */}
          <div>
            <Label>Full Name</Label>
            <Input
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
            />
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input value={form.email} readOnly />
          </div>

          {/* Phone */}
          <div>
            <Label>Phone (optional)</Label>
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving
              ? "Saving..."
              : saved
              ? "Saved!"
              : "Save Changes"}
          </Button>

        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        className="w-full bg-red-500 hover:bg-red-600"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </motion.div>
  );
}