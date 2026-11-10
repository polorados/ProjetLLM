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

document.addEventListener("DOMContentLoaded", async () => {
    const { recommendations = {} } =
        await chrome.storage.local.get("recommendations");

    const container = document.getElementById("recommendations");
    container.innerHTML = "";

    Object.entries(recommendations).forEach(([id, feature]) => {
        const card = document.createElement("div");
        card.className = "recommendation";

        const name = document.createElement("h2");
        name.textContent = feature.name;

        const section = document.createElement("small");
        section.textContent = id;

        const needs = document.createElement("div");
        needs.className = "needs";

        (feature.needs || []).forEach(need => {
            const tag = document.createElement("span");
            tag.className = "need-tag";
            tag.textContent = need;
            needs.appendChild(tag);
        });

        const description = document.createElement("p");
        description.textContent = feature.summary;

        const link = document.createElement("a");
        link.href = feature.url;
        link.textContent = "En savoir plus";
        link.target = "_blank";

        card.append(name, section, needs, description, link);
        container.appendChild(card);
    });
});