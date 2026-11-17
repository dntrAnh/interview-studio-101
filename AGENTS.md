<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Live collaboration uses Yjs synced over Cloud Realtime broadcast (`src/lib/useRoom.ts`); there is no Yjs server, so peers answer `sync-req` and the DB `sessions.code` is only a seed/backup.
- Code execution uses authenticated `runCode` with direct Judge0 CE by default, sequential paced submissions and optional configured/RapidAPI fallback; stdin→stdout pairs keep languages consistent.
- Snapshots are insert-only rows (no update/delete grants) to keep them immutable.
- Root session context derives from the persisted auth session and the single root identity listener; cached route access is only a UI gate, while server middleware and RLS validate access.
- Room launches share StartSessionDialog so dashboard imports and question-editor launches use the same save/create flow.
- Guest roles and seat limits are assigned atomically by join_session_as under a room row lock; spectators are read-only and only hosts manage session lifecycle.
