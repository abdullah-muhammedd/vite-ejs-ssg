# **EJS-Vite Framework (With Taillwind)**

A strict-structure, component-driven static-site generator using EJS templates and Vite bundling, with predictable client-side state and automated page-/component-scaffolding.

---

## The Problem I’m Trying to Solve

When building multi-page sites by hand, it’s easy to end up with:

- Inconsistent folder layouts
- Components scattered or duplicated
- Fragile client-script wiring
- Unclear ownership of shared UI
- No enforcement of conventions until it’s too late

This framework provides:

- One-command scaffolding for pages and components
- A rigid, enforced directory convention
- Scoped components that prevent accidental reuse
- A singleton event-based store for shared state
- Automatic validation before every build

---

## Why Not React or Next.js (Just a critical thinking about a specific case)

Next.js is fundamentally a server framework; squeezing only SSG from it adds server-side complexity you don’t need when you only want static HTML.

React apps are single-page by default and rely on client-side rendering, which can hurt SEO and initial-load performance compared to fully pre-rendered pages.

This project delivers true static output with selective hydration—no server runtime, no SPA drawbacks, just plain HTML plus targeted interactivity.

The whole purpose of this is to fasten and control developer journey towards pure SSG because if you don't need a frameework now you may consider it for future cases but if you don't need a framework at all may be it is better o find another soluiion and it always better to strive for simplicity

## Philosophy

1. **Convention over Configuration**
   Folder and file names drive behavior, so you spend time writing code, not wiring it.

2. **Separation of Concerns**
   Pages, layouts, and design-system live in their own domains; no accidental cross-pollination.

3. **Static First, Dynamic When Needed**
   Pre-render everything server-side; hydrate only the components that need JS.

4. **Predictable State**
   Local state lives in components; global state flows through a simple singleton store.

5. **Design System at the Core**
   Shared UI pieces live under `design-system`, self-contained and dependency-free.

---

## Project Structure

- **src/pages/**
  Each page folder must contain only:
  - `<name>.controller.ts`
  - `<name>.view.ejs`
  - A `components/` subfolder
  - Optionally `<name>.client.ts` and `<name>.model.ts`

- **src/layout/**
  Same rules as pages, but for the global layout.

- **src/design-system/**
  Holds reusable components.
  Each component folder contains only its `.component.ejs` template.

- **src/lib/**
  Core utilities:
  - A base `Component` class
  - `GlobalStore` singleton
  - A simple template-engine wrapper

- **src/main.ts**
  Imports page and layout client scripts to hydrate on load.

---

## Core Rules (Enforced by Validation Script)

1. **Pages & Layouts**
   Must include exactly:
   - A controller (`.controller.ts`)
   - A view template (`.view.ejs`)
   - A `components/` directory
     May include a client script (`.client.ts`) and a model (`.model.ts`). No other files.

2. **Component Folders**
   Under any `components/` directory only subfolders are allowed.
   Each `<componentName>/` folder must contain exactly:
   - `<componentName>.client.ts`
   - `<componentName>.component.ejs`
     No extra files.

3. **No Page-to-Page Imports**
   Pages cannot import code from other pages.

4. **Scoped Components**
   Components under a page or layout may only be imported by that owner.
   If reused by more than one owner, it must live in `design-system/<componentName>/`.

5. **Design-System Isolation**
   Templates there cannot include or reference pages or layout templates.
   Scripts there cannot import from outside `design-system`.

6. **Automated Validation**
   Run the validation before building. Any rule violation prints `✗` and aborts. Success prints `✓ Structure validation passed`.

---

## CLI Commands

- **Generate a new page**
  `npm run gen:page home`

- **Generate a component in a page**
  `npm run gen:component -p home hero`

- **Generate a layout component**
  `npm run gen:component -l header`

- **Generate a design-system component**
  `npm run gen:component -s button`

- **Validate project structure**
  `npm run test:structure`

- **Build for production**
  `npm run build`

---

## Global Store (Shared State)

Use the singleton `GlobalStore` for cross-component state:

- Register a state key once, e.g. `cartCount`
- Update it from any component
- Subscribe to changes in any component

This avoids global variables and keeps state changes predictable and traceable.

---

## How to Use

- Scaffold pages and components with a single command.
- Write your UI in EJS templates and client logic in `.client.ts`.
- Keep shared UI in `design-system`.
- Hydrate only the parts you need.
- Share state via the `GlobalStore` singleton.
- Run validation to catch mistakes automatically.
- Build once; deploy static HTML anywhere.
