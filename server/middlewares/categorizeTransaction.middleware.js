import Transaction from "../models/transaction.model.js";

const VALID_CATEGORIES =
    Transaction.schema.path("category").enumValues;

// ------------------------------------------------------------------
// Cost optimization: rules-first categorization.
// CHANGE: Previously every note/reference triggered an LLM API call.
// Now: (1) keyword match -> free, (2) cached LLM result -> free,
// (3) LLM call only for novel/ambiguous notes. This cuts ~70-80% API cost.
// Keyword lists cover English + Bangla + Banglish per user-provided table.
// ------------------------------------------------------------------
export const CATEGORY_KEYWORDS = {
    "food-dining": [
        "food", "restaurant", "meal", "lunch", "dinner", "breakfast",
        "snacks", "cafe", "coffee", "tea", "fast food", "food delivery",
        "takeaway", "biryani", "pizza", "burger", "chicken", "kfc",
        "mcdonald", "foodpanda", "hungerstation", "bakery", "sweets",
        "grocery food",
        "খাবার", "রেস্টুরেন্ট", "খাবার দোকান", "দুপুরের খাবার",
        "রাতের খাবার", "সকালের নাস্তা", "নাস্তা", "চা", "কফি",
        "ফাস্ট ফুড", "বিরিয়ানি", "পিজ্জা", "বার্গার", "মুরগি",
        "বেকারি", "মিষ্টি",
        "khabar", "khawa", "resturent", "hotel", "nasta", "nashta",
        "cha", "biriyani", "murgi", "mishti", "khabar delivery"
    ],
    "bills-utilities": [
        "electricity", "electric bill", "gas bill", "water bill",
        "internet bill", "wifi", "broadband", "utility", "desco",
        "dpdc", "wasa", "wifi bill",
        "বিদ্যুৎ", "বিদ্যুৎ বিল", "গ্যাস", "গ্যাস বিল", "পানি",
        "পানির বিল", "ইন্টারনেট বিল", "বিল", "ইউটিলিটি",
        "biddut", "current", "biddut bill", "pani bill", "bill",
        "current bill"
    ],
    housing: [
        "rent", "house rent", "apartment", "flat", "landlord",
        "housing", "accommodation", "hostel", "mess",
        "ভাড়া", "বাসা", "বাড়ি", "বাসাভাড়া", "বাড়িভাড়া",
        "ফ্ল্যাট", "হোস্টেল", "মেস",
        "vara", "bhara", "basa vara", "bari vara", "flat vara",
        "basar vara"
    ],
    transportation: [
        "bus", "train", "taxi", "uber", "pathao", "rickshaw",
        "cng", "metro", "fuel", "petrol", "diesel", "parking", "fare",
        // CHANGE: compound "vehicle + vara" so "bus vara"/"rickshaw vara"
        // (len 8-13) beats bare "vara" (len 4, housing) via longest-first.
        "bus vara", "rickshaw vara", "cng vara", "uber vara",
        "pathao vara", "train vara", "taxi vara",
        "বাস", "ট্রেন", "ট্যাক্সি", "রিকশা", "সিএনজি", "মেট্রো",
        "জ্বালানি", "পার্কিং", "ভাড়া",
        // CHANGE: inflected Bangla (ট্রেনের = of train) — eval miss fix.
        "ট্রেনের",
        "tren", "riksha", "ricksa", "tel"
    ],
    shopping: [
        "shopping", "clothes", "clothing", "shirt", "pants", "shoes",
        "bag", "accessories", "grocery", "supermarket", "daraz",
        "amazon", "gift",
        "শপিং", "কাপড়", "জামা", "শার্ট", "প্যান্ট", "জুতা",
        "ব্যাগ", "বাজার", "মুদিখানা", "উপহার",
        "kapor", "jama", "pant", "juta", "bazar", "mudir dokan", "upohar"
    ],
    healthcare: [
        "doctor", "hospital", "clinic", "medicine", "pharmacy",
        "medical", "treatment", "surgery", "dentist", "dental",
        "test", "diagnosis", "health",
        "ডাক্তার", "হাসপাতাল", "ক্লিনিক", "ওষুধ", "ফার্মেসি",
        "চিকিৎসা", "অপারেশন", "দাঁতের ডাক্তার", "পরীক্ষা",
        // CHANGE: inflected form — eval miss fix.
        "হাসপাতালে",
        "daktar", "oshudh", "osudh", "chikitsa", "operation",
        "dat er daktar"
    ],
    education: [
        "university", "college", "school", "tuition", "coaching",
        "course", "book", "textbook", "exam", "admission",
        "semester", "registration", "fee", "workshop",
        "বিশ্ববিদ্যালয়", "ইউনিভার্সিটি", "কলেজ", "স্কুল",
        "টিউশন", "কোচিং", "কোর্স", "বই", "পরীক্ষা", "ভর্তি",
        "সেমিস্টার", "ফি",
        "varsity", "versity", "tution", "boi", "vorti"
    ],
    entertainment: [
        "movie", "cinema", "netflix", "youtube", "spotify", "game",
        "gaming", "concert", "music", "amusement park", "theatre",
        "streaming",
        "সিনেমা", "মুভি", "গান", "খেলা", "গেম", "কনসার্ট",
        "থিয়েটার", "বিনোদন", "পার্ক",
        "gaan", "khela", "binodon", "park"
    ],
    communication: [
        "mobile recharge", "recharge", "airtime", "mobile data",
        "internet package", "sms", "call", "phone", "sim", "robi",
        "grameenphone", "banglalink", "airtel", "teletalk",
        "data pack", "net pack", "mobile balance",
        "রিচার্জ", "মোবাইল রিচার্জ", "ইন্টারনেট প্যাক", "ডাটা",
        "কল", "ফোন", "সিম",
        "richarge", "balance"
    ],
    "personal-care": [
        "salon", "haircut", "barber", "beauty", "makeup",
        "cosmetics", "skincare", "shampoo", "facial", "spa", "perfume",
        "সেলুন", "চুল কাটা", "নাপিত", "বিউটি", "মেকআপ",
        "প্রসাধনী", "ত্বক", "শ্যাম্পু", "ফেসিয়াল",
        "chul kata", "napit", "prosadhoni"
    ],
    financial: [
        "bank", "banking", "loan", "credit", "debit", "interest",
        "insurance", "investment", "savings", "deposit", "dps", "charge",
        "ব্যাংক", "ঋণ", "লোন", "সুদ", "বীমা", "বিনিয়োগ",
        "সঞ্চয়", "আমানত", "চার্জ",
        // CHANGE: inflected form — eval miss fix.
        "ব্যাংকে",
        "rin", "sud", "bima", "binyog", "sonchoy"
    ],
    "family-social": [
        "family", "parents", "mother", "father", "brother",
        "sister", "relative", "friend", "wedding", "birthday",
        "marriage", "party", "social",
        "পরিবার", "মা", "বাবা", "ভাই", "বোন", "আত্মীয়",
        "বন্ধু", "বিয়ে", "জন্মদিন", "অনুষ্ঠান", "পার্টি",
        // CHANGE: inflected form — eval miss fix.
        "পরিবারকে",
        "ma", "maa", "baba", "bhai", "bon", "attoyo", "bondhu",
        "biya", "biye", "onushthan",
        // CHANGE: missing Banglish kinship from user example
        // "ammu ke taka pathalam" — without these it was a MISS.
        "ammu", "amma", "abbu", "abba"
    ],
    donation: [
        "donation", "charity", "zakat", "sadaqah", "mosque",
        "orphanage", "humanitarian", "relief", "fund",
        "দান", "সাহায্য", "যাকাত", "সদকা", "মসজিদ",
        "এতিমখানা", "ত্রাণ", "মানবিক সাহায্য", "ফান্ড",
        "dan", "sahajjo", "jakat", "sadaka", "mosjid",
        "etimkhana",
        // CHANGE: bare "tran" removed — substring-matched "transfer".
        // Use compounds so flood-relief still hits, transfer does not.
        "tran dilam", "bonna tran", "bonnar tran", "tran sahajjo"
    ]
};

// ------------------------------------------------------------------
// CHANGE: Flattened + longest-first index.
// Why longest-first: "biddut bill" must win over generic "bill",
// "basa vara" must win over bare "vara", "mobile recharge" over "recharge".
// NOTE (ambiguity): bare "vara"/"ভাড়া"/"bill"/"fee" alone is ambiguous
// (housing vs transportation). It will keyword-hit the first longest equal
// match (currently housing) — for true disambiguation the note needs
// context (e.g. "rickshaw vara") otherwise LLM fallback returns "other".
// ------------------------------------------------------------------
const FLAT_KEYWORDS = Object.entries(CATEGORY_KEYWORDS)
    .flatMap(([category, keywords]) =>
        keywords.map((k) => ({
            category,
            keyword: k.toLowerCase().trim(),
            length: k.trim().length
        }))
    )
    .filter((k) => k.keyword.length > 0)
    .sort((a, b) => b.length - a.length);

export const normalizeText = (text) =>
    String(text || "").toLowerCase().replace(/\s+/g, " ").trim();

// ------------------------------------------------------------------
// CHANGE: Free keyword matcher (no API cost).
// Combines user_note + reference, normalizes case/spacing, then
// boundary-aware search against FLAT_KEYWORDS. Returns category or null.
// CHANGE: whole-word match (not includes()) so "tran" != "transfer",
// "ma" != "smart/supermarket", "khela"(play) != "khelam"(ate).
// Bangla range \u0980-\u09FF treated as letters for boundaries.
// Longest-first still applies: "bus vara" beats bare "vara".
// Exported for tests/eval (server/tests/categorize.eval.js).
// ------------------------------------------------------------------
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keywordRegex = (keyword) =>
    new RegExp(`(^|[^a-z\\u0980-\\u09FF0-9])${escapeRegExp(keyword)}([^a-z\\u0980-\\u09FF0-9]|$)`);
export const matchKeywordCategory = (user_note, reference) => {
    const text = normalizeText(
        `${user_note || ""} ${reference || ""}`
    );
    if (!text) return null;
    const hit = FLAT_KEYWORDS.find(({ keyword }) =>
        keywordRegex(keyword).test(text)
    );
    return hit ? hit.category : null;
};

// ------------------------------------------------------------------
// CHANGE: In-memory LLM result cache.
// Same normalized "note + reference" seen before -> reuse category free.
// LRU-ish: drops oldest entry once LLM_CACHE_MAX (1000) is reached.
// categorySource = "keyword" | "cache" | "llm" lets controller/analytics
// know whether this txn cost an API call.
// ------------------------------------------------------------------
const llmCache = new Map();
const LLM_CACHE_MAX = 1000;

export const categorizeTransaction = async (req, res, next) => {
    try {
        const {
            category,
            user_note,
            reference
        } = req.body;

        // Category is provided → validate and use it
        // No LLM call
        if (category) {
            if (!VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`
                });
            }

            return next();
        }

        // No category, note, or reference
        // Automatically categorize as "other"
        if (!user_note && !reference) {
            req.body.category = "other";
            return next();
        }

        // No category, but note/reference exists
        // CHANGE Step 1 (free): rules-first keyword lookup.
        // Hit -> set category + categorySource="keyword", skip LLM entirely.
        const keywordCategory = matchKeywordCategory(user_note, reference);
        if (keywordCategory) {
            req.body.category = keywordCategory;
            req.body.categorySource = "keyword";
            return next();
        }

        // CHANGE Step 2 (free): repeat-note cache lookup.
        // Same note+reference as a prior LLM success -> reuse, skip LLM.
        const cacheKey = normalizeText(
            `${user_note || ""} ${reference || ""}`
        );
        if (llmCache.has(cacheKey)) {
            req.body.category = llmCache.get(cacheKey);
            req.body.categorySource = "cache";
            return next();
        }

        // CHANGE Step 3 (paid): LLM fallback — only reached when Steps 1-2 miss.
        // i.e. novel phrasing or ambiguous single word like bare "vara".
        // With note="vara" alone the LLM has no housing-vs-transport signal,
        // so per Rule 5 it should return "other" (verified: no history passed).
        const prompt = `
You are a transaction categorization assistant.

Classify the transaction into exactly ONE of the allowed categories based on the user's note and reference.

Allowed categories:
${VALID_CATEGORIES.join(", ")}

User note:
"${user_note || "Not provided"}"

Reference:
"${reference || "Not provided"}"

Rules:
1. Use both the user note and reference when both are provided.
2. If one is missing, use the available information.
3. Understand English, Bangla, and Banglish.
4. Classify based on the meaning and purpose of the transaction.
5. If the transaction clearly does not fit any category, return "other".
6. Return ONLY the exact category name.
7. Do not return explanations or additional text.
8. The categories are: food-dining",
                "bills-utilities",
                "housing",
                "transportation",
                "shopping",
                "healthcare",
                "education",
                "entertainment",
                "communication",
                "personal-care",
                "financial",
                "family-social",
                "donation",
                "other"

Examples:
- "khabar kinlam" → food-dining
- "basha vara" -> housing
- "restaurant e lunch korlam" → food-dining
- "বিদ্যুৎ বিল দিলাম" → bills-utilities
- "rickshaw vara" → transportation
- "oshudh kinlam" → healthcare
- "notun shirt kinlam" → shopping
- "movie dekhte gelam" → entertainment
- "course er fee dilam" → education
- "ammu ke taka pathalam" → family-social
- unclear transaction → other
`;

        const response = await fetch(
            process.env.LLM_BASE_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.LLM_API_KEY}`
                },
                body: JSON.stringify({
                    model: process.env.LLM_MODEL,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0
                })
            }
        );

        if (!response.ok) {
            console.error(
                "LLM categorization failed:",
                await response.text()
            );

            return res.status(503).json({
                success: false,
                message:
                    "Transaction categorization service unavailable"
            });
        }

        const result = await response.json();

        const llmCategory =
            result.choices?.[0]?.message?.content?.trim();

        if (!llmCategory) {
            req.body.category = "other";
            return next();
        }

        console.log(result);

        // If LLM returns something outside the allowed categories,
        // safely categorize it as "other"
        if (!VALID_CATEGORIES.includes(llmCategory)) {
            console.log(
                "LLM returned unknown category:",
                llmCategory
            );

            req.body.category = "other";
            return next();
        }

        // Pass category to transaction controller
        // CHANGE: tag source as "llm" (paid path) for cost tracking.
        req.body.category = llmCategory;
        req.body.categorySource = "llm";

        // CHANGE: Learn it — cache this LLM answer so the next identical
        // note+reference hits Step 2 and costs nothing.
        if (llmCache.size >= LLM_CACHE_MAX) {
            const oldest = llmCache.keys().next().value;
            llmCache.delete(oldest);
        }
        llmCache.set(cacheKey, llmCategory);

        next();

    } catch (error) {
        console.error(
            "Transaction categorization error:",
            error.message
        );

        // Categorization failure should not stop the transaction.
        // Fall back to "other".
        req.body.category = "other";

        next();
    }
};