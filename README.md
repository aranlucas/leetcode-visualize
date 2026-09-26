# ProblemPrism

ProblemPrism is a client-only Chrome side-panel extension for learning LeetCode and NeetCode problems with ChatGPT. It coaches reasoning, can review the code currently in the editor when requested, and provides local visualizations and formatting tools.

Open the panel on a problem to get a short explanation and ask for help immediately. Examples, code review, hints, and optional interview practice open inline; there is no learning-style setup. After sign-in, the detected problem is sent to ChatGPT automatically to prepare its explanation and supporting material. Code is read only when you request a review.

There is no ProblemPrism server or OpenAI API key. Login tokens stay in trusted extension storage.

## Build and install

Requires Node.js 24.15+ and Chrome.

```bash
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `apps/extension/dist`.

## Verify

```bash
npm run check
npm test
npm run build
npm audit --omit=dev
```

For the demo UI, run `npm run dev:extension` and open `http://localhost:5173/sidepanel.html?demo=1`.
