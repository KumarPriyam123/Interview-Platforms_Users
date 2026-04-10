# Refactoring Summary — CodeWorkspace Unification

## Files Removed

| Path | Reason |
|------|--------|
| `ai-interview-service/frontend/` (entire dir) | Duplicate React app — main `frontend/` now serves AI interview UI |
| `frontend/src/pages/LiveInterviewPage.jsx` | Leftover duplicate of AIInterviewPage |
| `Backend/src/services/judgeExecution.service.js` | Unused Judge0 execution path |
| `Backend/src/services/rag.service.js` | Stub with no real implementation |
| `Backend/src/db/postgres.js` | No Postgres in use — MongoDB only |
| `Backend/src/models/schema.sql` | Postgres schema — no longer applicable |
| `Backend/src/models/user.model.js` | Unused Postgres user model |
| `Backend/src/examples/` (entire dir) | Dead example/test files |

## Files Created

| Path | Purpose |
|------|---------|
| `frontend/src/components/CodeWorkspace/utils.js` | Shared helpers: LANGUAGES, normalizeLanguage, buildCodingStarter, createDefaultTestCases, formatTestCaseDisplay, etc. |
| `frontend/src/components/CodeWorkspace/LanguageSelector.jsx` | Language dropdown with color-coded icon |
| `frontend/src/components/CodeWorkspace/MonacoEditor.jsx` | Wrapper around `@monaco-editor/react` with dark theme defaults |
| `frontend/src/components/CodeWorkspace/RunButton.jsx` | Execute button with play icon and loading state |
| `frontend/src/components/CodeWorkspace/TestCasePanel.jsx` | Tabbed test case editor + results (AI mode) |
| `frontend/src/components/CodeWorkspace/ExecutionOutput.jsx` | Raw stdout/stderr output display (P2P/Industry mode) |
| `frontend/src/components/CodeWorkspace/CodeWorkspace.jsx` | Main orchestrator: composes all sub-components |
| `frontend/src/components/CodeWorkspace/CodeWorkspace.css` | Shared styles for all `cw-*` classes |
| `frontend/src/components/CodeWorkspace/index.js` | Barrel exports |

## Files Modified

### Frontend

- **`AIInterviewPage.jsx`** — Removed ~300 lines of inline helpers, editor JSX, test case panel.
  Now imports `CodeWorkspace` and `utils` from shared module. Editor + test cases rendered via
  `<CodeWorkspace mode="ai">`.
- **`P2PInterviewPage.jsx`** — Replaced `<textarea>` with `<CodeWorkspace mode="p2p">` (Monaco).
  Removed duplicated utility functions. Adapted event-based handlers to value-based callbacks.
  WebRTC sync preserved through `onCodeChange`/`onLanguageChange` props.
- **`IndustryLeaderInterviewPage.jsx`** — Replaced static `mockStarterCode` display with
  `<CodeWorkspace mode="industry">`. Now has a functional editor and code execution.
- **`App.jsx`** — Removed `/live-interview/:id` duplicate route.
- **`services/interviewApi.js`** — Removed unused `runCode()` export.

### Backend

- **`routes/interview.routes.js`** — Removed `/code/run` Judge0 route.
- **`controllers/interview.controller.js`** — Removed `executeCodingAnswer`, Judge0 imports, RAG stubs.
- **`index.js`** — Removed Postgres connect/disconnect.
- **`db/index.js`** — Removed Postgres exports.
- **`package.json`** — Removed `pg` dependency.

### Docs

- **`ai-interview-service/ARCHITECTURE.md`** — Added deprecation/migration note.

## Architecture: Code Execution Flow

All three interview modes now use the same execution pipeline:

```
Frontend (any mode)
  → POST /api/code-execution/jobs   (codeExecution.js service)
  → Backend Express route            (codeExecution.routes.js)
  → BullMQ queue                     (codeExecution/queue.js)
  → Worker spawns Docker container   (codeExecution/execution/)
  → Poll GET /api/code-execution/jobs/:id for result
```

Docker images: `node:20-alpine`, `python:3.12-alpine`, `gcc:14`, `openjdk:21-jdk-slim`
Security: `--network none`, `--read-only`, unprivileged user, dropped caps, 5s timeout, 128MB memory.

## CodeWorkspace Component API

```jsx
<CodeWorkspace
  mode="ai" | "p2p" | "industry"
  language={string}
  onLanguageChange={(langId) => void}
  code={string}
  onCodeChange={(code) => void}
  readOnly={boolean}
  languageDisabled={boolean}
  // AI mode:
  testCases={array}
  onTestCasesChange={(testCases) => void}
  isStructuredCoding={boolean}
  // P2P/Industry mode:
  onRunCode={() => void}             // override internal runner
  executionState={string}
  executionResult={object}
  executionError={string}
  executionJobId={string}
  stdinValue={string}
  onStdinChange={(val) => void}
  // Extra:
  headerExtra={ReactNode}
/>
```

## Testing Checklist

- [ ] `cd frontend && npx vite build` — builds without errors ✅
- [ ] `cd Backend && node -e "import('./src/app.js')"` — imports resolve ✅
- [ ] AI Interview: coding questions show Monaco editor, test cases run through Docker
- [ ] P2P Interview: Monaco editor replaces textarea, WebRTC code sync works
- [ ] P2P Interview: Run Code → Docker execution → stdout/stderr displayed
- [ ] Industry Leader: Editor is interactive, Run Code executes via Docker
- [ ] Language switching works in all three modes
- [ ] Redis + Worker must be running for code execution (`start_code_execution_stack.ps1`)
