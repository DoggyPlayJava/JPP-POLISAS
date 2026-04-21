# JPP-POLISAS System Architecture & Development Guidelines

Welcome to the JPP-POLISAS project! This document tells AI agents and human developers about the core technical architectural decisions made to keep this system blazing fast and reliable.

## 1. Global State Management (Zustand)

We have migrated heavy, universally-used states (like Notifications) away from standard React `Context API` to **Zustand**. This completely eliminates unnecessary deep component tree re-renders.

**How to use Zustand properly here:**
- The store is defined in `src/store/useNotificationStore.ts`.
- `NotificationContext.tsx` is now just a **headless component**. It lives in `App.tsx` solely to subscribe to Supabase Realtime and push payload data into the Zustand store. It no longer wraps Context Providers.
- **CRITICAL OBLIGATION FOR AI AGENTS:** When reading from Zustand, you MUST use atomic selectors to preserve performance. 
  - ❌ **DO NOT DO THIS:** `const { unreadCount } = useNotificationStore();` (This subscribes the component to ALL state changes).
  - ✅ **DO THIS:** `const unreadCount = useNotificationStore(state => state.unreadCount);` (This subscribes only to `unreadCount`, ensuring the component only re-renders when this specific primitive changes).

## 2. End-to-End (E2E) Testing (Playwright)

We use **Playwright**—not Cypress—to conduct end-to-end testing as it natively supports modern Vite projects and executes extraordinarily fast.

**How to use Playwright here:**
- The configuration is at `/playwright.config.ts`. It is configured to automatically launch the vite dev server (`npm run dev`) at `localhost:3000` when running tests.
- All test scripts are located inside the `/e2e/` folder.
- **CRITICAL OBLIGATION FOR AI AGENTS:** Before suggesting a massive UI or routing refactor is "safe", you are encouraged to write a playwright spec and execute it via the terminal.
  - Run the tests using: `npm run test:e2e`
  - Playwright is fully configured for headless CI execution environment.

## 3. Data Integrity & Types

- Supabase Database types are auto-generated.
- Avoid using `any` or `Record<string, unknown>`. Always import the canonical typescript interfaces from `src/types/database.types.ts` when making Supabase queries.
