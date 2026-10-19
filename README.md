# Valmiki AI Master — Kandera

## Project structure
- `server.js`
- `public/index.html`

## Install and run
Use Node.js 20 or newer. In the project folder:

```bash
npm init -y
npm pkg set type=module
npm install express express-rate-limit @google/genai
```

Set a Gemini API key as an environment variable (never paste it into HTML or share it publicly):
- Linux/macOS: `export GEMINI_API_KEY="YOUR_KEY"`
- Windows PowerShell: `$env:GEMINI_API_KEY="YOUR_KEY"`

Optional model setting:
- Linux/macOS: `export GEMINI_MODEL="gemini-2.5-flash"`
- Windows PowerShell: `$env:GEMINI_MODEL="gemini-2.5-flash"`

Check Google AI Studio's current model list if that model is unavailable for your key. Then run:

```bash
node server.js
```

Open `http://localhost:3000`.

## Current capabilities and limitations
- Text chat using Gemini API.
- Image upload and image understanding (model must support image input).
- Browser speech recognition where supported, typically Chrome and HTTPS/localhost.
- Browser text-to-speech, with speaker on/off, pause/resume, stop, and speed controls.
- The current code does NOT generate or edit image files. It sends the uploaded image for analysis and can discuss edit instructions. For actual edited-image output and download, connect an image editing/generation model or service and add an endpoint that returns the generated image bytes/data URL. Do not promise image editing until that endpoint is configured.
- The server defaults to `gemini-2.5-flash`; if not available, set `GEMINI_MODEL` to a model shown as available for your Google AI Studio project.
- On hosted platforms, add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in their Secrets/Environment Variables settings, then restart/redeploy.
