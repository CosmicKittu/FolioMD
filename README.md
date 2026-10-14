# FolioMD — PDF-Style Markdown & Folder Viewer

A clean, dark-themed Markdown file and local folder viewer designed like a modern PDF reader with VS Code directory navigation and local IndexedDB caching.

## Features

- **Homepage with Local Cache (`IndexedDB` + `LocalStorage`)**:
  - **Open Local Folder** or **Open Markdown File** (or drag-and-drop any folder/file onto the page).
  - **Recent Files & Folders Section**: Automatically caches opened folders (including nested subfolders, `.md` contents, and local images) and standalone files for instant 1-click access. Includes filter tabs (`All`, `Folders`, `Files`, `Pinned`), search, pinning, and cache clearing.
- **PDF-Viewer Style Markdown View Page**:
  - **Left Sidebar — Sectional Navigator**: Live hierarchical Table of Contents (`H1`–`H6`) with reading progress bar, scroll-spy active section highlighting, section filter, and a dedicated **FIGURES** tab indexing all Figures, Mermaid Diagrams, Charts, and Tables.
  - **Center Canvas — PDF Document Sheet**: Crisp dark-mode document sheet with zoom controls (`50%`–`200%`), page layout switcher (`Page View`, `Wide View`, `Full Width`), font switcher (`Sans`, `Serif`, `Mono`), in-document search (`Ctrl+F`), and PDF print/export.
  - **Right Sidebar — VS Code File & Folder Explorer**: Collapsible directory tree, active file highlight, file search filter, and quick cached workspace drawer.
- **Cross-File Markdown Link Navigation + Back / Forward History**:
  - Clicking relative Markdown links (e.g. `[Figures](./guides/figures-and-graphs.md)` or `[Spec](../api/navigation-spec.md#section)`) or wiki-links (`[[page]]`) opens the linked Markdown file inside the viewer and pushes to the session history stack.
  - Use the **Back (`←`)** and **Forward (`→`)** buttons in the top toolbar (or `Alt+Left` / `Alt+Right`) and the History popover to move backward and forward.
- **Accessibility & Focus-Assistive Reading**:
  - **Bionic Reading Mode (`Alt+B`)**: Highlights artificial fixation points across prose using a research-tuned 42–45% fixation ratio, allowing the eye to skip through text and significantly assisting readers with ADHD.
  - **Dyslexia-Optimized Typography**: Choose between **OpenDyslexic** (weighted baseline gravity to prevent letter flipping/rotation) and **Lexend** (scientifically engineered letter spacing and kerning for cognitive fluency), alongside Sans, Serif, and Mono.
- **Adaptive Reading Themes**:
  - **Dark Sheet Mode**: Original carbon/obsidian sheet for low-light environments.
  - **White Paper Mode**: Clean, crisp paper-white sheet (`#ffffff`) with high-contrast slate ink.
  - **Yellow / Warm Sepia Reading Mode**: Soft amber/parchment background (`#fbf0d9`) with warm espresso ink designed like Kindle/iBooks to eliminate eye fatigue during long reading sessions.
- **4 Document Quick Tags & Tagged Content Menu (`Alt+T`)**:
  - Pin any of the 4 tags to the currently viewed document with 1 click right at the top of the reading sheet:
    - **★ Favorite** (amber badge)
    - **⚑ Important** (rose badge)
    - **⏱ Incomplete** (sky blue badge)
    - **👍 Like** (emerald green badge)
  - All tags are saved in browser cache (`IndexedDB` + `localStorage`).
  - Open the **Tagged Content Explorer Menu** from the top toolbar or header to filter, search, and jump to any tagged document across folders and workspaces in 1 click!
- **Advanced Markdown Support**:
  - **Mermaid Diagrams** (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `erDiagram`, `pie`, etc.)
  - **Interactive Charts / Graphs** (` ```chart ` / ` ```graph ` powered by Chart.js)
  - **Figures & Captions** with relative local image resolution and Fullscreen Lightbox Inspector
  - **KaTeX Mathematics** (inline `$...$` and display `$$...$$`)
  - **GitHub Callouts / Alerts** (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`)
  - **YAML Frontmatter**, **GFM Tables**, **Task Lists**, **Footnotes**, and **Syntax Highlighting** with copy buttons

## Running the Project

You can open [index.html](file:///home/priyanshu/PlayGround/Projects/Mdfile/index.html) directly in any browser, or run a local server:

```bash
# Option 1: Using npm
npm start

# Option 2: Using Python
python3 -m http.server 3000
```

You can also test folder selection right away using the included [sample-docs](file:///home/priyanshu/PlayGround/Projects/Mdfile/sample-docs/README.md) directory.
