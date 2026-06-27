import React, { useState, useEffect } from "react";
import {
  Users,
  Settings,
  Search,
  Key,
  LogOut,
  RefreshCw,
  Edit,
  Check,
  Shield,
  ShieldAlert,
  Coins,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  X,
  Mic
} from "lucide-react";
import { auth, signOut } from "../lib/firebase";

interface AdminPanelProps {
  onBackToApp: () => void;
}

interface UserAccount {
  id: string;
  uid: string;
  email: string;
  username: string;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPanel({ onBackToApp }: AdminPanelProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");

  // User Accounts State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Edit User Modal/Form State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editCredits, setEditCredits] = useState<number>(0);
  const [editIsAdmin, setEditIsAdmin] = useState<boolean>(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // System Settings State
  const [defaultCredits, setDefaultCredits] = useState<number>(10);
  const [apiToken, setApiToken] = useState<string>("");
  const [originalApiToken, setOriginalApiToken] = useState<string>("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // General System Stats State
  interface AdminStats {
    totalUsers: number;
    totalCredits: number;
    totalAdmins: number;
    totalVoiceovers: number;
  }
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCredits: 0,
    totalAdmins: 0,
    totalVoiceovers: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch Stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Users List
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("فشل تحميل قائمة الحسابات.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setUsersError(err.message || "حدث خطأ أثناء جلب الحسابات.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch System Settings
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    setSettingsError(null);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("فشل تحميل الإعدادات العامة.");
      }
      const data = await response.json();
      setDefaultCredits(data.defaultEntryCredits);
      setApiToken(data.geminiApiKey || "");
      setOriginalApiToken(data.geminiApiKey || "");
    } catch (err: any) {
      console.error(err);
      setSettingsError(err.message || "حدث خطأ أثناء جلب الإعدادات.");
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    fetchStats();
  }, [searchQuery]);

  // Save User Edit
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingUser(true);
    try {
      const response = await fetch("/api/admin/user-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.uid,
          credits: editCredits,
          isAdmin: editIsAdmin,
        }),
      });

      if (!response.ok) {
        throw new Error("فشل حفظ تعديلات الحساب.");
      }

      setEditingUser(null);
      await fetchUsers(); // Reload table
      await fetchStats(); // Reload stats
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultEntryCredits: defaultCredits,
          geminiApiKey: apiToken,
        }),
      });

      if (!response.ok) {
        throw new Error("فشل حفظ الإعدادات.");
      }

      setSettingsSuccess("تم حفظ التعديلات بنجاح وتطبيقها على خوادم المنصة!");
      await fetchSettings(); // Reload settings
      await fetchStats(); // Reload stats
    } catch (err: any) {
      setSettingsError(err.message || "حدث خطأ أثناء حفظ الإعدادات.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Stats

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-[20%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-[10%] w-[350px] h-[350px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Admin Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse">
            <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1 flex-row-reverse">
                لوحة تحكم الإدارة 🛡️
              </span>
              <span className="text-[10px] text-slate-400 font-mono">uScale Dialect Admin Control</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onBackToApp}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-xs text-slate-300 px-4 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              العودة إلى الأستوديو الرئيسي
            </button>
            <button
              onClick={() => {
                signOut(auth);
                onBackToApp();
              }}
              className="flex items-center gap-2 bg-red-950/20 hover:bg-red-950/30 text-xs text-red-400 px-4 py-2 rounded-xl border border-red-950/30 transition-all cursor-pointer font-bold"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col gap-8">
        
        {/* Quick KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">إجمالي المستخدمين</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">{stats.totalUsers}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">مجموع النقاط الموزعة</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">{stats.totalCredits}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Mic className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">التعليقات المنتجة</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">{stats.totalVoiceovers}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
            <div className="bg-teal-500/10 p-3 rounded-xl border border-teal-500/20">
              <TrendingUp className="w-6 h-6 text-teal-400" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">متوسط رصيد المستخدم</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">
                {stats.totalUsers > 0 ? Math.round(stats.totalCredits / stats.totalUsers) : 0}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
            <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">عدد المدراء (Admins)</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">{stats.totalAdmins}</p>
            </div>
          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-900 justify-end gap-6 flex-row-reverse">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 text-sm font-extrabold relative transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "users" ? "text-cyan-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            إدارة الحسابات والأرصدة
            {activeTab === "users" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 text-sm font-extrabold relative transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "settings" ? "text-cyan-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            الإعدادات العامة والتوكن
            {activeTab === "settings" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab 1: Manage Accounts */}
        {activeTab === "users" && (
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-6">
            
            {/* Search and Refresh Tools */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between flex-row-reverse">
              <div className="relative w-full md:max-w-md">
                <input
                  type="text"
                  placeholder="ابحث بالحساب الإلكتروني أو باسم المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pr-10 pl-4 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors text-right"
                />
                <Search className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5" />
              </div>

              <button
                onClick={() => {
                  fetchUsers();
                  fetchStats();
                }}
                className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-xs text-cyan-400 px-4 py-3 rounded-xl border border-slate-800 hover:border-cyan-500/20 transition-all cursor-pointer font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin" : ""}`} />
                تحديث البيانات
              </button>
            </div>

            {usersError && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs text-right flex-row-reverse">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{usersError}</span>
              </div>
            )}

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-900">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-900">
                    <th className="p-4 font-bold">تاريخ التسجيل</th>
                    <th className="p-4 font-bold">الصلاحية</th>
                    <th className="p-4 font-bold text-center">الرصيد (نقاط)</th>
                    <th className="p-4 font-bold">اسم المستخدم</th>
                    <th className="p-4 font-bold">البريد الإلكتروني</th>
                    <th className="p-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-2" />
                        جاري جلب قائمة الحسابات...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12 text-slate-500">
                        لا يوجد مستخدمين يطابقون خيارات البحث.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-900/40 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-slate-500 font-mono">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-DZ") : "--"}
                        </td>
                        <td className="p-4">
                          {user.isAdmin ? (
                            <span className="bg-red-400/10 text-red-400 border border-red-400/10 px-2 py-0.5 rounded font-bold text-[10px]">
                              إدمن 🛡️
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                              مستخدم عادي
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-1 rounded-md font-mono font-bold">
                            {user.credits}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">{user.username || "بدون اسم"}</td>
                        <td className="p-4 text-slate-300 font-mono">{user.email || "حساب تجريبي/مجهول"}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditCredits(user.credits || 0);
                              setEditIsAdmin(user.isAdmin || false);
                            }}
                            className="inline-flex items-center gap-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/20 hover:border-cyan-400/35 px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            تعديل الحساب
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 2: System Settings */}
        {activeTab === "settings" && (
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-6 max-w-2xl mx-auto w-full">
            
            <div className="border-b border-slate-900 pb-4 text-right flex flex-row-reverse items-center justify-between">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2 flex-row-reverse">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span>تهيئة إعدادات النظام وتوكن الذكاء الاصطناعي</span>
              </h3>
            </div>

            {isLoadingSettings ? (
              <div className="text-center p-12 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-2" />
                جاري جلب الإعدادات الحالية من السحابة...
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 text-right">
                
                {/* Default entry credits */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-200 font-bold">رصيد النقاط الافتراضي للحسابات الجديدة:</label>
                  <input
                    type="number"
                    min={0}
                    value={defaultCredits}
                    onChange={(e) => setDefaultCredits(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors text-right"
                  />
                  <p className="text-[10px] text-slate-500">
                    الرصيد الترحيبي المجاني الذي يحصل عليه المستخدم فور التسجيل لأول مرة.
                  </p>
                </div>

                {/* Gemini API Key */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between flex-row-reverse">
                    <label className="text-xs text-slate-200 font-bold">مفتاح توكن الذكاء الاصطناعي (Gemini API Key):</label>
                    {originalApiToken && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        نشط ومحفوظ بقاعدة البيانات ✅
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder={originalApiToken ? "••••••••••••••••••••••••••••••••" : "أدخل مفتاح Gemini API الجديد هنا..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-cyan-300 placeholder:text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors text-right"
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    مفتاح التوكن المستخدم لتوليد وتكييف السيناريوهات وقراءة التعليقات الصوتية. يفضل الاحتفاظ به آمناً. في حال تركه فارغاً، ستستخدم المنصة تلقائياً المفتاح الافتراضي الخاص بالخادم.
                  </p>
                </div>

                {settingsError && (
                  <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs text-right flex-row-reverse">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4 flex items-center gap-3 text-cyan-400 text-xs text-right flex-row-reverse">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      جاري حفظ وتثبيت التغييرات...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-slate-950" />
                      حفظ إعدادات النظام وتحديث التوكن
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        )}

      </main>

      {/* Edit User Account Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-row-reverse">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2 flex-row-reverse">
                <Edit className="w-4 h-4 text-cyan-400" />
                <span>تعديل الحساب: {editingUser.username || editingUser.email?.split("@")[0]}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUserEdit} className="p-6 flex flex-col gap-5 text-right">
              
              {/* User email static show */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">البريد الإلكتروني:</label>
                <span className="text-slate-300 text-xs font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  {editingUser.email || "حساب مجهول/تجريبي"}
                </span>
              </div>

              {/* Set Credits Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-200 font-bold">الرصيد الحالي من النقاط:</label>
                <input
                  type="number"
                  min={0}
                  value={editCredits}
                  onChange={(e) => setEditCredits(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors text-right"
                />
              </div>

              {/* Toggle Admin Level */}
              <div className="flex items-center justify-between border border-slate-800 bg-slate-950/40 p-4 rounded-xl flex-row-reverse">
                <div className="text-right">
                  <label className="text-xs text-slate-200 font-bold block">منح صلاحيات مدير النظام (Admin):</label>
                  <span className="text-[9px] text-slate-500">يتيح للحساب الدخول التلقائي للوحة التحكم وتحرير الإعدادات.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsAdmin}
                  onChange={(e) => setEditIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end flex-row-reverse pt-2">
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingUser ? (
                    <>
                      <RefreshCw className="w-3 animate-spin text-slate-950" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      حفظ وتثبيت
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء الأمر
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
