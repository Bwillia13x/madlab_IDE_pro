# MAD LAB IDE: MVP Development Roadmap

This document outlines the work required to bring the MAD LAB IDE to a Minimum Viable Product (MVP) state. The goal of the MVP is to provide a stable, usable, and valuable tool for performing basic financial analysis.

## MVP Definition

The MAD LAB IDE MVP will allow users to:

*   Create and manage multiple analysis sheets.
*   Add, arrange, and configure a core set of financial analysis widgets (KPI, Chart, Table).
*   Load data into widgets from static sources (CSV, JSON).
*   Persist their workspace layout and widget configurations.
*   Interact with a polished, VS Code-inspired interface.

---

## MVP Roadmap

### Phase 1: Core UI & Layout Hardening (1-2 weeks)

**Objective:** Solidify the core user interface, ensuring a consistent and polished look and feel.

**Work Items:**

1.  **Theme and Styling:**
    *   Extract all colors, spacing, and typography into a tokenized theme (`lib/tokens.ts` and `tailwind.config.ts`).
    *   Implement a robust light/dark mode theme system.
    *   Consolidate all UI components under `/components/ui` and replace ad-hoc styles with a consistent system.

2.  **Layout Polish:**
    *   Improve the resize handles for all panes (larger hit-target, keyboard support, focus rings).
    *   Enhance the status bar with a (mocked) connection indicator and quick toggles for editor settings.

3.  **Accessibility:**
    *   Ensure all interactive elements have proper ARIA roles and attributes.
    *   Implement comprehensive keyboard navigation and visible focus states.

### Phase 2: Widget SDK & Core Widgets (2-3 weeks)

**Objective:** Build a flexible and extensible widget system and implement the core set of widgets required for basic financial analysis.

**Work Items:**

1.  **Widget SDK:**
    *   Define the widget schema (`WidgetMeta` and `WidgetRuntime`).
    *   Implement a widget registry (`registerWidget` function).
    *   Create a property editor that automatically generates a configuration form based on a widget's schema.

2.  **Core Widgets:**
    *   **`BlankTile`:** A basic, empty widget to act as a placeholder.
    *   **`Markdown`:** A simple widget for adding notes and commentary.
    *   **`ChartLite`:** A lightweight charting widget (line and bar) with basic interactivity.
    *   **`Table`:** A virtualized table widget with sorting and CSV import capabilities.
    *   **`KPI`:** A key performance indicator widget with value, delta, and an inline sparkline.

### Phase 3: Data Integration (1-2 weeks)

**Objective:** Decouple widgets from data sources and implement basic data loading capabilities.

**Work Items:**

1.  **Data Source Abstraction:**
    *   Define a `DataSource` interface with a `query` method.
    *   Implement initial data source providers: `StaticJSON`, `CSV`, and `FetchREST`.

2.  **Data Caching:**
    *   Implement a simple in-memory and `localStorage` caching layer for data sources.

3.  **Widget Data Binding:**
    *   Allow widgets to declare a `dataRef` that can be bound to a data source in the property editor.

### Phase 4: State Management & Persistence (1-2 weeks)

**Objective:** Implement robust workspace persistence to ensure users don't lose their work.

**Work Items:**

1.  **Workspace Export/Import:**
    *   Implement a feature to export the entire workspace to a compact JSON file.
    *   Implement a feature to import a workspace from a JSON file.

2.  **URL-based Sharing:**
    *   Implement a feature to encode the workspace state into a URL for easy sharing of small demos.

3.  **State Migration:**
    *   Implement a basic state migration system to handle changes to the workspace state shape over time.

### Phase 5: Polishing & MVP Release (1 week)

**Objective:** Prepare the application for its initial release by focusing on documentation, testing, and final polish.

**Work Items:**

1.  **Testing:**
    *   Increase unit test coverage for all core libraries and components.
    *   Write end-to-end tests for the core user flows (creating a sheet, adding widgets, configuring widgets, loading data, saving/loading a workspace).

2.  **Documentation:**
    *   Write user-facing documentation for all core features.
    *   Create a "Getting Started" guide for new users.

3.  **Final Polish:**
    *   Perform a final round of bug fixing and UI polish.
    *   Create a polished demo workspace to showcase the application's capabilities.

---

## Agentic Prompts for MVP Development

This section contains a series of prompts designed to be executed by an agentic programmer to complete the MVP roadmap. The prompts are broken down into batches that should be completed sequentially.

### Batch 1: Core UI & Layout

**Prompt:**

"As a senior frontend engineer, your task is to harden the core UI and layout of the MAD LAB IDE.

**Phase 1: Theme and Styling**

1.  **Tokenize the Design System:**
    *   Read the contents of `tailwind.config.ts` and `app/globals.css`.
    *   Create a new file `lib/tokens.ts` to define all color, spacing, and typography tokens.
    *   Update `tailwind.config.ts` to use the tokens from `lib/tokens.ts`.
    *   Refactor all components in `/components` to use the new Tailwind theme aliases instead of hardcoded values.

2.  **Implement Light/Dark Mode:**
    *   Use the `next-themes` library to implement a robust light/dark mode switcher.
    *   Ensure that all components are correctly styled in both modes.

**Phase 2: Layout Polish**

1.  **Improve Pane Resizing:**
    *   Analyze the implementation of the resizable panes.
    *   Increase the size of the resize handles and add visual feedback on hover.
    *   Implement keyboard shortcuts for resizing panes.

2.  **Enhance the Status Bar:**
    *   Add a (mocked) connection status indicator to the status bar.
    *   Add toggle buttons for common editor settings like word wrap and whitespace rendering.

**Phase 3: Accessibility**

1.  **Perform an Accessibility Audit:**
    *   Use browser developer tools and accessibility testing libraries to identify and fix accessibility issues.
    *   Ensure all interactive elements have the correct ARIA roles and attributes.
    *   Verify that the application is fully navigable using only the keyboard."

### Batch 2: Widget SDK & Core Widgets

**Prompt:**

"As a senior software engineer, your next task is to build the Widget SDK and the core set of widgets for the MAD LAB IDE.

**Phase 1: Widget SDK**

1.  **Define Widget Schemas:**
    *   Create a new file `lib/widgets/schema.ts` to define the `WidgetMeta` and `WidgetRuntime` interfaces using Zod for schema validation.

2.  **Implement the Widget Registry:**
    *   Create a new file `lib/widgets/registry.ts` to implement the `registerWidget` function and a central widget registry.

3.  **Build the Property Editor:**
    *   Create a new component `components/inspector/PropertyEditor.tsx`.
    *   This component should take a widget's Zod schema and automatically generate a configuration form.

**Phase 2: Core Widgets**

1.  **Implement Core Widgets:**
    *   Create the following new widgets in the `/components/widgets` directory, ensuring they all conform to the Widget SDK:
        *   `BlankTile.tsx`
        *   `Markdown.tsx`
        *   `ChartLite.tsx` (using `recharts`)
        *   `Table.tsx` (using a lightweight virtualization library)
        *   `KPI.tsx`"

### Batch 3: Data Integration

**Prompt:**

"As a senior software engineer, your task is to implement the data integration layer for the MAD LAB IDE.

**Phase 1: Data Source Abstraction**

1.  **Define the DataSource Interface:**
    *   Create a new file `lib/data/source.ts` to define the `DataSource` interface and the `DataFrame` type.

2.  **Implement Data Source Providers:**
    *   Create the following data source providers in the `/lib/data/providers` directory:
        *   `StaticJSONProvider.ts`
        *   `CSVProvider.ts`
        *   `FetchRESTProvider.ts`

**Phase 2: Data Caching**

1.  **Implement a Caching Layer:**
    *   Create a new file `lib/data/cache.ts` to implement a simple in-memory and `localStorage` caching solution for data sources.

**Phase 3: Widget Data Binding**

1.  **Update the Property Editor:**
    *   Modify the `PropertyEditor.tsx` component to allow users to select a data source and bind it to a widget's `dataRef` property."

### Batch 4: State Management & Persistence

**Prompt:**

"As a senior software engineer, your task is to implement robust state management and persistence for the MAD LAB IDE.

**Phase 1: Workspace Export/Import**

1.  **Implement Workspace Export:**
    *   Add a new command to the command palette to export the current workspace to a JSON file.

2.  **Implement Workspace Import:**
    *   Add a new command to the command palette to import a workspace from a JSON file.

**Phase 2: URL-based Sharing**

1.  **Implement URL Sharing:**
    *   Add a new command to the command palette to generate a shareable URL that encodes the current workspace state.

**Phase 3: State Migration**

1.  **Implement a Migration System:**
    *   Modify the `zustand` store to include a version number and a migration function to handle state shape changes between versions."

### Batch 5: Polishing & MVP Release

**Prompt:**

"As a senior software engineer, your final task is to prepare the MAD LAB IDE for its MVP release.

**Phase 1: Testing**

1.  **Increase Test Coverage:**
    *   Write unit tests for all new services and components, aiming for at least 80% coverage.
    *   Write end-to-end tests for the core user flows using Playwright.

**Phase 2: Documentation**

1.  **Write User Documentation:**
    *   Create a new `/docs/user-guide` directory and add Markdown files explaining how to use the application.

**Phase 3: Final Polish**

1.  **Create a Demo Workspace:**
    *   Create a polished demo workspace that showcases the application's features and save it as a JSON file.

2.  **Perform a Final Review:**
    *   Conduct a final review of the application, fixing any remaining bugs and polishing the UI."
