
# Mermaid to React Flow Editor

## Table of Contents
## Mermaid React Flow Editor

 A small editor that converts Mermaid diagrams (from the built-in code editor) into interactive, editable React Flow diagrams.


## Quick links
- Source: this repository
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`

## Table of contents
- [Overview](#overview)
- [Features](#features)
- [Demo](#demo)
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

<a id="demo"></a>
## Demo

- examples/demo.mp4

<a id="quick-start"></a>
## Quick start

Requirements: Node 18+ recommended.

1. Install dependencies

```powershell
npm install
```

2. Start dev server
 The app reads Mermaid code blocks from the built-in code editor, converts the Mermaid AST into a React Flow node/edge graph, and renders an interactive canvas where nodes and edges can be edited. 
```powershell
npm run dev
```

3. Open the URL printed by Vite (usually http://localhost:5173)

4. Upload a `.md` file or paste Mermaid code in the Input area. Select extracted diagrams and interact with the canvas.
## Mermaid React Flow Editor

A minimal, code-first editor that converts Mermaid diagram source (entered in the built-in editor) into an interactive React Flow canvas that you can pan, zoom, edit, and export.

This README has been updated to reflect the repository contents on the current branch. It omits previously removed features such as Markdown import flows and focuses on the code-first workflow: paste or type Mermaid code in the editor and the app converts it to editable React Flow nodes and edges.

## Table of contents
- [Overview](#overview)
- [Features](#features)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Project layout](#project-layout)
- [Internals & behavior notes](#internals--behavior-notes)
- [Exporting & limitations](#exporting--limitations)
- [Development](#development)
- [How to contribute](#how-to-contribute)
- [Dependencies (from package.json)](#dependencies-from-packagejson)

## Overview

This project provides a small React + TypeScript application that:

- Accepts Mermaid diagram source in a left-side editor (the editor is the single source of truth).
- Parses the Mermaid code and converts supported elements into a React Flow graph (nodes, edges, groups/subgraphs).
- Renders an interactive React Flow canvas where nodes and edges can be repositioned, edited, or deleted.
- Provides utilities to save diagrams to browser storage, and to export the canvas to raster images (PNG).

Note: some features present in other branches (Markdown file import, multiple-editor workflows) were removed on this branch; the README reflects the current simplified workflow.

## Features

- Code-first Mermaid editor (paste/type Mermaid source).
- Conversion of common Mermaid flowchart constructs (nodes, edges, labels, subgraphs) into React Flow nodes/edges.
- Support for subgraph grouping (mapped to React Flow group or custom nodes).
- Interactive canvas: pan, zoom, drag, multi-select, and basic editing actions.
- Custom node renderers for enhanced visuals (see `src/components/CustomNode.tsx`).
- Editing toolbar with common actions (align, distribute, duplicate, lock/unlock, z-order).
- Export to PNG via `html-to-image` (best-effort; see limitations below).
- Local browser persistence helpers (save/load) — check `src/utils/diagramStorage.ts` for behavior.
- An LLM-based Mermaid generator component exists (`src/components/GeminiMermaidGenerator.tsx`) that streams Mermaid source from LLMs (uses LLM.js / optional Google Gemini helper).

- AI integrations & streaming rendering: the project includes an LLM-driven generator component that can stream Mermaid source incrementally into the editor and preview, enabling progressive rendering as the model emits tokens. The streaming implementation handles common streaming formats (async iterables, ReadableStream, and SSE-like payloads), sanitizes and extracts Mermaid code from partial output, and supports an optional Google Gemini streaming helper (`src/utils/geminiStream.ts`). See the dedicated section below for details.

## Quick start

Prerequisites: Node 18+ recommended, npm (or compatible client).

1. Install dependencies

```powershell
npm install
```

2. Start the dev server (Vite)

```powershell
npm run dev
```

3. Open the URL printed by Vite (typically http://localhost:5173)

4. Paste or type Mermaid code in the left-hand editor and interact with the canvas on the right.

## Scripts

These scripts are defined in `package.json`:

- `dev` — start Vite dev server
- `build` — typecheck (tsc) and build the Vite production bundle
- `preview` — preview the production build locally
- `test` — run unit tests with Vitest (if tests are present)

Run them with `npm run <script>`.

## Project layout (important files)

- `index.html` — application host
- `src/main.tsx` — React entry point
- `src/App.tsx` — main application UI and state orchestration
- `src/components/FlowDiagram.tsx` — React Flow wrapper and canvas logic
- `src/components/MermaidEditor.tsx` — the code editor where you enter Mermaid source
- `src/components/MermaidRenderer.tsx` — simple Mermaid SVG preview and controls
- `src/components/CustomNode.tsx` — a custom node renderer
- `src/components/SubgraphNode.tsx` — visual representation for subgraph/group nodes
- `src/components/GeminiMermaidGenerator.tsx` — streaming LLM Mermaid generator UI and logic
 - `src/utils/geminiStream.ts` — optional Google Gemini streaming helper used by the Gemini generator
- `src/utils/mermaidToReactFlow.ts` — core conversion logic from Mermaid text to React Flow data
- `src/utils/mermaidParser.ts` — helper parsing utilities (if present)
- `src/utils/exportImage.ts` — image export helper using `html-to-image`
- `src/utils/diagramStorage.ts` — localStorage persistence helpers
- `src/utils/diagramEditingUtils.ts` — alignment/duplication/z-order helpers
- `tsconfig.json`, `vite.config.ts`, `package.json` — build & tooling configs

## Internals & behavior notes

- The app uses a code-first workflow: the editor content is the single source of truth. When the editor content changes, the conversion pipeline parses Mermaid source and produces a React Flow graph.
- The converter focuses on flowchart-style Mermaid diagrams and common node syntaxes. Features such as sequence diagrams, gantt charts, or class diagrams are not guaranteed to convert into meaningful React Flow graphs.
- Grouping/subgraph support attempts to preserve nested structures by mapping them to React Flow groups or custom container nodes.
- Layout uses Dagre for automatic initial placement when possible; manual adjustments are supported via the canvas.

Streaming & progressive rendering (AI integration)

- The `GeminiMermaidGenerator` component (and its utils) implement streaming-friendly logic so Mermaid source can be displayed and converted as chunks arrive from an LLM. Key behaviors:
    - Supports multiple streaming formats: async iterators (token streams), ReadableStream bodies, and SSE-like `data:` payloads.
    - Uses a streaming parser that detects fenced Mermaid blocks (```mermaid ... ```), raw mermaid starts (e.g., `graph TD`), and accumulates partial text until a complete diagram is available.
    - Performs post-processing and sanitization on the final extracted Mermaid text: quotes problematic labels, enforces a single-diagram output, and strips surrounding prose or extra fences.
    - The UI receives partial chunks via callbacks so the editor or preview can render progressively while the model continues to stream.

This streaming approach improves latency and user feedback when generating large diagrams from an LLM — users see the diagram build up in real time rather than waiting for a full response.

Edge cases and notes:
- If node labels contain punctuation that could break Mermaid parsing (parentheses, quotes, commas), the generator and sanitizer aim to quote or escape labels. However, complex edge cases may still require manual fixes.
- Very large diagrams may be slow to layout in the browser. Consider simplifying diagrams or running batch layout offline for very large graphs.

## Exporting & limitations

- Export to PNG uses `html-to-image` to rasterize the React Flow wrapper. This is best-effort and known to have limitations:
    - External images may be missing due to CORS restrictions.
    - Bounding-box calculations can be imperfect for complex nested layouts.
    - High pixelRatio renders may produce increased memory usage or blank images for very large canvases.

If you need deterministic, high-quality SVG or image exports for production, consider rendering Mermaid to SVG server-side or using an offscreen/headless renderer.

## Development

- TypeScript, React, and Vite are used for development. The project compiles with `tsc` and builds with Vite.
- Run unit tests (if any) with Vitest:

```powershell
npm run test
```

- Linting or formatting is not enforced by default in the repository (check for local configs if you want to add them).

Developer tips:
- `src/utils/mermaidToReactFlow.ts` is the key conversion module — start there when changing how Mermaid constructs are mapped to React Flow.
- `src/components/GeminiMermaidGenerator.tsx` streams LLM output and includes sanitizers and parsers to extract Mermaid code from streamed responses — useful if you want to integrate other streaming LLM providers.

## How to contribute

- Open an issue describing the bug or feature.
- Fork the repository and create a branch for your change.
- Make changes, run `npm run build` and any tests, then open a pull request with a clear description of the change.

## Dependencies (from package.json)

The project declares dependencies in `package.json`. Key runtime dependencies present on this branch include:

- react: ^19.1.0
- react-dom: ^19.1.0
- reactflow: ^11.11.4
- mermaid: ^11.9.0
- dagre: ^0.8.5
- html-to-image: ^1.11.13
- @monaco-editor/react — embedded code editor
- bootstrap — UI styles
- LLM/streaming helpers: `@themaximalist/llm.js` and optional `@google/generative-ai` (used by the Gemini generator component)

For exact versions see `package.json` in the repository root.


