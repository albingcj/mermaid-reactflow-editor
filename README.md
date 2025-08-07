# Mermaid to React Flow Converter

Convert Mermaid diagrams from markdown files into interactive React Flow visualizations.

## Features

- Parse markdown files to extract Mermaid diagram code blocks
- Convert Mermaid flowcharts into React Flow nodes and edges
- Interactive UI with pan, zoom, and minimap
- Support for multiple diagrams in a single markdown file
- Real-time conversion from text input or file upload

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Usage

1. Run the development server with `npm run dev`
2. Open the application in your browser
3. Either:
   - Upload a markdown file containing Mermaid diagrams using the file picker
   - Paste markdown content directly into the text area
4. Select a diagram from the list (if multiple are found)
5. Interact with the generated React Flow diagram

## Example

An example markdown file (`example.md`) is included with various Mermaid diagram types.

## Supported Mermaid Diagram Types

Currently optimized for:
- Flowcharts (`graph` and `flowchart`)
- Other diagram types are detected but may have limited conversion support

## Technologies Used

- React
- React Flow
- Mermaid
- TypeScript
- Vite