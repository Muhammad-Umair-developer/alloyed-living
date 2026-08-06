# Project Constraints

LIVE production e-commerce site. Backend is Supabase. Treat every change as high risk.

## Absolute rules
- Do NOT change styling, CSS, Tailwind classes, colours, spacing, fonts, or layout.
- Do NOT reformat or lint files you were not asked to modify.
- Do NOT rename or move files, or reorganise folders.
- Do NOT add, remove or upgrade packages unless explicitly told to.
- Do NOT drop or alter existing DB columns, enum values, or rows.
- Do NOT edit .env files. Tell me what to add; I will add it.
- The SUPABASE_SERVICE_ROLE_KEY must NEVER appear in client-side code.
- Every new table and storage bucket must have RLS enabled with explicit policies.
- NEVER run `supabase db reset` against a linked remote project. Local or staging only.
- NEVER run any DELETE, DROP, or TRUNCATE against production without showing me the exact statement and the affected row count first, and waiting for my explicit approval.
- The ONLY table whose rows may ever be deleted in this project is `orders` and its dependent rows. Never users, products, content, or settings.
- Before any command that touches a remote database, print which Supabase project ref is currently linked and wait for my confirmation.


## Working method
- Mirror the existing Cash on Delivery implementation's patterns exactly.
- State which files you will touch before editing. Wait for approval.
- Smallest possible diff.
- Show `git diff --stat` after each task.
