# Supabase edge functions

`functions/generate-answers` writes model answers for a past paper and `functions/generate-quiz` writes quiz questions
from a note. Both use ChatPDF. Shared checks live in `functions/_shared/guard.ts`.

## Secrets (never put keys in the code)

```bash
supabase secrets set CHATPDF_API_KEY=<your key>
# optional: more browser origins allowed to call the functions, comma separated
supabase secrets set EXTRA_ORIGINS=https://your-admin-domain.example
```

The previous ChatPDF key was written in the function source, so **rotate it in the ChatPDF dashboard** and set the new
one as the secret above.

## Deploy

```bash
supabase functions deploy generate-answers
supabase functions deploy generate-quiz
```

## What the guard enforces

- The caller must be signed in.
- The file must be one of our own `resources` (an arbitrary URL is refused).
- Students need a current pass for that resource's department, year and semester. Admins (anyone with a role in
  `app_metadata`) may use any file.
- Every response, errors included, carries the CORS headers so the browser can read the message.
