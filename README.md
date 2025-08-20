
# Mermaid to React Flow Editor

## Table of Contents
## Mermaid React Flow Editor

A small editor that converts Mermaid diagrams (from Markdown or pasted code) into interactive, editable React Flow diagrams. It provides import from Markdown, node/edge editing, basic alignment tools, exporting to PNG, and local persistence.

This README was updated to reflect the current implementation in the repository (scripts, features, components and known limitations).

## Quick links
- Source: this repository
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`

## Table of contents
- [Overview](#overview)
- [Features](#features)
- [Quick start](#quick-start)
- [Project layout](#project-layout)
- [Internals & behavior notes](#internals--behavior-notes)
- [Data model & APIs](#data-model--apis)
- [Exporting](#exporting)
- [Known limitations & notes](#known-limitations--notes)
- [Development notes](#development-notes)

<a id="overview"></a>
## Overview

The app reads Mermaid code blocks from Markdown or pasted text, converts the Mermaid AST into a React Flow node/edge graph, and renders an interactive canvas where nodes and edges can be edited. Diagrams can be saved to browser localStorage, reloaded, and exported to PNG images (exporting to images is still buggy in some cases — see Known limitations).

<a id="features"></a>
## Features (what the repo currently provides)
- Parse Mermaid code blocks from Markdown and detect diagram headings.
- Convert Mermaid flowcharts (and many node/edge forms) into React Flow nodes and edges.
- Support for Mermaid `subgraph` blocks; the converter preserves subgraph/group relationships.
- Interactive React Flow canvas: pan, zoom, selection, drag, double-click to edit nodes/edges.
- Custom node types: `custom` and `group` (see `src/components/CustomNode.tsx` and `SubgraphNode.tsx`).
- Editing toolbar with actions: align, distribute, duplicate, delete, lock/unlock, select subgraph contents, bring to front/send to back.
- Export current canvas bounding box to PNG using `html-to-image` (configurable pixelRatio). NOTE: exporting to images is still buggy in some scenarios (external images, bounding box calculation, and pixel ratio issues are common).
- Save/load diagrams to browser `localStorage` with basic metadata.
- Simple Mermaid SVG preview component with zoom/pan controls.

<a id="quick-start"></a>
## Quick start

Requirements: Node 18+ recommended.

1. Install dependencies

```powershell
npm install
```

2. Start dev server

```powershell
npm run dev
```

3. Open the URL printed by Vite (usually http://localhost:5173)

4. Upload a `.md` file or paste Mermaid code in the Input area. Select extracted diagrams and interact with the canvas.

Available scripts (from `package.json`):
- `dev` — start Vite dev server
- `build` — run `tsc` then `vite build`
- `preview` — preview the production build

<a id="project-layout"></a>
## Project layout (important files)

- `index.html` — application host page
- `src/main.tsx` — React entry
- `src/App.tsx` — main application UI and state orchestration
- `src/components/FlowDiagram.tsx` — wrapper around React Flow and most canvas behaviors
- `src/components/MermaidRenderer.tsx` — render Mermaid SVG with pan/zoom
- `src/components/CustomNode.tsx` — custom node renderer (used by node types)
- `src/components/SubgraphNode.tsx` — visual representation of a subgraph/group
- `src/components/EditingToolbar.tsx` — toolbar actions for selection
- `src/utils/mermaidParser.ts` — extracts Mermaid code blocks from Markdown and resolves headings
- `src/utils/mermaidToReactFlow.ts` — converts Mermaid code into React Flow nodes/edges, including subgraph parsing and a Dagre-based layout step
- `src/utils/exportImage.ts` — handles exporting the visible diagram to PNG using `html-to-image`
- `src/utils/diagramEditingUtils.ts` — alignment, distribution, duplicate, z-order, and lock/unlock helpers
- `src/utils/diagramStorage.ts` — localStorage persistence helpers (save/load/delete/export)

<a id="internals--behavior-notes"></a>
## Internals & behavior notes

Parsing
- `extractMermaidDiagrams(markdown)` finds triple-backtick Mermaid blocks and attempts to capture the nearest preceding Markdown heading as the diagram name.

Conversion
- `convertMermaidToReactFlow(code)` (exposed from `mermaidToReactFlow.ts`) does multi-pass parsing:
    - Pre-scans code for explicit node definitions to capture labels and shapes reliably.
    - Detects `subgraph` blocks (including nested subgraphs), keeps a subgraph stack, and assigns nodes to groups.
    - Parses edges, labels, and supports common Mermaid node shapes.
    - Uses Dagre for layout and returns `ReactFlowData` ({ nodes, edges }).

Canvas & editing
- The React Flow canvas supports selection, multi-select, node dragging, edge creation (with Ctrl/Cmd), and double-click to edit edge labels.
- Editing toolbar actions operate on the current selection and update parent state via callbacks.

<a id="exporting"></a>
Exporting
- Export uses `html-to-image.toPng(wrapper, { pixelRatio })` and attempts to compute a tight bounding box around nodes. The exporter temporarily resizes the wrapper and sets the viewport so the bounding box maps to (0,0) when rasterizing.

> ⚠️ Note about image exporting (important): exporting to PNG is currently known to be buggy in several cases. Common issues include missing external images (CORS), incorrect bounding box or empty margins, unexpected scaling when using high pixel ratios, and occasional blank outputs for complex diagrams. Use exporting for simple diagrams or as a convenience — for reliable high-quality exports consider rendering SVG from Mermaid directly or using a headless renderer.

<a id="data-model--apis"></a>
Data model (runtime)
- MermaidDiagram: { type, code, name, position }
- ReactFlowData: { nodes: Node[], edges: Edge[] }
- SavedDiagram: { id, name, nodes, edges, originalMermaidCode, createdAt, updatedAt, metadata }

<a id="known-limitations--notes"></a>
## Known limitations & important notes

- Mermaid support: The converter implements a robust parser for common flowchart node syntaxes and subgraphs, but not every Mermaid feature is fully supported (sequence diagrams, gantt, class diagrams may not convert to React Flow accurately).
- Exporting to images (PNG) is buggy: If nodes reference external image URLs, they may not appear in exported PNGs due to cross-origin or html-to-image limitations. Other common problems are incorrect bounding boxes, unexpected scaling, or blank/partial images for complex layouts.
- Layout/alignment: Alignment and distribution helpers perform arithmetic on node positions. For complex diagrams (many nested subgraphs), minor manual adjustments are commonly required.
- Performance: Very large diagrams (hundreds of nodes) may be slow to layout in the browser. Dagre layout is synchronous and can block the main thread for complex graphs.
- Security: `MermaidRenderer` initializes mermaid with `securityLevel: 'loose'` to allow a broader set of diagrams; be cautious if you paste untrusted content.

<a id="development-notes"></a>
## Development notes and tips

- TypeScript: The repo is TypeScript-based. Some components include `// @ts-nocheck` when the code intentionally accepts flexible types.
- React Flow: Node `width`/`height` can come from the renderer or be approximated; the exporter uses defaults when values are missing.
- Debugging: `mermaidToReactFlow.ts` currently has a `DEBUG` flag — set to `false` to silence converter logs.
- Keyboard shortcuts implemented in the app:
    - Ctrl/Cmd+S — save current diagram (when nodes exist)
    - Ctrl/Cmd+F — open node search
    - Ctrl/Cmd +/- — zoom in/out in the Mermaid preview component

## How to contribute

- Open an issue describing the feature or bug.
- For code changes: fork, create a topic branch, update code, run `npm run build` and open a pull request.

## Dependencies (high level)

- React 19
- React Flow (v11)
- Mermaid (v11)
- Dagre (layout)
- html-to-image (export)
- Vite + TypeScript + Bootstrap for dev and styling

Exact dependencies and versions are in `package.json`.


