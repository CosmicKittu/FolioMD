/**
 * FolioMD — Advanced Markdown Rendering Engine
 * Supports:
 * - YAML Frontmatter metadata extraction
 * - GitHub Flavored Markdown (Tables, Task Lists, Strikethrough, Autolinks, Footnotes)
 * - Mermaid Diagrams & Flowcharts (dark theme + fullscreen zoom)
 * - Interactive Data Charts / Graphs via Chart.js (` ```chart ` / ` ```graph `)
 * - KaTeX Math (`$$...$$`, `$...$`, `\[...\]`, `\(...\)`, ` ```math `)
 * - Figures & Captions + Local Folder Relative Image Resolution
 * - GitHub Alerts / Callouts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`)
 * - Relative Markdown Link Resolution & Wiki-links (`[[page]]`)
 */
(function (global) {
  let mermaidInitialized = false;
  let activeChartInstances = [];

  function initMermaid() {
    if (mermaidInitialized || typeof global.mermaid === 'undefined') return;
    try {
      global.mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        themeVariables: {
          darkMode: true,
          background: '#0d111a',
          primaryColor: '#1e293b',
          primaryTextColor: '#eef2f9',
          primaryBorderColor: '#6366f1',
          lineColor: '#818cf8',
          secondaryColor: '#172033',
          tertiaryColor: '#111827'
        }
      });
      mermaidInitialized = true;
    } catch (_) {}
  }

  /**
   * Normalize a relative path against a current directory path
   */
  function resolveRelativePath(baseFilePath, relativeTarget) {
    if (!relativeTarget) return '';
    const cleanedTarget = decodeURIComponent(relativeTarget.trim()).replace(/\\/g, '/');
    if (cleanedTarget.startsWith('/')) {
      return cleanedTarget.replace(/^\/+/, '');
    }

    const baseParts = (baseFilePath || '').replace(/\\/g, '/').split('/');
    baseParts.pop(); // remove filename

    const targetParts = cleanedTarget.split('/');
    for (const part of targetParts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }
    return baseParts.join('/');
  }

  /**
   * Generate GitHub-compatible heading slug
   */
  function slugifyHeading(text, usedSlugs) {
    const base = String(text || '')
      .toLowerCase()
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';

    if (!usedSlugs) return base;
    let slug = base;
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${counter++}`;
    }
    usedSlugs.add(slug);
    return slug;
  }

  /**
   * Parse YAML Frontmatter at top of Markdown file
   */
  function extractFrontmatter(rawMarkdown) {
    const text = String(rawMarkdown || '').replace(/\r\n/g, '\n');
    if (!text.startsWith('---\n')) {
      return { frontmatter: null, content: text };
    }
    const endIdx = text.indexOf('\n---\n', 4);
    if (endIdx === -1) {
      return { frontmatter: null, content: text };
    }

    const yamlBlock = text.slice(4, endIdx).trim();
    const body = text.slice(endIdx + 5);
    const meta = {};

    yamlBlock.split('\n').forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (!key) return;
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        val = val.replace(/^['"]|['"]$/g, '');
      }
      meta[key] = val;
    });

    return {
      frontmatter: Object.keys(meta).length ? meta : null,
      content: body
    };
  }

  /**
   * Pre-process math expressions, wiki-links, highlights, and footnotes
   */
  function preprocessMarkdown(markdownText) {
    const mathBlocks = [];
    const codeBlocks = [];
    const footnotes = new Map();

    // 1. Temporarily shield fenced code blocks so math/wiki regexes don't touch code
    let text = markdownText.replace(/```[\s\S]*?```/g, (match) => {
      const idx = codeBlocks.push(match) - 1;
      return `@@FOLIO_CODE_BLOCK_${idx}@@`;
    });

    // 2. Extract footnote definitions: [^id]: definition text
    text = text.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (_, id, def) => {
      footnotes.set(id.trim(), def.trim());
      return '';
    });

    // 3. Extract display math $$ ... $$ and \[ ... \]
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      const idx = mathBlocks.push({ display: true, expr: expr.trim() }) - 1;
      return `\n\n@@FOLIO_MATH_${idx}@@\n\n`;
    });

    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => {
      const idx = mathBlocks.push({ display: true, expr: expr.trim() }) - 1;
      return `\n\n@@FOLIO_MATH_${idx}@@\n\n`;
    });

    // 4. Shield inline code `...`
    const inlineCodes = [];
    text = text.replace(/`[^`\n]+`/g, (match) => {
      const idx = inlineCodes.push(match) - 1;
      return `@@FOLIO_INLINE_CODE_${idx}@@`;
    });

    // 5. Extract inline math $...$ and \(...\)
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => {
      const idx = mathBlocks.push({ display: false, expr: expr.trim() }) - 1;
      return `@@FOLIO_MATH_${idx}@@`;
    });

    text = text.replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (full, prefix, expr) => {
      const idx = mathBlocks.push({ display: false, expr: expr.trim() }) - 1;
      return `${prefix}@@FOLIO_MATH_${idx}@@`;
    });

    // 6. Convert Obsidian / Wiki links [[target|label]] or [[target]]
    text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const cleanTarget = target.trim();
      const display = (label || cleanTarget).trim();
      const href = /\.(md|markdown|mdx|txt)(#.*)?$/i.test(cleanTarget)
        ? cleanTarget
        : `${cleanTarget}.md`;
      return `[${display}](${href})`;
    });

    // 7. Convert ==highlight== to <mark>
    text = text.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

    // 8. Convert footnote references [^id]
    text = text.replace(/\[\^([^\]]+)\]/g, (_, id) => {
      const cleanId = id.trim();
      return `<sup class="footnote-ref"><a href="#fn-${cleanId}" id="fnref-${cleanId}">[${cleanId}]</a></sup>`;
    });

    // Restore inline code
    text = text.replace(/@@FOLIO_INLINE_CODE_(\d+)@@/g, (_, idx) => inlineCodes[Number(idx)]);

    // Restore fenced code blocks
    text = text.replace(/@@FOLIO_CODE_BLOCK_(\d+)@@/g, (_, idx) => codeBlocks[Number(idx)]);

    return { text, mathBlocks, footnotes };
  }

  /**
   * Render KaTeX math tokens back into HTML
   */
  function restoreMathTokens(html, mathBlocks) {
    return html.replace(/@@FOLIO_MATH_(\d+)@@/g, (_, idx) => {
      const item = mathBlocks[Number(idx)];
      if (!item) return '';
      if (typeof global.katex !== 'undefined') {
        try {
          const rendered = global.katex.renderToString(item.expr, {
            displayMode: item.display,
            throwOnError: false
          });
          return item.display ? `<div class="math-block">${rendered}</div>` : rendered;
        } catch (_) {}
      }
      return item.display
        ? `<div class="math-block"><code>$$${escapeHtml(item.expr)}$$</code></div>`
        : `<code>$${escapeHtml(item.expr)}$</code>`;
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Fallback lightweight Markdown parser if CDN `marked` is unavailable
   */
  function basicMarkdownFallback(md) {
    let html = escapeHtml(md);
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return html
      .split(/\n{2,}/)
      .map((p) => (p.trim().startsWith('<h') ? p : `<p>${p}</p>`))
      .join('\n');
  }

  /**
   * Destroy previous Chart.js instances before rendering a new document
   */
  function cleanupCharts() {
    activeChartInstances.forEach((chart) => {
      try {
        chart.destroy();
      } catch (_) {}
    });
    activeChartInstances = [];
  }

  /**
   * Main render method: parses Markdown into target container and returns
   * extracted sections (headings), figures/graphs/tables index, frontmatter, and stats.
   */
  async function renderMarkdownDocument({
    rawMarkdown,
    currentFilePath,
    workspace,
    containerEl,
    frontmatterEl,
    onInternalLinkClick,
    onAnchorLinkClick,
    onInspectFigure
  }) {
    cleanupCharts();
    initMermaid();

    const { frontmatter, content } = extractFrontmatter(rawMarkdown);

    // Render Frontmatter Bar if present
    if (frontmatter && frontmatterEl) {
      frontmatterEl.innerHTML = Object.entries(frontmatter)
        .map(([k, v]) => {
          const valHtml = Array.isArray(v)
            ? v.map((tag) => `<span class="frontmatter-tag">${escapeHtml(tag)}</span>`).join('')
            : `<span class="frontmatter-val">${escapeHtml(v)}</span>`;
          return `<div class="frontmatter-field"><span class="frontmatter-key">${escapeHtml(k)}:</span>${valHtml}</div>`;
        })
        .join('');
      frontmatterEl.classList.remove('hidden');
    } else if (frontmatterEl) {
      frontmatterEl.innerHTML = '';
      frontmatterEl.classList.add('hidden');
    }

    // Preprocess math, wiki-links, highlights, footnotes
    const { text: preprocessedText, mathBlocks, footnotes } = preprocessMarkdown(content);

    // Parse Markdown to HTML via Marked
    let rawHtml = '';
    if (typeof global.marked !== 'undefined') {
      global.marked.setOptions({
        gfm: true,
        breaks: false
      });
      rawHtml = global.marked.parse(preprocessedText);
    } else {
      rawHtml = basicMarkdownFallback(preprocessedText);
    }

    // Restore KaTeX math blocks
    rawHtml = restoreMathTokens(rawHtml, mathBlocks);

    // Append footnotes section if any definitions were found
    if (footnotes.size > 0) {
      const fnItems = Array.from(footnotes.entries())
        .map(
          ([id, def]) =>
            `<li id="fn-${escapeHtml(id)}">${def} <a href="#fnref-${escapeHtml(id)}" class="footnote-backref" title="Back to reference">↩</a></li>`
        )
        .join('');
      rawHtml += `<hr /><section class="footnotes-section"><h4>Footnotes</h4><ol>${fnItems}</ol></section>`;
    }

    containerEl.innerHTML = rawHtml;

    const sections = [];
    const figures = [];
    const usedSlugs = new Set();
    let figureCounter = 1;

    // 1. Process Headings (H1 - H6) for Left Sectional Navigator
    const headingEls = containerEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingEls.forEach((h) => {
      const level = Number(h.tagName.slice(1));
      const plainText = (h.textContent || '').trim();
      const slug = slugifyHeading(plainText, usedSlugs);
      h.id = slug;

      const anchor = document.createElement('a');
      anchor.href = `#${slug}`;
      anchor.className = 'heading-anchor-btn';
      anchor.textContent = '#';
      anchor.title = 'Link to this section';
      h.appendChild(anchor);

      sections.push({
        id: slug,
        text: plainText,
        level
      });
    });

    // 2. Transform GitHub-style Callouts / Alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
    const blockquotes = containerEl.querySelectorAll('blockquote');
    const calloutMeta = {
      NOTE: { label: 'Note', cls: 'callout-note', icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
      TIP: { label: 'Tip', cls: 'callout-tip', icon: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>' },
      IMPORTANT: { label: 'Important', cls: 'callout-important', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="12" y1="15" x2="12.01" y2="15"/>' },
      WARNING: { label: 'Warning', cls: 'callout-warning', icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
      CAUTION: { label: 'Caution', cls: 'callout-caution', icon: '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' }
    };

    blockquotes.forEach((bq) => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;
      const match = firstP.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>|\n)?/i);
      if (!match) return;
      const typeKey = match[1].toUpperCase();
      const cfg = calloutMeta[typeKey];
      if (!cfg) return;

      firstP.innerHTML = firstP.innerHTML.slice(match[0].length);
      const calloutDiv = document.createElement('div');
      calloutDiv.className = `md-callout ${cfg.cls}`;
      calloutDiv.innerHTML = `
        <div class="md-callout-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cfg.icon}</svg>
          <span>${cfg.label}</span>
        </div>
        <div class="md-callout-body">${bq.innerHTML}</div>
      `;
      bq.replaceWith(calloutDiv);
    });

    // 3. Process Code Blocks: Mermaid Diagrams, Chart.js Graphs, Math Blocks, and Syntax-Highlighted Code
    const codeEls = Array.from(containerEl.querySelectorAll('pre > code'));
    for (const codeEl of codeEls) {
      const preEl = codeEl.parentElement;
      if (!preEl) continue;

      const classList = Array.from(codeEl.classList);
      const langClass = classList.find((c) => c.startsWith('language-')) || '';
      const lang = langClass.replace('language-', '').toLowerCase().trim();
      const rawCode = codeEl.textContent || '';

      // 3a. Mermaid Diagram Block
      if (lang === 'mermaid') {
        const figIndex = figureCounter++;
        const figId = `figure-${figIndex}`;
        const captionMatch = rawCode.match(/%%\s*caption:\s*(.+)$/m);
        const captionText = captionMatch ? captionMatch[1].trim() : `Mermaid Diagram (${detectMermaidType(rawCode)})`;

        const figEl = document.createElement('figure');
        figEl.className = 'md-figure mermaid-figure';
        figEl.id = figId;
        figEl.innerHTML = `
          <div class="md-figure-toolbar">
            <span class="md-figure-type">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Figure ${figIndex} · Mermaid Graph
            </span>
            <div class="md-figure-actions">
              <button type="button" class="figure-btn btn-inspect-mermaid">Fullscreen Zoom</button>
            </div>
          </div>
          <div class="md-figure-stage">
            <div class="mermaid-render-box">Rendering diagram...</div>
          </div>
          <figcaption><span class="figure-num-label">Figure ${figIndex}:</span> ${escapeHtml(captionText)}</figcaption>
        `;
        preEl.replaceWith(figEl);

        const renderBox = figEl.querySelector('.mermaid-render-box');
        if (typeof global.mermaid !== 'undefined') {
          try {
            const uniqueMermaidId = `mermaid-svg-${Date.now()}-${figIndex}`;
            const { svg } = await global.mermaid.render(uniqueMermaidId, rawCode.trim());
            renderBox.innerHTML = svg;
          } catch (err) {
            renderBox.innerHTML = `<pre style="color:#f87171;font-size:12px;">Mermaid Syntax Error:\n${escapeHtml(err.message || String(err))}</pre>`;
          }
        } else {
          renderBox.innerHTML = `<pre>${escapeHtml(rawCode)}</pre>`;
        }

        const openLightbox = () => {
          if (onInspectFigure) {
            onInspectFigure({
              title: `Figure ${figIndex}: ${captionText}`,
              html: renderBox.innerHTML
            });
          }
        };
        renderBox.addEventListener('click', openLightbox);
        figEl.querySelector('.btn-inspect-mermaid').addEventListener('click', openLightbox);

        figures.push({
          id: figId,
          type: 'mermaid',
          badge: 'Graph',
          title: `Fig ${figIndex}: ${captionText}`
        });
        continue;
      }

      // 3b. Interactive Chart Block (` ```chart ` or ` ```graph `)
      if (lang === 'chart' || lang === 'graph') {
        const figIndex = figureCounter++;
        const figId = `figure-${figIndex}`;
        let chartSpec = null;
        try {
          chartSpec = JSON.parse(rawCode.trim());
        } catch (_) {}

        if (chartSpec) {
          const titleText = chartSpec.title || 'Interactive Data Graph';
          const captionText = chartSpec.caption || titleText;
          const figEl = document.createElement('figure');
          figEl.className = 'md-figure chart-figure';
          figEl.id = figId;
          figEl.innerHTML = `
            <div class="md-figure-toolbar">
              <span class="md-figure-type">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Figure ${figIndex} · Interactive Chart (${escapeHtml((chartSpec.type || 'bar').toUpperCase())})
              </span>
            </div>
            <div class="md-figure-stage">
              <div class="chart-canvas-wrap">
                <canvas></canvas>
              </div>
            </div>
            <figcaption><span class="figure-num-label">Figure ${figIndex}:</span> ${escapeHtml(captionText)}</figcaption>
          `;
          preEl.replaceWith(figEl);

          if (typeof global.Chart !== 'undefined') {
            try {
              const ctx = figEl.querySelector('canvas').getContext('2d');
              const chartInstance = new global.Chart(ctx, {
                type: chartSpec.type || 'bar',
                data: {
                  labels: chartSpec.labels || [],
                  datasets: (chartSpec.datasets || []).map((ds) =>
                    Object.assign(
                      {
                        borderWidth: 2,
                        borderRadius: chartSpec.type === 'bar' ? 6 : 0
                      },
                      ds
                    )
                  )
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: '#cbd5e1', font: { family: 'Inter, sans-serif', size: 12 } }
                    },
                    title: {
                      display: Boolean(chartSpec.title),
                      text: chartSpec.title,
                      color: '#eef2f9',
                      font: { family: 'Inter, sans-serif', size: 13.5, weight: '600' }
                    }
                  },
                  scales:
                    chartSpec.type === 'pie' || chartSpec.type === 'doughnut' || chartSpec.type === 'polarArea'
                      ? {}
                      : {
                          x: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(148, 163, 184, 0.1)' }
                          },
                          y: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(148, 163, 184, 0.1)' }
                          }
                        }
                }
              });
              activeChartInstances.push(chartInstance);
            } catch (_) {}
          }

          figures.push({
            id: figId,
            type: 'chart',
            badge: 'Chart',
            title: `Fig ${figIndex}: ${titleText}`
          });
          continue;
        }
      }

      // 3c. Math / LaTeX Fenced Block
      if (lang === 'math' || lang === 'latex' || lang === 'katex') {
        const mathDiv = document.createElement('div');
        mathDiv.className = 'math-block';
        if (typeof global.katex !== 'undefined') {
          try {
            mathDiv.innerHTML = global.katex.renderToString(rawCode.trim(), {
              displayMode: true,
              throwOnError: false
            });
          } catch (_) {
            mathDiv.textContent = rawCode;
          }
        } else {
          mathDiv.textContent = rawCode;
        }
        preEl.replaceWith(mathDiv);
        continue;
      }

      // 3d. Standard Syntax-Highlighted Code Block
      if (typeof global.hljs !== 'undefined') {
        try {
          if (lang && global.hljs.getLanguage(lang)) {
            codeEl.innerHTML = global.hljs.highlight(rawCode, { language: lang }).value;
          } else {
            codeEl.innerHTML = global.hljs.highlightAuto(rawCode).value;
          }
        } catch (_) {}
      }
      codeEl.classList.add('hljs');

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <div class="code-header-left">
          <span class="code-lang-label">${escapeHtml(lang || 'code')}</span>
        </div>
        <div class="code-header-actions">
          <button type="button" class="code-style-btn" title="Toggle Code Card Style (Dark Box / Paper Match)">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path>
            </svg>
            <span>Style</span>
          </button>
          <button type="button" class="code-copy-btn" title="Copy code to clipboard">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
      `;
      preEl.parentNode.insertBefore(wrapper, preEl);
      wrapper.appendChild(header);
      wrapper.appendChild(preEl);

      const copyBtn = header.querySelector('.code-copy-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(rawCode);
        const span = copyBtn.querySelector('span') || copyBtn;
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          span.textContent = originalText;
          copyBtn.classList.remove('copied');
        }, 1600);
      });

      const styleBtn = header.querySelector('.code-style-btn');
      if (styleBtn) {
        styleBtn.addEventListener('click', () => {
          const sheet = document.getElementById('document-sheet');
          if (sheet) {
            sheet.classList.toggle('code-theme-paper');
            const isPaper = sheet.classList.contains('code-theme-paper');
            try {
              localStorage.setItem('foliomd_code_theme', isPaper ? 'paper' : 'dark');
            } catch (_) {}
            const codeThemeLabel = document.getElementById('code-theme-label');
            if (codeThemeLabel) {
              codeThemeLabel.textContent = isPaper ? 'Code: Paper' : 'Code: Dark';
            }
          }
        });
      }
    }

    // 4. Process Images & Figures (Resolve Local Folder Images + Wrap in Numbered Figure Cards)
    const imgEls = Array.from(containerEl.querySelectorAll('img'));
    imgEls.forEach((img) => {
      const rawSrc = img.getAttribute('src') || '';
      if (rawSrc && !/^(https?:|data:|blob:)/i.test(rawSrc) && workspace && workspace.files) {
        const resolvedPath = resolveRelativePath(currentFilePath, rawSrc.split('#')[0].split('?')[0]);
        const fileEntry =
          workspace.files[resolvedPath] ||
          Object.values(workspace.files).find(
            (f) => f.path.toLowerCase() === resolvedPath.toLowerCase() || f.name.toLowerCase() === resolvedPath.split('/').pop().toLowerCase()
          );
        if (fileEntry && fileEntry.dataUrl) {
          img.src = fileEntry.dataUrl;
        }
      }

      const figIndex = figureCounter++;
      const figId = `figure-${figIndex}`;
      const altText = (img.getAttribute('alt') || '').trim();
      const titleText = (img.getAttribute('title') || '').trim();
      const caption = titleText || altText || `Image Asset`;

      const existingFigure = img.closest('figure');
      if (existingFigure) {
        existingFigure.classList.add('md-figure');
        existingFigure.id = figId;
      } else {
        const figEl = document.createElement('figure');
        figEl.className = 'md-figure image-figure';
        figEl.id = figId;
        figEl.innerHTML = `
          <div class="md-figure-toolbar">
            <span class="md-figure-type">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Figure ${figIndex} · Illustration
            </span>
            <div class="md-figure-actions">
              <button type="button" class="figure-btn btn-inspect-img">Fullscreen Zoom</button>
            </div>
          </div>
          <div class="md-figure-stage"></div>
          <figcaption><span class="figure-num-label">Figure ${figIndex}:</span> ${escapeHtml(caption)}</figcaption>
        `;
        const parentP = img.parentElement;
        if (parentP && parentP.tagName === 'P' && parentP.childNodes.length === 1) {
          parentP.replaceWith(figEl);
        } else {
          img.replaceWith(figEl);
        }
        figEl.querySelector('.md-figure-stage').appendChild(img);

        const openImgLightbox = () => {
          if (onInspectFigure) {
            onInspectFigure({
              title: `Figure ${figIndex}: ${caption}`,
              html: `<img src="${img.src}" alt="${escapeHtml(altText)}" />`
            });
          }
        };
        img.addEventListener('click', openImgLightbox);
        figEl.querySelector('.btn-inspect-img').addEventListener('click', openImgLightbox);
      }

      figures.push({
        id: figId,
        type: 'image',
        badge: 'Figure',
        title: `Fig ${figIndex}: ${altText || caption}`
      });
    });

    // 5. Process Data Tables (Wrap for scrolling & index in Figures/Tables list)
    const tableEls = Array.from(containerEl.querySelectorAll('table'));
    tableEls.forEach((table, idx) => {
      const tableNum = idx + 1;
      const tableId = `table-${tableNum}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'md-table-wrapper';
      wrapper.id = tableId;
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      const firstHeaders = Array.from(table.querySelectorAll('th'))
        .slice(0, 3)
        .map((th) => th.textContent.trim())
        .filter(Boolean)
        .join(' · ');

      figures.push({
        id: tableId,
        type: 'table',
        badge: 'Table',
        title: `Table ${tableNum}: ${firstHeaders || 'Data Table'}`
      });
    });

    // 6. Process Links (Intercept Internal Markdown Links & Anchor Links)
    const linkEls = Array.from(containerEl.querySelectorAll('a[href]'));
    linkEls.forEach((a) => {
      if (a.classList.contains('heading-anchor-btn')) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const targetHash = a.getAttribute('href').slice(1);
          if (onAnchorLinkClick) onAnchorLinkClick(targetHash);
        });
        return;
      }

      const rawHref = (a.getAttribute('href') || '').trim();
      if (!rawHref) return;

      // In-document anchor link (#section)
      if (rawHref.startsWith('#')) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const targetHash = decodeURIComponent(rawHref.slice(1));
          if (onAnchorLinkClick) onAnchorLinkClick(targetHash);
        });
        return;
      }

      // External HTTP/HTTPS/mailto link
      if (/^(https?:|mailto:|tel:)/i.test(rawHref)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        return;
      }

      // Internal / Relative Markdown File Link (e.g. ./other.md, ../dir/doc.md#section)
      const [pathPart, hashPart] = rawHref.split('#');
      const isMdLink =
        /\.(md|markdown|mdx|txt|mkd)$/i.test(pathPart) ||
        Boolean(findTargetFileInWorkspace(workspace, currentFilePath, pathPart));

      if (isMdLink) {
        a.classList.add('md-internal-link');
        a.title = `Open linked Markdown file: ${rawHref}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (onInternalLinkClick) {
            onInternalLinkClick({
              rawHref,
              targetPath: pathPart,
              targetHash: hashPart ? decodeURIComponent(hashPart) : ''
            });
          }
        });
      }
    });

    // Compute document stats
    const plainBody = (containerEl.textContent || '').trim();
    const wordCount = plainBody ? plainBody.split(/\s+/).length : 0;
    const readTimeMin = Math.max(1, Math.ceil(wordCount / 210));

    return {
      frontmatter,
      sections,
      figures,
      stats: {
        words: wordCount,
        readTimeMin,
        sectionsCount: sections.length,
        figuresCount: figures.length
      }
    };
  }

  function detectMermaidType(code) {
    const firstLine = (code || '').trim().split('\n')[0].toLowerCase();
    if (firstLine.includes('sequencediagram')) return 'Sequence';
    if (firstLine.includes('statediagram')) return 'State Diagram';
    if (firstLine.includes('erdiagram')) return 'ER Diagram';
    if (firstLine.includes('classdiagram')) return 'Class Diagram';
    if (firstLine.includes('pie')) return 'Pie Chart';
    if (firstLine.includes('gantt')) return 'Gantt';
    return 'Flowchart';
  }

  /**
   * Smart lookup of a linked Markdown file in the active workspace
   */
  function findTargetFileInWorkspace(workspace, currentFilePath, targetPathPart) {
    if (!workspace || !workspace.files || !targetPathPart) return null;
    const filesMap = workspace.files;
    const resolved = resolveRelativePath(currentFilePath, targetPathPart);

    // 1. Exact path match
    if (filesMap[resolved] && filesMap[resolved].kind === 'markdown') {
      return filesMap[resolved];
    }

    // 2. Try appending .md
    if (filesMap[`${resolved}.md`]) {
      return filesMap[`${resolved}.md`];
    }

    // 3. Case-insensitive path match
    const lowerResolved = resolved.toLowerCase();
    const allFiles = Object.values(filesMap).filter((f) => f.kind === 'markdown');
    const exactCaseInsensitive = allFiles.find(
      (f) => f.path.toLowerCase() === lowerResolved || f.path.toLowerCase() === `${lowerResolved}.md`
    );
    if (exactCaseInsensitive) return exactCaseInsensitive;

    // 4. Filename match fallback
    const baseName = resolved.split('/').pop().toLowerCase();
    return (
      allFiles.find(
        (f) =>
          f.name.toLowerCase() === baseName ||
          f.name.toLowerCase() === `${baseName}.md`
      ) || null
    );
  }

  // =========================================================================
  // BIONIC READING (ADHD & Cognitive Reading Assistance)
  // =========================================================================
  function getFixationLength(len) {
    if (len <= 1) return 1;
    if (len <= 3) return 1;
    if (len <= 5) return 2;
    if (len <= 7) return 3;
    if (len <= 9) return 4;
    if (len <= 12) return 5;
    return Math.ceil(len * 0.42);
  }

  function bionicFormatWord(rawToken) {
    // Preserve leading & trailing punctuation, brackets, quotes
    const match = rawToken.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+(?:['’\-][a-zA-Z0-9]+)*)([^a-zA-Z0-9]*)$/);
    if (!match) return rawToken;

    const prefix = match[1];
    const core = match[2];
    const suffix = match[3];

    // Don't format numbers alone
    if (/^\d+$/.test(core)) {
      return rawToken;
    }

    const fixLen = getFixationLength(core.length);
    const boldPart = core.slice(0, fixLen);
    const tailPart = core.slice(fixLen);

    return `${prefix}<span class="bionic-word"><b class="bionic-fixation">${boldPart}</b><span class="bionic-tail">${tailPart}</span></span>${suffix}`;
  }

  function bionicFormatText(text) {
    if (!text || !text.trim()) return text;
    return text.replace(/\S+/g, (token) => {
      // Don't modify URLs or code-like patterns
      if (/^(https?:\/\/|www\.|\S+@\S+|#|\/)/i.test(token)) {
        return token;
      }
      return bionicFormatWord(token);
    });
  }

  function applyBionicReading(containerEl) {
    if (!containerEl) return;
    removeBionicReading(containerEl); // clean any existing first

    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (['CODE', 'PRE', 'KBD', 'SCRIPT', 'STYLE', 'SVG', 'CANVAS', 'INPUT', 'TEXTAREA'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('pre, code, kbd, svg, canvas, .math-block, .katex, .mermaid-figure, .chart-figure, .bionic-text-chunk')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const original = node.nodeValue;
      if (!original || !original.trim()) return;
      const formattedHtml = bionicFormatText(original);
      if (formattedHtml !== original) {
        const span = document.createElement('span');
        span.className = 'bionic-text-chunk';
        span.innerHTML = formattedHtml;
        node.parentNode.replaceChild(span, node);
      }
    });
  }

  function removeBionicReading(containerEl) {
    if (!containerEl) return;
    const chunks = containerEl.querySelectorAll('.bionic-text-chunk');
    chunks.forEach((chunk) => {
      const textNode = document.createTextNode(chunk.textContent || '');
      chunk.parentNode.replaceChild(textNode, chunk);
    });
    containerEl.normalize();
  }

  global.FolioMarkdownEngine = {
    renderMarkdownDocument,
    resolveRelativePath,
    findTargetFileInWorkspace,
    slugifyHeading,
    applyBionicReading,
    removeBionicReading
  };
})(window);
