const input = document.getElementById("apiKeyInput");
const status = document.getElementById("statusMsg");

(async () => {
    const { apiKey } = await chrome.storage.local.get("apiKey");
    if (apiKey) input.value = apiKey;
})();

document.getElementById("saveBtn").addEventListener("click", async () => {
    const key = input.value.trim();
    if (!key.startsWith("sk-ant-")) {
        setStatus("This doesn't look like an Anthropic API key (it should start with sk-ant-). Saving it anyway...", true);
    }
    await chrome.storage.local.set({ apiKey: key });
    setStatus("Saved. You can reopen the extension popup window.", false);
});

document.getElementById("clearBtn").addEventListener("click", async () => {
    await chrome.storage.local.remove("apiKey");
    input.value = "";
    setStatus("API key cleared.", false);
});

function setStatus(msg, isError) {
    status.textContent = msg;
    status.className = "status" + (isError ? " error " : "");
}