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
