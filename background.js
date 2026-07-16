// It receives the analysis request from the pop-up window, sends it to the Anthropic API, and returns the result

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "clade-sonnet-5";
const MAX_CHARS = 20000;

const SYSTEM_PROMPT = `You are an expert in privacy policy analysis, including GDPR, KVKK (Turkish Personal Data Protection Law), and general data privacy regulations.
You will be given raw text extracted from a website. The text may be a Privacy Policy, KVKK Privacy Notice,
Terms of Service, Cookie Policy, or it may simply be an unrelated webpage.

Your tasks:
1. Determine whether the provided text is actually a Privacy Policy, KVKK notice, Terms of Service, Cookie Policy, or another document related to personal data processing.
2. If the text is NOT a privacy-related document, set "not_privacy_policy" to true and fill the remaining fields with reasonable default or empty values.
3. If the text is a valid privacy-related document, assign a "risk_score" between 0 and 100 (100 = very transparent and privacy-friendly, 0 = serious privacy concerns).
4. Identify risky or noteworthy clauses. For each clause provide:
   - a short quote from the original text (maximum 2–3 sentences, as close to the original wording as possible, shortened if necessary)
   - a plain-language explanation describing what it actually means for the user, avoiding legal jargon
   - a risk level: "high", "medium", or "low"
   - a category such as "Advertising", "Location Data", "Third-Party Sharing", "International Data Transfer", "Children's Data", "Profiling / Automated Decision Making", "Biometric / Audio / Camera", "Data Retention", or "Other".
5. Generate an overall summary describing:
   - what types of personal data are collected,
   - who the data is shared with,
   - how long it is retained,
   - and whether users have deletion or objection rights.
6. Extract important privacy-related keywords that actually appear in the document (for example: third party, advertising partners, international transfer, location data, biometric data, voice recording, camera, marketing, profiling, cookies, personalization, automated decision making, etc.).

IMPORTANT: Return ONLY a valid JSON object matching the schema below.
Do NOT include Markdown code blocks (\`\`\`), explanations, comments, or any additional text.
The first character of your response must be {.

JSON Schema:
{
  "not_privacy_policy": boolean,
  "risk_score": number,
  "risk_level": "safe" | "caution" | "risky",
  "summary": {
    "collected_data": string,
    "shared_with": string,
    "retention": string,
    "deletion_rights": string
  },
  "risky_clauses": [
    {
      "original": string,
      "simplified": string,
      "risk_level": "high" | "medium" | "low",
      "category": string
    }
  ],
  "keywords_found": [string]
}`;

async function callClaude(apiKey, pageText, pageUrl) {
  const truncated = pageText.length > MAX_CHARS
    ? pageText.slice(0, MAX_CHARS) + "\n\n[...the text has been shortened due to length limits....]"
    : pageText;

  const userContent = `URL: ${pageUrl}\n\nText extracted from page:\n"""\n${truncated}\n"""`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!response.ok) {
    let errText = "";
    try {
      const errJson = await response.json();
      errText = errJson?.error?.message || JSON.stringify(errJson);
    } catch (e) {
      errText = await response.text();
    }
    throw new Error(`API hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(b => b.type === "text");
  if (!textBlock) throw new Error("Modelden metin yanıtı alınamadı.");

  let raw = textBlock.text.trim();
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } else {
      throw new Error("Model yanıtı geçerli JSON formatında değil.");
    }
  }
  return parsed;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "ANALYZE") {
    const startedAt = Date.now();
    (async () => {
      try {
        const { apiKey } = await chrome.storage.local.get("apiKey");
        if (!apiKey) {
          sendResponse({ ok: false, error: "API anahtarı ayarlanmamış. Lütfen uzantı ayarlarından Anthropic API anahtarınızı girin." });
          return;
        }
        if (!message.pageText || message.pageText.trim().length < 50) {
          sendResponse({ ok: false, error: "Sayfada analiz edilecek yeterli metin bulunamadı." });
          return;
        }
        const result = await callClaude(apiKey, message.pageText, message.pageUrl || "");
        const elapsedMs = Date.now() - startedAt;
        sendResponse({ ok: true, result, elapsedMs });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || String(err) });
      }
    })();
    return true; 
  }
});
