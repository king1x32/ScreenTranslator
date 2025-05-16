let KEY_INDEX = null;
const API_KEYS = [
    'YOUR_API_KEY_01',
    'YOUR_API_KEY_02',
    'YOUR_API_KEY_03',
]; // Replace with your Gemini API key https://aistudio.google.com/app/apikey

const CONFIG = {
    MODEL: "gemini-2.0-flash-lite", // Models and pricing https://ai.google.dev/gemini-api/docs/models https://ai.google.dev/gemini-api/docs/pricing
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.6, // Controls the randomness of the output, lower values are more deterministic and higher values are more random (0 - 2)
    TOP_P: 0.8, // Thêm top_p cho đa dạng kết quả
    TOP_K: 30, // Thêm top_k cho đa dạng kết quả
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models",
};

const rotateApiKey = () => {
    if (API_KEYS.length === 0) {
        throw new Error("No API keys configured");
    }
    KEY_INDEX =
        KEY_INDEX === null
            ? Math.floor(Math.random() * API_KEYS.length)
            : (KEY_INDEX + 1) % API_KEYS.length;
    return API_KEYS[KEY_INDEX];
};

const getApiUrl = (apiKey) =>
    `${CONFIG.BASE_URL}/${CONFIG.MODEL}:generateContent?key=${apiKey}`;

const createRequestBody = (prompt, text) => ({
    system_instruction: {
        parts: [{ text: prompt }],
    },
    contents: {
        parts: [{ text }],
    },
    generationConfig: {
        temperature: CONFIG.TEMPERATURE,
        topP: CONFIG.TOP_P,
        topK: CONFIG.TOP_K,
        maxOutputTokens: CONFIG.MAX_TOKENS,
    },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" },
    ],
});

async function makeTranslationRequest(apiKey, prompt, text) {
    const response = await fetch(getApiUrl(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createRequestBody(prompt, text)),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const translatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translatedText) {
        throw new Error("Invalid response format");
    }

    return translatedText;
}

async function translate(text, from, to) {
    if (!text?.trim()) {
        proxy.setTranslated("");
        return;
    }

    console.log(`Translating from ${from} to ${to} using ${CONFIG.MODEL}`);

    const prompt = `Translate from ${from} to ${to} and return only the translated text`;
    const startIndex = KEY_INDEX ?? 0;
    let lastError = null;

    // Thử lần lượt tất cả API key nếu gặp lỗi
    for (let i = 0; i < API_KEYS.length; i++) {
        const currentIndex = (startIndex + i) % API_KEYS.length;
        const apiKey = API_KEYS[currentIndex];

        try {
            const translatedText = await makeTranslationRequest(apiKey, prompt, text);
            KEY_INDEX = currentIndex; // Cập nhật KEY_INDEX khi thành công
            console.log("Translation successful");
            proxy.setTranslated(translatedText);
            return;
        } catch (error) {
            console.error(`Failed with API key ${currentIndex}:`, error);
            lastError = error;
            continue; // Thử key tiếp theo nếu có lỗi
        }
    }

    // Nếu đã thử hết tất cả key mà vẫn lỗi
    console.error("Translation failed with all API keys");
    proxy.setFailed(`Translation error: ${lastError?.message}`);
}

function init() {
    proxy.translate.connect(translate);
}
