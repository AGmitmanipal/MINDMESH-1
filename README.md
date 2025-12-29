# Cortex - Your Personal Web Helper 🚀

**A smart browser assistant that remembers so you don't have to.**  
*Built for the Samsung Prism WebAgent Hackathon.*

Cortex is a privacy-first browser extension and dashboard that automatically organizes your digital life. It understands the **meaning** of the pages you visit, allowing you to find anything in your history by just asking in plain English.

---

## 🌟 How it works

As soon as you enable the extension, Cortex goes to work in the background:

1.  **Automatic Saving**: Every time you visit a page and stay for more than a second, Cortex securely saves a "memory" of that page (title, description, and key topics).
2.  **Smart Organizing**: It automatically groups related pages into "Auto Groups" (e.g., all your "Travel" research or "Coding" tips are grouped together).
3.  **Meaningful Search**: Instead of searching for exact words, you can search for concepts. Asking *"Where was that cheap hotel in Tokyo?"* works even if those exact words aren't in the page title.
4.  **100% Private**: All of this happens **locally on your computer**. No data is ever sent to a server.

---

## 🛠️ How do I know it's working?

It's easy to verify Cortex is active:

1.  **The Extension Popup**: Click the Cortex icon in your browser bar. You'll see a live count of **"Saved Pages"** and **"Memory Size"**. If these numbers go up as you browse, it's working!
2.  **The Dashboard**: Click **"Open Dashboard"** from the popup. You'll see your recently visited pages appear instantly.
3.  **Try a Search**: Visit a few pages about a specific topic (e.g., "Healthy Recipes"). Then go to the dashboard and search for *"something to cook"*. Cortex will show you those recipes.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 1.1 (Optional) Enable the Automation Agent (Gemini)
1. Copy `ENV.example` to `.env`
2. Set `GEMINI_API_KEY` in `.env`.
3. Set `GEMINI_MODEL` to the desired Gemini model identifier. If left unset the server will default to the model configured in the server environment.

#### Self-hosting (recommended if you don't want external API calls)
You can run a model locally and point the server to it using `LOCAL_LLM_URL` in your `.env` (for example `http://localhost:8080/generate`). The server will prefer a local URL when present.

Quick example using a local text-generation server (requires a local GPU and appropriate model):
If you run a local inference endpoint, set `LOCAL_LLM_URL` in `.env` to the server's prediction endpoint (for example `http://localhost:8080/v1/models/<MODEL_ID>:predict`).

Or run any local inference server that accepts a POST with `{ "inputs": "..." }` and returns either plain text or JSON — the server will attempt to parse JSON out of the response.

Ollama (optional local runner)
-----------------------------------
If you run models locally with Ollama, you can point the server at the local Ollama daemon.

1. Install Ollama (see https://ollama.com for instructions).
2. Pull a model (example):
```bash
ollama pull llamacpp/ggml-vicuna-13b
```
3. Ensure the Ollama daemon is running (it usually runs automatically). The local API is available at `http://localhost:11434` by default.
4. Set environment variables in `.env` if you want to use Ollama:
```env
LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=<your-ollama-model-name>
```

The server will call the Ollama `/api/generate` endpoint and pass the model name from `GEMINI_MODEL` (or `LOCAL_LLM_MODEL` if you prefer to set a separate var). The response is parsed for JSON; if the model returns text the server will include it under `debug.raw`.

### 2. Start the Dashboard
```bash
pnpm dev
```

## 🔐 Firebase Authentication (Email/Password)

This app uses Firebase v9+ modular SDK for auth.

Create a `.env` file in the project root (same folder as `package.json`) and set:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

### 3. Build the Extension
```bash
pnpm build:extension
```

### 4. Load in Browser
1.  Open Chrome/Brave and go to `chrome://extensions/`.
2.  Turn on **Developer mode** (top right).
3.  Click **Load unpacked** and select the `dist/extension/` folder in this project.

---

## 🔒 Privacy Perimeter

We believe your history belongs to you.
- **Zero Cloud**: No accounts, no sync, no data leakage.
- **Selective Forget**: Delete any domain or time range from your memory instantly.
- **Pause Anytime**: One click to stop Cortex from saving your sessions.

---

**Built with ❤️ for the Samsung Prism WebAgent Hackathon**

