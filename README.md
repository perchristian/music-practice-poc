# piano-practice-poc

Mock-first prototype for testing whether a screen recording can become a better piano learning workflow.

The current POC generates mock drums, bass, guitar, and piano stems. The browser can play them together, mute/unmute individual stems, and mute piano for play-along practice.

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Mock mode is the default and requires no heavy ML dependencies:

```bash
PIPELINE_MODE=mock npm start
```

See `DEMO.md` for the current demo flow and known limitations.

## Verify

```bash
npm test
npx playwright install chromium
npm run test:gui
```

`npm test` runs the mock backend smoke test. `npm run test:gui` runs the Playwright browser smoke test for the mock upload-to-practice flow.
