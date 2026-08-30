# ProblemPrism

ProblemPrism is a client-only Chrome MV3 side-panel extension for LeetCode and NeetCode. It reads the active problem, lets the learner focus on highlighted question text, and uses their own ChatGPT account to teach the reasoning process expected in a coding interview.

ProblemPrism does not inspect submission history or read editor code automatically. **Check my current code** reads the active LeetCode or NeetCode editor only when clicked, then critiques correctness, complexity, and edge cases without generating a replacement solution.

On LeetCode's current Monaco-based interface, ProblemPrism also adds a **Format**
button beside the code editor. Legacy CodeMirror layouts are intentionally ignored.
It formats Java, C++, JavaScript, TypeScript, and Dart locally in the browser.
Use `Ctrl+Alt+F` to run the same action from the keyboard.

The tutoring flow starts at the beginning:

- Choose question-led coaching, an example-first walkthrough, or pattern recognition.
- Progress through Understand, Notice, Explore, Plan, and Explain.
- Practice an answer at any stage and ask ChatGPT what works, what to improve, and how to say it more clearly.
- Check the code currently in the page editor for specific defects, repair hints, and edge cases without receiving replacement code.
- Reveal a focused nudge and interview talk track only when needed.
- Use progressive hints without receiving implementation code.
- Choose **I just want the answer** when you need to move on; ProblemPrism reveals a complete solution and schedules a local retry reminder for the next day.
- Open an interactive visualization when state changes or spatial relationships are genuinely easier to understand visually.

## Architecture

Everything runs inside `apps/extension`:

- A content script extracts the active LeetCode or NeetCode problem and reads the current editor only after an explicit code-check action.
- Each supported browser tab receives its own side-panel instance, so switching tabs preserves the coaching response and in-progress practice for each problem.
- The background service worker runs the ChatGPT device login, discovers the account’s available models, refreshes tokens, and calls the model through the Vercel AI SDK.
- ChatGPT returns schema-validated tutoring sessions, progressive hints, optional visualizations, opt-in feedback on written practice answers, and opt-in current-code reviews.
- Completed tutoring sessions are cached locally for 30 days (up to 24 entries), keyed by problem content, selected focus, and teaching style, so an identical run does not call ChatGPT again. Disconnecting ChatGPT clears the cache.
- Full-answer retry reminders use Chrome's local alarms and notifications APIs. They do not require a ProblemPrism server.
- Visualizations can render arrays, graphs, trees, grids, or richer data-flow scenes with metrics, transformations, and evolving keyed buckets.
- The side panel renders every response as trusted native React and SVG UI; it does not execute model-generated code.
- The LeetCode formatter is based on the ISC-licensed
  [`madhur/leetcode-format-chrome-extension`](https://github.com/madhur/leetcode-format-chrome-extension);
  attribution and the license text are in `THIRD_PARTY_NOTICES.md`. Its
  language-specific runtimes load only after you use the Format action.
- Login tokens are stored in `chrome.storage.local` and restricted to trusted extension contexts with `setAccessLevel`. They are never exposed to the page or content script.

There is no ProblemPrism server and no OpenAI API key.

> Client-only token storage is less isolated than the server-backed architecture recommended by `login-with-chatgpt`. Only install builds you trust.

## Build and install

Requirements: Node.js 24 LTS (`24.15.0` or newer) and Chrome.

```bash
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select:

```text
apps/extension/dist
```

The manifest contains a development public key, so the unpacked extension keeps the stable ID `ojfbgijlkpoacdndnjekabfeakpcnceh`.

Open a supported problem page:

- `https://leetcode.com/problems/...`
- `https://neetcode.io/problems/...`

Click the ProblemPrism toolbar action, review the login consent, connect ChatGPT, choose how you want to learn, and select **Start interview coaching**.

## Checks

```bash
npm run check
npm test
npm run build
npm audit --omit=dev
```

For UI-only review in a normal browser, run `npm run dev:extension` and open:

```text
http://localhost:5173/sidepanel.html?demo=1
```

Append `&setup=1` to review the pre-coaching teaching-style selector.
