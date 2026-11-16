# Stuydo — Interview Studio Works

A practice and mock-interview app: problem on the left, code editor on the right, timers, live collaboration with friends, and frozen session snapshots.

## Pages
- **Landing** (`/`) — what it is, sign-in button.
- **Sign in / Sign up** (`/auth`) — email + password only.
- **Dashboard** — your questions, your sessions, your snapshots; buttons "Practice solo" and "Start mock interview".
- **Question editor** — write a question (title, description, examples, constraints, starter code, test cases) with AI help:
  1. Improve phrasing
  2. Reformat into classic interview style (Problem / Examples / Constraints)
  3. Bring in questions from LeetCode/HackerRank by pasting the problem text and parsing it
  4. Suggest hints, including time and space complexity
- **Session room** — split screen:
  - Left: question, with a show/hide toggle for hints, including complexity hints when present (host controls it; hidden from interviewee by default).
  - Right: code editor with language picker (Python, JavaScript, Java, C++, Go...), Run button, output and test-case results panel.
  - Top bar: countdown (pick duration) or stopwatch, available in both solo and mock sessions, participant avatars, invite link, "Save snapshot", "End session".
- **Snapshot viewer** — read-only view of a saved moment: question, code, language, output, timer value, participants, date. Cannot be edited.

## Collaboration
- Host creates a mock session and shares a link; friends must sign in to join.
- Live shared code editing with each person's cursor visible, synced language, synced timer, synced hint visibility.
- Roles: interviewer (host) and interviewee.

## Snapshots
- One click freezes everything into a static record. Snapshots are never changed after creation; listed on the dashboard.

## Technical details
- Lovable Cloud: auth, tables `profiles`, `questions`, `sessions`, `session_participants`, `snapshots` (immutable, insert-only RLS), with grants and owner/participant RLS.
- Realtime: Cloud Realtime channels per session for code (Yjs CRDT over broadcast), presence, timer and hint state; latest code persisted periodically to `sessions`.
- Editor: Monaco loaded client-only.
- Code execution: server function calling Judge0 (via RapidAPI or self-hosted) — needs an API key added as a secret; runs code against each question's test cases.
- AI: Lovable AI Gateway server functions for phrasing, reformatting, and complexity suggestions.
- Distinct "IDE" visual direction with monospace accents, in both dark and light mode with a toggle (editor theme follows).

## Needs from you
- A Judge0 API key (I'll prompt for it when we reach code running).
