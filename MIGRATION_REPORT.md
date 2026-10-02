# MIGRATION_REPORT.md — Coachify Web UI migration

- **Branch:** `phase_4`.
- **Baseline:** `0ac61ee`, the last commit before the migration.
- **After:** `b40f111`, the cleanup commit.
- **Date:** 2026-10-02.
- **See also:** [UI_GUIDE.md](UI_GUIDE.md) for the conventions and [PERMISSIONS_MAP.md](PERMISSIONS_MAP.md) for permission verification and role-testing notes.

---

## 1. Performance: before / after

### How it was measured

The Lighthouse CLI is **not installed** on this machine. Per the working rule (no installs without approval), these numbers come from a Lighthouse-equivalent run instead:

- Headless Chrome via Playwright, mobile viewport 412×823.
- **Lighthouse's mobile throttling:** 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown.
- `vite preview` of each production build.
- API mocked with empty responses, so only the frontend is measured.
- Each value is the median of 3 runs.

Metrics come from the browser's own `PerformanceObserver`:

| Metric | Source |
|---|---|
| FCP, LCP | paint entries |
| CLS | `layout-shift` |
| TBT | `longtask` time beyond 50 ms |

To get official Lighthouse scores, approve `npx lighthouse` (see §4) and run against both builds.

### Results (median of 3)

| Page | Metric | Before | After | Change |
|---|---|---:|---:|---:|
| `/` (sign-in) | FCP / LCP | 3.49 s | 2.85 s | **−18%** |
| | TBT | 282 ms | 368 ms | +86 ms |
| | CLS | 0.018 | 0 | ✓ |
| | Transferred | 736 KB / 27 req | 378 KB / 18 req | **−49%** |
| `/dashboard` | FCP / LCP | 3.73 / 3.92 s | 2.07 s | **−47%** LCP |
| | TBT | 593 ms | 515 ms | −13% |
| | CLS | **1.638** | 0 | ✓ (layout jump removed) |
| | Transferred | 605 KB / 82 req | 361 KB / 51 req | **−40%** |
| `/students` | FCP / LCP | 3.74 s | 2.16 s | **−42%** |
| | TBT | 572 ms | 606 ms | +34 ms (within run noise) |
| | CLS | 0 | 0 | — |
| | Transferred | 677 KB / 41 req | 359 KB / 46 req | **−47%** |

### Build output

| | Before | After |
|---|---:|---:|
| `dist/` size | 22 MB | 3.3 MB |
| Files in `dist/` | 428 | 183 |
| All JS (raw / gzip) | 3,389 KB / 935 KB | 1,755 KB / 542 KB |
| All CSS | 828 KB (16 render-blocking template sheets) | 102 KB (1 sheet) |
| Largest JS chunk | 1,169 KB | 579 KB |

### Where the gains came from

- **Render-blocking CSS:** 16 template stylesheets, remixicon and the iconify runtime were removed from `index.html`.
- **Libraries:** Bootstrap, react-bootstrap and slick were dropped.
- **Assets:** about 21 MB of unused template images and fonts left `public/`.
- **Code splitting:** each route is lazy-loaded.
- **Layout shift:** dashboard CLS was 1.64 (cards popping in). It is now 0, thanks to skeletons shaped like the final content.

TBT on the sign-in page rose slightly. That page now loads the shared UI primitives (Radix, motion) that every later page reuses. Splitting the 579 KB main chunk (`build.rollupOptions.output.manualChunks`) is the next step if you want TBT down further. It is listed below.

---

## 2. Not migrated / left as-is

### Deliberately preserved (per the brief and decisions)

| Item | Status | Why |
|---|---|---|
| Permission quirks Q1–Q14 (PERMISSIONS_MAP.md) | Preserved exactly | "Never weaken or change a permission check". Each needs its own reviewed decision. |
| Static settings pages (`/dashboard/settings/company`, `notification`, `notification-alert`, `theme`) and `/auth/sign-up` | **Ported as-is**: same fields, ids and options, still no API calls, still no sidebar link | D2 said "leave untouched", but they used Bootstrap/template CSS, which the cleanup removed. They were re-skinned without any behaviour change. |
| Routes with no guard (Q9) | Unchanged | They rely on the backend, as before. |
| Bearer token in `localStorage` | Unchanged | Kept for parity with the mobile app (UI_AUDIT §9). |

### Not done (candidates for follow-up)

| Item | Layer | Notes |
|---|---|---|
| Insights charts (D6) | Web | The page was migrated in its existing card layout, but no charts were added. `recharts` has been uninstalled; adding charts later means installing a chart library again (lazy-loaded). |
| Unused dependencies `recharts`, `cmdk`, `canvas-confetti` (+ `@types/canvas-confetti`) | Web | **Removed** 2026-10-02. |
| Main chunk 579 KB (Vite warning) | Web | Add `manualChunks` (radix / motion / tiptap / tanstack). |
| Official Lighthouse scores | Web | Needs the `lighthouse` CLI; see §1. |
| `build/` folder committed and not git-ignored | Repo | UI_AUDIT §9. Not touched. |
| Backend password rule (D4) | Backend | **Done** in coachify_back_end: `min:8` on every create/update rule. Sign-in has no length rule, so existing 6–7 character passwords still work until they are changed. |
| Min-8 password check | Mobile | No client-side check exists in coachify_react_native. |
| Tenant settings only refresh on re-login | Web | UI_AUDIT §2. Pre-existing; unchanged. |

### Backend issues found during the migration

Fixed in coachify_back_end `ec0c53a` (branch `phase_3`):

| Sev | Issue | Fix | Still to do |
|---|---|---|---|
| **High** | D7: `GET /tenants/{subdomain}` (public) returned `fcm_server_key` and `firebase_admin_sdk_json` | `$hidden` on `Tenant`. The `sleep(1)` was removed. Verified live: no secrets, 32 ms | **Rotate both Firebase keys** (deferred by you on 2026-10-02): they were public. Browsers that signed in before the fix still hold them in `localStorage.tenant` until their next sign-in |
| **High** | `ChapterController@show` (teacher and admin) returned other tenants' topics | Topics filtered to `tenant_id IN (0, own)` | — |
| Medium | Student activities had no topic or chapter names | `topicModel` and `chapterModel` are now eager-loaded | — |
| Medium | Student topic content had no MCQ choices | `question_type` and `option_a`–`option_d` are added. `correct_answer` is sent only once solutions unlock. The web page shows the choices and reveals the answer on "Show answer" | Mobile can use the same fields |

Not yet done:

| Sev | Issue | Next step |
|---|---|---|
| Low | Student `subjects` JSON holds duplicate or invalid ids. The fix and the `students:clean-subject-ids` command are written | Run `--dry-run` (25 of 48 profiles would change), then run it for real. This changes data, so it's your call |

---|---|---|
| **High** | D7: `GET /tenants/{subdomain}` (public) returns `fcm_server_key` and `firebase_admin_sdk_json` | Hide them on `Tenant` (or return a public DTO), **rotate the keys**, and remove the `sleep(1)` |
| **High** | `ChapterController@show` returns topics from other tenants. The web app now hides them client-side, but the API still sends them | `Topic::where('chapter_id', …)->whereIn('tenant_id', [0, $tenantId])` |
| Medium | Student activities don't eager-load `topicModel`/`chapterModel`, so topic and chapter names are missing | Add them to `with()` in `studentActivities` |
| Medium | Student topic content omits the MCQ options, so practice questions show without choices | Add `option_a`–`option_d` to the select in `Student\TopicContentController` |
| Low | Student `subjects` JSON holds duplicate or invalid ids. The fix and the `students:clean-subject-ids` command are written | Run `--dry-run` (25 of 48 profiles would change), then run it for real |

---

## 3. Verification at `b40f111`

- `eslint --max-warnings=0 src` passes, covering all of `src`.
- `tsc -b` passes.
- 49 test files and 319 tests pass.
- `vite build` succeeds.
- A Playwright sweep of 34 screens (32 routes plus sign-in and sign-up) as `coaching_admin` had no page errors.
- Profile, Notifications, Students and Dashboard were re-checked with realistic data in light mode, dark mode, and at 390px mobile:
  - no error boundaries;
  - no horizontal overflow.

## 4. To finish the Lighthouse deliverable (needs approval)

```bash
# one-off, not added to package.json
npx -y lighthouse@12 http://localhost:5302/dashboard --form-factor=mobile --only-categories=performance,accessibility,best-practices --chrome-flags="--headless" --output=json
```

Authenticated pages need the `authToken`/`authUser` localStorage values injected. The Playwright harness in this report already does that, and Lighthouse can be driven the same way through its Puppeteer API.
