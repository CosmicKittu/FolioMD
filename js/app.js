/**
 * FolioMD — Main Application Controller
 * Coordinates:
 * - Homepage: Open Local Folder / Open Markdown File + Locally Cached Recent Section
 * - Markdown PDF Viewer:
 *   - Left Sidebar: Sectional Navigator (H1-H6 Outline + Scroll-Spy + Figures/Graphs Index)
 *   - Center Canvas: Dark PDF Sheet (Zoom, Page Mode, Font Mode, Find, Print, Prev/Next Footer)
 *   - Right Sidebar: VS Code File & Folder Explorer Tree
 *   - Cross-File Markdown Link Router + Back / Forward History Stack
 */
(function () {
  const MD_EXTENSIONS = /\.(md|markdown|mdx|txt|mkd)$/i;
  const IMG_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i;
  const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', '.venv', '__pycache__']);

  const state = {
    currentView: 'home', // 'home' | 'viewer'
    recentFilter: 'all', // 'all' | 'folder' | 'file' | 'pinned'
    recentSearch: '',
    recentList: [],

    // Active Viewer Workspace & File
    workspace: null,
    activeFilePath: '',
    sections: [],
    figures: [],
    expandedFolders: new Set(),

    // Navigation History Stack (Back / Forward)
    historyStack: [], // [{ workspaceId, filePath, anchor, scrollTop, title }]
    historyIndex: -1,
    isNavigatingHistory: false,

    // PDF Viewer Display Settings
    zoom: 100,
    pageMode: 'sheet', // 'sheet' | 'wide' | 'full'
    fontMode: localStorage.getItem('foliomd_font_mode') || 'sans', // 'sans' | 'serif' | 'mono' | 'opendyslexic' | 'lexend'
    sheetTheme: localStorage.getItem('foliomd_sheet_theme') || 'dark', // 'dark' | 'white' | 'sepia'
    codeTheme: localStorage.getItem('foliomd_code_theme') || 'dark', // 'dark' | 'paper'
    bionicReading: localStorage.getItem('foliomd_bionic_reading') === 'true',
    leftSidebarOpen: window.innerWidth > 1024,
    rightSidebarOpen: window.innerWidth > 1024,
    activeLeftTab: 'outline', // 'outline' | 'figures'

    // Document Tags & Tagged Content
    currentDocTags: [],
    tagsModalFilter: 'all',
    tagsModalSearch: '',

    // In-document Find
    findMatches: [],
    findActiveIdx: -1,

    // Lightbox Zoom
    lightboxZoom: 100,

    // Quick Open Modal
    quickOpenItems: [],
    quickOpenSelectedIdx: 0
  };

  // DOM References
  const dom = {};

  function cacheDom() {
    dom.fileInputMd = document.getElementById('file-input-md');
    dom.folderInputMd = document.getElementById('folder-input-md');
    dom.dropzoneOverlay = document.getElementById('dropzone-overlay');

    // Views
    dom.homeView = document.getElementById('home-view');
    dom.viewerView = document.getElementById('viewer-view');

    // Homepage Elements
    dom.cacheStatusText = document.getElementById('cache-status-text');
    dom.btnLoadDemo = document.getElementById('btn-load-demo');
    dom.btnEmptyLoadDemo = document.getElementById('btn-empty-load-demo');
    dom.cardOpenFolder = document.getElementById('card-open-folder');
    dom.cardOpenFile = document.getElementById('card-open-file');
    dom.recentCountBadge = document.getElementById('recent-count-badge');
    dom.recentTabs = document.querySelectorAll('.recent-tab');
    dom.recentSearchInput = document.getElementById('recent-search-input');
    dom.btnClearRecent = document.getElementById('btn-clear-recent');
    dom.recentItemsContainer = document.getElementById('recent-items-container');
    dom.recentEmptyState = document.getElementById('recent-empty-state');

    // Viewer Toolbar
    dom.btnToggleLeftSidebar = document.getElementById('btn-toggle-left-sidebar');
    dom.btnGoHome = document.getElementById('btn-go-home');
    dom.btnNavBack = document.getElementById('btn-nav-back');
    dom.btnNavForward = document.getElementById('btn-nav-forward');
    dom.btnNavHistory = document.getElementById('btn-nav-history');
    dom.historyPopover = document.getElementById('history-popover');
    dom.historyStepBadge = document.getElementById('history-step-badge');
    dom.historyList = document.getElementById('history-list');
    dom.viewerBreadcrumbs = document.getElementById('viewer-breadcrumbs');

    dom.btnZoomOut = document.getElementById('btn-zoom-out');
    dom.btnZoomReset = document.getElementById('btn-zoom-reset');
    dom.btnZoomIn = document.getElementById('btn-zoom-in');
    dom.btnPageMode = document.getElementById('btn-page-mode');
    dom.pageModeLabel = document.getElementById('page-mode-label');

    // Theme & Font & Bionic Controls
    dom.btnThemeMode = document.getElementById('btn-theme-mode');
    dom.themeModeIcon = document.getElementById('theme-mode-icon');
    dom.themeModeLabel = document.getElementById('theme-mode-label');
    dom.btnCodeTheme = document.getElementById('btn-code-theme');
    dom.codeThemeLabel = document.getElementById('code-theme-label');
    dom.btnFontMode = document.getElementById('btn-font-mode');
    dom.fontModeLabel = document.getElementById('font-mode-label');
    dom.btnBionicToggle = document.getElementById('btn-bionic-toggle');

    // Tags Menu Toolbar Button
    dom.btnTagsMenu = document.getElementById('btn-tags-menu');
    dom.taggedTotalBadge = document.getElementById('tagged-total-badge');

    dom.btnFindInDoc = document.getElementById('btn-find-in-doc');
    dom.btnQuickOpen = document.getElementById('btn-quick-open');
    dom.btnSyncDisk = document.getElementById('btn-sync-disk');
    dom.btnPrintPdf = document.getElementById('btn-print-pdf');
    dom.btnToggleRightSidebar = document.getElementById('btn-toggle-right-sidebar');

    // Left Sidebar (Sectional Navigator)
    dom.leftSidebar = document.getElementById('left-sidebar');
    dom.leftResizer = document.getElementById('left-resizer');
    dom.leftTabs = document.querySelectorAll('[data-left-tab]');
    dom.outlineCountBadge = document.getElementById('outline-count-badge');
    dom.figuresCountBadge = document.getElementById('figures-count-badge');
    dom.btnScrollTop = document.getElementById('btn-scroll-top');
    dom.readingProgressBar = document.getElementById('reading-progress-bar');
    dom.outlineFilterInput = document.getElementById('outline-filter-input');
    dom.leftPanelOutline = document.getElementById('left-panel-outline');
    dom.leftPanelFigures = document.getElementById('left-panel-figures');
    dom.outlineTree = document.getElementById('outline-tree');
    dom.figuresList = document.getElementById('figures-list');

    // Center Canvas (PDF Document Sheet)
    dom.findBar = document.getElementById('find-bar');
    dom.findInput = document.getElementById('find-input');
    dom.findMatchCount = document.getElementById('find-match-count');
    dom.btnFindPrev = document.getElementById('btn-find-prev');
    dom.btnFindNext = document.getElementById('btn-find-next');
    dom.btnFindClose = document.getElementById('btn-find-close');
    dom.documentViewport = document.getElementById('document-viewport');
    dom.documentZoomWrapper = document.getElementById('document-zoom-wrapper');
    dom.documentSheet = document.getElementById('document-sheet');
    dom.docTagBar = document.getElementById('doc-tag-bar');
    dom.tagPillButtons = document.querySelectorAll('.tag-pill-btn');
    dom.btnShortcutViewTags = document.getElementById('btn-shortcut-view-tags');
    dom.docTagsActiveCounter = document.getElementById('doc-tags-active-counter');
    dom.docFrontmatter = document.getElementById('doc-frontmatter');
    dom.markdownBody = document.getElementById('markdown-body');
    dom.docFooterNav = document.getElementById('doc-footer-nav');

    // Right Sidebar (VS Code Explorer)
    dom.rightSidebar = document.getElementById('right-sidebar');
    dom.rightResizer = document.getElementById('right-resizer');
    dom.btnExplorerOpenFile = document.getElementById('btn-explorer-open-file');
    dom.btnExplorerOpenFolder = document.getElementById('btn-explorer-open-folder');
    dom.btnExplorerExpandAll = document.getElementById('btn-explorer-expand-all');
    dom.btnExplorerCollapseAll = document.getElementById('btn-explorer-collapse-all');
    dom.explorerWorkspaceName = document.getElementById('explorer-workspace-name');
    dom.explorerFileCount = document.getElementById('explorer-file-count');
    dom.explorerFilterInput = document.getElementById('explorer-filter-input');
    dom.explorerTree = document.getElementById('explorer-tree');
    dom.btnToggleMiniRecent = document.getElementById('btn-toggle-mini-recent');
    dom.miniRecentList = document.getElementById('mini-recent-list');
    dom.mobileSidebarBackdrop = document.getElementById('mobile-sidebar-backdrop');

    // Status Bar
    dom.statusSourceText = document.getElementById('status-source-text');
    dom.statusFilePath = document.getElementById('status-file-path');
    dom.statusWords = document.getElementById('status-words');
    dom.statusReadtime = document.getElementById('status-readtime');
    dom.statusSections = document.getElementById('status-sections');
    dom.statusFigures = document.getElementById('status-figures');
    dom.statusZoom = document.getElementById('status-zoom');

    // Lightbox Modal
    dom.lightboxModal = document.getElementById('lightbox-modal');
    dom.lightboxCaption = document.getElementById('lightbox-caption');
    dom.lightboxContent = document.getElementById('lightbox-content');
    dom.btnLightboxZoomOut = document.getElementById('btn-lightbox-zoom-out');
    dom.btnLightboxZoomReset = document.getElementById('btn-lightbox-zoom-reset');
    dom.btnLightboxZoomIn = document.getElementById('btn-lightbox-zoom-in');
    dom.btnLightboxClose = document.getElementById('btn-lightbox-close');

    // Quick Open Modal
    dom.quickOpenModal = document.getElementById('quick-open-modal');
    dom.quickOpenInput = document.getElementById('quick-open-input');
    dom.quickOpenResults = document.getElementById('quick-open-results');

    // Tagged Content Modal
    dom.tagsModal = document.getElementById('tags-modal');
    dom.btnTagsDialogClose = document.getElementById('btn-tags-dialog-close');
    dom.tagsTabs = document.querySelectorAll('.tags-tab');
    dom.tagsSearchInput = document.getElementById('tags-search-input');
    dom.tagsResultsList = document.getElementById('tags-results-list');
    dom.tagsDialogCountBadge = document.getElementById('tags-dialog-count-badge');

    // Toast
    dom.toastContainer = document.getElementById('toast-container');
  }

  // =========================================================================
  // INITIALIZATION & SEEDING
  // =========================================================================
  async function initApp() {
    cacheDom();
    bindEvents();
    updateSidebarVisibilityUI();

    // Initialize display modes from preferences
    setSheetTheme(state.sheetTheme);
    setCodeTheme(state.codeTheme);
    setFontMode(state.fontMode);
    if (state.bionicReading) {
      if (dom.btnBionicToggle) dom.btnBionicToggle.classList.add('active');
      dom.documentSheet.classList.add('bionic-active');
    }

    await window.FolioCache.init();

    // Seed sample workspace on very first visit so Recent Cache is immediately demonstrable
    const seededKey = 'foliomd_seeded_sample_v1';
    if (!localStorage.getItem(seededKey) && window.FolioSampleData) {
      await window.FolioCache.saveWorkspace(window.FolioSampleData.SAMPLE_SINGLE_FILE);
      await window.FolioCache.saveWorkspace(window.FolioSampleData.SAMPLE_WORKSPACE);

      // Seed helpful sample tags
      await window.FolioCache.setDocumentTags('folder:FolioMD-Handbook', 'README.md', ['favorite', 'important'], {
        workspaceName: 'FolioMD-Handbook',
        fileName: 'README.md',
        title: 'FolioMD Handbook & Feature Showcase'
      });
      await window.FolioCache.setDocumentTags('folder:FolioMD-Handbook', 'guides/figures-and-graphs.md', ['like'], {
        workspaceName: 'FolioMD-Handbook',
        fileName: 'figures-and-graphs.md',
        title: 'Figures, Diagrams & Interactive Graphs'
      });
      await window.FolioCache.setDocumentTags('folder:FolioMD-Handbook', 'architecture/system-design.md', ['incomplete'], {
        workspaceName: 'FolioMD-Handbook',
        fileName: 'system-design.md',
        title: 'System Architecture & Local Cache Design'
      });

      try {
        localStorage.setItem(seededKey, '1');
      } catch (_) {}
    }

    updateTotalTaggedBadge();
    await refreshRecentList();
  }

  // =========================================================================
  // HOMEPAGE & RECENT CACHE MANAGEMENT
  // =========================================================================
  async function refreshRecentList() {
    state.recentList = await window.FolioCache.listRecent();
    renderRecentSection();
    renderMiniRecentDrawer();
  }

  function renderRecentSection() {
    const allItems = state.recentList || [];
    const totalCount = allItems.length;
    dom.recentCountBadge.textContent = `${totalCount} cached`;
    dom.cacheStatusText.textContent =
      totalCount > 0 ? `${totalCount} item${totalCount === 1 ? '' : 's'} in Local Cache` : 'Local Cache Ready';

    const query = state.recentSearch.trim().toLowerCase();
    const filtered = allItems.filter((item) => {
      if (state.recentFilter === 'folder' && item.type !== 'folder') return false;
      if (state.recentFilter === 'file' && item.type !== 'file') return false;
      if (state.recentFilter === 'pinned' && !item.pinned) return false;
      if (state.recentFilter === 'tagged') {
        const allTagged = window.FolioCache.listAllTaggedDocuments('all');
        const isTagged = allTagged.some((t) => t.workspaceId === item.id);
        if (!isTagged) return false;
      }
      if (query) {
        const hay = `${item.name} ${item.subtitle || ''} ${item.activeFilePath || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      dom.recentItemsContainer.innerHTML = '';
      dom.recentItemsContainer.classList.add('hidden');
      dom.recentEmptyState.classList.remove('hidden');
      return;
    }

    dom.recentEmptyState.classList.add('hidden');
    dom.recentItemsContainer.classList.remove('hidden');

    dom.recentItemsContainer.innerHTML = filtered
      .map((item) => {
        const isFolder = item.type === 'folder';
        const iconSvg = isFolder
          ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
          : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

        const subtitle =
          item.subtitle ||
          (isFolder
            ? `${item.fileCount || 1} files • Last viewed: ${item.activeFilePath || 'README.md'}`
            : `${formatBytes(item.totalBytes || 0)} • Markdown File`);

        return `
          <div class="recent-item-card" data-ws-id="${escapeAttr(item.id)}" role="button" tabindex="0">
            <div class="recent-item-icon ${isFolder ? 'type-folder' : 'type-file'}">
              ${iconSvg}
            </div>
            <div class="recent-item-body">
              <div class="recent-item-top">
                <span class="recent-item-name" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
                <span class="recent-type-pill ${isFolder ? 'folder' : 'file'}">${isFolder ? 'Folder' : 'File'}</span>
              </div>
              <div class="recent-item-meta" title="${escapeAttr(subtitle)}">${escapeHtml(subtitle)}</div>
              <div class="recent-item-footer">
                <span class="recent-cache-tag">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Cached · ${formatRelativeTime(item.lastOpened)}
                </span>
                <div class="recent-item-actions">
                  <button type="button" class="recent-action-btn btn-pin-recent ${item.pinned ? 'pinned' : ''}" data-ws-id="${escapeAttr(item.id)}" title="${item.pinned ? 'Unpin' : 'Pin to top'}">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="${item.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                  <button type="button" class="recent-action-btn delete btn-delete-recent" data-ws-id="${escapeAttr(item.id)}" title="Remove from local cache">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Attach listeners to cards
    dom.recentItemsContainer.querySelectorAll('.recent-item-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.recent-action-btn')) return;
        const wsId = card.getAttribute('data-ws-id');
        openCachedWorkspaceById(wsId);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const wsId = card.getAttribute('data-ws-id');
          openCachedWorkspaceById(wsId);
        }
      });
    });

    dom.recentItemsContainer.querySelectorAll('.btn-pin-recent').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wsId = btn.getAttribute('data-ws-id');
        const ws = await window.FolioCache.getWorkspace(wsId);
        if (ws) {
          await window.FolioCache.touchWorkspace(wsId, { pinned: !ws.pinned, keepTimestamp: true });
          await refreshRecentList();
          showToast(ws.pinned ? 'Removed pin' : 'Pinned to top of Recent');
        }
      });
    });

    dom.recentItemsContainer.querySelectorAll('.btn-delete-recent').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wsId = btn.getAttribute('data-ws-id');
        await window.FolioCache.removeWorkspace(wsId);
        await refreshRecentList();
        showToast('Removed from local cache');
      });
    });
  }

  function renderMiniRecentDrawer() {
    if (!dom.miniRecentList) return;
    const list = (state.recentList || []).slice(0, 10);
    if (!list.length) {
      dom.miniRecentList.innerHTML = `<div class="sidebar-empty-note">No cached items</div>`;
      return;
    }

    dom.miniRecentList.innerHTML = list
      .map(
        (item) => `
        <button type="button" class="mini-recent-item" data-ws-id="${escapeAttr(item.id)}" title="${escapeAttr(item.name)}">
          <span class="tree-icon ${item.type === 'folder' ? 'folder-icon' : 'md-icon'}">
            ${
              item.type === 'folder'
                ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
                : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>'
            }
          </span>
          <span>${escapeHtml(item.name)}</span>
        </button>
      `
      )
      .join('');

    dom.miniRecentList.querySelectorAll('.mini-recent-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wsId = btn.getAttribute('data-ws-id');
        openCachedWorkspaceById(wsId);
      });
    });
  }

  async function openCachedWorkspaceById(wsId) {
    let ws = await window.FolioCache.getWorkspace(wsId);
    if (!ws && wsId === 'folder:FolioMD-Handbook' && window.FolioSampleData) {
      ws = await window.FolioCache.saveWorkspace(window.FolioSampleData.SAMPLE_WORKSPACE);
    }
    if (!ws) {
      showToast('Cached item not found');
      await refreshRecentList();
      return;
    }

    await window.FolioCache.touchWorkspace(ws.id, {});
    await refreshRecentList();

    const entryFile = chooseDefaultMarkdownFile(ws.files, ws.activeFilePath);
    if (!entryFile) {
      showToast('No Markdown files found in this workspace');
      return;
    }

    await loadWorkspaceIntoViewer(ws, entryFile.path, { resetHistory: true });
  }

  // =========================================================================
  // FILE & FOLDER SELECTION (FILE SYSTEM ACCESS API + FALLBACK INPUTS + DND)
  // =========================================================================
  async function triggerOpenFolder() {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        await ingestDirectoryHandle(dirHandle);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        // Fallback to webkitdirectory input if permission or security context blocked
      }
    }
    dom.folderInputMd.value = '';
    dom.folderInputMd.click();
  }

  async function triggerOpenFile() {
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Markdown Documents',
              accept: {
                'text/markdown': ['.md', '.markdown', '.mdx', '.mkd'],
                'text/plain': ['.txt']
              }
            }
          ]
        });
        if (handles && handles.length > 0) {
          const files = [];
          for (const h of handles) {
            files.push(await h.getFile());
          }
          await ingestFileList(files, handles.length === 1 ? handles[0] : null);
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    dom.fileInputMd.value = '';
    dom.fileInputMd.click();
  }

  async function ingestDirectoryHandle(dirHandle) {
    showToast(`Reading folder "${dirHandle.name}"...`);
    const filesMap = {};
    let totalBytes = 0;
    let mdCount = 0;

    async function walk(handle, prefix) {
      for await (const entry of handle.values()) {
        if (entry.kind === 'directory') {
          if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
          await walk(entry, prefix ? `${prefix}/${entry.name}` : entry.name);
        } else if (entry.kind === 'file') {
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (MD_EXTENSIONS.test(entry.name)) {
            const file = await entry.getFile();
            const content = await file.text();
            filesMap[relPath] = {
              path: relPath,
              name: entry.name,
              kind: 'markdown',
              size: file.size,
              content
            };
            totalBytes += file.size;
            mdCount++;
          } else if (IMG_EXTENSIONS.test(entry.name)) {
            const file = await entry.getFile();
            if (file.size <= 8 * 1024 * 1024) {
              const dataUrl = await readFileAsDataUrl(file);
              filesMap[relPath] = {
                path: relPath,
                name: entry.name,
                kind: 'image',
                size: file.size,
                dataUrl
              };
              totalBytes += file.size;
            }
          }
        }
      }
    }

    await walk(dirHandle, '');

    if (mdCount === 0) {
      showToast(`No Markdown (.md) files found inside "${dirHandle.name}"`);
      return;
    }

    const defaultMd = chooseDefaultMarkdownFile(filesMap, '');
    const workspace = await window.FolioCache.saveWorkspace({
      id: `folder:${dirHandle.name}`,
      type: 'folder',
      name: dirHandle.name,
      subtitle: `${mdCount} Markdown file${mdCount === 1 ? '' : 's'} • ${formatBytes(totalBytes)}`,
      activeFilePath: defaultMd.path,
      fileCount: mdCount,
      totalBytes,
      files: filesMap,
      handle: dirHandle
    });

    await refreshRecentList();
    await loadWorkspaceIntoViewer(workspace, defaultMd.path, { resetHistory: true });
    showToast(`Cached folder "${dirHandle.name}" (${mdCount} Markdown files)`);
  }

  async function ingestFolderInputFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const firstRel = (files[0].webkitRelativePath || files[0].name).replace(/\\/g, '/');
    const rootFolderName = firstRel.includes('/') ? firstRel.split('/')[0] : 'Local-Folder';

    const filesMap = {};
    let totalBytes = 0;
    let mdCount = 0;

    for (const file of files) {
      const fullRel = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
      const parts = fullRel.split('/');
      if (parts.some((p) => IGNORED_DIRS.has(p) || (p.startsWith('.') && p.length > 1))) continue;

      const relPath = parts.length > 1 ? parts.slice(1).join('/') : parts[0];

      if (MD_EXTENSIONS.test(file.name)) {
        const content = await file.text();
        filesMap[relPath] = {
          path: relPath,
          name: file.name,
          kind: 'markdown',
          size: file.size,
          content
        };
        totalBytes += file.size;
        mdCount++;
      } else if (IMG_EXTENSIONS.test(file.name) && file.size <= 8 * 1024 * 1024) {
        const dataUrl = await readFileAsDataUrl(file);
        filesMap[relPath] = {
          path: relPath,
          name: file.name,
          kind: 'image',
          size: file.size,
          dataUrl
        };
        totalBytes += file.size;
      }
    }

    if (mdCount === 0) {
      showToast(`No Markdown (.md) files found in "${rootFolderName}"`);
      return;
    }

    const defaultMd = chooseDefaultMarkdownFile(filesMap, '');
    const workspace = await window.FolioCache.saveWorkspace({
      id: `folder:${rootFolderName}`,
      type: 'folder',
      name: rootFolderName,
      subtitle: `${mdCount} Markdown file${mdCount === 1 ? '' : 's'} • ${formatBytes(totalBytes)}`,
      activeFilePath: defaultMd.path,
      fileCount: mdCount,
      totalBytes,
      files: filesMap
    });

    await refreshRecentList();
    await loadWorkspaceIntoViewer(workspace, defaultMd.path, { resetHistory: true });
    showToast(`Cached folder "${rootFolderName}" (${mdCount} Markdown files)`);
  }

  async function ingestFileList(fileList, singleHandle = null) {
    const files = Array.from(fileList || []).filter((f) => MD_EXTENSIONS.test(f.name) || f.type.startsWith('text/'));
    if (!files.length) {
      showToast('Please select a Markdown (.md, .markdown, .mdx, .txt) file');
      return;
    }

    if (files.length === 1) {
      const file = files[0];
      const content = await file.text();
      const ws = await window.FolioCache.saveWorkspace({
        id: `file:${file.name}`,
        type: 'file',
        name: file.name,
        subtitle: `${formatBytes(file.size)} • Standalone Markdown File`,
        activeFilePath: file.name,
        fileCount: 1,
        totalBytes: file.size,
        handle: singleHandle,
        files: {
          [file.name]: {
            path: file.name,
            name: file.name,
            kind: 'markdown',
            size: file.size,
            content
          }
        }
      });

      await refreshRecentList();
      await loadWorkspaceIntoViewer(ws, file.name, { resetHistory: true });
      showToast(`Opened & cached "${file.name}"`);
      return;
    }

    // Multiple files selected together -> group as a bundle workspace
    const filesMap = {};
    let totalBytes = 0;
    for (const file of files) {
      const content = await file.text();
      filesMap[file.name] = {
        path: file.name,
        name: file.name,
        kind: 'markdown',
        size: file.size,
        content
      };
      totalBytes += file.size;
    }

    const bundleName = `${files[0].name} (+${files.length - 1} more)`;
    const ws = await window.FolioCache.saveWorkspace({
      id: `folder:${bundleName}`,
      type: 'folder',
      name: bundleName,
      subtitle: `${files.length} Markdown files • ${formatBytes(totalBytes)}`,
      activeFilePath: files[0].name,
      fileCount: files.length,
      totalBytes,
      files: filesMap
    });

    await refreshRecentList();
    await loadWorkspaceIntoViewer(ws, files[0].name, { resetHistory: true });
    showToast(`Opened ${files.length} Markdown files`);
  }

  function chooseDefaultMarkdownFile(filesMap, preferredPath) {
    const mdFiles = Object.values(filesMap || {}).filter((f) => f.kind === 'markdown');
    if (!mdFiles.length) return null;
    if (preferredPath && filesMap[preferredPath] && filesMap[preferredPath].kind === 'markdown') {
      return filesMap[preferredPath];
    }
    const readme = mdFiles.find((f) => /^readme\.md$/i.test(f.path) || /^index\.md$/i.test(f.path));
    if (readme) return readme;
    return mdFiles.sort((a, b) => a.path.localeCompare(b.path))[0];
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // VIEWER PAGE: LOADING WORKSPACE, RENDERING & HISTORY NAVIGATION
  // =========================================================================
  async function loadWorkspaceIntoViewer(workspace, filePath, options = {}) {
    state.workspace = workspace;

    // Expand all folders in the workspace initially so tree navigation is clear
    if (options.resetHistory) {
      state.expandedFolders.clear();
      Object.keys(workspace.files || {}).forEach((p) => {
        const parts = p.split('/');
        parts.pop();
        let acc = '';
        for (const seg of parts) {
          acc = acc ? `${acc}/${seg}` : seg;
          state.expandedFolders.add(acc);
        }
      });
    }

    switchView('viewer');

    if (workspace.handle) {
      dom.btnSyncDisk.classList.remove('hidden');
    } else {
      dom.btnSyncDisk.classList.add('hidden');
    }

    await openMarkdownFileInCurrentWorkspace(filePath, {
      anchor: options.anchor || '',
      scrollTop: options.scrollTop || 0,
      resetHistory: Boolean(options.resetHistory),
      skipHistoryPush: Boolean(options.skipHistoryPush)
    });
  }

  async function openMarkdownFileInCurrentWorkspace(filePath, options = {}) {
    if (!state.workspace || !state.workspace.files) return;

    const fileObj = state.workspace.files[filePath];
    if (!fileObj || fileObj.kind !== 'markdown') {
      showToast(`Markdown file not found: ${filePath}`);
      return;
    }

    // Record scrollTop of current history entry before moving away
    if (
      !options.resetHistory &&
      !options.skipHistoryPush &&
      state.historyIndex >= 0 &&
      state.historyStack[state.historyIndex]
    ) {
      state.historyStack[state.historyIndex].scrollTop = dom.documentViewport.scrollTop;
    }

    state.activeFilePath = filePath;

    // Ensure parent directories of active file are expanded in VS Code Explorer
    const segments = filePath.split('/');
    segments.pop();
    let dirAcc = '';
    for (const seg of segments) {
      dirAcc = dirAcc ? `${dirAcc}/${seg}` : seg;
      state.expandedFolders.add(dirAcc);
    }

    // Persist last active file in cache
    state.workspace.activeFilePath = filePath;
    window.FolioCache.touchWorkspace(state.workspace.id, { activeFilePath: filePath, keepTimestamp: true });

    // Manage History Stack (Back / Forward)
    if (options.resetHistory) {
      state.historyStack = [
        {
          workspaceId: state.workspace.id,
          filePath,
          anchor: options.anchor || '',
          scrollTop: 0,
          title: fileObj.name
        }
      ];
      state.historyIndex = 0;
    } else if (!options.skipHistoryPush) {
      const currentEntry = state.historyStack[state.historyIndex];
      const isSameTarget =
        currentEntry &&
        currentEntry.workspaceId === state.workspace.id &&
        currentEntry.filePath === filePath &&
        (currentEntry.anchor || '') === (options.anchor || '');

      if (!isSameTarget) {
        state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        state.historyStack.push({
          workspaceId: state.workspace.id,
          filePath,
          anchor: options.anchor || '',
          scrollTop: 0,
          title: options.anchor ? `${fileObj.name}#${options.anchor}` : fileObj.name
        });
        state.historyIndex = state.historyStack.length - 1;
      }
    }

    updateHistoryButtonsUI();
    renderBreadcrumbs();
    renderExplorerTree();

    // Render Markdown into PDF Document Sheet
    const renderResult = await window.FolioMarkdownEngine.renderMarkdownDocument({
      rawMarkdown: fileObj.content || '',
      currentFilePath: filePath,
      workspace: state.workspace,
      containerEl: dom.markdownBody,
      frontmatterEl: dom.docFrontmatter,
      onInternalLinkClick: handleInternalMarkdownLinkClick,
      onAnchorLinkClick: handleAnchorLinkClick,
      onInspectFigure: openLightboxModal
    });

    state.sections = renderResult.sections || [];
    state.figures = renderResult.figures || [];

    renderOutlineNavigator();
    renderFiguresNavigator();
    renderDocumentFooterNav();
    updateStatusBar(renderResult.stats);

    // Sync active document tags in tag bar
    await updateDocumentTagsUI();

    // Re-apply Bionic Reading if active
    if (state.bionicReading) {
      window.FolioMarkdownEngine.applyBionicReading(dom.markdownBody);
    }

    // Scroll to target anchor or scrollTop
    if (options.anchor) {
      scrollToSectionAnchor(options.anchor, false);
    } else if (typeof options.scrollTop === 'number' && options.scrollTop > 0) {
      dom.documentViewport.scrollTop = options.scrollTop;
    } else {
      dom.documentViewport.scrollTop = 0;
    }

    updateScrollSpyAndProgress();
  }

  /**
   * Handle clicking an internal link to another Markdown file (e.g. ./guides/math.md#tables)
   */
  async function handleInternalMarkdownLinkClick({ rawHref, targetPath, targetHash }) {
    if (!state.workspace) return;

    const targetFile = window.FolioMarkdownEngine.findTargetFileInWorkspace(
      state.workspace,
      state.activeFilePath,
      targetPath
    );

    if (targetFile) {
      await openMarkdownFileInCurrentWorkspace(targetFile.path, {
        anchor: targetHash || ''
      });
      return;
    }

    // Also check if another cached workspace matches that file name
    const recentList = await window.FolioCache.listRecent();
    const targetBaseName = targetPath.split('/').pop().toLowerCase();
    for (const item of recentList) {
      const ws = await window.FolioCache.getWorkspace(item.id);
      if (!ws || !ws.files) continue;
      const match = Object.values(ws.files).find(
        (f) =>
          f.kind === 'markdown' &&
          (f.name.toLowerCase() === targetBaseName || f.name.toLowerCase() === `${targetBaseName}.md`)
      );
      if (match) {
        state.workspace = ws;
        await openMarkdownFileInCurrentWorkspace(match.path, { anchor: targetHash || '' });
        showToast(`Switched to cached workspace "${ws.name}"`);
        return;
      }
    }

    showToast(`Linked Markdown file "${rawHref}" is not in the currently loaded folder`);
  }

  /**
   * Handle clicking an in-page section link (#heading-slug)
   */
  function handleAnchorLinkClick(anchorSlug) {
    if (!anchorSlug) return;

    // Record current scroll position & push anchor step to history
    if (state.historyIndex >= 0 && state.historyStack[state.historyIndex]) {
      state.historyStack[state.historyIndex].scrollTop = dom.documentViewport.scrollTop;
    }

    const fileName = state.activeFilePath.split('/').pop();
    state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
    state.historyStack.push({
      workspaceId: state.workspace.id,
      filePath: state.activeFilePath,
      anchor: anchorSlug,
      scrollTop: 0,
      title: `${fileName}#${anchorSlug}`
    });
    state.historyIndex = state.historyStack.length - 1;
    updateHistoryButtonsUI();

    scrollToSectionAnchor(anchorSlug, true);
  }

  function scrollToSectionAnchor(anchorSlug, smooth = true) {
    if (!anchorSlug) return;
    const targetEl =
      document.getElementById(anchorSlug) ||
      document.getElementById(window.FolioMarkdownEngine.slugifyHeading(anchorSlug));

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      targetEl.classList.remove('heading-flash');
      void targetEl.offsetWidth;
      targetEl.classList.add('heading-flash');
    }
  }

  /**
   * Back / Forward Navigation History Actions
   */
  async function navigateHistory(delta) {
    const targetIdx = state.historyIndex + delta;
    if (targetIdx < 0 || targetIdx >= state.historyStack.length) return;
    await jumpToHistoryIndex(targetIdx);
  }

  async function jumpToHistoryIndex(targetIdx) {
    if (targetIdx < 0 || targetIdx >= state.historyStack.length) return;

    // Save current scrollTop before leaving
    if (state.historyIndex >= 0 && state.historyStack[state.historyIndex]) {
      state.historyStack[state.historyIndex].scrollTop = dom.documentViewport.scrollTop;
    }

    state.historyIndex = targetIdx;
    const entry = state.historyStack[targetIdx];

    if (!state.workspace || state.workspace.id !== entry.workspaceId) {
      const ws = await window.FolioCache.getWorkspace(entry.workspaceId);
      if (ws) state.workspace = ws;
    }

    await openMarkdownFileInCurrentWorkspace(entry.filePath, {
      anchor: entry.anchor || '',
      scrollTop: entry.scrollTop || 0,
      skipHistoryPush: true
    });
  }

  function updateHistoryButtonsUI() {
    const canBack = state.historyIndex > 0;
    const canForward = state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1;

    dom.btnNavBack.disabled = !canBack;
    dom.btnNavForward.disabled = !canForward;

    if (canBack) {
      const prev = state.historyStack[state.historyIndex - 1];
      dom.btnNavBack.title = `Back to ${prev.title} (Alt+Left)`;
    } else {
      dom.btnNavBack.title = 'Navigate Back (Alt+Left)';
    }

    if (canForward) {
      const next = state.historyStack[state.historyIndex + 1];
      dom.btnNavForward.title = `Forward to ${next.title} (Alt+Right)`;
    } else {
      dom.btnNavForward.title = 'Navigate Forward (Alt+Right)';
    }

    dom.historyStepBadge.textContent = `${state.historyIndex + 1} / ${ Math.max(1, state.historyStack.length) }`;

    dom.historyList.innerHTML = state.historyStack
      .map(
        (item, idx) => `
        <button type="button" class="history-item ${idx === state.historyIndex ? 'current' : ''}" data-hist-idx="${idx}">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          </svg>
          <span class="history-item-path">${escapeHtml(item.title)}</span>
        </button>
      `
      )
      .reverse()
      .join('');

    dom.historyList.querySelectorAll('.history-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-hist-idx'));
        dom.historyPopover.classList.add('hidden');
        jumpToHistoryIndex(idx);
      });
    });
  }

  // =========================================================================
  // LEFT SIDEBAR: SECTIONAL NAVIGATOR (TABLE OF CONTENTS & FIGURES)
  // =========================================================================
  function renderOutlineNavigator() {
    const filter = (dom.outlineFilterInput.value || '').trim().toLowerCase();
    const list = state.sections.filter((s) => !filter || s.text.toLowerCase().includes(filter));

    dom.outlineCountBadge.textContent = String(state.sections.length);

    if (list.length === 0) {
      dom.outlineTree.innerHTML = `<div class="sidebar-empty-note">${
        state.sections.length === 0 ? 'No section headings in this file' : 'No matching sections'
      }</div>`;
      return;
    }

    dom.outlineTree.innerHTML = list
      .map(
        (sec) => `
        <a class="outline-item level-${sec.level}" data-section-id="${escapeAttr(sec.id)}" href="#${escapeAttr(sec.id)}" title="${escapeAttr(sec.text)}">
          <span class="outline-level-badge">H${sec.level}</span>
          <span class="outline-text">${escapeHtml(sec.text)}</span>
        </a>
      `
      )
      .join('');

    dom.outlineTree.querySelectorAll('.outline-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-section-id');
        handleAnchorLinkClick(id);
        if (window.innerWidth <= 1024) {
          state.leftSidebarOpen = false;
          updateSidebarVisibilityUI();
        }
      });
    });
  }

  function renderFiguresNavigator() {
    const filter = (dom.outlineFilterInput.value || '').trim().toLowerCase();
    const list = state.figures.filter((f) => !filter || f.title.toLowerCase().includes(filter));

    dom.figuresCountBadge.textContent = String(state.figures.length);

    if (list.length === 0) {
      dom.figuresList.innerHTML = `<div class="sidebar-empty-note">${
        state.figures.length === 0
          ? 'No figures, graphs, or tables in this document'
          : 'No matching figures'
      }</div>`;
      return;
    }

    dom.figuresList.innerHTML = list
      .map(
        (fig) => `
        <button type="button" class="figure-nav-card" data-fig-id="${escapeAttr(fig.id)}">
          <span class="figure-nav-badge ${escapeAttr(fig.type)}">${escapeHtml(fig.badge)}</span>
          <span class="figure-nav-title">${escapeHtml(fig.title)}</span>
        </button>
      `
      )
      .join('');

    dom.figuresList.querySelectorAll('.figure-nav-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const figId = btn.getAttribute('data-fig-id');
        scrollToSectionAnchor(figId, true);
        if (window.innerWidth <= 1024) {
          state.leftSidebarOpen = false;
          updateSidebarVisibilityUI();
        }
      });
    });
  }

  function updateScrollSpyAndProgress() {
    const vp = dom.documentViewport;
    if (!vp) return;

    const maxScroll = Math.max(1, vp.scrollHeight - vp.clientHeight);
    const pct = Math.min(100, Math.max(0, (vp.scrollTop / maxScroll) * 100));
    dom.readingProgressBar.style.width = `${pct}%`;

    if (!state.sections.length) return;

    const vpRect = vp.getBoundingClientRect();
    let activeId = state.sections[0].id;

    for (const sec of state.sections) {
      const el = document.getElementById(sec.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top - vpRect.top <= 110) {
        activeId = sec.id;
      } else {
        break;
      }
    }

    dom.outlineTree.querySelectorAll('.outline-item').forEach((item) => {
      const isMatch = item.getAttribute('data-section-id') === activeId;
      item.classList.toggle('active', isMatch);
    });
  }

  // =========================================================================
  // RIGHT SIDEBAR: VS CODE FILE & FOLDER EXPLORER TREE
  // =========================================================================
  function buildFolderTreeStructure(filesMap, filterQuery) {
    const root = { name: '', path: '', childrenFolders: {}, childrenFiles: [] };
    const q = (filterQuery || '').trim().toLowerCase();

    Object.values(filesMap || {}).forEach((file) => {
      if (q && !file.path.toLowerCase().includes(q)) return;
      const parts = file.path.split('/');
      const fileName = parts.pop();
      let curr = root;
      let pathAcc = '';

      for (const dirName of parts) {
        pathAcc = pathAcc ? `${pathAcc}/${dirName}` : dirName;
        if (!curr.childrenFolders[dirName]) {
          curr.childrenFolders[dirName] = {
            name: dirName,
            path: pathAcc,
            childrenFolders: {},
            childrenFiles: []
          };
        }
        curr = curr.childrenFolders[dirName];
      }
      curr.childrenFiles.push(Object.assign({}, file, { name: fileName }));
    });

    return root;
  }

  function renderExplorerTree() {
    if (!state.workspace) return;

    const filesMap = state.workspace.files || {};
    const allFiles = Object.values(filesMap);
    const mdCount = allFiles.filter((f) => f.kind === 'markdown').length;

    dom.explorerWorkspaceName.textContent = state.workspace.name;
    dom.explorerFileCount.textContent = `${mdCount} md`;

    const filterQuery = (dom.explorerFilterInput.value || '').trim();
    const treeRoot = buildFolderTreeStructure(filesMap, filterQuery);

    function renderNode(folderNode, depth) {
      let html = '';
      const subFolders = Object.values(folderNode.childrenFolders).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const files = folderNode.childrenFiles.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'markdown' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const sub of subFolders) {
        const isExpanded = filterQuery ? true : state.expandedFolders.has(sub.path);
        const indentPx = 10 + depth * 14;
        html += `
          <div class="tree-folder-group">
            <div class="tree-row folder-row" data-folder-path="${escapeAttr(sub.path)}" style="padding-left:${indentPx}px">
              <span class="tree-chevron ${isExpanded ? 'expanded' : ''}">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </span>
              <span class="tree-icon folder-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </span>
              <span class="tree-label" title="${escapeAttr(sub.path)}">${escapeHtml(sub.name)}</span>
            </div>
            <div class="tree-children ${isExpanded ? '' : 'collapsed'}">
              ${renderNode(sub, depth + 1)}
            </div>
          </div>
        `;
      }

      for (const file of files) {
        const isActive = file.path === state.activeFilePath;
        const indentPx = 10 + depth * 14;
        const isMd = file.kind === 'markdown';
        const iconSvg = isMd
          ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
          : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

        const fileTags = isMd && state.workspace ? window.FolioCache.getDocumentTags(state.workspace.id, file.path) : [];
        const tagDotsHtml = fileTags
          .map((t) => `<span class="tree-tag-dot ${t}" title="Tag: ${t}"></span>`)
          .join('');

        html += `
          <div class="tree-row file-row ${isActive ? 'active' : ''}" data-file-path="${escapeAttr(file.path)}" data-file-kind="${escapeAttr(file.kind)}" style="padding-left:${indentPx}px" title="${escapeAttr(file.path)}">
            <span class="tree-chevron empty"></span>
            <span class="tree-icon ${isMd ? 'md-icon' : 'img-icon'}">${iconSvg}</span>
            <span class="tree-label">${escapeHtml(file.name)}</span>
            ${tagDotsHtml}
          </div>
        `;
      }

      return html;
    }

    const treeHtml = renderNode(treeRoot, 0);
    dom.explorerTree.innerHTML =
      treeHtml || `<div class="sidebar-empty-note">No files match filter</div>`;

    // Folder expand/collapse clicks
    dom.explorerTree.querySelectorAll('.folder-row').forEach((row) => {
      row.addEventListener('click', () => {
        const folderPath = row.getAttribute('data-folder-path');
        if (state.expandedFolders.has(folderPath)) {
          state.expandedFolders.delete(folderPath);
        } else {
          state.expandedFolders.add(folderPath);
        }
        renderExplorerTree();
      });
    });

    // File clicks
    dom.explorerTree.querySelectorAll('.file-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const filePath = row.getAttribute('data-file-path');
        const kind = row.getAttribute('data-file-kind');
        if (kind === 'markdown') {
          await openMarkdownFileInCurrentWorkspace(filePath);
          if (window.innerWidth <= 1024) {
            state.rightSidebarOpen = false;
            updateSidebarVisibilityUI();
          }
        } else if (kind === 'image') {
          const imgFile = state.workspace.files[filePath];
          if (imgFile && imgFile.dataUrl) {
            openLightboxModal({
              title: imgFile.path,
              html: `<img src="${imgFile.dataUrl}" alt="${escapeAttr(imgFile.name)}" />`
            });
          }
        }
      });
    });
  }

  // =========================================================================
  // BREADCRUMBS, FOOTER NAV & STATUS BAR
  // =========================================================================
  function renderBreadcrumbs() {
    if (!state.workspace) return;
    const parts = (state.activeFilePath || '').split('/').filter(Boolean);
    const segmentsHtml = [
      `<span class="breadcrumb-segment">${escapeHtml(state.workspace.name)}</span>`
    ];

    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      segmentsHtml.push(`<span class="breadcrumb-sep">/</span>`);
      segmentsHtml.push(
        `<span class="breadcrumb-segment ${isLast ? 'active' : ''}">${escapeHtml(part)}</span>`
      );
    });

    dom.viewerBreadcrumbs.innerHTML = segmentsHtml.join('');
  }

  function renderDocumentFooterNav() {
    if (!state.workspace || !state.workspace.files) {
      dom.docFooterNav.innerHTML = '';
      return;
    }

    const mdFiles = Object.values(state.workspace.files)
      .filter((f) => f.kind === 'markdown')
      .sort((a, b) => a.path.localeCompare(b.path));

    if (mdFiles.length <= 1) {
      dom.docFooterNav.innerHTML = '';
      return;
    }

    const currIdx = mdFiles.findIndex((f) => f.path === state.activeFilePath);
    const prevFile = currIdx > 0 ? mdFiles[currIdx - 1] : null;
    const nextFile = currIdx >= 0 && currIdx < mdFiles.length - 1 ? mdFiles[currIdx + 1] : null;

    dom.docFooterNav.innerHTML = `
      <div>
        ${
          prevFile
            ? `<button type="button" class="doc-nav-card prev" data-nav-path="${escapeAttr(prevFile.path)}" style="width:100%">
                <span class="doc-nav-dir">← Previous in Folder</span>
                <span class="doc-nav-title">${escapeHtml(prevFile.path)}</span>
              </button>`
            : ''
        }
      </div>
      <div>
        ${
          nextFile
            ? `<button type="button" class="doc-nav-card next" data-nav-path="${escapeAttr(nextFile.path)}" style="width:100%">
                <span class="doc-nav-dir">Next in Folder →</span>
                <span class="doc-nav-title">${escapeHtml(nextFile.path)}</span>
              </button>`
            : ''
        }
      </div>
    `;

    dom.docFooterNav.querySelectorAll('.doc-nav-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-path');
        openMarkdownFileInCurrentWorkspace(target);
      });
    });
  }

  function updateStatusBar(stats = {}) {
    dom.statusSourceText.textContent =
      state.workspace && state.workspace.type === 'folder' ? 'Cached Folder' : 'Cached File';
    dom.statusFilePath.textContent = state.activeFilePath || '';
    dom.statusWords.textContent = `${stats.words || 0} words`;
    dom.statusReadtime.textContent = `${stats.readTimeMin || 1} min read`;
    dom.statusSections.textContent = `${stats.sectionsCount || 0} sections`;
    dom.statusFigures.textContent = `${stats.figuresCount || 0} figures`;
    dom.statusZoom.textContent = `${state.zoom}%`;
  }

  // =========================================================================
  // PDF VIEWER DISPLAY CONTROLS (ZOOM, PAGE WIDTH, FONT, FIND, LIGHTBOX)
  // =========================================================================
  function setZoom(newZoom) {
    state.zoom = Math.min(200, Math.max(50, newZoom));
    dom.btnZoomReset.textContent = `${state.zoom}%`;
    dom.statusZoom.textContent = `${state.zoom}%`;
    dom.documentSheet.style.zoom = `${state.zoom}%`;
  }

  function cyclePageMode() {
    const modes = ['sheet', 'wide', 'full'];
    const labels = { sheet: 'Page View', wide: 'Wide View', full: 'Full Width' };
    const nextIdx = (modes.indexOf(state.pageMode) + 1) % modes.length;
    state.pageMode = modes[nextIdx];

    dom.documentSheet.classList.remove('page-mode-sheet', 'page-mode-wide', 'page-mode-full');
    dom.documentSheet.classList.add(`page-mode-${state.pageMode}`);
    dom.pageModeLabel.textContent = labels[state.pageMode];
  }

  // =========================================================================
  // TYPOGRAPHY (SANS, SERIF, MONO, DYSLEXIC, LEXEND)
  // =========================================================================
  const FONT_MODES = ['sans', 'serif', 'mono', 'opendyslexic', 'lexend'];
  const FONT_LABELS = {
    sans: 'Sans',
    serif: 'Serif',
    mono: 'Mono',
    opendyslexic: 'Dyslexic',
    lexend: 'Lexend'
  };

  function setFontMode(font) {
    state.fontMode = FONT_MODES.includes(font) ? font : 'sans';
    try {
      localStorage.setItem('foliomd_font_mode', state.fontMode);
    } catch (_) {}

    dom.documentSheet.classList.remove(
      'font-mode-sans',
      'font-mode-serif',
      'font-mode-mono',
      'font-mode-opendyslexic',
      'font-mode-lexend'
    );
    dom.documentSheet.classList.add(`font-mode-${state.fontMode}`);
    if (dom.fontModeLabel) {
      dom.fontModeLabel.textContent = FONT_LABELS[state.fontMode] || 'Sans';
    }
  }

  function cycleFontMode() {
    const currIdx = FONT_MODES.indexOf(state.fontMode);
    const nextIdx = (currIdx + 1) % FONT_MODES.length;
    setFontMode(FONT_MODES[nextIdx]);
    showToast(`Font: ${FONT_LABELS[state.fontMode]}`);
  }

  // =========================================================================
  // READING SHEET THEMES: DARK (DEFAULT), WHITE PAPER, AND SEPIA/YELLOW MODE
  // =========================================================================
  const THEME_MODES = ['dark', 'white', 'sepia'];
  const THEME_LABELS = { dark: 'Dark', white: 'White', sepia: 'Yellow' };
  const THEME_ICONS = {
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
    white: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
    sepia: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>'
  };

  function setSheetTheme(theme) {
    state.sheetTheme = THEME_MODES.includes(theme) ? theme : 'dark';
    try {
      localStorage.setItem('foliomd_sheet_theme', state.sheetTheme);
    } catch (_) {}

    dom.documentSheet.classList.remove('sheet-theme-dark', 'sheet-theme-white', 'sheet-theme-sepia');
    dom.documentSheet.classList.add(`sheet-theme-${state.sheetTheme}`);

    if (dom.themeModeLabel) {
      dom.themeModeLabel.textContent = THEME_LABELS[state.sheetTheme];
    }
    if (dom.themeModeIcon) {
      dom.themeModeIcon.innerHTML = THEME_ICONS[state.sheetTheme];
    }
  }

  function cycleSheetTheme() {
    const currIdx = THEME_MODES.indexOf(state.sheetTheme);
    const nextIdx = (currIdx + 1) % THEME_MODES.length;
    setSheetTheme(THEME_MODES[nextIdx]);
    showToast(`Reading Mode: ${THEME_LABELS[state.sheetTheme]}`);
  }

  function setCodeTheme(theme) {
    state.codeTheme = theme === 'paper' ? 'paper' : 'dark';
    try {
      localStorage.setItem('foliomd_code_theme', state.codeTheme);
    } catch (_) {}

    if (dom.documentSheet) {
      dom.documentSheet.classList.toggle('code-theme-paper', state.codeTheme === 'paper');
    }
    if (dom.codeThemeLabel) {
      dom.codeThemeLabel.textContent = state.codeTheme === 'paper' ? 'Code: Paper' : 'Code: Dark';
    }
  }

  function toggleCodeTheme() {
    setCodeTheme(state.codeTheme === 'dark' ? 'paper' : 'dark');
    showToast(`Code Style: ${state.codeTheme === 'paper' ? 'Paper Match' : 'Dark Card'}`);
  }

  // =========================================================================
  // BIONIC READING (ADHD FOCUS ASSISTANT)
  // =========================================================================
  function toggleBionicReading(forcedState) {
    state.bionicReading = typeof forcedState === 'boolean' ? forcedState : !state.bionicReading;
    try {
      localStorage.setItem('foliomd_bionic_reading', String(state.bionicReading));
    } catch (_) {}

    if (dom.btnBionicToggle) {
      dom.btnBionicToggle.classList.toggle('active', state.bionicReading);
    }
    dom.documentSheet.classList.toggle('bionic-active', state.bionicReading);

    if (state.bionicReading) {
      window.FolioMarkdownEngine.applyBionicReading(dom.markdownBody);
      showToast('Bionic Reading Enabled (ADHD Assistant)');
    } else {
      window.FolioMarkdownEngine.removeBionicReading(dom.markdownBody);
      showToast('Bionic Reading Disabled');
    }
  }

  // =========================================================================
  // DOCUMENT TAGS: FAVORITE, IMPORTANT, INCOMPLETE, LIKE
  // =========================================================================
  async function updateDocumentTagsUI() {
    if (!state.workspace || !state.activeFilePath) {
      state.currentDocTags = [];
      updateTagBarPills();
      return;
    }

    state.currentDocTags = window.FolioCache.getDocumentTags(state.workspace.id, state.activeFilePath);
    updateTagBarPills();
    updateTotalTaggedBadge();
  }

  function updateTagBarPills() {
    if (!dom.tagPillButtons) return;
    const activeSet = new Set(state.currentDocTags || []);

    dom.tagPillButtons.forEach((btn) => {
      const tagName = btn.getAttribute('data-tag-name');
      const isActive = activeSet.has(tagName);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (dom.docTagsActiveCounter) {
      if (activeSet.size > 0) {
        dom.docTagsActiveCounter.textContent = `${activeSet.size}`;
        dom.docTagsActiveCounter.classList.remove('hidden');
      } else {
        dom.docTagsActiveCounter.classList.add('hidden');
      }
    }
  }

  async function toggleDocumentTag(tagName) {
    if (!state.workspace || !state.activeFilePath) return;
    const activeSet = new Set(state.currentDocTags || []);
    let added = false;
    if (activeSet.has(tagName)) {
      activeSet.delete(tagName);
    } else {
      activeSet.add(tagName);
      added = true;
    }

    const newTags = Array.from(activeSet);
    state.currentDocTags = newTags;
    updateTagBarPills();

    const fileName = state.activeFilePath.split('/').pop();
    const docTitle = state.sections && state.sections[0] ? state.sections[0].text : fileName;

    await window.FolioCache.setDocumentTags(state.workspace.id, state.activeFilePath, newTags, {
      workspaceName: state.workspace.name,
      fileName,
      title: docTitle
    });

    const tagCapitalized = tagName.charAt(0).toUpperCase() + tagName.slice(1);
    showToast(added ? `Marked as ${tagCapitalized}` : `Removed tag: ${tagCapitalized}`);
    updateTotalTaggedBadge();
    renderExplorerTree(); // refresh tag dot indicators in tree
  }

  function updateTotalTaggedBadge() {
    const allTagged = window.FolioCache.listAllTaggedDocuments('all');
    if (dom.taggedTotalBadge) {
      dom.taggedTotalBadge.textContent = String(allTagged.length);
    }
  }

  // =========================================================================
  // TAGGED CONTENT EXPLORER MODAL (ALL, FAVORITE, IMPORTANT, INCOMPLETE, LIKE)
  // =========================================================================
  function openTagsModal(filter = 'all') {
    state.tagsModalFilter = filter || 'all';
    state.tagsModalSearch = '';
    if (dom.tagsSearchInput) dom.tagsSearchInput.value = '';

    dom.tagsTabs.forEach((tab) => {
      const f = tab.getAttribute('data-tag-filter');
      tab.classList.toggle('active', f === state.tagsModalFilter);
    });

    renderTagsModalResults();
    dom.tagsModal.classList.remove('hidden');
    if (dom.tagsSearchInput) dom.tagsSearchInput.focus();
  }

  function renderTagsModalResults() {
    const allTagged = window.FolioCache.listAllTaggedDocuments('all');
    const counts = {
      all: allTagged.length,
      favorite: allTagged.filter((i) => i.tags.includes('favorite')).length,
      important: allTagged.filter((i) => i.tags.includes('important')).length,
      incomplete: allTagged.filter((i) => i.tags.includes('incomplete')).length,
      like: allTagged.filter((i) => i.tags.includes('like')).length
    };

    const countAllEl = document.getElementById('tags-tab-count-all');
    const countFavEl = document.getElementById('tags-tab-count-favorite');
    const countImpEl = document.getElementById('tags-tab-count-important');
    const countIncEl = document.getElementById('tags-tab-count-incomplete');
    const countLikeEl = document.getElementById('tags-tab-count-like');

    if (countAllEl) countAllEl.textContent = counts.all;
    if (countFavEl) countFavEl.textContent = counts.favorite;
    if (countImpEl) countImpEl.textContent = counts.important;
    if (countIncEl) countIncEl.textContent = counts.incomplete;
    if (countLikeEl) countLikeEl.textContent = counts.like;
    if (dom.tagsDialogCountBadge) {
      dom.tagsDialogCountBadge.textContent = `${counts[state.tagsModalFilter] || 0} items`;
    }

    let filtered = window.FolioCache.listAllTaggedDocuments(state.tagsModalFilter);
    const q = (state.tagsModalSearch || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.filePath.toLowerCase().includes(q) ||
          item.workspaceName.toLowerCase().includes(q)
      );
    }

    if (!filtered.length) {
      const emptyTagLabel = state.tagsModalFilter === 'all' ? 'any' : state.tagsModalFilter;
      dom.tagsResultsList.innerHTML = `
        <div class="sidebar-empty-note">
          <p>No documents found with tag "${emptyTagLabel}"</p>
          <span style="font-size:11.5px;color:var(--text-muted)">Mark files with the 4 tag buttons at the top of any reading page.</span>
        </div>
      `;
      return;
    }

    dom.tagsResultsList.innerHTML = filtered
      .map((item) => {
        const badgesHtml = item.tags
          .map((t) => {
            const label =
              t === 'favorite' ? '★ Favorite' : t === 'important' ? '⚑ Important' : t === 'incomplete' ? '⏱ Incomplete' : '👍 Like';
            return `<span class="tag-badge ${t}">${label}</span>`;
          })
          .join('');

        return `
          <div class="tagged-doc-card" data-ws-id="${escapeAttr(item.workspaceId)}" data-file-path="${escapeAttr(item.filePath)}">
            <div class="tagged-doc-left">
              <div class="tagged-doc-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div class="tagged-doc-info">
                <div class="tagged-doc-title">${escapeHtml(item.title)}</div>
                <div class="tagged-doc-path">${escapeHtml(item.workspaceName)} / ${escapeHtml(item.filePath)}</div>
              </div>
            </div>
            <div class="tagged-doc-badges">${badgesHtml}</div>
          </div>
        `;
      })
      .join('');

    dom.tagsResultsList.querySelectorAll('.tagged-doc-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const wsId = card.getAttribute('data-ws-id');
        const fPath = card.getAttribute('data-file-path');
        dom.tagsModal.classList.add('hidden');

        if (!state.workspace || state.workspace.id !== wsId) {
          const ws = await window.FolioCache.getWorkspace(wsId);
          if (ws) {
            await loadWorkspaceIntoViewer(ws, fPath, { resetHistory: true });
            return;
          }
        }
        await openMarkdownFileInCurrentWorkspace(fPath);
      });
    });
  }

  function updateSidebarVisibilityUI() {
    dom.leftSidebar.classList.toggle('collapsed', !state.leftSidebarOpen);
    dom.rightSidebar.classList.toggle('collapsed', !state.rightSidebarOpen);
    dom.btnToggleLeftSidebar.classList.toggle('active', state.leftSidebarOpen);
    dom.btnToggleRightSidebar.classList.toggle('active', state.rightSidebarOpen);

    const isMobileOverlay =
      window.innerWidth <= 1024 && (state.leftSidebarOpen || state.rightSidebarOpen);
    dom.mobileSidebarBackdrop.classList.toggle('hidden', !isMobileOverlay);
  }

  // In-Document Search / Find
  function toggleFindBar(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : dom.findBar.classList.contains('hidden');
    if (shouldOpen) {
      dom.findBar.classList.remove('hidden');
      dom.findInput.focus();
      dom.findInput.select();
      performInDocumentFind(dom.findInput.value);
    } else {
      dom.findBar.classList.add('hidden');
      clearFindHighlights();
    }
  }

  function clearFindHighlights() {
    dom.markdownBody.querySelectorAll('mark.search-match').forEach((mark) => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
    state.findMatches = [];
    state.findActiveIdx = -1;
    dom.findMatchCount.textContent = '0 / 0';
  }

  function performInDocumentFind(query) {
    clearFindHighlights();
    const q = (query || '').trim();
    if (!q) return;

    const walker = document.createTreeWalker(dom.markdownBody, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parentTag = node.parentElement ? node.parentElement.tagName : '';
        if (['SCRIPT', 'STYLE', 'SVG', 'CANVAS'].includes(parentTag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQ})`, 'gi');

    textNodes.forEach((node) => {
      const val = node.nodeValue;
      if (!regex.test(val)) return;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      val.replace(regex, (match, _p1, offset) => {
        if (offset > lastIdx) {
          frag.appendChild(document.createTextNode(val.slice(lastIdx, offset)));
        }
        const mark = document.createElement('mark');
        mark.className = 'search-match';
        mark.textContent = match;
        frag.appendChild(mark);
        state.findMatches.push(mark);
        lastIdx = offset + match.length;
      });
      if (lastIdx < val.length) {
        frag.appendChild(document.createTextNode(val.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    });

    if (state.findMatches.length > 0) {
      stepFindMatch(0);
    } else {
      dom.findMatchCount.textContent = '0 / 0';
    }
  }

  function stepFindMatch(delta) {
    const total = state.findMatches.length;
    if (!total) return;
    if (state.findActiveIdx >= 0 && state.findMatches[state.findActiveIdx]) {
      state.findMatches[state.findActiveIdx].classList.remove('active-match');
    }
    state.findActiveIdx = (state.findActiveIdx + delta + total) % total;
    const activeMark = state.findMatches[state.findActiveIdx];
    activeMark.classList.add('active-match');
    activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    dom.findMatchCount.textContent = `${state.findActiveIdx + 1} / ${total}`;
  }

  // Lightbox Modal for Figures & Diagrams
  function openLightboxModal({ title, html }) {
    state.lightboxZoom = 100;
    dom.lightboxCaption.textContent = title || 'Figure Preview';
    dom.lightboxContent.innerHTML = html || '';
    dom.lightboxContent.style.transform = 'scale(1)';
    dom.btnLightboxZoomReset.textContent = '100%';
    dom.lightboxModal.classList.remove('hidden');
  }

  function updateLightboxZoom(delta) {
    state.lightboxZoom = delta === 0 ? 100 : Math.min(300, Math.max(40, state.lightboxZoom + delta));
    dom.lightboxContent.style.transform = `scale(${state.lightboxZoom / 100})`;
    dom.btnLightboxZoomReset.textContent = `${state.lightboxZoom}%`;
  }

  // Quick Open File Modal (Ctrl+P)
  function openQuickSwitcher() {
    const items = [];
    if (state.workspace && state.workspace.files) {
      Object.values(state.workspace.files)
        .filter((f) => f.kind === 'markdown')
        .forEach((f) => {
          items.push({
            workspaceId: state.workspace.id,
            workspaceName: state.workspace.name,
            filePath: f.path,
            fileName: f.name
          });
        });
    }

    state.quickOpenItems = items;
    state.quickOpenSelectedIdx = 0;
    dom.quickOpenInput.value = '';
    renderQuickOpenResults('');
    dom.quickOpenModal.classList.remove('hidden');
    dom.quickOpenInput.focus();
  }

  function renderQuickOpenResults(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = state.quickOpenItems.filter(
      (i) => !q || i.filePath.toLowerCase().includes(q) || i.fileName.toLowerCase().includes(q)
    );

    if (state.quickOpenSelectedIdx >= filtered.length) {
      state.quickOpenSelectedIdx = 0;
    }

    if (!filtered.length) {
      dom.quickOpenResults.innerHTML = `<div class="sidebar-empty-note">No matching Markdown files</div>`;
      return;
    }

    dom.quickOpenResults.innerHTML = filtered
      .map(
        (item, idx) => `
        <button type="button" class="quick-open-item ${idx === state.quickOpenSelectedIdx ? 'selected' : ''}" data-qo-path="${escapeAttr(item.filePath)}">
          <div class="quick-open-item-left">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            <span class="quick-open-name">${escapeHtml(item.fileName)}</span>
          </div>
          <span class="quick-open-path">${escapeHtml(item.filePath)}</span>
        </button>
      `
      )
      .join('');

    dom.quickOpenResults.querySelectorAll('.quick-open-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetPath = btn.getAttribute('data-qo-path');
        dom.quickOpenModal.classList.add('hidden');
        openMarkdownFileInCurrentWorkspace(targetPath);
      });
    });
  }

  // =========================================================================
  // VIEW SWITCHING & EVENT BINDINGS
  // =========================================================================
  function switchView(viewName) {
    state.currentView = viewName;
    dom.homeView.classList.toggle('active', viewName === 'home');
    dom.viewerView.classList.toggle('active', viewName === 'viewer');
    if (viewName === 'home') {
      refreshRecentList();
    }
  }

  function bindEvents() {
    // Homepage Open Folder & File Buttons
    dom.cardOpenFolder.addEventListener('click', triggerOpenFolder);
    dom.cardOpenFile.addEventListener('click', triggerOpenFile);

    const openSampleDemo = async () => {
      if (!window.FolioSampleData) return;
      const ws = await window.FolioCache.saveWorkspace(window.FolioSampleData.SAMPLE_WORKSPACE);
      await refreshRecentList();
      await loadWorkspaceIntoViewer(ws, 'README.md', { resetHistory: true });
      showToast('Loaded Sample Markdown Workspace');
    };
    dom.btnLoadDemo.addEventListener('click', openSampleDemo);
    dom.btnEmptyLoadDemo.addEventListener('click', openSampleDemo);

    // Fallback File & Folder Inputs
    dom.folderInputMd.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        ingestFolderInputFiles(e.target.files);
      }
    });

    dom.fileInputMd.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        ingestFileList(e.target.files);
      }
    });

    // Homepage Recent Filter Tabs & Search
    dom.recentTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.recentTabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        state.recentFilter = tab.getAttribute('data-filter') || 'all';
        renderRecentSection();
      });
    });

    dom.recentSearchInput.addEventListener('input', (e) => {
      state.recentSearch = e.target.value || '';
      renderRecentSection();
    });

    dom.btnClearRecent.addEventListener('click', async () => {
      await window.FolioCache.clearAll();
      await refreshRecentList();
      showToast('Cleared all cached files and folders');
    });

    // Viewer Top Toolbar Controls
    dom.btnGoHome.addEventListener('click', () => switchView('home'));

    dom.btnToggleLeftSidebar.addEventListener('click', () => {
      state.leftSidebarOpen = !state.leftSidebarOpen;
      if (window.innerWidth <= 1024 && state.leftSidebarOpen) {
        state.rightSidebarOpen = false;
      }
      updateSidebarVisibilityUI();
    });

    dom.btnToggleRightSidebar.addEventListener('click', () => {
      state.rightSidebarOpen = !state.rightSidebarOpen;
      if (window.innerWidth <= 1024 && state.rightSidebarOpen) {
        state.leftSidebarOpen = false;
      }
      updateSidebarVisibilityUI();
    });

    dom.mobileSidebarBackdrop.addEventListener('click', () => {
      state.leftSidebarOpen = false;
      state.rightSidebarOpen = false;
      updateSidebarVisibilityUI();
    });

    // Back / Forward / History Popover
    dom.btnNavBack.addEventListener('click', () => navigateHistory(-1));
    dom.btnNavForward.addEventListener('click', () => navigateHistory(1));
    dom.btnNavHistory.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.historyPopover.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.history-dropdown-wrap')) {
        dom.historyPopover.classList.add('hidden');
      }
    });

    // Zoom, Page Width, Theme, Typography, Bionic Reading
    dom.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 10));
    dom.btnZoomIn.addEventListener('click', () => setZoom(state.zoom + 10));
    dom.btnZoomReset.addEventListener('click', () => setZoom(100));
    dom.btnPageMode.addEventListener('click', cyclePageMode);
    dom.btnThemeMode.addEventListener('click', cycleSheetTheme);
    if (dom.btnCodeTheme) dom.btnCodeTheme.addEventListener('click', toggleCodeTheme);
    dom.btnFontMode.addEventListener('click', cycleFontMode);
    dom.btnBionicToggle.addEventListener('click', () => toggleBionicReading());

    // Tagged Content Menu & Document Tag Pills
    dom.btnTagsMenu.addEventListener('click', () => openTagsModal('all'));
    if (dom.btnShortcutViewTags) {
      dom.btnShortcutViewTags.addEventListener('click', () => openTagsModal('all'));
    }

    dom.tagPillButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tagName = btn.getAttribute('data-tag-name');
        toggleDocumentTag(tagName);
      });
    });

    // Tagged Modal Event Handlers
    dom.btnTagsDialogClose.addEventListener('click', () => dom.tagsModal.classList.add('hidden'));
    dom.tagsModal.addEventListener('click', (e) => {
      if (e.target === dom.tagsModal) dom.tagsModal.classList.add('hidden');
    });

    dom.tagsTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.tagsTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.tagsModalFilter = tab.getAttribute('data-tag-filter') || 'all';
        renderTagsModalResults();
      });
    });

    dom.tagsSearchInput.addEventListener('input', (e) => {
      state.tagsModalSearch = e.target.value || '';
      renderTagsModalResults();
    });

    // Find, Quick Open, Sync Disk, Print
    dom.btnFindInDoc.addEventListener('click', () => toggleFindBar());
    dom.btnQuickOpen.addEventListener('click', openQuickSwitcher);
    dom.btnPrintPdf.addEventListener('click', () => window.print());

    dom.btnSyncDisk.addEventListener('click', async () => {
      if (!state.workspace || !state.workspace.handle) return;
      try {
        if (state.workspace.type === 'folder') {
          await ingestDirectoryHandle(state.workspace.handle);
        } else {
          const file = await state.workspace.handle.getFile();
          await ingestFileList([file], state.workspace.handle);
        }
      } catch (_) {
        showToast('Could not re-sync disk handle; please re-select folder');
      }
    });

    // Left Sidebar Tabs & Filter
    dom.leftTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.leftTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-left-tab');
        state.activeLeftTab = target;
        dom.leftPanelOutline.classList.toggle('hidden', target !== 'outline');
        dom.leftPanelFigures.classList.toggle('hidden', target !== 'figures');
      });
    });

    dom.outlineFilterInput.addEventListener('input', () => {
      renderOutlineNavigator();
      renderFiguresNavigator();
    });

    dom.btnScrollTop.addEventListener('click', () => {
      dom.documentViewport.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Scroll Spy on Document Viewport
    dom.documentViewport.addEventListener('scroll', updateScrollSpyAndProgress, { passive: true });

    // Right Sidebar Explorer Controls
    dom.btnExplorerOpenFile.addEventListener('click', triggerOpenFile);
    dom.btnExplorerOpenFolder.addEventListener('click', triggerOpenFolder);

    dom.btnExplorerExpandAll.addEventListener('click', () => {
      if (!state.workspace || !state.workspace.files) return;
      Object.keys(state.workspace.files).forEach((p) => {
        const parts = p.split('/');
        parts.pop();
        let acc = '';
        for (const seg of parts) {
          acc = acc ? `${acc}/${seg}` : seg;
          state.expandedFolders.add(acc);
        }
      });
      renderExplorerTree();
    });

    dom.btnExplorerCollapseAll.addEventListener('click', () => {
      state.expandedFolders.clear();
      renderExplorerTree();
    });

    dom.explorerFilterInput.addEventListener('input', renderExplorerTree);

    dom.btnToggleMiniRecent.addEventListener('click', () => {
      dom.btnToggleMiniRecent.classList.toggle('open');
      dom.miniRecentList.classList.toggle('hidden');
    });

    // Find Bar Events
    dom.findInput.addEventListener('input', (e) => performInDocumentFind(e.target.value));
    dom.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        stepFindMatch(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        toggleFindBar(false);
      }
    });
    dom.btnFindNext.addEventListener('click', () => stepFindMatch(1));
    dom.btnFindPrev.addEventListener('click', () => stepFindMatch(-1));
    dom.btnFindClose.addEventListener('click', () => toggleFindBar(false));

    // Lightbox Events
    dom.btnLightboxZoomIn.addEventListener('click', () => updateLightboxZoom(25));
    dom.btnLightboxZoomOut.addEventListener('click', () => updateLightboxZoom(-25));
    dom.btnLightboxZoomReset.addEventListener('click', () => updateLightboxZoom(0));
    dom.btnLightboxClose.addEventListener('click', () => dom.lightboxModal.classList.add('hidden'));
    dom.lightboxModal.addEventListener('click', (e) => {
      if (e.target === dom.lightboxModal) dom.lightboxModal.classList.add('hidden');
    });

    // Quick Open Modal Events
    dom.quickOpenInput.addEventListener('input', (e) => renderQuickOpenResults(e.target.value));
    dom.quickOpenInput.addEventListener('keydown', (e) => {
      const items = dom.quickOpenResults.querySelectorAll('.quick-open-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.quickOpenSelectedIdx = Math.min(items.length - 1, state.quickOpenSelectedIdx + 1);
        renderQuickOpenResults(dom.quickOpenInput.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.quickOpenSelectedIdx = Math.max(0, state.quickOpenSelectedIdx - 1);
        renderQuickOpenResults(dom.quickOpenInput.value);
      } else if (e.key === 'Enter' && items[state.quickOpenSelectedIdx]) {
        e.preventDefault();
        items[state.quickOpenSelectedIdx].click();
      } else if (e.key === 'Escape') {
        dom.quickOpenModal.classList.add('hidden');
      }
    });
    dom.quickOpenModal.addEventListener('click', (e) => {
      if (e.target === dom.quickOpenModal) dom.quickOpenModal.classList.add('hidden');
    });

    // Sidebar Resizers
    setupSidebarResizer(dom.leftResizer, dom.leftSidebar, 'left');
    setupSidebarResizer(dom.rightResizer, dom.rightSidebar, 'right');

    // Global Drag & Drop
    setupGlobalDragAndDrop();

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!dom.tagsModal.classList.contains('hidden')) {
          dom.tagsModal.classList.add('hidden');
          return;
        }
        if (!dom.lightboxModal.classList.contains('hidden')) {
          dom.lightboxModal.classList.add('hidden');
          return;
        }
        if (!dom.quickOpenModal.classList.contains('hidden')) {
          dom.quickOpenModal.classList.add('hidden');
          return;
        }
        if (!dom.findBar.classList.contains('hidden')) {
          toggleFindBar(false);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'k')) {
        if (state.currentView === 'viewer') {
          e.preventDefault();
          openQuickSwitcher();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (state.currentView === 'viewer') {
          e.preventDefault();
          toggleFindBar(true);
        }
      }

      if (state.currentView === 'viewer' && e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleBionicReading();
      }

      if (state.currentView === 'viewer' && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        toggleCodeTheme();
      }

      if (state.currentView === 'viewer' && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openTagsModal('all');
      }

      if (state.currentView === 'viewer' && e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateHistory(-1);
      }

      if (state.currentView === 'viewer' && e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateHistory(1);
      }
    });
  }

  function setupSidebarResizer(resizerEl, sidebarEl, side) {
    if (!resizerEl || !sidebarEl) return;
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e) => {
      const delta = side === 'left' ? e.clientX - startX : startX - e.clientX;
      const newWidth = Math.min(480, Math.max(190, startWidth + delta));
      sidebarEl.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      resizerEl.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizerEl.addEventListener('mousedown', (e) => {
      if (sidebarEl.classList.contains('collapsed')) return;
      startX = e.clientX;
      startWidth = sidebarEl.getBoundingClientRect().width;
      resizerEl.classList.add('dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function setupGlobalDragAndDrop() {
    let dragDepth = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragDepth++;
      dom.dropzoneOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        dom.dropzoneOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragDepth = 0;
      dom.dropzoneOverlay.classList.add('hidden');

      const items = e.dataTransfer ? Array.from(e.dataTransfer.items || []) : [];
      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const entries = items.map((i) => i.webkitGetAsEntry()).filter(Boolean);
        if (entries.length === 1 && entries[0].isDirectory) {
          await ingestDroppedDirectoryEntry(entries[0]);
          return;
        }
      }

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await ingestFileList(e.dataTransfer.files);
      }
    });
  }

  async function ingestDroppedDirectoryEntry(dirEntry) {
    const filesMap = {};
    let totalBytes = 0;
    let mdCount = 0;

    async function readEntry(entry, prefix) {
      if (entry.isFile) {
        const file = await new Promise((res) => entry.file(res));
        if (!file) return;
        const relPath = prefix ? `${prefix}/${file.name}` : file.name;
        if (MD_EXTENSIONS.test(file.name)) {
          const content = await file.text();
          filesMap[relPath] = {
            path: relPath,
            name: file.name,
            kind: 'markdown',
            size: file.size,
            content
          };
          totalBytes += file.size;
          mdCount++;
        } else if (IMG_EXTENSIONS.test(file.name) && file.size <= 8 * 1024 * 1024) {
          const dataUrl = await readFileAsDataUrl(file);
          filesMap[relPath] = {
            path: relPath,
            name: file.name,
            kind: 'image',
            size: file.size,
            dataUrl
          };
          totalBytes += file.size;
        }
      } else if (entry.isDirectory) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) return;
        const reader = entry.createReader();
        const subEntries = await new Promise((res) => reader.readEntries(res));
        for (const sub of subEntries || []) {
          await readEntry(sub, prefix ? `${prefix}/${entry.name}` : entry.name);
        }
      }
    }

    const rootReader = dirEntry.createReader();
    const topEntries = await new Promise((res) => rootReader.readEntries(res));
    for (const child of topEntries || []) {
      await readEntry(child, '');
    }

    if (mdCount === 0) {
      showToast(`No Markdown files found in dropped folder "${dirEntry.name}"`);
      return;
    }

    const defaultMd = chooseDefaultMarkdownFile(filesMap, '');
    const ws = await window.FolioCache.saveWorkspace({
      id: `folder:${dirEntry.name}`,
      type: 'folder',
      name: dirEntry.name,
      subtitle: `${mdCount} Markdown files • ${formatBytes(totalBytes)}`,
      activeFilePath: defaultMd.path,
      fileCount: mdCount,
      totalBytes,
      files: filesMap
    });

    await refreshRecentList();
    await loadWorkspaceIntoViewer(ws, defaultMd.path, { resetHistory: true });
    showToast(`Cached dropped folder "${dirEntry.name}"`);
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#818cf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>${escapeHtml(message)}</span>
    `;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const val = bytes / Math.pow(1024, i);
    return `${val >= 10 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Recently';
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  // Start App when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
