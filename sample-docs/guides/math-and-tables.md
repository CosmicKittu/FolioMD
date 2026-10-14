---
title: Mathematics, Equations & Tables
category: Scientific Markdown
---

# Mathematics, Equations & Tables

← Back to **[Figures & Graphs](./figures-and-graphs.md)** | Next: **[Architecture Overview](../architecture/overview.md)**

## 1. KaTeX Mathematical Expressions

Inline math: $E = mc^2$ and Euler's identity $e^{i\pi} + 1 = 0$.

Display math block:

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

## 2. GFM Data Table

| Feature | Supported Syntax | Rendered Output |
| :--- | :--- | :--- |
| Diagrams | ` ```mermaid ` | Interactive Dark SVG + Lightbox |
| Charts | ` ```chart ` | Interactive Chart.js Canvas |
| Math | `$...$` and `$$...$$` | KaTeX Typesetting |
| Callouts | `> [!NOTE]`, `> [!TIP]` | Semantic Alert Cards |
| Links | `[Doc](../other.md)` | Instant Viewer Navigation + Back/Forward |

> [!TIP]
> Click **[Architecture Overview](../architecture/overview.md)** to test cross-folder relative link navigation!
