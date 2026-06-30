import React, { useState } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Loader2,
  Shield,
  Mic,
  Music,
  Globe,
  Coins,
  Key,
} from "lucide-react";
import UScaleLogo from "./UScaleLogo";
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "../lib/firebase";

interface AuthGatewayProps {
  onAuthSuccess: () => void;
}

export default function AuthGateway({ onAuthSuccess }: AuthGatewayProps) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError("فشل تسجيل الدخول بواسطة جوجل. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  // Email Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!username.trim()) {
          throw new Error("الرجاء إدخال اسم مستخدم أو لقب صالح.");
        }
        if (password.length < 6) {
          throw new Error("يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل.");
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        // Sync user to Firestore backend
        await fetch("/api/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: credential.user.uid,
            email: email,
            username: username,
          }),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("هذا البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر.");
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else if (err.code === "auth/weak-password") {
        setError("يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          "تم تعطيل تسجيل الحساب بالبريد الإلكتروني في إعدادات Firebase. الرجاء تفعيل Email/Password من Firebase Console > Authentication > Sign-in method.",
        );
      } else {
        setError(err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-12 relative font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Dynamic Ambient Glowing Orbs */}
      <div className="absolute top-10 right-10 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Main Responsive Split Grid Card */}
      <div className="w-full max-w-5xl bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* LEFT COLUMN: Premium Feature Showcase & Value Pitch (Hidden on Mobile/Tablet, elegant on Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 p-10 flex-col justify-between border-r border-slate-900 text-right">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 justify-end">
            <div className="flex flex-col">
              <span className="text-white font-black text-base tracking-tight">
                صوت الدّارجة
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                uScale Voice Studio
              </span>
            </div>
            <UScaleLogo className="h-9" />
          </div>

          {/* Core Feature bullet lists */}
          <div className="flex flex-col gap-6 my-8">
            <h3 className="text-white font-extrabold text-lg">
              أول منصة ذكاء اصطناعي صوتية بالدارجة الجزائريّة 🇩🇿
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بإنشاء حساب مجاني فوراً لفتح كافة مميزات أستوديو التعليق الصوتي
              المتقدم بالدارجة العامية المحلية لمختلف مناطق الجزائر.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              {/* Feature 1 */}
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20 mt-0.5">
                  <Mic className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs text-white font-bold">
                    دقة للهجات المحلية الدارجة
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    مواءمة فورية بين الفصحى والدارجة لتوليد نطق طبيعي 100%.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 mt-0.5">
                  <Music className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs text-white font-bold">
                    تعديل المشاعر ونبرة الصوت
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    اختر بين نبرات حماسية، هادئة، أو مهنية وماركتينغ تناسب
                    مشروعك.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-0.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs text-white font-bold">
                    نقاط ترحيبية مجانية 🎁
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    احصل على رصيد نقاط فوري عند التسجيل للبدء في إنتاج تعليقاتك
                    الصوتية.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="flex items-center gap-2 justify-end text-slate-500 text-[10px]">
            <span>نظام تسجيل دخول مشفّر وآمن</span>
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Forms (Highly Responsive, full viewport on small screens) */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center text-right">
          {/* Mobile-only Header */}
          <div className="flex lg:hidden flex-col items-center gap-2 mb-8">
            <UScaleLogo className="h-10" />
            <h2 className="text-white font-black text-lg mt-2">
              صوت الدّارجة 🎙️
            </h2>
            <p className="text-xs text-slate-400 text-center">
              بوابة تسجيل الحساب لفتح أستوديو التعليق الصوتي بالعامية الجزائرية
            </p>
          </div>

          <div className="max-w-md w-full mx-auto flex flex-col gap-6">
            {/* Form Title */}
            <div className="hidden lg:flex flex-col gap-1.5">
              <h2 className="text-white font-black text-2xl">
                إنشاء حساب أو تسجيل الدخول
              </h2>
              <p className="text-xs text-slate-400">
                يرجى تسجيل حساب جديد للوصول إلى كامل أدوات الأستوديو.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  setError(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isRegistering
                    ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                تسجيل الدخول
              </button>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              {isRegistering && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5 justify-end">
                    <span>اسم المستخدم / اللقب:</span>
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: عبد القادر"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all text-right"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5 justify-end">
                  <span>البريد الإلكتروني:</span>
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-mono text-right"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5 justify-end">
                  <span>كلمة المرور:</span>
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-mono text-right"
                />
              </div>

              {error && (
                <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-[11px] text-red-400 font-bold leading-relaxed text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98 shadow-lg shadow-cyan-500/10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>جاري المعالجة الآمنة...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>
                      {isRegistering
                        ? "تأكيد التسجيل وفتح الأستوديو"
                        : "دخول آمن لحسابك"}
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800/60"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                أو تسجيل الدخول السريع
              </span>
              <div className="flex-grow border-t border-slate-800/60"></div>
            </div>

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-white font-bold py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-98"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14A5.64 5.64 0 0 1 8.3 12.9a5.64 5.64 0 0 1 5.69-5.64c1.556 0 2.978.61 4.053 1.62l3.11-3.11A10.02 10.02 0 0 0 13.99 2 9.98 9.98 0 0 0 4 11.97a9.98 9.98 0 0 0 9.99 9.97c5.51 0 10.01-4 10.01-9.97 0-.6-.05-1.18-.15-1.685z"
                />
              </svg>
              <span>سجّل فوراً بحساب جوجل Gmail</span>
            </button>

            {/* Safe Policy Note */}
            <p className="text-[10px] text-slate-500 leading-normal text-center mt-2">
              بالتسجيل في المنصة، فإنك تنضم لشبكة أستوديو uScale Voice وتوافق
              على شروط الخدمة وسياسة الخصوصية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
