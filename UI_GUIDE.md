# UI_GUIDE.md — Coachify Web (coachify_front_end)

How the UI is built after the migration, and the rules for adding to it. If a page breaks one of these rules, fix the page rather than the rule.

Related docs:

- [PERMISSIONS_MAP.md](PERMISSIONS_MAP.md): every permission and role check, with verification notes.
- [MIGRATION_REPORT.md](MIGRATION_REPORT.md): before/after performance and what was not migrated.

---

## 1. Stack

| Concern | Use | Don't use |
|---|---|---|
| Styling | Tailwind v4 utilities (`src/styles/tailwind.css`), preflight on, **no prefix** | Bootstrap classes, template CSS, inline `style` for colours |
| Components | `src/components/ui/*` (shadcn on Radix) and `src/components/common/*` | `react-bootstrap`, hand-rolled modals |
| Icons | `lucide-react`, always with `aria-hidden="true"` when decorative | `<iconify-icon>`, remixicon. Brand logos missing from lucide go inline as SVG (see `features/facts/components/ShareSheet.tsx`) |
| Motion | `motion/react` through `m.*` and the shared variants in `src/animations` | `motion.*` (throws under `LazyMotion strict`), ad-hoc transition objects |
| Forms | react-hook-form + zod v4 schema in the feature's `schemas/` | Uncontrolled forms with manual `useState` per field |
| Tables | `components/common/DataTable` (TanStack Table v8) | Raw `<table>` for anything sortable or paginated |
| Toasts | `sonner` (`toast.success` / `toast.error`) | `alert()` |
| Confirm | `components/common/ConfirmDialog` | `window.confirm()` |
| Rich text | `components/common/RichTextEditor` (Tiptap) to edit. `RichHtml` (DOMPurify) to display | `dangerouslySetInnerHTML` on API HTML without sanitising |
| Tests | vitest + Testing Library, next to the page as `*.test.tsx` | — |

`cn()` (`src/lib/utils.ts`) is `twMerge(clsx(...))`. Use it whenever classes are conditional or a `className` prop is merged.

---

## 2. Folder layout

```
src/
  app/            router, providers, AppShell/Topbar/Sidebar, NotFoundPage
  components/ui/      primitives (button, card, dialog, badge, input, native-select, tabs, …)
  components/common/  app-level building blocks (PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, ErrorState, StatCard, …)
  features/<name>/
    services/     axios calls — request/response shapes match the backend exactly
    schemas/      zod schemas + form defaults/mappers
    components/   feature-only components
    lib/          pure helpers (unit-tested)
    pages/        route components (default export only — no other exports, for fast refresh)
  permissions/    keys, usePermission, RequirePermission, PermissionGate, menu
  animations/     MotionProvider, variants, useCountUp
  theme/          tenant colour engine (runs before first paint), tokens
  hooks/ lib/     shared hooks and helpers (useAsync, apiClient, forms, validation)
```

A new page goes in `features/<name>/pages/` and is registered in `src/app/router.tsx` with a lazy import. If it needs a sidebar entry, add it to `src/permissions/menu.ts` and to `menu.test.ts`.

---

## 3. Design tokens

All colours are CSS variables set in `src/styles/tailwind.css` and exposed as Tailwind colours. **Never hard-code hex values in components.**

| Token (Tailwind name) | Use for |
|---|---|
| `background`, `foreground` | Page background and body text |
| `card`, `card-foreground`, `popover` | Surfaces |
| `muted`, `muted-foreground` | Secondary text, subtle fills |
| `border`, `input`, `ring` | Borders, form-control borders, focus ring |
| `primary`, `primary-hover`, `primary-active`, `primary-foreground` | **Tenant colour**: main actions, active nav |
| `primary-soft`, `primary-soft-foreground` | Tinted backgrounds (icon chips, selected rows) |
| `success` / `warning` / `destructive` / `info` (+ `-soft`, `-foreground`) | Status. Always pair the colour with text or an icon, never colour alone |
| `secondary`, `accent` | Neutral buttons and hovers |

Other tokens:

- **Radius:** `--radius-sm/md/lg/xl`.
- **Shadow:** `--shadow-xs…lg`.
- **Easing:** `ease-standard`, `ease-decelerate`, `ease-accelerate`.
- **Durations and springs:** `src/theme/tokens.ts`.

### Tenant theme (D1)

The tenant's `theme_color` from `GET /tenants/{subdomain}` is the only per-tenant setting. `src/theme/engine.ts`:

- derives the whole `primary-*` scale from it, with a contrast-safe foreground;
- builds a dark-mode variant.

It is compiled into an inline `<head>` script by `themePreloadPlugin` in `vite.config.ts`, so the colour is applied **before first paint** with no flash. Keep `engine.ts` dependency-free.

### Dark mode (D5)

`html[data-theme="dark"]` is stored in localStorage under `coachify-theme` and toggled from the top bar. Every token has a dark value. If you use tokens, dark mode works automatically. Check new screens in both modes.

---

## 4. Page anatomy

```tsx
<div className="flex flex-col gap-5">
  <PageHeader title="Chapters" description="…" actions={<Button>…</Button>} className="mb-0" />
  <Card className="p-3">{/* filters */}</Card>
  {loading ? <Skeleton … /> : error ? <ErrorState onRetry={reload} /> : rows.length === 0 ? <EmptyState … /> : <DataTable … />}
</div>
```

Every data view handles **four states**: loading (a `Skeleton` shaped like the content, with `role="status"` and an `aria-label`), error (`ErrorState` with retry), empty (`EmptyState` with an icon and a next step), and data.

- **Loading:** use `useAsync(load, deps, { enabled })` for reads. Keep the previous data on screen while refetching and dim it with `opacity-70` instead of flashing a skeleton.
- **Width:** reading pages (topic detail, profile) use `mx-auto max-w-4xl`. Lists use the full width.
- **Mobile:** every screen must work at 360px. Filters stack (`w-full sm:w-48`). Tables scroll inside their card, never the page. Long text in flex rows needs `min-w-0` and `truncate`.
- **Headings:** one `h1` per page (`PageHeader` renders it). Card titles use `CardTitle`.
- **Full-screen pages:** `/facts` is "immersive": `AppShell` drops the page padding and footer and locks the page height, so only the feed scrolls. Add a route to that check in `AppShell.tsx` only for app-like, full-bleed screens.

---

## 5. Components cheat-sheet

**`Button`:**

- variants `default | secondary | outline | ghost | soft | success | destructive | link`;
- sizes `xs | sm | default | lg | icon | icon-sm`;
- `loading` shows a spinner and disables the button;
- `asChild` wraps a `<Link>`.

**`Badge`:** variants `soft (default) | default | secondary | success | warning | destructive | info | outline`.

**`FormDialog`:** a dialog plus an RHF shell. It provides:

- a Submit/Cancel footer with loading state;
- double-submit protection;
- a form-level error;
- a "Discard changes?" prompt when a dirty form is closed.

Props: `open, onClose, title, description?, form, onSubmit, submitLabel, submittingLabel?, error?, children`. To reset state between openings, key the body by the record id.

**`ConfirmDialog`:** the Yes/No step for anything destructive or hard to undo:

- delete;
- reject or send back;
- release a paper;
- opt out;
- remove an attachment.

Props: `open, onOpenChange, title, description?, confirmLabel?, cancelLabel?, destructive?, onConfirm`. `onConfirm` may be async: the dialog shows a spinner, and stays open if the promise rejects.

```tsx
<ConfirmDialog
  open={!!pending}
  onOpenChange={(o) => !o && setPending(null)}
  title="Delete this chapter?"
  description={<><strong>{pending?.name}</strong> and its topics will be removed. This can't be undone.</>}
  confirmLabel="Delete"
  destructive
  onConfirm={() => remove(pending!.id)}
/>
```

**`DataTable`:** TanStack columns, sorting, pagination, `rowProps` for row-level attributes, and a built-in empty state.

**Other components:**

| Component | What it is |
|---|---|
| `StatCard`, `WidgetCard` | Dashboard tiles |
| `ProgressRing` | Percentage ring |
| `SegmentedControl` | Tab-like filters with `aria-pressed` |
| `UserAvatar`, `PersonRow` | Avatar with initials fallback; avatar plus name and meta |
| `FileDropzone` | Click or drop upload |
| `AttachmentPreviewModal` | Image/PDF preview with rotate, zoom (25–500%) and drag to pan |
| `RichTextEditor` | Pass `label` (used as the aria-label). An empty editor emits `''` |
| `RichHtml` | Sanitised display of API HTML. **Always** use it for HTML from the API |

---

## 6. Forms

1. **Schema:** put the zod schema in `features/<x>/schemas/`. Messages are in plain English and say how to fix the problem ("Enter a title", not "Required"). Shared rules live in `src/lib/validation.ts`:
   - `email`;
   - `password` (minimum 8, D4);
   - `optionalPhone`;
   - `requiredText`;
   - `optionalPastDate`.
2. **Hook:** `useForm({ resolver: zodResolver(schema), defaultValues })`. Defaults come from a mapper, so edit forms round-trip every field. Facts lost `target_roles` before this rule.
3. **Server errors:** on a 422, call `applyServerErrors(err, form.setError, KNOWN_FIELDS, { fieldMap })`. It puts each message on its field and focuses the first one. Show anything left over in `FormDialog`'s `error`.
4. **Labels:** every input has a visible `<Label htmlFor>`. Mark required fields. Put hints under the field, not in the placeholder.
5. **Payloads:** the request body must match the backend contract exactly. Map form values to the payload in one function, and test it.
6. **Dates:** keep `YYYY-MM-DD` and local datetimes as strings. Never pass them through `new Date().toISOString()`, which shifted Facts `publish_at` by the UTC offset.

---

## 7. Permissions in the UI

```ts
import { PERMISSIONS as P, usePermission } from '@/permissions'
const { can, canAny, hasRole } = usePermission()
```

- **Routes:** wrap them in `<Guard anyOf={[P.X]} orRoles={[...]}>` in `router.tsx`. Use the same rule as the legacy route; see PERMISSIONS_MAP.md §2.
- **Controls:** render restricted controls conditionally, as `{can(P.X) && <Button/>}` or `<PermissionGate>`. **Don't** render a disabled control instead. Skip API calls the user can't make (pass `enabled: can(...)` to `useAsync`).
- **Role checks:** role-based quirks (Q1–Q14) are intentional and preserved. Don't "fix" one in passing. Raise it instead.
- **Checklist:** every new gate gets a row in PERMISSIONS_MAP.md and a test that renders the page without the permission and asserts the control is **absent**.

---

## 8. Motion

- **Provider:** `MotionProvider` wraps the app in `LazyMotion strict` + `MotionConfig reducedMotion="user"`.
- **Variants:** use `fadeIn`, `slideUp`, `pop`, `stagger`, `shake` and `wiggle` from `@/animations`. Animate only `opacity` and `transform`.
- **Durations:** under 250ms for UI feedback. Never animate more than you need to orient the user.
- **Reduced motion:** with `prefers-reduced-motion`, transform animations are skipped. CSS spinners and transitions add `motion-reduce:animate-none` / `motion-reduce:transition-none`.
- **What to animate:** only real state changes (list insert/remove, dialog open, count-up on stats). Don't add decorative animation.

---

## 9. Accessibility checklist

- [ ] Icon-only buttons have an `aria-label`. Decorative icons have `aria-hidden="true"`.
- [ ] Focus is visible (the `ring` token). Dialogs trap focus and restore it on close (Radix does this).
- [ ] Loading regions have `role="status"` and a label. Toasts announce results.
- [ ] Status isn't shown by colour alone (badges carry text).
- [ ] Text contrast is at least 4.5:1 in light and dark, including on the tenant primary. The engine picks a light or dark foreground.
- [ ] Touch targets are at least 32px (`icon-sm`) and preferably 40px.

---

## 10. Before you commit

```bash
npm run -s lint:migrated && npx tsc -b && npm test -s && npm run -s build
```

Then:

- check the screen at 360px and 1440px, in light and dark mode, with reduced motion on;
- if you touched a gate, update PERMISSIONS_MAP.md.

`howk.coachify.local` serves `dist/`, so run `npm run build` to see your changes there.
