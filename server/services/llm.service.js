export const askLLM = async (input, { temperature = 0 } = {}) => {
    const messages =
        typeof input === "string"
            ? [{ role: "user", content: input }]
            : input;

    const response = await fetch(process.env.LLM_BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LLM_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.LLM_MODEL,
            messages,
            temperature
        })
    });

    if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || "";
};

// Parse LLM output that should be JSON. Models often wrap the answer in a
// markdown code fence (```json ... ```) despite "return only JSON"
// instructions, so strip the fence before parsing. Returns null on failure.
export const parseJsonLoose = (text) => {
    if (typeof text !== "string") return null;

    const trimmed = text.trim();

    try {
        return JSON.parse(trimmed);
    } catch {
        // Not plain JSON — try extracting a fenced code block.
    }

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        try {
            return JSON.parse(fenced[1].trim());
        } catch {
            return null;
        }
    }

    return null;
};
