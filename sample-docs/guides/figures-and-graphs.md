---
title: Figures, Mermaid Diagrams & Interactive Graphs
category: Visual Markdown
---

# Figures, Mermaid Diagrams & Interactive Graphs

← Back to **[README.md](../README.md)** | Next: **[Mathematics & Tables](./math-and-tables.md)**

## 1. Local Relative Figure with Caption

![Architecture Pipeline Figure](../assets/architecture-diagram.svg "Resolved via relative path ../assets/architecture-diagram.svg")

## 2. Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Viewer as PDF Sheet Viewer
    participant Router as History Stack
    User->>Viewer: Clicks link to math-and-tables.md
    Viewer->>Router: Push state & open target .md
    User->>Router: Clicks Back (←) button
    Router->>Viewer: Restore previous file & scroll position
```

## 3. Interactive Chart Block

```chart
{
  "type": "bar",
  "title": "Cache vs Disk Read Latency (ms)",
  "caption": "Locally cached folders open nearly instantaneously.",
  "labels": ["Cold Folder Read", "Cached Folder Open", "Cross-File Link"],
  "datasets": [
    {
      "label": "Latency (ms)",
      "data": [145, 5, 2],
      "backgroundColor": ["rgba(99, 102, 241, 0.7)", "rgba(16, 185, 129, 0.7)", "rgba(56, 189, 248, 0.7)"],
      "borderColor": ["#818cf8", "#34d399", "#38bdf8"]
    }
  ]
}
```
