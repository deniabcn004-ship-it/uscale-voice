import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Volume2,
  MapPin,
  Cpu,
  History,
  FileText,
  Sliders,
  Maximize2,
  Trash2,
  Mic,
  Info,
  Loader2,
  AlertCircle,
  HelpCircle,
  Undo,
  Coins,
  LogOut,
  Lock,
  Shield,
  User,
  Mail,
  Phone,
  MessageSquare,
  Key,
} from "lucide-react";
import { PRESET_SCRIPTS } from "./components/Presets";
import { HistoryItem, PresetScript } from "./types";
import AudioPlayer from "./components/AudioPlayer";
import ScriptGenerator from "./components/ScriptGenerator";
import HistoryList from "./components/HistoryList";
import UScaleLogo from "./components/UScaleLogo";
import AdminPanel from "./components/AdminPanel";
import AuthGateway from "./components/AuthGateway";
import {
  auth,
  db,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "./lib/firebase";
import { onSnapshot } from "firebase/firestore";

// Helper to convert base64 audio back to Blob URL for playback
function base64ToBlobUrl(base64: string, mimeType: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert base64 to Blob URL", e);
    return "";
  }
}

export default function App() {
  // Script / Adaptation states
  const [originalScript, setOriginalScript] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [adaptedArabic, setAdaptedArabic] = useState("");
  const [adaptedLatin, setAdaptedLatin] = useState("");
  const [pronunciationGuide, setPronunciationGuide] = useState("");
  const [vibeDescription, setVibeDescription] = useState("");

  // Configuration states
  const [region, setRegion] = useState("central");
  const [style, setStyle] = useState("commercial");
  const [voice, setVoice] = useState("Kore"); // Amina (Kore) is default
  const [speed, setSpeed] = useState("normal");
  const [emotion, setEmotion] = useState("cheerful");

  // Loading and feedback states
  const [isLoadingAdapt, setIsLoadingAdapt] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Audio and history states
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/mp3");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Simple stats
  const [totalVoiceovers, setTotalVoiceovers] = useState(0);

  // Firebase Auth & Sync State
  const [user, setUser] = useState<any>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // New States for Authentication & Admin panel
  const [isAdminView, setIsAdminView] = useState(
    window.location.pathname === "/admin",
  );
  const [credits, setCredits] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Fallback to load history from localStorage if Firebase fails or is offline
  const loadLocalHistoryFallback = () => {
    const saved = localStorage.getItem("algerian_voiceover_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        setTotalVoiceovers(parsed.length);
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
      }
    }
  };

  // Load and merge/sync history from Firestore
  const loadHistoryFromFirestore = async (userId: string) => {
    try {
      setIsFirebaseLoading(true);
      const q = query(
        collection(db, "voiceovers"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);
      const cloudItems: HistoryItem[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const base64 = data.audioBase64 || "";
        const mimeType = data.mimeType || "audio/mp3";
        const blobUrl = base64 ? base64ToBlobUrl(base64, mimeType) : "";

        cloudItems.push({
          id: docSnap.id,
          title: data.title || "تعليق صوتي بدون عنوان",
          originalText: data.originalText || "",
          adaptedArabic: data.adaptedArabic || "",
          adaptedLatin: data.adaptedLatin || "",
          region: data.region || "central",
          voice: data.voice || "Kore",
          speed: data.speed || "normal",
          emotion: data.emotion || "cheerful",
          audioUrl: blobUrl, // Dynamic session-valid blob URL
          timestamp: data.timestamp || "",
          vibeDescription: data.vibeDescription || "",
          pronunciationGuide: data.pronunciationGuide || "",
          mimeType: mimeType,
          audioBase64: base64,
        });
      });

      // Sync local storage history if cloud is currently empty (first cloud use)
      const savedLocal = localStorage.getItem("algerian_voiceover_history");
      if (savedLocal && cloudItems.length === 0) {
        try {
          const parsedLocal: HistoryItem[] = JSON.parse(savedLocal);
          if (parsedLocal.length > 0) {
            console.log("Syncing local history items to Firebase cloud...");
            for (const item of parsedLocal) {
              const docRef = doc(db, "voiceovers", item.id);
              await setDoc(docRef, {
                userId,
                title: item.title,
                originalText: item.originalText,
                adaptedArabic: item.adaptedArabic,
                adaptedLatin: item.adaptedLatin,
                region: item.region,
                voice: item.voice,
                speed: item.speed,
                emotion: item.emotion,
                audioBase64: item.audioBase64 || "",
                mimeType: item.mimeType || "audio/mp3",
                timestamp: item.timestamp,
                vibeDescription: item.vibeDescription,
                pronunciationGuide: item.pronunciationGuide,
                createdAt: new Date(parseInt(item.id) || Date.now()),
              });
            }
            // Reload after sync
            await loadHistoryFromFirestore(userId);
            return;
          }
        } catch (syncErr) {
          console.error("Error syncing local history to Firebase", syncErr);
        }
      }

      setHistory(cloudItems);
      setTotalVoiceovers(cloudItems.length);
    } catch (err) {
      console.error("Error loading from Firestore", err);
      loadLocalHistoryFallback();
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  // Auth and Firestore mount listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.isAnonymous) {
        // If they are anonymous, sign them out so we require actual accounts
        await signOut(auth);
        setUser(null);
        setIsFirebaseLoading(false);
      } else {
        setUser(currentUser);
        if (currentUser) {
          await loadHistoryFromFirestore(currentUser.uid);
        } else {
          setIsFirebaseLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of Credits and Profile metadata
  useEffect(() => {
    if (!user) {
      setCredits(null);
      setUserProfile(null);
      return;
    }

    // 1. Sync account info with backend (creates user doc if non-existent, updates email/username)
    fetch("/api/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email || "",
        username:
          user.displayName ||
          user.email?.split("@")[0] ||
          (user.isAnonymous ? "زائر" : "مستخدم"),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Profile sync complete:", data);
      })
      .catch((err) => {
        console.warn("Backend profile sync warning:", err);
      });

    // 2. Setup real-time listener for credits and isAdmin privilege
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCredits(data.credits ?? 0);
          setUserProfile(data);
        } else {
          setCredits(0);
          setUserProfile(null);
        }
      },
      (err) => {
        console.warn("Firestore user profile subscription error:", err);
      },
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    setTotalVoiceovers(newHistory.length);
    localStorage.setItem(
      "algerian_voiceover_history",
      JSON.stringify(newHistory),
    );
  };

  // Preset Selection handler
  const handleSelectPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = PRESET_SCRIPTS.find((p) => p.id === presetId);
    if (preset) {
      setOriginalScript(preset.text);
      setScriptTitle(preset.title);
      // Clear old adaptations to avoid mismatch
      setAdaptedArabic("");
      setAdaptedLatin("");
      setPronunciationGuide("");
      setVibeDescription("");
      setAudioUrl(null);
      setError(null);
    }
  };

  // Convert script to Algerian Dialect via API
  const handleAdaptDialect = async () => {
    if (!originalScript.trim()) {
      setError("الرجاء إدخال السكريبت أولاً.");
      return;
    }

    setIsLoadingAdapt(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/adapt-dialect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: originalScript,
          region,
          style,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل تحويل السكريبت إلى الدارجة.");
      }

      const data = await response.json();
      setAdaptedArabic(data.adaptedArabic);
      setAdaptedLatin(data.adaptedLatin);
      setPronunciationGuide(data.pronunciationGuide);
      setVibeDescription(data.vibeDescription);
      setSuccess("تم تكييف النص وتحويله إلى الدارجة بنجاح!");
    } catch (err: any) {
      console.error("Adapt dialect error:", err);
      setError(err.message || "حدث خطأ أثناء تحويل اللهجة.");
    } finally {
      setIsLoadingAdapt(false);
    }
  };

  // Convert generated Darja text into Voiceover audio file via API
  const handleGenerateVoice = async () => {
    const textToSpeak = adaptedArabic || originalScript;

    if (!textToSpeak.trim()) {
      setError("الرجاء كتابة أو توليد النص الذي ترغب في تحويله لصوت.");
      return;
    }

    setIsLoadingVoice(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voice,
          speed,
          emotion,
          userId: user?.uid,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 402) {
          throw new Error(
            "رصيدك غير كافٍ لتوليد التعليق الصوتي! يرجى شحن حسابك بالاتصال بنا على 0654049765 أو عبر واتساب.",
          );
        }
        throw new Error(errData.error || "فشل توليد الفويس أوفر.");
      }

      const data = await response.json();
      const base64Audio = data.audioBase64;
      const responseMimeType = data.mimeType || "audio/mp3";

      // Convert Base64 back to Blob URL for playback
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: responseMimeType });
      const blobUrl = URL.createObjectURL(blob);

      setAudioUrl(blobUrl);
      setAudioMimeType(responseMimeType);
      setSuccess("تم توليد التعليق الصوتي الاحترافي بنجاح!");

      // Add to Studio History list
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: scriptTitle || "تعليق صوتي بدون عنوان",
        originalText: originalScript,
        adaptedArabic: adaptedArabic || textToSpeak,
        adaptedLatin: adaptedLatin,
        region,
        voice,
        speed,
        emotion,
        audioUrl: blobUrl,
        timestamp: new Date().toLocaleTimeString("ar-DZ", {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        }),
        vibeDescription: vibeDescription,
        pronunciationGuide: pronunciationGuide,
        mimeType: responseMimeType,
        audioBase64: base64Audio,
      };

      saveHistory([newItem, ...history]);

      // Save to Firebase Cloud Firestore
      if (user) {
        try {
          const docRef = doc(db, "voiceovers", newItem.id);
          await setDoc(docRef, {
            userId: user.uid,
            title: newItem.title,
            originalText: newItem.originalText,
            adaptedArabic: newItem.adaptedArabic,
            adaptedLatin: newItem.adaptedLatin,
            region: newItem.region,
            voice: newItem.voice,
            speed: newItem.speed,
            emotion: newItem.emotion,
            audioBase64: base64Audio,
            mimeType: newItem.mimeType || "audio/mp3",
            timestamp: newItem.timestamp,
            vibeDescription: newItem.vibeDescription,
            pronunciationGuide: newItem.pronunciationGuide,
            createdAt: new Date(),
          });
          console.log("Successfully saved voiceover to Firebase Cloud!");
        } catch (cloudErr) {
          console.error(
            "Failed to save voiceover to Firebase Cloud:",
            cloudErr,
          );
        }
      }
    } catch (err: any) {
      console.error("Voice synthesis error:", err);
      setError(err.message || "حدث خطأ أثناء توليد الفويس أوفر.");
    } finally {
      setIsLoadingVoice(false);
    }
  };

  // Handle script loaded from custom script writer
  const handleCustomScriptGenerated = (
    generatedScript: string,
    title: string,
  ) => {
    setOriginalScript(generatedScript);
    setScriptTitle(title);
    setAdaptedArabic("");
    setAdaptedLatin("");
    setPronunciationGuide("");
    setVibeDescription("");
    setAudioUrl(null);
    setError(null);
    setSuccess("تم صياغة السكريبت الفني بالذكاء الاصطناعي بنجاح!");
  };

  // Google Single Sign-On Authenticator
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError(err.message || "فشل تسجيل الدخول بجوجل.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Email and Password Sign-In / Register Form Submit Handler
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (isRegistering) {
        // Sign Up Flow
        if (!authUsername.trim()) {
          throw new Error("الرجاء إدخال اسم مستخدم صالح.");
        }
        const credential = await createUserWithEmailAndPassword(
          auth,
          authEmail,
          authPassword,
        );

        // Call sync-user endpoint to write username details to Firestore
        await fetch("/api/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: credential.user.uid,
            email: authEmail,
            username: authUsername,
          }),
        });
      } else {
        // Sign In Flow
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Email Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("هذا البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر.");
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setAuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل.");
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "تم تعطيل تسجيل الحساب بالبريد الإلكتروني في إعدادات Firebase. الرجاء تفعيل Email/Password من Firebase Console > Authentication > Sign-in method.",
        );
      } else {
        setAuthError(err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Action: Download active audio
  const handleDownloadActiveAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    const ext = audioMimeType === "audio/wav" ? "wav" : "mp3";
    a.download = `${(scriptTitle || "algerian_voiceover").replace(/\s+/g, "_")}_DZ.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Delete single history item
  const handleDeleteHistory = async (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);

    // Delete from Firebase Cloud Firestore
    if (user) {
      try {
        await deleteDoc(doc(db, "voiceovers", id));
        console.log("Successfully deleted voiceover from Firebase Cloud!");
      } catch (err) {
        console.error("Failed to delete voiceover from Firebase Cloud:", err);
      }
    }
  };

  // Delete all history items
  const handleClearAllHistory = async () => {
    if (confirm("هل أنت متأكد من رغبتك في حذف كل المقاطع المحفوظة؟")) {
      saveHistory([]);

      // Delete all documents from Firestore for this user
      if (user) {
        try {
          const q = query(
            collection(db, "voiceovers"),
            where("userId", "==", user.uid),
          );
          const querySnapshot = await getDocs(q);
          const deletePromises: any[] = [];
          querySnapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(docSnapshot.ref));
          });
          await Promise.all(deletePromises);
          console.log(
            "Successfully cleared all voiceovers from Firebase Cloud!",
          );
        } catch (err) {
          console.error("Failed to clear voiceovers from Firebase Cloud:", err);
        }
      }
    }
  };

  // Play older voiceover
  const handlePlayHistoryItem = (item: HistoryItem) => {
    setAudioUrl(item.audioUrl);
    setAudioMimeType(item.mimeType || "audio/mp3");
    setScriptTitle(item.title);
    setAdaptedArabic(item.adaptedArabic);
    setAdaptedLatin(item.adaptedLatin);
    setPronunciationGuide(item.pronunciationGuide);
    setVibeDescription(item.vibeDescription);
    setRegion(item.region);
    setVoice(item.voice);
    setEmotion(item.emotion);
    setSpeed(item.speed);
  };

  // Load older script into edit state
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setOriginalScript(item.originalText);
    setScriptTitle(item.title);
    setAdaptedArabic(item.adaptedArabic);
    setAdaptedLatin(item.adaptedLatin);
    setPronunciationGuide(item.pronunciationGuide);
    setVibeDescription(item.vibeDescription);
    setRegion(item.region);
    setVoice(item.voice);
    setEmotion(item.emotion);
    setSpeed(item.speed);
    setAudioUrl(item.audioUrl);
    setError(null);
    setSuccess("تم استرجاع إعدادات المقطع الصوتي بالكامل في الأستوديو.");
  };

  // 1. Full-screen Loading State
  if (isFirebaseLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="text-xs text-slate-400 font-bold font-mono uppercase tracking-wider text-center">
            جاري تحميل أستوديو صوت الدّارجة...
          </p>
        </div>
      </div>
    );
  }

  // If Admin panel view is active, hijack the rendering completely to show modular Admin Panel
  if (isAdminView) {
    const isAuthorizedAdmin =
      user &&
      !user.isAnonymous &&
      (user.email === "deniabcn004@gmail.com" || userProfile?.isAdmin === true);

    if (isAuthorizedAdmin) {
      return (
        <AdminPanel
          onBackToApp={() => {
            window.history.pushState({}, "", "/");
            setIsAdminView(false);
          }}
        />
      );
    }

    const handleAdminLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setIsAuthLoading(true);
      try {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } catch (err: any) {
        setAuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } finally {
        setIsAuthLoading(false);
      }
    };

    const handleAdminGoogleSignIn = async () => {
      setAuthError(null);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        setAuthError("فشل تسجيل الدخول بجوجل.");
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative font-sans selection:bg-cyan-500 selection:text-slate-950">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-8 shadow-2xl flex flex-col gap-6 text-right">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-cyan-500/10 p-3 rounded-full border border-cyan-500/20">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-white font-extrabold text-lg mt-2">
              بوابة تسجيل دخول الإدارة 🛡️
            </h2>
            <p className="text-xs text-slate-400 text-center font-mono">
              uScale Algerian Dialect System
            </p>
          </div>

          {user && !user.isAnonymous && !isAuthorizedAdmin && (
            <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-xs text-red-400 leading-relaxed text-center font-bold">
              عذراً، الحساب الحالي ({user.email}) لا يملك صلاحيات الإدارة للوصول
              إلى لوحة التحكم.
            </div>
          )}

          <form
            onSubmit={handleAdminLoginSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-bold">
                البريد الإلكتروني للإدارة:
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="example@admin.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors text-right"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-bold">
                كلمة المرور:
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors text-right"
              />
            </div>

            {authError && (
              <p className="text-[11px] text-red-400 text-center font-bold">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 text-slate-950" />
                  تسجيل الدخول الآمن
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold">
              أو تسجيل سريع
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            onClick={handleAdminGoogleSignIn}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-white font-bold py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14A5.64 5.64 0 0 1 8.3 12.9a5.64 5.64 0 0 1 5.69-5.64c1.556 0 2.978.61 4.053 1.62l3.11-3.11A10.02 10.02 0 0 0 13.99 2 9.98 9.98 0 0 0 4 11.97a9.98 9.98 0 0 0 9.99 9.97c5.51 0 10.01-4 10.01-9.97 0-.6-.05-1.18-.15-1.685z"
              />
            </svg>
            تسجيل الدخول بواسطة حساب Gmail
          </button>

          <div className="flex justify-center mt-2 border-t border-slate-800 pt-4">
            <button
              onClick={() => {
                window.history.pushState({}, "", "/");
                setIsAdminView(false);
              }}
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              العودة للمنصة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Gateway Block: Require users to create an account or login
  const isLogged = user && !user.isAnonymous;
  if (!isLogged) {
    return (
      <AuthGateway
        onAuthSuccess={() => {
          console.log("Logged in successfully, unlocking studio.");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Decorative colored glow orbs */}
      <div className="absolute top-0 right-[15%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] left-[5%] w-[350px] h-[350px] rounded-full bg-red-500/5 blur-[100px] pointer-events-none" />

      {/* Modern High-End Navbar Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between flex-row-reverse">
          {/* Logo Brand */}
          <div className="flex items-center gap-4 flex-row-reverse">
            <UScaleLogo className="h-9" />
            <div className="hidden sm:block h-6 w-[1px] bg-slate-800" />
            <div className="flex flex-col text-right">
              <span className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1 flex-row-reverse">
                صوت الدّارجة
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                uScale Voice Studio
              </span>
            </div>
          </div>

          {/* User Account / Auth Control and stats */}
          <div className="flex items-center gap-3">
            {/* If user is logged in (and not anonymous) */}
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-3">
                {/* Admin Access Privilege Indicator */}
                {(userProfile?.isAdmin === true ||
                  user.email === "deniabcn004@gmail.com") && (
                  <button
                    onClick={() => {
                      window.history.pushState({}, "", "/admin");
                      setIsAdminView(true);
                    }}
                    className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] px-3 py-1.5 rounded-xl border border-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    لوحة التحكم 🛡️
                  </button>
                )}

                {/* Credits Indicator / Buy trigger */}
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-400">رصيدك:</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">
                    {credits !== null ? credits : "--"}
                  </span>
                </div>

                {/* User email badge */}
                <div className="hidden xs:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300 max-w-[120px] truncate">
                    {userProfile?.username || user.email?.split("@")[0]}
                  </span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut(auth)}
                  title="تسجيل الخروج"
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 p-2 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Anonymous / Guest Guest Mode
              <div className="flex items-center gap-3">
                {/* Guest balance show if they have any */}
                {credits !== null && credits > 0 && (
                  <div className="hidden sm:flex items-center gap-1 bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-xl">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-slate-400">
                      رصيد تجريبي: {credits}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthEmail("");
                    setAuthPassword("");
                    setAuthUsername("");
                    setIsRegistering(false);
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-cyan-500/10 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  تسجيل الدخول / حساب جديد
                </button>
              </div>
            )}

            {/* General studio indicators */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">
                المنتج: {totalVoiceovers}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-cyan-500/10 px-2.5 py-1.5 rounded-lg border border-cyan-500/15">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                Gemini AI Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* RIGHT COLUMN: Output, Player, and Archived History (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-1 lg:order-2">
          {/* Section: Premium Audio Player */}
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider text-right flex items-center justify-end gap-1.5">
              <span>أستوديو التشغيل الصوتي</span>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <AudioPlayer
              audioUrl={audioUrl}
              onDownload={handleDownloadActiveAudio}
              title={scriptTitle || "مقطع الدارجة المولد"}
              pronunciationGuide={pronunciationGuide}
              vibeDescription={vibeDescription}
              adaptedArabic={adaptedArabic}
              adaptedLatin={adaptedLatin}
            />
          </div>

          {/* Section: Credit Purchase Support Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4 text-right">
            <div className="flex justify-between items-center flex-row-reverse">
              <h4 className="text-white font-extrabold text-sm flex items-center gap-1.5 flex-row-reverse">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>شحن حسابك وتعبئة النقاط 💳</span>
              </h4>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-bold">
                شحن سريع
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              تحتاج إلى المزيد من النقاط لإنتاج تعليقات صوتية غير محدودة؟ اتصل
              بنا أو راسلنا الآن لشحن حسابك فوراً وتفعيل باقات النقاط الإضافية!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <a
                href="tel:0654049765"
                className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 py-3 rounded-xl text-xs text-white font-bold transition-all cursor-pointer shadow-sm"
              >
                <span>اتصل بنا: 0654049765</span>
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
              </a>
              <a
                href="https://wa.me/213654049765"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-900/30 hover:border-emerald-800/40 py-3 rounded-xl text-xs text-emerald-400 font-bold transition-all cursor-pointer shadow-sm"
              >
                <span>راسلنا واتساب: 0654049765</span>
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            </div>
          </div>

          {/* Section: Archived History */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center flex-row-reverse">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5 flex-row-reverse">
                <History className="w-4 h-4 text-cyan-400" />
                <span>أرشيف التوليدات الأخيرة</span>
              </h3>
              {history.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/10 hover:bg-red-950/20 border border-red-950/30 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  مسح الكل
                </button>
              )}
            </div>

            <HistoryList
              items={history}
              onPlay={handlePlayHistoryItem}
              onDelete={handleDeleteHistory}
              onLoad={handleLoadHistoryItem}
            />
          </div>
        </div>

        {/* LEFT COLUMN: Input form, AI Generator, Dialect Adaptor (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
          {/* Global notification alerts */}
          {error && (
            <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs text-right flex-row-reverse">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4 flex items-center gap-3 text-cyan-400 text-xs text-right flex-row-reverse">
              <Sparkles className="w-5 h-5 shrink-0" />
              <div className="flex-1">{success}</div>
            </div>
          )}

          {/* Section 1: Script Writer (Presets & Custom Input) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-900 pb-4">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2 flex-row-reverse">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>الخطوة 1: السكريبت والنص المكتوب</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                بداية من فكرة أو نص جاهز
              </span>
            </div>

            {/* Presets selector */}
            <div className="flex flex-col gap-2 text-right">
              <label className="text-xs text-slate-300 font-medium">
                اختر نموذجاً أو سكريبت جاهزاً للبدء:
              </label>
              <select
                onChange={(e) => handleSelectPreset(e.target.value)}
                defaultValue=""
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors text-right cursor-pointer"
              >
                <option value="" disabled>
                  -- اختر من النماذج الاحترافية --
                </option>
                {PRESET_SCRIPTS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title} ({preset.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom script generator with AI */}
            <ScriptGenerator onScriptGenerated={handleCustomScriptGenerated} />

            {/* Standard Text input form */}
            <div className="flex flex-col gap-2 text-right">
              <div className="flex justify-between items-center flex-row-reverse">
                <label className="text-xs text-slate-200 font-bold">
                  النص الأصلي (بالعربية الفصحى أو بلغة أخرى):
                </label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="عنوان السكريبت..."
                  className="bg-transparent border-b border-slate-800 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none py-0.5 px-2 text-right placeholder:text-slate-700 max-w-[200px]"
                />
              </div>
              <textarea
                value={originalScript}
                onChange={(e) => {
                  setOriginalScript(e.target.value);
                  if (!scriptTitle) setScriptTitle("سكريبت فويس اوفر جزائري");
                }}
                rows={4}
                placeholder="اكتب السكريبت هنا باللغة العربية الفصحى أو الفرنسية، أو الصق النص الذي ترغب في تحويله وإلقائه بالدّارجة الجزائرية..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors text-right leading-relaxed"
                disabled={isLoadingAdapt}
              />
            </div>
          </div>

          {/* Section 2: Algerian Dialect Configuration (Darja Converter) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-900 pb-4">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2 flex-row-reverse">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>الخطوة 2: تكييف وتحويل اللهجة الجزائرية</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                اختر اللكنة الفرعية الدقيقة
              </span>
            </div>

            {/* Sub-dialect Region cards selection */}
            <div className="flex flex-col gap-3 text-right">
              <label className="text-xs text-slate-200 font-bold">
                اختر لهجة المنطقة الجغرافية:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    id: "central",
                    name: "لكنة الوسط 🇩🇿",
                    desc: "العاصمية والولايات المجاورة",
                  },
                  {
                    id: "western",
                    name: "لكنة الغرب 🍊",
                    desc: "الوهرانية وولايات الغرب",
                  },
                  {
                    id: "eastern",
                    name: "لكنة الشرق 🏺",
                    desc: "القسنطينية وباتنة وسطيف",
                  },
                  {
                    id: "southern",
                    name: "لكنة الجنوب 🌴",
                    desc: "الصحراء والواحات وبشار",
                  },
                ].map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setRegion(reg.id)}
                    className={`p-3.5 rounded-xl border text-center transition-all flex flex-col gap-1 items-center justify-center cursor-pointer ${
                      region === reg.id
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-500/5"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs font-bold">{reg.name}</span>
                    <span className="text-[9px] text-slate-500 text-center leading-normal">
                      {reg.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone/Style categories for Dialect Adaptation */}
            <div className="flex flex-col gap-2 text-right">
              <label className="text-xs text-slate-300 font-medium">
                روح وبناء الحوار المطلوب:
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { id: "commercial", label: "تجاري سريع" },
                  { id: "conversational", label: "حواري طبيعي" },
                  { id: "documentary", label: "عميق ووقور" },
                  { id: "youthful", label: "شبابي شعبي" },
                  { id: "formal", label: "رسمي جاد" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStyle(item.id)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-medium border text-center transition-colors ${
                      style === item.id
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Convert trigger button */}
            <button
              onClick={handleAdaptDialect}
              className="w-full h-11 bg-slate-900 hover:bg-slate-850 text-cyan-400 hover:text-cyan-300 rounded-xl font-bold text-xs border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              disabled={isLoadingAdapt || !originalScript.trim()}
            >
              {isLoadingAdapt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري صياغة وتحويل النص للدارجة الأصيلة...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>تحويل السكريبت إلى الدارجة الجزائرية 🇩🇿</span>
                </>
              )}
            </button>
          </div>

          {/* Section 3: Speech Synthesis Customization & Synthesis Trigger */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-900 pb-4">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2 flex-row-reverse">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>الخطوة 3: تخصيص الصوت ومقاييس الإلقاء</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                نبرة، سرعة وصوت المؤدي
              </span>
            </div>

            {/* Voice actor prebuilt voices */}
            <div className="flex flex-col gap-3 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <label className="text-xs text-slate-200 font-bold">
                  اختر معلقاً صوتياً بالذكاء الاصطناعي:
                </label>
                <Info
                  className="w-3.5 h-3.5 text-slate-500"
                  title="أصوات تخصصية ممتازة للنطق بالدّارجة"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  {
                    id: "Kore",
                    name: "أمينة (Kore) 👩‍💼",
                    desc: "نقي، عاصمي واحترافي",
                  },
                  {
                    id: "Puck",
                    name: "سليم (Puck) 👨‍💼",
                    desc: "حيوي ومرح وسريع",
                  },
                  {
                    id: "Zephyr",
                    name: "جميلة (Zephyr) 👩‍🎨",
                    desc: "لطيف، دافئ وقصصي",
                  },
                  {
                    id: "Charon",
                    name: "أمين (Charon) 👨‍🚀",
                    desc: "عميق، وقور وإعلامي",
                  },
                  {
                    id: "Fenrir",
                    name: "ياسين (Fenrir) 👨‍🌾",
                    desc: "ودود، هادئ وتواصلي",
                  },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoice(v.id)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 items-end justify-center cursor-pointer ${
                      voice === v.id
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-[11px] font-bold">{v.name}</span>
                    <span className="text-[9px] text-slate-500 leading-normal">
                      {v.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion / Mood configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              {/* Emotion Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-300 font-medium">
                  نبرة الصوت والأسلوب التعبيري:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "cheerful", name: "مرح وحيوي 😊" },
                    { id: "professional", name: "جدي واحترافي 💼" },
                    { id: "dramatic", name: "حماسي وقوي 🔥" },
                    { id: "calm", name: "هادئ ولطيف 🍃" },
                  ].map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEmotion(e.id)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                        emotion === e.id
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speech speed select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-300 font-medium">
                  سرعة الإلقاء ومعدل التحدث:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "slow", name: "بطيء وموزون 🐢" },
                    { id: "normal", name: "عادي طبيعي 🚶" },
                    { id: "fast", name: "سريع وحماسي ⚡" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpeed(s.id)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                        speed === s.id
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FINAL GENERATE TRIGGER BUTTON */}
            <button
              onClick={handleGenerateVoice}
              className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.99] transition-all"
              disabled={isLoadingVoice}
            >
              {isLoadingVoice ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>
                    جاري توليد الموجات الصوتية للفويس أوفر الاحترافي...
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>توليد التعليق الصوتي الاحترافي 🎙️</span>
                </>
              )}
            </button>
          </div>

          {/* Quick FAQ info tips */}
          <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex gap-4 text-right flex-row-reverse items-start">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h4 className="text-slate-200 text-xs font-bold">
                نصائح للحصول على فويس أوفر جزائري مثالي:
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                للحصول على جودة ممتازة، اضغط دائماً على "تحويل السكريبت إلى
                الدّارجة" في الخطوة الثانية قبل التوليد الصوتي. السكريبت المحول
                سيكتب بالدّارجة الجزائرية بشكل صوتي سلس، مما يجعل نموذج الذكاء
                الاصطناعي يلفظ الكلمات باللهجة الجزائرية بطريقة طبيعية ومتقنة
                بنسبة 100%!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* --- PREMIUM USER AUTHENTICATION MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans selection:bg-cyan-500 selection:text-slate-950">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative flex flex-col gap-5 text-right animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header Identity */}
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 p-3 rounded-2xl border border-cyan-500/20">
                <UScaleLogo className="h-8" />
              </div>
              <h3 className="text-white font-extrabold text-base mt-2">
                مرحباً بك في صوت الدّارجة 🎙️
              </h3>
              <p className="text-[11px] text-slate-400 text-center">
                قم بإنشاء حساب لحفظ مقاطعك السحابية والاستمتاع بالنقاط المجانية!
              </p>
            </div>

            {/* Registration Mode Tabs */}
            <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setAuthError(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isRegistering
                    ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                إنشاء حساب جديد
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setAuthError(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isRegistering
                    ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                تسجيل الدخول
              </button>
            </div>

            {/* Auth Form */}
            <form
              onSubmit={handleEmailAuthSubmit}
              className="flex flex-col gap-4"
            >
              {isRegistering && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-bold">
                    اسم المستخدم / اللقب:
                  </label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="مثال: أمين"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-500 transition-colors text-right"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-bold">
                  البريد الإلكتروني:
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors text-right"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-bold">
                  كلمة المرور:
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors text-right"
                />
              </div>

              {authError && (
                <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-[11px] text-red-400 font-bold leading-relaxed text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    {isRegistering ? "تأكيد التسجيل السريع" : "دخول آمن لحسابك"}
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold">
                أو تسجيل الدخول السريع
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Google Gmail authentication */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-white font-bold py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14A5.64 5.64 0 0 1 8.3 12.9a5.64 5.64 0 0 1 5.69-5.64c1.556 0 2.978.61 4.053 1.62l3.11-3.11A10.02 10.02 0 0 0 13.99 2 9.98 9.98 0 0 0 4 11.97a9.98 9.98 0 0 0 9.99 9.97c5.51 0 10.01-4 10.01-9.97 0-.6-.05-1.18-.15-1.685z"
                />
              </svg>
              سجّل فوراً بحساب جوجل Gmail
            </button>

            <p className="text-[10px] text-slate-500 leading-normal text-center mt-2">
              بإنشاء الحساب، فإنك توافق على شروط الخدمة وتوافق على تحويل رصيدك
              الحالي لحسابك المؤمن سحابياً.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
