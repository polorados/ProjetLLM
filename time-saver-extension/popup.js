const input = document.getElementById("apiKey");
const status = document.getElementById("status");

// Load the saved key when the popup opens
chrome.storage.local.get("apiKey", ({ apiKey }) => {
  if (apiKey) input.value = apiKey;
});

// Save on click
document.getElementById("save").addEventListener("click", async () => {
  const apiKey = input.value.trim();
  await chrome.storage.local.set({ apiKey });
  status.textContent = "Saved!";
  setTimeout(() => (status.textContent = ""), 1500);
});
