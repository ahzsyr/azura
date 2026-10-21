# Gate 4 Commit 0 acceptance + Commit 1 copy table decision

## Commit 0 — `535bf619` — ACCEPTED

| Fix | Result |
| --- | --- |
| G3-R1 brand weight | ✅ `font-weight: var(--brand-name-font-weight, 750)` — panel owns the value, lockup is fallback |
| G3-R1 wordmark fill | ✅ `color` / `-webkit-text-fill-color: var(--az-ink, var(--primary))` — ink first, preset-tracked primary when the token is absent, `gradient-flow` exemption kept |
| G3-R2 tagline | ✅ single `letter-spacing: 0.04em`; duplicate gone |
| G3-R3 logo-only | ✅ border suppressed for both breakpoints *and* the real `display: none` hides at `header-builder.css:133` (≤968px) and `:141` (≥969px) — the suppression is defence in depth, which is the right call for preview surfaces |

No new lockup-mode product decision was invented, and no branding setting lost its owner. Gate 3
is now fully closed on code.

---

## Commit 1 copy table — 9 of 13 approved, 4 held

The table is good work: the changes that ship all make a label say what happens or an error say
how to fix it. Four rows are held for the reasons below, one of them a blocker.

### Blocker — `locale.selectLanguageHint` would display Arabic text in English UIs

In `messages/ar.json` this key is **native Arabic**: `اختر لغتك المفضلة`. The proposal says
"en; ar/id get the same English" — applying that replaces a translated Arabic string with English
on the language chooser, for every Arabic visitor. This is exactly the class of regression the
`messages/` cap exists to prevent.

Decision: **change `en` only**; leave `ar` untouched. If you want shorter Arabic, that is a
translation task for an Arabic speaker, not a copy edit in this gate.

### Hold — Indonesian is a partially translated locale; "English-held" would overwrite real work

State of `messages/id.json` (verified):

| Key | Indonesian value | Proposed edit would |
| --- | --- | --- |
| `account.favoritesEmpty`, `account.requestsEmpty` | **already native Indonesian** | (not in the edit set anyway) |
| `maintenance.body` | **native Indonesian** | overwrite with English ❌ |
| `compare.*` subtree (`drawerTitle`, `hubHint`, `browseTypes`, `clearAll`, …) | **native Indonesian** | (only `drawerEmpty` / `empty` edited, both already English) |
| `common.loading`, `common.pageNotFoundBody`, `common.backToHome`, `locale.selectLanguageHint`, `contact.*`, `nav.inquire`, `product.stock.tipLabel` | English-held | overwrite English with English — no-op, but keeps it English |

Rule: **never write English into a key that currently holds native text.** For `id`, apply the
approved rows only where the current value is English (no visible change) or skip `id` entirely
for this commit. Recommendation: **skip `id` in Commit 1**, and open one backlog item —
"Indonesian copy completion" — listing the nine English-held keys per locale, so a translator
does them once with context.

The same logic applies to `ar`: every Arabic row in the table is already native Arabic and is a
*meaning-preserving* edit at most. Recommendation: **skip `ar` in Commit 1 too** unless the
proposed Arabic is identical in meaning — and even then, it is translation churn for the
"ellipsis / title case" class of change.

### Held rows, with reasons

| Key | Verdict | Why |
| --- | --- | --- |
| `nav.inquire` — "Inquire Now" → "Inquire" | **Hold** | English idiom: "Inquire Now" is the conventional CTA; "Inquire" alone is flatter and reads as a form label. This is voice, not correctness. `branding.md` keeps identity in tone of voice — dropping the deliberate emphasis on the product's primary action is a brand call owned by whoever wrote it, not a HIG fix. Keep unless the copy owner asks. |
| `common.pageNotFoundBody` → "This page doesn't exist. Go home or try search." | **Revise** | The proposed line names a destination ("Go home") and a control ("try search") that may not sit next to the 404 body. If the 404 page has a home link and a search field below, the sentence duplicates them; if it does not, the sentence promises something absent. Approve only after reading the 404 route and matching the words to the actual controls. |
| `common.backToHome` → "Back to Home" | **Approve for `en` only** | Correct title-case CTA, but it is a *style* fix; do not push it into a translated string. |
| `contact.error` | **Revise** | "We couldn't send your message. Check your connection and try again." — reasonable, but "check your connection" presumes the cause. If the form is used on a flaky-network B2B site, prefer cause-agnostic: "We couldn't send your message. Try again, or email us at {address}." Only approve if the contact route can supply an address; otherwise keep the retry clause and drop the diagnostic. |
| `contact.success` | **Approve** | "Message sent. We'll get back to you shortly." confirms the action; the old "Thank you!" thanked without confirming. |
| `common.loading` (proper ellipsis) | **Approve (`en`)** | Matches `compare.loading` ("Loading…"). Punctuation consistency is real. |
| `compare.drawerEmpty` / `compare.empty` | **Approve (`en`)** | Both now invite the next action. Pick one wording for both keys or keep the drawer/hub distinction explicit — they render in different places; the proposed pair does this correctly. |
| `product.stock.tipLabel` → "About stock availability" | **Approve (`en`)** | Name states what the control reveals. |

### Approved Commit 1 edit set

`messages/en.json` only, 9 keys:

1. `common.loading` → `Loading…`
2. `common.backToHome` → `Back to Home`
3. `common.pageNotFoundBody` → **only after** you read the 404 route; wording must match the controls actually present
4. `product.stock.tipLabel` → `About stock availability`
5. `locale.selectLanguageHint` → `Choose a language`
6. `contact.error` → "couldn't send … " form per the revision above
7. `contact.success` → `Message sent. We'll get back to you shortly.`
8. `compare.drawerEmpty` → `Nothing to compare yet. Add items from the catalog.`
9. `compare.empty` → `Your compare list is empty. Add items from the catalog.`

`ar` and `id`: **no edits in Commit 1.** Append one backlog item per locale listing the English-held
keys so a translator works through them with context.

---

## Commit 1 prompt (execute now)

> Gate 4, **Commit 1** — approved subset only.
>
> 1. Read the 404 route (`src/app/[locale]/(marketing)/not-found.tsx` or equivalent — find it) and
>    report which controls it renders. Then set `common.pageNotFoundBody` to wording that names
>    only controls present. If the route has no search field, do not mention search.
> 2. Edit `messages/en.json` only, the 9 approved keys. No `ar`, no `id` edits.
> 3. For `contact.error`, check whether the contact handler knows a support email; if yes include
>    it, otherwise keep the retry-only wording and note it.
> 4. Append to `docs/apple-design/backlog.md`:
>    - "Indonesian copy completion — nine English-held keys enumerated with `path:line`"
>    - "Arabic copy review — `locale.selectLanguageHint` and other copy edits need a native
>      reviewer; do not route translation through copy fixes."
> 5. Print the exact git diff for `messages/en.json` (9 keys, nothing else) and stop.
>    Commit as `copy: Gate 4 storefront copy, en only`.
>
> Commit 2 message: "Do not proceed. Nothing in `messages/` changes except the 9 keys; any other
> file in this diff is out of scope."

After this, run Commits 2–4 as previously specified (dark sweep, forced-colors, final report).
