// server/tests/categorize.eval.js
// Eval: 100 transactions -> keyword hit % (LLM NOT needed) vs LLM needed %.
// Run: node tests/categorize.eval.js
import { matchKeywordCategory } from "../middlewares/categorizeTransaction.middleware.js";

// [note, reference, expectedCategory or null(=LLM needed -> other/unclear)]
const SAMPLES = [
    // food-dining (7)
    ["khabar kinlam", "", "food-dining"],
    ["restaurant e lunch korlam", "", "food-dining"],
    ["বিরিয়ানি খেলাম", "", "food-dining"],
    ["pizza order dilam", "", "food-dining"],
    ["cha khelam tong e", "", "food-dining"],
    ["bakery theke mishti kinlam", "", "food-dining"],
    ["foodpanda delivery", "dinner", "food-dining"],
    // bills-utilities (7)
    ["biddut bill dilam", "", "bills-utilities"],
    ["বিদ্যুৎ বিল দিলাম", "", "bills-utilities"],
    ["gas bill dilam", "", "bills-utilities"],
    ["pani bill", "wasa", "bills-utilities"],
    ["wifi bill dilam", "", "bills-utilities"],
    ["DESCO current bill", "", "bills-utilities"],
    ["internet bill bkash", "", "bills-utilities"],
    // housing (7)
    ["basa vara dilam", "", "housing"],
    ["bari vara pathalam", "", "housing"],
    ["flat vara", "march", "housing"],
    ["হোস্টেল ভাড়া দিলাম", "", "housing"],
    ["mess vara dilam", "", "housing"],
    ["বাসাভাড়া দিলাম মালিককে", "", "housing"],
    ["house rent paid", "", "housing"],
    // transportation (7)
    ["rickshaw vara dilam", "", "transportation"],
    ["bus vara", "dhaka to comilla", "transportation"],
    ["uber nilam", "", "transportation"],
    ["pathao vara", "", "transportation"],
    ["metro ticket kinlam", "", "transportation"],
    ["petrol kinlam bike er", "", "transportation"],
    ["ট্রেনের টিকিট কাটলাম", "", "transportation"],
    // shopping (7)
    ["notun shirt kinlam", "", "shopping"],
    ["daraz theke shopping", "", "shopping"],
    ["জামা কিনলাম মার্কেট থেকে", "", "shopping"],
    ["juta kinlam", "", "shopping"],
    ["bag kinlam office er", "", "shopping"],
    ["বাজার করলাম মুদি দোকান", "", "shopping"],
    ["upohar kinlam bondhur", "", "shopping"],
    // healthcare (7)
    ["oshudh kinlam pharmacy", "", "healthcare"],
    ["daktar dekhailam", "", "healthcare"],
    ["হাসপাতালে গেলাম", "", "healthcare"],
    ["clinic e test koralam", "", "healthcare"],
    ["dentist er kache gelam", "", "healthcare"],
    ["medicine kinlam", "prescription", "healthcare"],
    ["চিকিৎসা খরচ দিলাম", "", "healthcare"],
    // education (7)
    ["tuition fee dilam", "", "education"],
    ["course er fee dilam", "", "education"],
    ["বই কিনলাম", "", "education"],
    ["exam fee varsity", "", "education"],
    ["varsity vorti fee", "", "education"],
    ["coaching fee dilam", "", "education"],
    ["সেমিস্টার ফি দিলাম", "", "education"],
    // entertainment (7)
    ["movie dekhte gelam", "", "entertainment"],
    ["cinema ticket", "", "entertainment"],
    ["গান শুনলাম concert", "", "entertainment"],
    ["concert ticket", "", "entertainment"],
    ["game kinlam steam", "", "entertainment"],
    ["theatre dekhlam", "", "entertainment"],
    ["park e ghurlam", "", "entertainment"],
    // communication (7)
    ["mobile recharge korlam", "", "communication"],
    ["robi recharge", "017xx", "communication"],
    ["গ্রামীনফোন রিচার্জ", "", "communication"],
    ["data pack kinlam", "", "communication"],
    ["net pack 1gb", "", "communication"],
    ["phone balance recharge", "", "communication"],
    ["ইন্টারনেট প্যাক কিনলাম", "", "communication"],
    // personal-care (6)
    ["salon e chul kata", "", "personal-care"],
    ["beauty parlour gelam", "", "personal-care"],
    ["makeup kinlam", "", "personal-care"],
    ["shampoo kinlam", "", "personal-care"],
    ["facial korlam spa", "", "personal-care"],
    ["napit er dokan", "", "personal-care"],
    // financial (6)
    ["bank deposit korlam", "", "financial"],
    ["loan er kisti dilam", "", "financial"],
    ["DPS joma dilam", "", "financial"],
    ["বীমা দিলাম", "", "financial"],
    ["savings account deposit", "", "financial"],
    ["ব্যাংকে টাকা জমা", "", "financial"],
    // family-social (5)
    ["ammu ke taka pathalam", "", "family-social"],
    ["baba ke taka dilam eid", "", "family-social"],
    ["বিয়ে খরচ দিলাম", "", "family-social"],
    ["bondhu ke birthday gift", "", "family-social"],
    ["পরিবারকে টাকা পাঠালাম", "", "family-social"],
    // donation (5)
    ["mosjid e dan korlam", "", "donation"],
    ["zakat dilam", "", "donation"],
    ["এতিমখানায় দান করলাম", "", "donation"],
    ["tran dilam bonnar", "", "donation"],
    ["sadaqah dilam", "", "donation"],
    // unclear / LLM needed (15) — no keyword, must miss -> LLM/other
    ["ok done", "", null],
    ["thanks a lot", "", null],
    ["tk pathalam urgent", "", null],
    ["payment kora holo", "", null],
    ["12345 transfer", "", null],
    ["hello", "", null],
    ["thik ache", "", null],
    ["hmm", "", null],
    ["done", "", null],
    ["alhamdulillah", "", null],
    ["pls check", "", null],
    ["xyz abc 123", "", null],
    ["a", "", null],
    ["settlement", "", null],
    ["adjustment", "", null]
];

let keywordCorrect = 0;
let llmNeeded = 0;
const misses = [];
const wrong = [];

SAMPLES.forEach(([note, ref, expected], i) => {
    const pred = matchKeywordCategory(note, ref);
    if (expected === null) {
        // should MISS (LLM needed)
        if (pred === null) {
            llmNeeded++;
        } else {
            wrong.push(`${i + 1}. "${note}" -> wrongly hit ${pred}, want MISS`);
        }
    } else {
        if (pred === expected) {
            keywordCorrect++;
        } else if (pred === null) {
            llmNeeded++;
            misses.push(`${i + 1}. "${note}" want ${expected}, got MISS (LLM call)`);
        } else {
            wrong.push(`${i + 1}. "${note}" want ${expected}, got ${pred}`);
        }
    }
});

const total = SAMPLES.length;
const keywordPct = ((keywordCorrect / total) * 100).toFixed(1);
const llmPct = (((total - keywordCorrect) / total) * 100).toFixed(1);

console.log(`Total: ${total}`);
console.log(`Keyword match (LLM NOT needed): ${keywordCorrect}/${total} = ${keywordPct}%`);
console.log(`LLM needed (miss/other): ${total - keywordCorrect}/${total} = ${llmPct}%`);
console.log(`Before keywords: 100 LLM calls. After: ${total - keywordCorrect} LLM calls. Saved ${keywordCorrect} calls.`);
if (wrong.length) {
    console.log(`\nWrong category (${wrong.length}):`);
    wrong.forEach((w) => console.log(" - " + w));
}
if (misses.length) {
    console.log(`\nMissed but expected keyword (${misses.length}):`);
    misses.forEach((w) => console.log(" - " + w));
}
if (keywordCorrect / total >= 0.8) {
    console.log("\nPASS: >=80% keyword coverage");
} else {
    console.log("\nFAIL: below 80% — add more keywords");
    process.exitCode = 1;
}
