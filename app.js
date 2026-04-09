import "./style.css";

const app = document.getElementById("app");

app.innerHTML = `
  <main class="min-h-screen bg-base-200 text-base-content">
    <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <header class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Lesbian Lying Machine</h1>
            <p class="text-sm opacity-70">
              Get a beautiful lesbian chat client to lie to you
            </p>
          </div>
          <div id="status" class="text-sm opacity-70">Ready</div>
        </div>
      </header>

      <section class="card flex min-h-0 flex-1 bg-base-100 shadow-sm">
        <div id="messages" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"></div>
      </section>

      <form id="chat-form" class="card bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4">
          <textarea
            id="prompt"
            rows="2"
            placeholder="Type your message..."
            class="textarea textarea-bordered w-full resize-none"
          ></textarea>

          <div class="flex items-center justify-between gap-3">
            <p class="text-xs opacity-60">
              Press <kbd class="kbd kbd-sm">Enter</kbd> to send,
              <kbd class="kbd kbd-sm">Shift</kbd> + <kbd class="kbd kbd-sm">Enter</kbd> for a new line.
            </p>

            <button id="send" type="submit" class="btn btn-primary">
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
`;

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const promptEl = document.getElementById("prompt");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");

const messages = [
    {
        role: "assistant",
        content: "Hi — send a prompt and I’ll show the full chat here.",
    },
];

let isSending = false;

function escapeHtml(text = "") {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatMessage(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
}

function extractReply(data) {
    if (typeof data === "string") return data;
    if (!data || typeof data !== "object") return "";

    return (
        data.reply ??
        data.message ??
        data.content ??
        data.text ??
        data.response ??
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        JSON.stringify(data, null, 2)
    );
}

function renderMessages() {
    messagesEl.innerHTML = messages
        .map((message) => {
            const isUser = message.role === "user";
            const bubbleClass = isUser
                ? "chat-bubble-primary text-primary-content"
                : "chat-bubble-secondary text-secondary-content";

            return `
        <div class="chat ${isUser ? "chat-end" : "chat-start"}">
          <div class="chat-bubble ${bubbleClass} max-w-[85vw] sm:max-w-[70%] whitespace-normal break-words">
            ${formatMessage(message.content)}
          </div>
        </div>
      `;
        })
        .join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setStatus(text) {
    statusEl.textContent = text;
}

async function sendPrompt(prompt) {
    const text = prompt.trim();
    if (!text || isSending) return;

    isSending = true;
    sendEl.disabled = true;
    setStatus("Sending...");

    messages.push({ role: "user", content: text });

    const assistantBubble = { role: "assistant", content: "Thinking..." };
    messages.push(assistantBubble);

    renderMessages();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: text,
                messages: messages
                    .filter(m => m.role !== "Thinking...")
                    .map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
            }),
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        const reply = extractReply(data).trim();
        assistantBubble.content = reply || "(empty response)";
        setStatus("Ready");
    } catch (error) {
        assistantBubble.content = `Error: ${error.message}`;
        setStatus("Failed");
    } finally {
        isSending = false;
        sendEl.disabled = false;
        renderMessages();
        promptEl.focus();
    }
}

formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = promptEl.value;
    promptEl.value = "";
    promptEl.style.height = "auto";
    sendPrompt(value);
});

promptEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        formEl.requestSubmit();
    }
});

promptEl.addEventListener("input", () => {
    promptEl.style.height = "auto";
    promptEl.style.height = `${promptEl.scrollHeight}px`;
});

renderMessages();
promptEl.focus();