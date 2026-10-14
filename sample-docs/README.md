---
title: Sample Documentation Root
author: FolioMD
tags: [sample-docs, markdown, graphs, figures]
---

# Sample Documentation Folder (`sample-docs`)

Welcome to the on-disk **`sample-docs`** folder! You can select this folder using **Open Local Folder** to test directory tree navigation, local caching, figures, graphs, and cross-file Markdown links.

## Linked Markdown Files in This Folder

- **[Figures, Mermaid Diagrams & Charts](./guides/figures-and-graphs.md)**
- **[Mathematics, Equations & Tables](./guides/math-and-tables.md)**
- **[Architecture Overview](./architecture/overview.md)**

---

## Architecture Figure

![FolioMD Rendering Pipeline](./assets/architecture-diagram.svg "Local SVG asset resolved from ./assets/architecture-diagram.svg")

---

## Live Mermaid Flowchart

```mermaid
flowchart LR
    Open["Select Local Folder"] --> Cache["IndexedDB Local Cache"]
    Cache --> Left["Left: Section Outline"]
    Cache --> Center["Center: PDF Sheet"]
    Cache --> Right["Right: VS Code Tree"]
```

---

## Code Highlighting & Contrast Check

Add the Header component JSX:

```js
function Header() {
  return (
    <header>
      <h2>App Header</h2>
    </header>
  );
}
```

Now add the header to the main App component:

```js
function App() {
  return (
    <div>
      <Header />
      <h1>Hello, React</h1>
    </div>
  );
}
```

