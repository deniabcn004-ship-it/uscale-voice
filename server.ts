import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
// @ts-ignore
import lamejs from "lamejs";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvironmentVariables() {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.local"),
    override: true,
  });
  dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });
}

loadEnvironmentVariables();

// Initialize Firebase Admin SDK
// Local development without ADC can still run by falling back to an in-memory store.
let dbAdmin: any;

try {
  const app =
    admin.apps.length > 0
      ? admin.apps[0]
      : admin.initializeApp({
          projectId: "gen-lang-client-0753108654",
        });

  dbAdmin = getFirestore(app);
  console.log("Firebase Admin initialized successfully.");
} catch (err) {
  console.warn(
    "Firestore/ADC unavailable, falling back to local in-memory storage:",
    err,
  );

  class MemoryStore {
    private data = new Map<string, Map<string, any>>();
    private orderByField?: string;
    private orderByDirection: "asc" | "desc" = "asc";

    collection(name: string) {
      if (!this.data.has(name)) {
        this.data.set(name, new Map());
      }
      return new MemoryCollectionRef(this, name);
    }

    get(collectionName: string, docId: string) {
      const collection = this.data.get(collectionName);
      return collection?.get(docId);
    }

    set(collectionName: string, docId: string, value: any) {
      const collection =
        this.data.get(collectionName) || new Map<string, any>();
      collection.set(docId, value);
      this.data.set(collectionName, collection);
    }

    list(collectionName: string) {
      const collection = this.data.get(collectionName);
      if (!collection) return [] as Array<{ id: string; data: any }>;
      return Array.from(collection.entries()).map(([id, data]) => ({
        id,
        data,
      }));
    }

    setOrderBy(field: string, direction: "asc" | "desc") {
      this.orderByField = field;
      this.orderByDirection = direction;
    }

    getOrderBy() {
      return { field: this.orderByField, direction: this.orderByDirection };
    }
  }

  class MemoryCollectionRef {
    constructor(
      private store: MemoryStore,
      private collectionName: string,
    ) {}

    doc(id: string) {
      return new MemoryDocRef(this.store, this.collectionName, id);
    }

    orderBy(field: string, direction: "asc" | "desc" = "asc") {
      this.store.setOrderBy(field, direction);
      return this;
    }

    async get() {
      const docs = this.store.list(this.collectionName);
      const { field, direction } = this.store.getOrderBy();
      const sortedDocs = [...docs].sort((a, b) => {
        if (!field) return 0;
        const aValue = a.data?.[field];
        const bValue = b.data?.[field];
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return direction === "desc" ? -result : result;
      });

      return {
        size: sortedDocs.length,
        forEach: (callback: (doc: any) => void) => {
          sortedDocs.forEach((doc) =>
            callback({ id: doc.id, data: () => doc.data }),
          );
        },
      };
    }

    count() {
      return {
        get: async () => ({
          data: () => ({ count: this.store.list(this.collectionName).length }),
        }),
      };
    }

    select() {
      return {
        get: async () => this.get(),
      };
    }
  }

  class MemoryDocRef {
    constructor(
      private store: MemoryStore,
      private collectionName: string,
      private docId: string,
    ) {}

    async get() {
      const value = this.store.get(this.collectionName, this.docId);
      return {
        exists: value !== undefined,
        data: () => (value === undefined ? undefined : value),
      };
    }

    async set(data: any, options?: { merge?: boolean }) {
      const existing = this.store.get(this.collectionName, this.docId);
      const merged =
        options?.merge && existing ? { ...existing, ...data } : data;
      this.store.set(this.collectionName, this.docId, merged);
    }

    async update(data: any) {
      const existing = this.store.get(this.collectionName, this.docId) || {};
      this.store.set(this.collectionName, this.docId, { ...existing, ...data });
    }
  }

  dbAdmin = new MemoryStore();
}

// System Settings Helpers
function isGeminiAuthError(error: any): boolean {
  const message =
    `${error?.message || ""} ${error?.status || ""}`.toLowerCase();
  return (
    message.includes("permission_denied") ||
    message.includes("unregistered callers") ||
    message.includes("api key") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  );
}

function getGeminiErrorMessage(error: any): string {
  if (isGeminiAuthError(error)) {
    return "Gemini API authorization failed. Your API key is invalid, expired, or not enabled for the Generative Language API. Please create a new key in Google AI Studio and set it as GEMINI_API_KEY in your environment.";
  }

  return error?.message || "فشل الاتصال بخدمة الذكاء الاصطناعي.";
}

async function getGeminiApiKey(): Promise<string> {
  loadEnvironmentVariables();
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (envKey.trim()) {
    console.log(
      "Using Gemini API key from environment variables (.env.local or .env).",
    );
    return envKey.trim();
  }

  try {
    const docRef = dbAdmin.collection("settings").doc("system");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.geminiApiKey) {
        console.log("Found Gemini API Key in system settings Firestore.");
        return data.geminiApiKey;
      }
    }
  } catch (err) {
    console.warn("Failed to read system settings for api key:", err);
  }

  return "";
}

async function getDefaultEntryCredits(): Promise<number> {
  try {
    const docRef = dbAdmin.collection("settings").doc("system");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && typeof data.defaultEntryCredits === "number") {
        return data.defaultEntryCredits;
      }
    }
  } catch (err) {
    console.warn(
      "Failed to read defaultEntryCredits from settings system, using 10 as default:",
      err,
    );
  }
  return 10;
}

// User Credits Helpers
async function checkAndDeductCredit(
  userId: string,
): Promise<{ success: boolean; error?: string; remainingCredits?: number }> {
  if (!userId) {
    return { success: false, error: "يجب تسجيل الدخول لاستخدام هذه الخدمة." };
  }
  try {
    const userRef = dbAdmin.collection("users").doc(userId);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      const defaultCredits = await getDefaultEntryCredits();
      const newUser = {
        uid: userId,
        email: "",
        username: "مستخدم جديد",
        credits: defaultCredits,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };
      await userRef.set(newUser);
      if (defaultCredits > 0) {
        await userRef.update({ credits: defaultCredits - 1 });
        return { success: true, remainingCredits: defaultCredits - 1 };
      } else {
        return {
          success: false,
          error:
            "رصيدك غير كافٍ. يرجى شراء المزيد من الرصيد بالاتصال بنا أو عبر الواتساب على الرقم 0654049765.",
        };
      }
    }

    const userData = docSnap.data();
    if (!userData) {
      return { success: false, error: "فشل قراءة بيانات حسابك." };
    }

    if (
      userData.isAdmin === true ||
      userData.email === "deniabcn004@gmail.com"
    ) {
      return { success: true, remainingCredits: 99999 };
    }

    const currentCredits = userData.credits ?? 0;
    if (currentCredits <= 0) {
      return {
        success: false,
        error:
          "رصيدك غير كافٍ. يرجى شراء المزيد من الرصيد بالاتصال بنا أو عبر الواتساب على الرقم 0654049765.",
      };
    }

    const newCredits = currentCredits - 1;
    await userRef.update({ credits: newCredits });
    return { success: true, remainingCredits: newCredits };
  } catch (err: any) {
    console.error("Credit deduction failed:", err);
    return { success: false, error: "فشل تحديث الرصيد: " + err.message };
  }
}

// Get Dynamic Google Gen AI client with the latest api key
async function getAiClient(): Promise<GoogleGenAI> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Add GEMINI_API_KEY (or GOOGLE_API_KEY) to your environment or Firebase settings.",
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function resampleTo48kMono(
  inputSamples: Int16Array,
  fromSampleRate: number,
  fromChannels: number,
): Int16Array {
  // 1. Channel downmixing to Mono if needed
  let monoSamples: Int16Array;
  if (fromChannels === 2) {
    const numSamples = Math.floor(inputSamples.length / 2);
    monoSamples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const left = inputSamples[i * 2];
      const right = inputSamples[i * 2 + 1];
      monoSamples[i] = Math.round((left + right) / 2);
    }
  } else {
    monoSamples = inputSamples;
  }

  if (fromSampleRate === 48000) {
    return monoSamples;
  }

  // 2. Resample from fromSampleRate to 48000 using linear interpolation
  const ratio = fromSampleRate / 48000;
  const outputLength = Math.floor(monoSamples.length / ratio);
  const outputSamples = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index >= monoSamples.length - 1) {
      outputSamples[i] = monoSamples[monoSamples.length - 1];
    } else {
      const sample1 = monoSamples[index];
      const sample2 = monoSamples[index + 1];
      outputSamples[i] = Math.round(sample1 + (sample2 - sample1) * fraction);
    }
  }

  return outputSamples;
}

function buildWavBuffer(
  pcmSamples: Int16Array,
  sampleRate: number = 48000,
): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = pcmSamples.length * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = Buffer.alloc(totalSize);

  // RIFF identifier
  buffer.write("RIFF", 0, "ascii");
  // File size minus RIFF header (totalSize - 8)
  buffer.writeUInt32LE(totalSize - 8, 4);
  // WAVE identifier
  buffer.write("WAVE", 8, "ascii");
  // fmt chunk identifier
  buffer.write("fmt ", 12, "ascii");
  // Size of fmt chunk (16)
  buffer.writeUInt32LE(16, 16);
  // Audio format (1 = PCM)
  buffer.writeUInt16LE(1, 20);
  // Channels
  buffer.writeUInt16LE(numChannels, 22);
  // Sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // Byte rate (sampleRate * numChannels * bitsPerSample / 8)
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  // Block align (numChannels * bitsPerSample / 8)
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  // Bits per sample
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data chunk identifier
  buffer.write("data", 36, "ascii");
  // Data size
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM samples
  for (let i = 0; i < pcmSamples.length; i++) {
    buffer.writeInt16LE(pcmSamples[i], headerSize + i * 2);
  }

  return buffer;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "20mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // API 0: Sync User profile & credits upon login
  app.post("/api/sync-user", async (req, res) => {
    try {
      const { userId, email, username } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const userRef = dbAdmin.collection("users").doc(userId);
      const docSnap = await userRef.get();

      const defaultCredits = await getDefaultEntryCredits();
      const isAdminUser = email === "deniabcn004@gmail.com";

      if (!docSnap.exists) {
        const newUser = {
          uid: userId,
          email: email || "",
          username: username || email?.split("@")[0] || "مستخدم",
          credits: defaultCredits,
          isAdmin: isAdminUser,
          createdAt: new Date().toISOString(),
        };
        await userRef.set(newUser);
        console.log(`Created user ${userId} with ${defaultCredits} credits.`);
        res.json(newUser);
      } else {
        const existingData = docSnap.data() || {};
        const updates: any = {};
        if (email && existingData.email !== email) updates.email = email;
        if (username && existingData.username !== username)
          updates.username = username;
        if (isAdminUser && !existingData.isAdmin) updates.isAdmin = true;

        if (Object.keys(updates).length > 0) {
          await userRef.update(updates);
        }
        res.json({ ...existingData, ...updates });
      }
    } catch (err: any) {
      console.error("Error in sync-user endpoint:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API 1: List user accounts & credits (supports search by email or username)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { search } = req.query;
      const snapshot = await dbAdmin
        .collection("users")
        .orderBy("createdAt", "desc")
        .get();
      let users: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({ id: doc.id, ...data });
      });

      if (search) {
        const term = String(search).toLowerCase();
        users = users.filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.username && u.username.toLowerCase().includes(term)),
        );
      }

      res.json(users);
    } catch (err: any) {
      console.error("Admin list users failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API 5: Get general system stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const usersSnapshot = await dbAdmin.collection("users").get();
      const totalUsers = usersSnapshot.size;
      let totalCredits = 0;
      let totalAdmins = 0;

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        totalCredits += data.credits || 0;
        if (data.isAdmin === true || data.email === "deniabcn004@gmail.com") {
          totalAdmins += 1;
        }
      });

      let totalVoiceovers = 0;
      try {
        const voiceoversSnap = await dbAdmin
          .collection("voiceovers")
          .count()
          .get();
        totalVoiceovers = voiceoversSnap.data().count;
      } catch (countErr) {
        const voiceoversSnap = await dbAdmin
          .collection("voiceovers")
          .select()
          .get();
        totalVoiceovers = voiceoversSnap.size;
      }

      res.json({
        totalUsers,
        totalCredits,
        totalAdmins,
        totalVoiceovers,
      });
    } catch (err: any) {
      console.error("Admin stats failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API 2: Update credits/isAdmin for a user account
  app.post("/api/admin/user-credits", async (req, res) => {
    try {
      const { userId, credits, isAdmin } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      const userRef = dbAdmin.collection("users").doc(userId);
      const docSnap = await userRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const updates: any = {};
      if (typeof credits === "number") updates.credits = credits;
      if (typeof isAdmin === "boolean") updates.isAdmin = isAdmin;

      await userRef.update(updates);
      res.json({ success: true, message: "تم تحديث الحساب بنجاح!" });
    } catch (err: any) {
      console.error("Admin update user failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API 3: Get system settings (default credits, masked api key)
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const defaultCredits = await getDefaultEntryCredits();
      const rawKey = await getGeminiApiKey();
      const maskedKey = rawKey
        ? `${rawKey.substring(0, 6)}...${rawKey.substring(rawKey.length - 4)}`
        : "";
      res.json({
        defaultEntryCredits: defaultCredits,
        geminiApiKey: maskedKey,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API 4: Save system settings
  app.post("/api/admin/settings", async (req, res) => {
    try {
      const { defaultEntryCredits, geminiApiKey } = req.body;
      const settingsRef = dbAdmin.collection("settings").doc("system");

      const updates: any = {};
      if (typeof defaultEntryCredits === "number") {
        updates.defaultEntryCredits = defaultEntryCredits;
      }
      if (typeof geminiApiKey === "string" && geminiApiKey.trim() !== "") {
        if (!geminiApiKey.includes("...")) {
          updates.geminiApiKey = geminiApiKey.trim();
        }
      }

      await settingsRef.set(updates, { merge: true });
      res.json({ success: true, message: "تم حفظ الإعدادات بنجاح!" });
    } catch (err: any) {
      console.error("Admin save settings failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API 1: Adapt Script to Algerian Dialect (Darja)
  app.post("/api/adapt-dialect", async (req, res) => {
    try {
      const { script, region, style } = req.body;

      if (!script) {
        return res.status(400).json({ error: "Script text is required" });
      }

      const ai = await getAiClient();

      const regionMap: Record<string, string> = {
        central:
          "الوسط (العاصمية والولايات المجاورة) - تتميز بـ 'واش راك'، 'بزاف'، استخدام الفصحى والفرنسية الخفيفة بنطق مميز.",
        western:
          "الغرب (الوهرانية وما جاورها) - تتميز بـ 'كي راك'، 'غايا'، 'نيشان'، 'حمبوك'، ونطق القاف كالجيم المصرية غالباً.",
        eastern:
          "الشرق (القسنطينية والولايات المجاورة) - تتميز بـ 'ياسر'، ونطق القاف الفصيحة بوضوح وسلاسة، واستعمال ألفاظ أصيلة.",
        southern:
          "الجنوب (الصحراوية والواحات) - فصيحة وموزونة، هادئة ودافئة، قريبة من العربية الأصيلة مع كرم ترحيبي.",
      };

      const selectedRegionDesc = regionMap[region] || regionMap.central;

      const prompt = `أنت خبير لغوي وصانع محتوى جزائري محترف.
قم بتحويل النص (السكريبت) التالي إلى اللهجة الجزائرية الدارجة الأصيلة (Darja).
اللهجة الفرعية المطلوبة هي: ${selectedRegionDesc}
نوع الأسلوب والروح المطلوبة للنص: ${style || "عادي/حواري"}

النص الأصلي المراد تحويله:
"${script}"

يجب أن تقوم بتوليد مخرجات تحتوي على:
1. النص المعدل بالخط العربي باللهجة الجزائرية الدارجة الأصيلة بشكل طبيعي وسلس ومناسب للإلقاء الصوتي المباشر.
2. النص المعدل مكتوباً بالحروف اللاتينية والفرانكو (Franco-Arabe) لتسهيل القراءة الصوتية لمن يصعب عليه نطق بعض الحروف، أو للمساعدة في اللحن الصوتي الصحيح.
3. دليل نطق مختصر جداً لأهم الكلمات الجزائرية الواردة بالسكريبت لتسهيل مهمة المعلق الصوتي.
4. وصف مختصر لروح هذا النص ونبرة الإلقاء الجزائرية المثالية له (مثال: نبرة حماسية شعبية، نبرة هادئة عاصمية، إلخ).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are a professional Algerian copywriter and linguist specializing in Algerian dialects (Darja). Your output must always be valid JSON following the schema precisely.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              adaptedArabic: {
                type: Type.STRING,
                description:
                  "السكريبت المترجم إلى الدارجة الجزائرية بالخط العربي الأصيل",
              },
              adaptedLatin: {
                type: Type.STRING,
                description:
                  "السكريبت بالدارجة الجزائرية مكتوباً بحروف الفرانكو/اللاتينية",
              },
              pronunciationGuide: {
                type: Type.STRING,
                description:
                  "دليل نطق مختصر وعملي لبعض الكلمات الدارجة المذكورة في النص",
              },
              vibeDescription: {
                type: Type.STRING,
                description:
                  "وصف لنبرة الإلقاء الجزائرية والروح المقترحة لقراءة هذا النص",
              },
            },
            required: [
              "adaptedArabic",
              "adaptedLatin",
              "pronunciationGuide",
              "vibeDescription",
            ],
          },
        },
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Error adapting dialect:", error);
      res.status(500).json({ error: getGeminiErrorMessage(error) });
    }
  });

  // API 2: Generate Audio Voiceover (TTS)
  app.post("/api/generate-voice", async (req, res) => {
    try {
      const { text, voice, speed, emotion, userId } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text to speak is required" });
      }

      // Enforce Credit Check and Deduction before generating TTS
      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.success) {
        return res.status(402).json({ error: creditCheck.error });
      }

      const ai = await getAiClient();

      // Map speeds and emotions to friendly terms
      const speedMap: Record<string, string> = {
        slow: "slowly and deliberately with natural pauses",
        normal: "at a normal conversational pace",
        fast: "at a rapid, high-energy, fast-paced speed",
      };

      const emotionMap: Record<string, string> = {
        cheerful: "with a cheerful, happy, smiling, and lively voice",
        professional:
          "in a serious, highly professional, corporate, clear, and formal broadcasting voice",
        dramatic:
          "with high drama, intense enthusiasm, power, and deep emotion",
        calm: "with a calm, peaceful, gentle, soft, and soothing voice",
      };

      const selectedSpeed = speedMap[speed] || speedMap.normal;
      const selectedEmotion = emotionMap[emotion] || emotionMap.normal;
      const selectedVoice = voice || "Kore"; // Puck, Charon, Kore, Fenrir, Zephyr

      // Engineering a prompt for Gemini TTS model to interpret and speak perfectly
      const ttsPrompt = `Please read the following text as a native Algerian voiceover artist.
You must speak in a flawless Algerian Arabic dialect (Darja).
Make sure you deliver the speech ${selectedEmotion} and ${selectedSpeed}.

Script to read:
"${text}"`;

      console.log(
        `Generating TTS with voice: ${selectedVoice}, speed: ${speed}, emotion: ${emotion}`,
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error(
          "لم يتم الحصول على بيانات صوتية من خوادم الذكاء الاصطناعي.",
        );
      }

      // Convert incoming base64 payload
      const wavBuffer = Buffer.from(base64Audio, "base64");

      let finalSamples: Int16Array;
      let detectedSampleRate = 24000; // default for Gemini TTS if raw PCM
      let detectedChannels = 1;

      console.log(
        `Analyzing audio buffer... Length: ${wavBuffer.length} bytes`,
      );
      const riffHeader =
        wavBuffer.length >= 12 ? wavBuffer.toString("ascii", 0, 4) : "";
      const waveHeader =
        wavBuffer.length >= 12 ? wavBuffer.toString("ascii", 8, 12) : "";

      if (riffHeader === "RIFF" && waveHeader === "WAVE") {
        console.log("Input is already a WAV file. Parsing chunks...");
        let offset = 12;
        let fmtChunk: Buffer | null = null;
        let dataChunk: Buffer | null = null;

        while (offset < wavBuffer.length - 8) {
          const chunkId = wavBuffer
            .toString("ascii", offset, offset + 4)
            .trim();
          const chunkSize = wavBuffer.readUInt32LE(offset + 4);

          if (offset + 8 + chunkSize > wavBuffer.length) {
            if (chunkId.toLowerCase() === "data") {
              dataChunk = wavBuffer.subarray(offset + 8);
            }
            break;
          }

          if (chunkId === "fmt ") {
            fmtChunk = wavBuffer.subarray(offset + 8, offset + 8 + chunkSize);
          } else if (chunkId.toLowerCase() === "data") {
            dataChunk = wavBuffer.subarray(offset + 8, offset + 8 + chunkSize);
          }

          offset += 8 + chunkSize;
        }

        if (fmtChunk && dataChunk && dataChunk.length > 0) {
          const audioFormat = fmtChunk.readUInt16LE(0);
          const channels = fmtChunk.readUInt16LE(2);
          const sampleRate = fmtChunk.readUInt32LE(4);
          const bitsPerSample = fmtChunk.readUInt16LE(14);

          console.log(
            `Detected input WAV info: Format=${audioFormat}, Channels=${channels}, SampleRate=${sampleRate}, BitsPerSample=${bitsPerSample}, DataSize=${dataChunk.length}`,
          );

          detectedSampleRate = sampleRate;
          detectedChannels = channels;

          let parsedSamples: Int16Array;
          if (audioFormat === 3 && bitsPerSample === 32) {
            // IEEE Float 32-bit
            const numSamples = Math.floor(dataChunk.length / 4);
            parsedSamples = new Int16Array(numSamples);
            for (let i = 0; i < numSamples; i++) {
              const val = dataChunk.readFloatLE(i * 4);
              parsedSamples[i] = Math.max(
                -32768,
                Math.min(32767, Math.round(val * 32767)),
              );
            }
          } else {
            // Default to PCM (Format 1)
            const byteDepth = bitsPerSample / 8;
            const numSamples = Math.floor(dataChunk.length / byteDepth);
            parsedSamples = new Int16Array(numSamples);
            if (bitsPerSample === 16) {
              for (let i = 0; i < numSamples; i++) {
                parsedSamples[i] = dataChunk.readInt16LE(i * 2);
              }
            } else if (bitsPerSample === 8) {
              for (let i = 0; i < numSamples; i++) {
                const val = dataChunk.readUInt8(i);
                parsedSamples[i] = (val - 128) * 256;
              }
            } else {
              throw new Error(
                `عمق البتات ${bitsPerSample} غير مدعوم في فك تشفير WAV.`,
              );
            }
          }
          finalSamples = parsedSamples;
        } else {
          throw new Error(
            "ملف WAV المكتشف من خوادم الذكاء الاصطناعي لا يحتوي على مقاطع fmt أو data صالحة.",
          );
        }
      } else {
        // Assume raw 16-bit signed PCM little-endian (e.g. Gemini 3.1-flash-tts-preview output)
        console.log("Input is raw PCM data. Extracting 16-bit samples...");
        const pcmBytesLength = Math.floor(wavBuffer.length / 2) * 2;
        if (pcmBytesLength === 0) {
          throw new Error("البيانات الصوتية المستلمة فارغة أو غير صالحة.");
        }
        const numSamples = pcmBytesLength / 2;
        finalSamples = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          finalSamples[i] = wavBuffer.readInt16LE(i * 2);
        }
      }

      // Check finalSamples validity
      if (!finalSamples || finalSamples.length === 0) {
        throw new Error(
          "فشل استخراج عينات الصوت: لا توجد بيانات صالحة للتوليد.",
        );
      }

      // Resample to 48000 Hz, Mono
      console.log(
        `Resampling from ${detectedSampleRate}Hz (${detectedChannels}ch) to 48000Hz (Mono)...`,
      );
      const samples48k = resampleTo48kMono(
        finalSamples,
        detectedSampleRate,
        detectedChannels,
      );
      if (samples48k.length === 0) {
        throw new Error("فشل إعادة أخذ العينات (Resampling)؛ النتيجة فارغة.");
      }

      // Build valid standard 48000 Hz Mono WAV buffer
      console.log(
        "Building standard WAV file with 48000 Hz, 16-bit Mono format...",
      );
      const outputWavBuffer = buildWavBuffer(samples48k, 48000);

      // Verify the built file starts with RIFF and contains WAVE Header
      const magicRiff = outputWavBuffer.toString("ascii", 0, 4);
      const magicWave = outputWavBuffer.toString("ascii", 8, 12);
      if (magicRiff !== "RIFF" || magicWave !== "WAVE") {
        throw new Error(
          "فشل التحقق من ترويسة ملف WAV المنشأ حديثاً: غياب ترويسة RIFF/WAVE",
        );
      }
      if (outputWavBuffer.length !== 44 + samples48k.length * 2) {
        throw new Error(
          `حجم ملف WAV المنشأ (${outputWavBuffer.length} بايت) لا يطابق الطول المتوقع (${44 + samples48k.length * 2} بايت).`,
        );
      }

      console.log(
        `Successfully generated and verified standard WAV: Size=${outputWavBuffer.length} bytes`,
      );

      // Initialize MP3 generation with lamejs only after ensuring WAV is perfectly valid
      let mp3Base64 = "";
      let mimeType = "audio/wav";
      let responseBase64 = outputWavBuffer.toString("base64");

      try {
        console.log("WAV validated. Compressing to MP3 using LameJS...");
        // @ts-ignore
        const mp3encoder = new lamejs.Mp3Encoder(1, 48000, 128); // Mono, 48000 Hz, 128 kbps
        const mp3Data: Buffer[] = [];
        const sampleBlockSize = 1152;

        for (let i = 0; i < samples48k.length; i += sampleBlockSize) {
          const sampleChunk = samples48k.subarray(i, i + sampleBlockSize);
          // @ts-ignore
          const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
          if (mp3buf && mp3buf.length > 0) {
            mp3Data.push(Buffer.from(mp3buf));
          }
        }

        // @ts-ignore
        const mp3buf = mp3encoder.flush();
        if (mp3buf && mp3buf.length > 0) {
          mp3Data.push(Buffer.from(mp3buf));
        }

        const mp3Buffer = Buffer.concat(mp3Data);
        console.log(
          `MP3 compression complete. Size: ${mp3Buffer.length} bytes`,
        );

        if (mp3Buffer.length > 0) {
          mp3Base64 = mp3Buffer.toString("base64");
          responseBase64 = mp3Base64;
          mimeType = "audio/mp3";
          console.log("Successfully converted validated WAV to MP3!");
        } else {
          throw new Error("ملف MP3 الناتج فارغ.");
        }
      } catch (mp3Err: any) {
        console.warn(
          "WAV to MP3 compression failed, falling back to verified standard WAV:",
          mp3Err,
        );
        // Fall back to the verified standard WAV instead of an empty file
        responseBase64 = outputWavBuffer.toString("base64");
        mimeType = "audio/wav";
      }

      res.json({
        audioBase64: responseBase64,
        mimeType: mimeType,
        sampleRate: 48000,
      });
    } catch (error: any) {
      console.error("Error generating voiceover:", error);
      res.status(500).json({ error: getGeminiErrorMessage(error) });
    }
  });

  // API 3: Generate Script by Topic & Category
  app.post("/api/generate-script", async (req, res) => {
    try {
      const { topic, category } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const ai = await getAiClient();

      const prompt = `أنت كاتب سيناريو وصانع محتوى إعلاني وإعلامي جزائري مبدع.
اكتب سكريبت إعلاني أو إعلامي احترافي قصير ومثير للاهتمام حول الموضوع التالي:
الموضوع: ${topic}
التصنيف المطلوب: ${category || "إعلاني تجاري"}

اكتب السكريبت باللغة العربية البسيطة والمفهومة ليسهل تحويلها للدرجة الجزائرية، أو اكتبها مباشرة بلهجة بيضاء جزائرية جذابة.
أضف عنواناً للسكريبت ووصفاً للجمهور المستهدف.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are a creative Algerian content developer. Respond with JSON containing: title, originalScript, audience.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              originalScript: { type: Type.STRING },
              audience: { type: Type.STRING },
            },
            required: ["title", "originalScript", "audience"],
          },
        },
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Error generating script:", error);
      res.status(500).json({ error: error.message || "فشل توليد السكريبت" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on http://localhost:${PORT} with NODE_ENV=${process.env.NODE_ENV || "development"}`,
    );
  });
}

startServer();
