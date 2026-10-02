import Transaction from "../models/transaction.model.js";

const VALID_CATEGORIES =
    Transaction.schema.path("category").enumValues;

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
        // Call LLM
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
        req.body.category = llmCategory;

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