/**
 * FolioMD — Built-in Rich Sample Workspace & Standalone File
 * Demonstrates:
 * - Multi-folder hierarchy (like VS Code Explorer)
 * - Cross-file Markdown links (relative ./, ../, subfolder.md#anchor, and [[wiki-links]])
 * - Advanced Markdown: Mermaid graphs, Interactive Chart.js graphs, Figures with captions,
 *   local relative SVG images, KaTeX math equations, GitHub Alerts/Callouts, GFM Tables, Footnotes.
 */
(function (global) {
  // Crisp dark-mode SVG illustrations stored as Data URLs to simulate local image assets in the folder
  const PIPELINE_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 260" fill="none">
  <rect width="820" height="260" rx="14" fill="#0d111a"/>
  <rect x="1" y="1" width="818" height="258" rx="13" stroke="#242e42" stroke-width="2"/>
  <g font-family="Inter, system-ui, sans-serif">
    <!-- Node 1 -->
    <rect x="36" y="75" width="150" height="110" rx="12" fill="#151c2c" stroke="#6366f1" stroke-width="2"/>
    <text x="111" y="118" fill="#a5b4fc" font-size="12" font-weight="700" text-anchor="middle">LOCAL SOURCE</text>
    <text x="111" y="142" fill="#eef2f9" font-size="14" font-weight="600" text-anchor="middle">Folder / .md File</text>
    <text x="111" y="164" fill="#687590" font-size="11" text-anchor="middle">File System API</text>

    <!-- Arrow 1 -->
    <path d="M194 130 H242" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="4 4"/>
    <polygon points="242,125 252,130 242,135" fill="#6366f1"/>

    <!-- Node 2 -->
    <rect x="258" y="75" width="150" height="110" rx="12" fill="#151c2c" stroke="#8b5cf6" stroke-width="2"/>
    <text x="333" y="118" fill="#c4b5fd" font-size="12" font-weight="700" text-anchor="middle">INDEXED-DB</text>
    <text x="333" y="142" fill="#eef2f9" font-size="14" font-weight="600" text-anchor="middle">Local Cache</text>
    <text x="333" y="164" fill="#687590" font-size="11" text-anchor="middle">Instant Offline Load</text>

    <!-- Arrow 2 -->
    <path d="M416 130 H464" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="4 4"/>
    <polygon points="464,125 474,130 464,135" fill="#8b5cf6"/>

    <!-- Node 3 -->
    <rect x="480" y="75" width="145" height="110" rx="12" fill="#151c2c" stroke="#38bdf8" stroke-width="2"/>
    <text x="552" y="118" fill="#7dd3fc" font-size="12" font-weight="700" text-anchor="middle">AST ENGINE</text>
    <text x="552" y="142" fill="#eef2f9" font-size="14" font-weight="600" text-anchor="middle">Mermaid + KaTeX</text>
    <text x="552" y="164" fill="#687590" font-size="11" text-anchor="middle">Figures &amp; Charts</text>

    <!-- Arrow 3 -->
    <path d="M633 130 H665" stroke="#10b981" stroke-width="2.5"/>
    <polygon points="665,125 675,130 665,135" fill="#10b981"/>

    <!-- Node 4 -->
    <rect x="680" y="75" width="110" height="110" rx="12" fill="#151c2c" stroke="#10b981" stroke-width="2"/>
    <text x="735" y="118" fill="#6ee7b7" font-size="12" font-weight="700" text-anchor="middle">VIEWER</text>
    <text x="735" y="142" fill="#eef2f9" font-size="14" font-weight="600" text-anchor="middle">PDF Sheet</text>
    <text x="735" y="164" fill="#687590" font-size="11" text-anchor="middle">Outline + Tree</text>
  </g>
</svg>`);

  const TOPOLOGY_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 280" fill="none">
  <rect width="760" height="280" rx="14" fill="#0d111a"/>
  <rect x="1" y="1" width="758" height="278" rx="13" stroke="#242e42" stroke-width="2"/>
  <!-- Connecting Lines -->
  <g stroke="#334155" stroke-width="1.6">
    <line x1="150" y1="70" x2="370" y2="55"/>
    <line x1="150" y1="70" x2="370" y2="140"/>
    <line x1="150" y1="70" x2="370" y2="225"/>
    <line x1="150" y1="140" x2="370" y2="55"/>
    <line x1="150" y1="140" x2="370" y2="140"/>
    <line x1="150" y1="140" x2="370" y2="225"/>
    <line x1="150" y1="210" x2="370" y2="55"/>
    <line x1="150" y1="210" x2="370" y2="140"/>
    <line x1="150" y1="210" x2="370" y2="225"/>
    <line x1="370" y1="55" x2="600" y2="100"/>
    <line x1="370" y1="55" x2="600" y2="180"/>
    <line x1="370" y1="140" x2="600" y2="100"/>
    <line x1="370" y1="140" x2="600" y2="180"/>
    <line x1="370" y1="225" x2="600" y2="100"/>
    <line x1="370" y1="225" x2="600" y2="180"/>
  </g>
  <!-- Input Layer -->
  <circle cx="150" cy="70" r="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="2.5"/>
  <circle cx="150" cy="140" r="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="2.5"/>
  <circle cx="150" cy="210" r="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="2.5"/>
  <!-- Hidden Layer -->
  <circle cx="370" cy="55" r="22" fill="#0f2942" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="370" cy="140" r="22" fill="#0f2942" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="370" cy="225" r="22" fill="#0f2942" stroke="#38bdf8" stroke-width="2.5"/>
  <!-- Output Layer -->
  <circle cx="600" cy="100" r="22" fill="#062e22" stroke="#10b981" stroke-width="2.5"/>
  <circle cx="600" cy="180" r="22" fill="#062e22" stroke="#10b981" stroke-width="2.5"/>
  <!-- Labels -->
  <g font-family="JetBrains Mono, monospace" font-size="11" fill="#94a3b8" text-anchor="middle">
    <text x="150" y="258">Markdown Tokens</text>
    <text x="370" y="264">AST Graph Nodes</text>
    <text x="600" y="258">PDF Sheet Layout</text>
  </g>
</svg>`);

  const SAMPLE_FILES = {
    'README.md': {
      path: 'README.md',
      name: 'README.md',
      kind: 'markdown',
      size: 4680,
      content: `---
title: FolioMD Handbook & Feature Showcase
author: FolioMD Engineering
version: 2.4.0
tags: [markdown, pdf-viewer, mermaid, charts, katex]
---

# FolioMD — PDF-Style Markdown Viewer

Welcome to **FolioMD**, a clean, dark-themed Markdown document and folder viewer crafted with the precision of a modern PDF reader and the navigation power of VS Code.

> [!TIP]
> **Try Cross-File Link Navigation!** Click any internal Markdown badge link below to open that file in the viewer, then use the **Back (\`←\`)** and **Forward (\`→\`)** buttons in the top-left toolbar (or press <kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>Alt</kbd> + <kbd>→</kbd>).

## Quick Navigation Directory

Explore the linked documents inside this workspace folder:

1. **[Figures, Diagrams & Interactive Graphs](./guides/figures-and-graphs.md)** — See Mermaid flowcharts, sequence diagrams, interactive Chart.js graphs, and captioned figures.
2. **[System Architecture & Cache Design](./architecture/system-design.md)** — How local IndexedDB caching and virtual folder trees work.
3. **[Mathematics, Tables & Callouts](./guides/math-and-tables.md)** — KaTeX equations, GFM data tables, footnotes, and GitHub alerts.
4. **[Link Router & Navigation Spec](./api/navigation-spec.md#history-stack-engine)** — Jump directly to the \`#history-stack-engine\` section inside \`api/navigation-spec.md\`.

---

## Core Architecture Overview

FolioMD organizes your reading workspace into three focused zones:

- **Left Sidebar — Sectional Navigator**: Live hierarchical Table of Contents (\`H1\`–\`H6\`) with scroll-spy highlighting plus a dedicated **Figures & Graphs** index tab.
- **Center Canvas — PDF Document Sheet**: Elevated dark sheet with zoom controls (\`50%\`–\`200%\`), page width modes (\`Page View\`, \`Wide\`, \`Full\`), typography switcher, and in-page search.
- **Right Sidebar — VS Code File Explorer**: Full collapsible folder tree with file filter, asset viewer, and quick cached workspace switching.

![FolioMD Rendering Pipeline](./assets/pipeline-diagram.svg "End-to-end local folder ingestion, IndexedDB caching, and PDF-sheet rendering pipeline")

---

## Live Workflow Diagram (Mermaid)

Below is a live **Mermaid flowchart** rendered directly from a fenced \`\`\`mermaid\`\`\` block. Click the diagram or use its toolbar to zoom and inspect:

\`\`\`mermaid
flowchart LR
    A["Select Local Folder / .md File"] --> B{"Cached in IndexedDB?"}
    B -- "Yes (Instant)" --> C["Load Virtual File Tree"]
    B -- "New / Updated" --> D["Read Files & Assets"]
    D --> E["Persist to Local Cache"]
    E --> C
    C --> F["Render PDF Sheet + Left Outline + Right File Tree"]
    F --> G["Click Linked .md File"]
    G --> H["Push to Back / Forward History Stack"]
\`\`\`

---

## Performance & Cache Latency Graph

FolioMD also supports interactive data charts via \`\`\`chart\`\`\` blocks:

\`\`\`chart
{
  "type": "bar",
  "title": "Workspace Load Time: Cold Disk Read vs. FolioMD Local Cache (ms)",
  "caption": "Benchmark across a 50-file Markdown documentation repository (lower is faster).",
  "labels": ["Initial Folder Parse", "Cached Folder Re-open", "Cross-File Link Jump", "Section Outline Sync"],
  "datasets": [
    {
      "label": "Cold File Read (ms)",
      "data": [185, 160, 48, 18],
      "backgroundColor": "rgba(99, 102, 241, 0.65)",
      "borderColor": "#818cf8"
    },
    {
      "label": "FolioMD Local Cache (ms)",
      "data": [18, 6, 3, 2],
      "backgroundColor": "rgba(16, 185, 129, 0.65)",
      "borderColor": "#34d399"
    }
  ]
}
\`\`\`

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>←</kbd> | Navigate **Back** in file/anchor history | Viewer |
| <kbd>Alt</kbd> + <kbd>→</kbd> | Navigate **Forward** in file/anchor history | Viewer |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Quick Open any file in workspace | Global |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Find text inside current Markdown document | Viewer |
| <kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>-</kbd> | Zoom PDF Document Sheet In / Out | Viewer |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | Reset Document Zoom to \`100%\` | Viewer |

> [!NOTE]
> Ready to see advanced visual components? Continue to **[Figures, Diagrams & Interactive Graphs](./guides/figures-and-graphs.md)**!
`
    },

    'guides/figures-and-graphs.md': {
      path: 'guides/figures-and-graphs.md',
      name: 'figures-and-graphs.md',
      kind: 'markdown',
      size: 4120,
      content: `---
title: Figures, Diagrams & Interactive Graphs
category: Visual Components
updated: 2026-10-04
tags: [figures, mermaid, charts, svg]
---

# Figures, Diagrams & Interactive Graphs

← Back to **[README.md](../README.md)** | Next: **[Mathematics & Tables](./math-and-tables.md)**

FolioMD treats visual elements as first-class citizens, numbering and indexing every **Figure**, **Mermaid Diagram**, **Interactive Chart**, and **Data Table** in the Left Sidebar under the **FIGURES** tab.

---

## 1. High-DPI Figures with Captions

Any standard Markdown image \`![Alt Caption](path "Optional Title")\` or HTML \`<figure>\` is automatically framed in a dark inspection card with fullscreen lightbox zoom and relative path resolution from your local folder:

![Neural AST Document Topology](../assets/neural-topology.svg "Multi-layer token-to-layout transformation graph resolved via relative path ../assets/neural-topology.svg")

> [!IMPORTANT]
> Click directly on any figure image or Mermaid diagram to open the **Fullscreen Lightbox Inspector** with dedicated zoom controls.

---

## 2. Sequence & State Diagrams

### Cross-File Navigation Sequence

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Sheet as PDF Document Sheet
    participant Router as Link & History Router
    participant Cache as Local IndexedDB Cache
    participant UI as Left Outline & Right Tree

    User->>Sheet: Clicks [system-design.md](../architecture/system-design.md)
    Sheet->>Router: Intercepts relative .md link
    Router->>Router: Resolves path -> "architecture/system-design.md"
    Router->>Cache: Fetch cached Markdown + assets
    Cache-->>Router: Returns file content (0ms disk wait)
    Router->>Router: Push state to Back/Forward stack
    Router->>UI: Update active file in VS Code tree & rebuild Outline
\`\`\`

### Document Cache Lifecycle State Machine

\`\`\`mermaid
stateDiagram-v2
    [*] --> Unloaded
    Unloaded --> Parsing: Select Folder / File
    Parsing --> CachedLocally: Store in IndexedDB
    CachedLocally --> ViewingSheet: Open in PDF Reader
    ViewingSheet --> NavigatingLink: Click relative .md link
    NavigatingLink --> ViewingSheet: Push History & Render
    ViewingSheet -->CachedLocally: Return to Homepage
\`\`\`

---

## 3. Interactive Multi-Series Line & Radar Charts

Use \`\`\`chart\`\`\` or \`\`\`graph\`\`\` fenced blocks to embed live dark-themed charts:

\`\`\`chart
{
  "type": "line",
  "title": "Document Rendering Throughput (Frames Per Second vs. Document Size)",
  "caption": "Smooth 60 FPS scrolling maintained across large technical specifications.",
  "labels": ["5 KB", "25 KB", "100 KB", "250 KB", "500 KB", "1 MB"],
  "datasets": [
    {
      "label": "FolioMD Virtualized Sheet (FPS)",
      "data": [60, 60, 60, 59, 58, 56],
      "borderColor": "#38bdf8",
      "backgroundColor": "rgba(56, 189, 248, 0.18)",
      "fill": true,
      "tension": 0.35
    },
    {
      "label": "Unoptimized DOM Renderer (FPS)",
      "data": [60, 55, 42, 28, 16, 9],
      "borderColor": "#f43f5e",
      "backgroundColor": "rgba(244, 63, 94, 0.12)",
      "fill": true,
      "tension": 0.35
    }
  ]
}
\`\`\`

---

## 4. Entity-Relationship Diagram

\`\`\`mermaid
erDiagram
    WORKSPACE ||--o{ MARKDOWN_FILE : contains
    WORKSPACE ||--o{ IMAGE_ASSET : caches
    MARKDOWN_FILE ||--o{ SECTION_HEADING : outlines
    MARKDOWN_FILE ||--o{ INTERNAL_LINK : references
    WORKSPACE {
        string id PK
        string type "folder | file"
        number lastOpened
        boolean pinned
    }
    MARKDOWN_FILE {
        string path PK
        string content
        number size
    }
\`\`\`

---

## Continue Exploring

- Read **[System Architecture & Cache Design](../architecture/system-design.md)**
- Read **[Mathematics, Tables & Callouts](./math-and-tables.md)**
`
    },

    'guides/math-and-tables.md': {
      path: 'guides/math-and-tables.md',
      name: 'math-and-tables.md',
      kind: 'markdown',
      size: 3650,
      content: `---
title: Mathematics, Scientific Notation & Tables
category: Technical Typography
tags: [katex, latex, tables, footnotes]
---

# Mathematics, Scientific Notation & Tables

← Back to **[Figures & Graphs](./figures-and-graphs.md)** | Next: **[Navigation Spec](../api/navigation-spec.md)**

FolioMD includes full support for **KaTeX mathematical typesetting**, **GitHub Flavored Markdown (GFM) tables**, **footnotes**, and **semantic callout blocks**.

---

## 1. LaTeX / KaTeX Mathematical Expressions

Inline math works seamlessly inside prose, such as Einstein's mass-energy equivalence $E = mc^2$, Shannon entropy $H(X) = -\\sum P(x) \\log_2 P(x)$, or the Gaussian distribution $\\mathcal{N}(\\mu, \\sigma^2)$.

### Display Math Blocks

Scaled Dot-Product Attention (Transformer Architecture)[^1]:

$$
\\mathrm{Attention}(Q, K, V) = \\mathrm{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

Continuous Fourier Transform & Inverse Transform:

$$
\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x)\\, e^{-2\\pi i x \\xi}\\,dx \\quad \\Longleftrightarrow \\quad f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\, e^{2\\pi i x \\xi}\\,d\\xi
$$

Navier–Stokes Momentum Equation:

$$
\\rho \\left( \\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla) \\mathbf{u} \\right) = -\\nabla p + \\mu \\nabla^2 \\mathbf{u} + \\mathbf{f}
$$

---

## 2. Structured Data Tables

Tables are automatically wrapped in a responsive container and indexed in the Left Sidebar:

| Module | Primary Responsibility | Storage Engine | Latency | Status |
| :--- | :--- | :--- | :---: | :---: |
| \`FolioCacheDB\` | Persistent Folder & File Cache | IndexedDB + LS | \`< 5 ms\` | ✅ Active |
| \`MarkdownEngine\` | GFM + Mermaid + Chart + KaTeX | Client AST | \`~ 12 ms\` | ✅ Active |
| \`HistoryRouter\` | Cross-File Link & Anchor Stack | Session State | \`< 1 ms\` | ✅ Active |
| \`ExplorerTree\` | VS Code Directory Hierarchy | Virtual DOM | \`~ 3 ms\` | ✅ Active |
| \`OutlineSpy\` | Scroll-Synchronized Section TOC | Intersection/Scroll | \`< 1 ms\` | ✅ Active |

---

## 3. GitHub-Style Callouts & Alerts

> [!NOTE]
> **Information Note**: All opened files and folders are cached locally in your browser's IndexedDB so you can re-open them from the Homepage in one click.

> [!TIP]
> **Pro Tip**: Press <kbd>Ctrl</kbd> + <kbd>P</kbd> (or <kbd>⌘</kbd> + <kbd>P</kbd>) at any time to fuzzy-search across all files in your currently opened folder.

> [!WARNING]
> **Relative Paths**: When linking between Markdown files in subfolders, standard relative paths like \`../architecture/system-design.md\` are resolved automatically against the current document's directory.

> [!CAUTION]
> **Clearing Cache**: Clicking *Clear Cache* on the Homepage removes locally cached snapshots from IndexedDB (your actual files on disk are never modified or deleted).

---

## 4. Interactive Task Checklists & Footnotes

- [x] Implement dark-theme PDF viewer sheet with zoom & width modes
- [x] Build Left Sidebar Sectional Navigator with live scroll-spy
- [x] Build Right Sidebar VS Code Folder & File Explorer
- [x] Support Mermaid diagrams, Chart.js graphs, KaTeX math, and captioned figures
- [x] Support relative \`.md\` link navigation with Back and Forward history buttons

[^1]: Vaswani et al., *"Attention Is All You Need"*, Advances in Neural Information Processing Systems (NeurIPS).
`
    },

    'architecture/system-design.md': {
      path: 'architecture/system-design.md',
      name: 'system-design.md',
      kind: 'markdown',
      size: 3290,
      content: `---
title: System Architecture & Local Cache Design
author: Core Platform Team
tags: [architecture, indexeddb, filesystem-api]
---

# System Architecture & Local Cache Design

← Back to **[README.md](../README.md)** | See also: **[Navigation Spec](../api/navigation-spec.md)**

## 1. Dual-Mode Local File & Folder Ingestion

FolioMD supports two complementary mechanisms for loading local files and folders:

1. **Modern File System Access API** (\`window.showDirectoryPicker\` & \`window.showOpenFilePicker\`):
   - Recursively traverses the selected directory, reading all Markdown files (\`.md\`, \`.markdown\`, \`.mdx\`, \`.txt\`) and local image assets (\`.png\`, \`.jpg\`, \`.svg\`, \`.webp\`, \`.gif\`).
   - Saves both the serialized virtual file tree **and** the native \`FileSystemHandle\` in IndexedDB so you can click **Reload from Disk** anytime.
2. **Universal Directory & File Input + Drag-and-Drop**:
   - Works across every browser and OS using \`webkitdirectory\` and \`DataTransferItem.webkitGetAsEntry()\`.

---

## 2. Storage Distribution Breakdown

\`\`\`chart
{
  "type": "doughnut",
  "title": "Typical Workspace Cache Composition by Asset Type",
  "caption": "IndexedDB efficiently stores both UTF-8 Markdown text and binary/SVG diagram assets.",
  "labels": ["Markdown Documents (.md)", "Vector Diagrams (.svg)", "Raster Figures (.png/.webp)", "Directory Index Metadata"],
  "datasets": [
    {
      "label": "Cache Share (%)",
      "data": [52, 24, 18, 6],
      "backgroundColor": [
        "rgba(99, 102, 241, 0.8)",
        "rgba(139, 92, 246, 0.8)",
        "rgba(16, 185, 129, 0.8)",
        "rgba(56, 189, 248, 0.8)"
      ],
      "borderColor": "#131824"
    }
  ]
}
\`\`\`

---

## 3. Component Interaction Graph

\`\`\`mermaid
flowchart TD
    subgraph Homepage["Homepage View"]
        OpenBtn["Open File / Folder Cards"]
        RecentGrid["Recent Cached Files & Folders"]
    end

    subgraph Storage["Local Persistence Layer"]
        IDB[("IndexedDB: FolioMDCacheDB")]
        LSMeta[("LocalStorage Metadata Mirror")]
    end

    subgraph Viewer["PDF-Style Markdown Viewer"]
        LeftTOC["Left: Sectional Navigator (TOC & Figures)"]
        CenterPDF["Center: Zoomable PDF Document Sheet"]
        RightTree["Right: VS Code File & Folder Explorer"]
    end

    OpenBtn --> IDB
    IDB --> RecentGrid
    IDB <--> LSMeta
    RecentGrid --> Viewer
    RightTree --> CenterPDF
    CenterPDF --> LeftTOC
\`\`\`

---

## Related Documents

- **[Link Router & Navigation Spec](../api/navigation-spec.md)**
- **[Figures, Diagrams & Interactive Graphs](../guides/figures-and-graphs.md)**
`
    },

    'api/navigation-spec.md': {
      path: 'api/navigation-spec.md',
      name: 'navigation-spec.md',
      kind: 'markdown',
      size: 2980,
      content: `---
title: Cross-File Link Router & History Specification
module: HistoryRouter
tags: [navigation, history, links]
---

# Cross-File Link Router & History Specification

← Back to **[README.md](../README.md)** | Previous: **[Mathematics & Tables](../guides/math-and-tables.md)**

## Overview

When reading interconnected Markdown documentation (such as project wikis, RFCs, or technical books), links often point to other \`.md\` files in the same folder or relative subdirectories.

---

## History Stack Engine

FolioMD implements a dedicated browser-grade **History Stack** (\`historyStack[]\` + \`historyIndex\`) for Markdown navigation:

1. **Relative Path Resolution**:
   - Given current file \`guides/figures-and-graphs.md\` and target href \`../architecture/system-design.md#overview\`, the router normalizes path segments (\`.\` and \`..\`) to resolve \`architecture/system-design.md\` and target section \`#overview\`.
2. **Wiki-Link Support**:
   - Supports Obsidian/Wiki-style links like \`[[system-design]]\` or \`[[guides/math-and-tables|Math Guide]]\`.
3. **Back & Forward Controls**:
   - Clicking **Back (\`←\`)** decrements \`historyIndex\` and restores the previous Markdown file and scroll/section position.
   - Clicking **Forward (\`→\`)** increments \`historyIndex\` to move forward again.
   - Clicking the **History Clock icon** next to Forward opens a jump-list of all visited documents in your session.

---

## Test Links Right Here

Click any of these links to test cross-file and anchor navigation, then use the **Back** and **Forward** buttons in the top toolbar:

- Jump to **[README.md (Root Document)](../README.md)**
- Jump to **[Figures & Graphs — Section 3 (Charts)](../guides/figures-and-graphs.md#3-interactive-multi-series-line-radar-charts)**
- Jump to **[Mathematics & Tables — Section 2 (Data Tables)](../guides/math-and-tables.md#2-structured-data-tables)**
- Jump to **[System Architecture](../architecture/system-design.md)**
`
    },

    'assets/pipeline-diagram.svg': {
      path: 'assets/pipeline-diagram.svg',
      name: 'pipeline-diagram.svg',
      kind: 'image',
      size: 1840,
      dataUrl: PIPELINE_SVG
    },

    'assets/neural-topology.svg': {
      path: 'assets/neural-topology.svg',
      name: 'neural-topology.svg',
      kind: 'image',
      size: 2150,
      dataUrl: TOPOLOGY_SVG
    }
  };

  const SAMPLE_WORKSPACE = {
    id: 'folder:FolioMD-Handbook',
    type: 'folder',
    name: 'FolioMD-Handbook',
    subtitle: '5 Markdown files • 2 SVG figures • Sample Workspace',
    activeFilePath: 'README.md',
    fileCount: 5,
    totalBytes: 22710,
    pinned: true,
    isSample: true,
    files: SAMPLE_FILES
  };

  const SAMPLE_SINGLE_FILE = {
    id: 'file:Quick-Start-Guide.md',
    type: 'file',
    name: 'Quick-Start-Guide.md',
    subtitle: '3.1 KB • Standalone Markdown File',
    activeFilePath: 'Quick-Start-Guide.md',
    fileCount: 1,
    totalBytes: 3180,
    pinned: false,
    isSample: true,
    files: {
      'Quick-Start-Guide.md': {
        path: 'Quick-Start-Guide.md',
        name: 'Quick-Start-Guide.md',
        kind: 'markdown',
        size: 3180,
        content: `---
title: Quick Start Guide
author: FolioMD
tags: [quickstart, pdf-viewer, dark-mode]
---

# FolioMD Quick Start Guide

This standalone Markdown file is stored in your **Local Cache** so you can test single-file mode alongside folder mode.

## 1. Opening Your Own Files & Folders

- Click **Open Local Folder** on the Homepage (or in the Right Explorer header) to pick any directory on your computer.
- Click **Open Markdown File** to pick one or more \`.md\` files.
- Or simply **drag and drop** any folder or \`.md\` file anywhere onto the window!

## 2. Navigating Sections & Files

- **Left Sidebar**: Click any heading in **SECTIONS** to smoothly scroll to that section, or switch to the **FIGURES** tab to jump directly to any diagram, chart, or table.
- **Right Sidebar**: Browse your folder hierarchy just like **VS Code**.

\`\`\`mermaid
pie title Markdown Elements Used in Technical Docs
    "Prose & Headings" : 40
    "Code Blocks" : 25
    "Mermaid & Charts" : 20
    "Tables & Math" : 15
\`\`\`

## 3. Mathematical Formula Check

The quadratic formula is given by:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## 4. Code Highlighting & Contrast Check

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
`
      }
    }
  };

  global.FolioSampleData = {
    SAMPLE_WORKSPACE,
    SAMPLE_SINGLE_FILE
  };
})(window);
