# CIS 4339 — Front-End Task List

Student tasks for the **Data Platform** front end (Vue 3 + Vite + Tailwind + Pinia).

Every task below is grounded in something that actually exists in this codebase — a real
defect, a real duplication, or a real gap. File and line references were verified against
the template as committed. Line numbers may drift once students start editing; treat them
as starting points, not gospel.

## How to read this document

| Field | Meaning |
| --- | --- |
| **Difficulty** | Beginner / Intermediate / Advanced, relative to a student who has completed the Vue basics |
| **Files** | The files a student is expected to touch |
| **Concepts** | What the task is actually teaching |
| **Done when** | Acceptance criteria — observable, checkable behavior |

## Suggested sequencing

| Phase | Theme | Tasks |
| --- | --- | --- |
| 1 | Onboarding — small verifiable bug fixes | F1–F5 |
| 2 | Core refactor — Options API to Composition API | R1–R5 |
| 3 | Component extraction | C1–C4 |
| 4 | Hardening — auth, roles, accessibility | S1–S3, A1–A4 |
| 5 | Polish — UX, tooling, tests | U1–U4, T1–T4 |

Phases 1 and 2 should be done in order. Phases 3–5 can be parallelized across teams.

**Alternative structure:** the three domains (clients / events / services) are almost
perfectly symmetric. Three teams can each own one vertical slice, perform the same
refactor independently, then compare approaches in a code review session.

---

# Phase 1 — Bug Fixes

Warm-up tasks. Each is small, but none can be solved without reading and tracing the
existing code. Good for the first week.

## F1 — Login does not survive a page refresh

**Difficulty:** Intermediate
**Files:** `src/api/api.js`, `src/store/loggedInUser.js`, `src/main.js`
**Concepts:** localStorage, JWT structure, app bootstrap order, axios interceptors

`loginUser()` writes the token to `localStorage` (`src/api/api.js:44`) and sets the axios
`Authorization` header. But **nothing ever reads the token back on app startup.** The
Pinia store initializes with `isLoggedIn: false`, the axios header is never restored, and
the router guard bounces the user to `/login`. Press F5 and you are logged out, even
though a perfectly valid token is sitting in localStorage.

Tasks:
1. On app startup, read `authToken` from localStorage and restore both the store state and
   the axios `Authorization` header.
2. Decode the JWT and check its `exp` claim. An expired token must be discarded, not
   restored.
3. Add an axios **response** interceptor: any `401` response should log the user out and
   redirect to `/login`.

**Done when:**
- Logging in and refreshing the page keeps the user logged in, with their role intact.
- A tampered-with or expired token in localStorage results in a logged-out state, not a crash.
- Forcing a 401 from the server redirects to the login page rather than silently failing.

> Discussion prompt: is localStorage the right place for a JWT? What does that expose you
> to that an httpOnly cookie would not?

## F2 — `catch` block throws an undefined variable

**Difficulty:** Beginner
**Files:** `src/App.vue`
**Concepts:** error handling, scope, reading stack traces

`src/App.vue:110-116`:

```js
async created() {
  try {
    this.orgName = await getOrgName();
  } catch {
    throw (error)      // <-- `error` was never declared
  }
}
```

The bare `catch { }` binds no variable, so `error` is undefined and the handler itself
throws a `ReferenceError` — masking whatever actually went wrong.

**Done when:** the organization name still loads on success; on failure a meaningful
message reaches the user (a toast) and the real error is visible in the console.

## F3 — Dead Vuex code in a Pinia project

**Difficulty:** Beginner
**Files:** `src/App.vue`
**Concepts:** recognizing dead code, distinguishing Vuex from Pinia

`src/App.vue:118-124` defines a `logout()` method that calls
`this.$store.dispatch('clearSessionData')`. That is the **Vuex** API. This project uses
**Pinia**, so `this.$store` is undefined and the method would throw if it ran.

It never runs — the nav calls `user.logout` from the store directly (`src/App.vue:29`).
It is pure dead code.

**Done when:** the dead method is removed, logout still works from the nav, and the
student can explain in a sentence or two how they proved the method was unreachable.

## F4 — Error toasts display `[object Object]`

**Difficulty:** Beginner
**Files:** all of `src/views/`, `src/App.vue`
**Concepts:** reading library docs, error object shapes, string coercion

Roughly 25 call sites get this wrong, in two distinct ways:

```js
toast.error(error)                        // error is an object -> renders "[object Object]"
toast.error('error loading data:', error) // 2nd arg to vue-toastification is OPTIONS, not a value
```

Examples: `src/views/clientdetails.vue:322`, `src/views/eventform.vue:246`,
`src/views/findevents.vue:125`, `src/App.vue:123`.

The second form is the more interesting bug — it looks like `console.log` semantics, but
vue-toastification's second parameter is a configuration object. The error is silently
discarded.

Tasks: write one small helper that turns any thrown value into a readable string, and
route every toast through it.

**Done when:** no toast in the application can render `[object Object]`; every error path
produces a human-readable message.

## F5 — API layer crashes when the backend is unreachable

**Difficulty:** Intermediate
**Files:** `src/api/api.js`
**Concepts:** axios error shapes, failure modes, defensive coding

Client and service calls end with:

```js
catch (error) { throw error.response.data }
```

If the backend is **down**, there is no `error.response` — so this throws a `TypeError`
and the original network error is lost. Meanwhile the events endpoints do
`throw error` instead. The layer is inconsistent with itself.

**Done when:**
- Stopping the backend and using the app produces a clear "cannot reach server" message
  rather than a `TypeError`.
- All API functions report errors through one consistent shape.

---

# Phase 2 — Options API to Composition API

The core refactor. Migrate to `<script setup>`.

Note that the template is *already inconsistently migrated* — `clientform.vue`,
`clientdetails.vue`, and `App.vue` mix a `setup()` block with `data()` and `methods`.
Students must reconcile two paradigms inside a single file, which is exactly what this
task looks like in industry.

Do the extraction tasks (R2–R5) **during** the migration, not before. They are the
payoff that makes composables feel worth the effort.

## R1 — Migrate all views and components to `<script setup>`

**Difficulty:** Intermediate
**Files:** all of `src/views/`, `src/components/`, `src/App.vue`
**Concepts:** `ref` vs `reactive`, `computed`, lifecycle hooks, `defineProps`, `useRoute` / `useRouter`

Convert one view at a time. Suggested order, easiest first:

1. `login.vue` (52 lines, already half-migrated)
2. `serviceform.vue`
3. `findservice.vue` / `findevents.vue` / `findclient.vue`
4. `clientform.vue`
5. `home.vue`
6. `servicedetails.vue` / `eventDetails.vue` / `clientdetails.vue`
7. `App.vue`

Watch for: `this.$route` becomes `useRoute()`, `this.$router` becomes `useRouter()`, and
Vuelidate's `useVuelidate()` needs its state passed explicitly once `data()` is gone.

**Done when:**
- No `export default { data() ... }` remains in `src/`.
- Every page still works: all CRUD flows, search, validation, and role-based disabling.
- No new console warnings or errors.

## R2 — Extract `formatDate` into a shared utility

**Difficulty:** Beginner
**Files:** new `src/utils/` or `src/composables/`, plus 4 views
**Concepts:** DRY, module extraction

The identical function is copy-pasted verbatim into four files:
`home.vue:223`, `findevents.vue:165`, `clientdetails.vue:327`, `servicedetails.vue:175`.

**Done when:** one definition exists; all four call sites import it; dates still render
as `MM/DD/YYYY` everywhere.

## R3 — Build a `useApi` composable for loading / error / data state

**Difficulty:** Intermediate
**Files:** new `src/composables/useApi.js`, most views
**Concepts:** composables, returning reactive state, separation of concerns

Every view hand-rolls the same `loading` / `error` / `data` triple — and only `home.vue`
actually bothers to implement it. The three "find" views have **no loading state at all**,
so a slow request looks identical to an empty result.

**Done when:** at least the three find views and the dashboard use the shared composable,
and each shows a distinguishable loading state, error state, and empty state.

## R4 — Collapse the boilerplate in `api.js` into an interceptor

**Difficulty:** Intermediate
**Files:** `src/api/api.js`
**Concepts:** axios interceptors, cross-cutting concerns

About 200 of this file's 387 lines are a repeated
`try { ... } catch (error) { throw error }` wrapper that adds nothing. Replace it with a
single response interceptor. Combine with F5.

**Done when:** `api.js` is substantially shorter, no function contains a pass-through
`try/catch`, and all existing calls still behave identically.

## R5 — Rewrite the chart components with the Composition API

**Difficulty:** Intermediate
**Files:** `src/components/barChart.vue`, `src/components/donutZipChart.vue`
**Concepts:** `onMounted`, `onBeforeUnmount`, `watch`, third-party library lifecycle, memory leaks

The single best teaching case in this repo. Both components build a Chart.js instance in
`mounted()` and then:

- **never react to prop changes** — change the data and the chart is stale;
- **never call `chart.destroy()`** on unmount, leaking the canvas and its listeners;
- pointlessly `await` a constructor (`await new Chart(...)`).

**Done when:**
- Changing the chart data updates the rendered chart without a page reload.
- The Chart.js instance is destroyed on unmount (verify by navigating away and back
  repeatedly and watching for growth in the detached-node count).
- The meaningless `await` is gone.

Stretch goal: merge both files into one `<ChartCard :type>` component.

---

# Phase 3 — Component Extraction

## C1 — Extract a reusable `<DataTable>`

**Difficulty:** Intermediate
**Files:** new component, plus the four list views
**Concepts:** props, slots, `v-for` with dynamic columns

The four list tables are near-identical markup. The hover-highlight logic (`hoverId`) is
duplicated across five files.

**Done when:** one table component serves all four lists; hover and row-click behavior is
defined once; per-column rendering is customizable via slots.

## C2 — Extract a `<SearchBar>`

**Difficulty:** Intermediate
**Files:** new component, plus `findclient.vue`, `findevents.vue`, `findservice.vue`
**Concepts:** `defineEmits`, `v-model` on components, configuration via props

`findclient.vue`, `findevents.vue`, and `findservice.vue` are roughly 90% the same file
with different field names.

**Done when:** all three views use the shared component; each search still hits the
correct endpoint with the correct parameters; "Clear Search" still resets to the full list.

## C3 — Build a reusable confirmation modal

**Difficulty:** Intermediate
**Files:** new component, plus the three detail views
**Concepts:** `<Teleport>`, slots, focus management, promise-returning UI

**Deletes currently happen with no confirmation whatsoever.** Clicking delete on a client
fires the API call immediately — there is no `confirm()` anywhere in `src/`.

**Done when:**
- Deleting a client, event, or service requires explicit confirmation.
- Cancelling makes no API call.
- The modal traps focus and closes on `Escape`.

## C4 — Extract the nav sidebar out of `App.vue`

**Difficulty:** Beginner
**Files:** `src/App.vue`, new component
**Concepts:** component boundaries, keeping the root component thin

**Done when:** `App.vue` is layout-only; all nav links and their role-based visibility
live in a dedicated component; navigation behaves identically.

---

# Phase 4 — Security and Accessibility

## S1 — Role checks fail open

**Difficulty:** Intermediate
**Files:** `clientdetails.vue`, `eventDetails.vue`, `servicedetails.vue`
**Concepts:** allowlist vs denylist, defensive authorization

Every role check in the app is written as a **denylist**:

```html
:disabled="user.role === 'viewer'"
```

(`clientdetails.vue:161,168,224`, `eventDetails.vue:139,146`, `servicedetails.vue:65,73`)

Any role that is not literally the string `'viewer'` — a typo, a new `'guest'` role, an
empty string, `undefined` — silently gets **full edit rights**. Invert it to an allowlist:
permit only `'editor'`.

**Done when:** a user whose role is anything other than `editor` cannot edit; adding a new
role to the backend does not accidentally grant write access.

## S2 — The router does not enforce roles

**Difficulty:** Intermediate
**Files:** `src/router/index.js`
**Concepts:** navigation guards, route meta, defense in depth

The guard at `src/router/index.js:76-86` only checks `requiresAuth`. The nav *hides*
editor links from viewers, but a logged-in viewer who types `/clientform` in the address
bar gets the full editor form.

Add `meta: { requiresRole: 'editor' }` to the three form routes and enforce it in the guard.

**Done when:** a viewer navigating directly to `/clientform`, `/eventform`, or
`/serviceform` is redirected rather than shown the form.

> Discussion prompt: this fix still does not make the app secure. Why not? What stops a
> determined viewer from creating a client anyway? (Answer: nothing — the backend must
> check too. Client-side authorization is UX, not security.)

## S3 — Add a catch-all 404 route

**Difficulty:** Beginner
**Files:** `src/router/index.js`, new view
**Concepts:** route matching, wildcard routes

Unmatched paths currently render a blank page with no explanation.

**Done when:** an unknown URL renders a real "not found" page with a link home.

## A1 — Table rows are unusable without a mouse

**Difficulty:** Intermediate
**Files:** the four list views
**Concepts:** keyboard accessibility, semantic HTML, ARIA

Every list uses `<tr @click="...">` with no `tabindex`, no `role`, and no keyboard
handler. **The entire application is unnavigable without a pointing device.**

**Done when:** every row is reachable by Tab, activates on Enter, and shows a visible
focus indicator.

## A2 — Missing image alt text and a Windows-only asset path

**Difficulty:** Beginner
**Files:** `src/App.vue`
**Concepts:** alt text, cross-platform paths

`src/App.vue:8`:

```html
<img class="m-auto" src="@\assets\DanPersona.svg" />
```

Two problems: no `alt` attribute, and **backslashes** in the path — which will not resolve
on macOS or Linux. Several students will be on non-Windows machines.

**Done when:** the path uses forward slashes, the image has meaningful `alt` text, and the
logo renders on all three operating systems.

## A3 — Document language and form labels

**Difficulty:** Beginner
**Files:** `index.html`, the three find views
**Concepts:** screen reader basics, label association

`index.html:2` declares `<html lang="">` — empty. The `<select>` elements in the search
views have no associated label.

**Done when:** `lang="en"` is set and every form control has a programmatically
associated label.

## A4 — Run an accessibility audit and fix the top findings

**Difficulty:** Intermediate
**Files:** across `src/`
**Concepts:** automated auditing, prioritizing findings

Run Lighthouse or axe DevTools against every page. Record the score before and after.

**Done when:** the student submits before/after reports and a written summary of what they
fixed and what they deliberately deferred (with justification).

---

# Phase 5 — UX, Tooling, and Tests

## U1 — Pagination and sorting on list views

**Difficulty:** Intermediate
**Files:** `<DataTable>` (see C1), the four list views
**Concepts:** `computed`, derived state, slicing data

The client table renders **every** record with no paging, sorting, or result count.

**Done when:** lists paginate, column headers sort ascending/descending, and a result
count is displayed.

## U2 — Loading, empty, and error states everywhere

**Difficulty:** Beginner
**Files:** the three find views
**Concepts:** UI state machines

A failed search currently shows an empty table with no explanation — indistinguishable
from a search that legitimately returned nothing.

**Done when:** each list view visibly distinguishes *loading*, *no results*, and *request
failed*.

## U3 — Make the layout responsive

**Difficulty:** Intermediate
**Files:** `src/App.vue`, `src/index.css`
**Concepts:** Tailwind breakpoints, mobile-first design

The sidebar is a fixed `w-4/5` split with no breakpoints. The app is unusable on a phone.

**Done when:** the app is usable at 375px wide; the sidebar collapses behind a toggle on
small screens and all pages remain reachable.

## U4 — Fix the dashboard render race

**Difficulty:** Advanced
**Files:** `src/views/home.vue`
**Concepts:** initial reactive state, render timing

`loading` is initialized to `false`, so on first render the chart's `v-if` briefly passes
before data has arrived. It happens to work today because an outer `v-if` on
`recentEvents.length` masks it — but the state modeling is wrong.

**Done when:** the student can explain the original sequence and the state is modeled so
correctness does not depend on the outer guard.

## T1 — Clean up `package.json`

**Difficulty:** Beginner
**Files:** `package.json`
**Concepts:** dependency hygiene, dependencies vs devDependencies

Two real problems:
- `vuelidate@0.7.7` is the **Vue 2** library, installed alongside the correct
  `@vuelidate/core`. It is dead weight and actively confusing.
- `vite` and `@vitejs/plugin-vue` are in `dependencies` instead of `devDependencies`.

**Done when:** the dead dependency is removed, build tools are in `devDependencies`, and
`npm run build` still succeeds from a clean `node_modules`.

## T2 — Add a `.env.example`

**Difficulty:** Beginner
**Files:** new `.env.example`, `README.md`
**Concepts:** configuration, onboarding, not committing secrets

The README requires `VITE_ROOT_API`, but no example file exists — every student hits this
friction on day one.

**Done when:** a new student can clone, copy `.env.example` to `.env`, and run the app
without reading past the first section of the README.

## T3 — Make linting actually run

**Difficulty:** Beginner
**Files:** `package.json`
**Concepts:** tooling configuration, code style automation

An ESLint config is embedded in `package.json` but **there is no `lint` script**, so it
never runs.

**Done when:** `npm run lint` works and reports on the whole `src/` tree. Fixing every
resulting warning is a reasonable follow-up assignment on its own.

## T4 — Add a test suite

**Difficulty:** Advanced
**Files:** new test files, `package.json`, `vite.config.js`
**Concepts:** unit testing, mocking modules, component testing

There are currently **zero tests**.

Set up Vitest and Vue Test Utils. Suggested first targets:
- the `formatDate` utility from R2 (pure function, trivial to test)
- the `useApi` composable from R3
- `<SearchBar>` from C2 — assert it emits the right payload
- the router guard from S2 — assert a viewer is redirected

**Done when:** `npm test` runs green in CI, and the four areas above have meaningful
coverage.

> This is the most persuasive argument for Phase 2. Ask students to try writing a unit
> test against the *original* Options API code first, then against their refactored
> version. The difference is the lesson.

---

## Instructor notes

- **Phase 1 is deliberately unglamorous.** Every task requires reading code the student
  did not write and proving a hypothesis about why something is broken. That skill
  transfers further than any framework knowledge in this document.
- **F1, S1, and S2 together** make a strong single lesson on why client-side checks are
  never sufficient.
- **R5 is the best Composition API demonstration in the repo** — it needs mount, unmount,
  and watch, all in about forty lines, with a real memory leak as the motivation.
- The template contains no tests and no CI. Adding both (T4) is a natural capstone.
