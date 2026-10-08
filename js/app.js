/**
 * Aurora Bookmarks - Main Application Coordinator
 * Author: BAI YONGJIAN
 */

import { db } from './db.js';
import { BookmarkParser } from './parser.js';
import { SearchEngine } from './search.js';
import { UIRenderer } from './ui.js';

class App {
  constructor() {
    this.bookmarks = [];
    this.categories = [];
    this.activeCategory = 'all';
    this.viewMode = 'card'; // 'grid' | 'card' | 'list'
    this.currentTheme = 'nebula';
    this.searchEngine = new SearchEngine();

    // Spotlight search state
    this.spotlightResults = [];
    this.spotlightIndex = 0;

    // Editing bookmark ID
    this.editingBookmarkId = null;
  }

  async init() {
    this.setupClock();
    this.setupKeyboardShortcuts();
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadData();
    this.initBackgroundEffects();
  }

  // --- Clock in Dynamic Island ---
  setupClock() {
    const updateTime = () => {
      const el = document.getElementById('island-time');
      if (el) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        el.textContent = `${hours}:${minutes}`;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // --- Keyboard Shortcuts (Spotlight: Cmd+K / Ctrl+K / / ) ---
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Cmd+K or Ctrl+K or '/' to open Spotlight
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSpotlight();
        return;
      }

      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.openSpotlight();
        return;
      }

      // Esc to close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }

      // Spotlight navigation
      const spotlightBackdrop = document.getElementById('spotlight-backdrop');
      if (spotlightBackdrop && spotlightBackdrop.classList.contains('active')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.spotlightIndex = Math.min(this.spotlightResults.length - 1, this.spotlightIndex + 1);
          UIRenderer.renderSpotlightResults(this.spotlightResults, this.spotlightIndex, (id) => this.handleOpenBookmark(id));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.spotlightIndex = Math.max(0, this.spotlightIndex - 1);
          UIRenderer.renderSpotlightResults(this.spotlightResults, this.spotlightIndex, (id) => this.handleOpenBookmark(id));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (this.spotlightResults[this.spotlightIndex]) {
            this.handleOpenBookmark(this.spotlightResults[this.spotlightIndex].id);
            this.closeAllModals();
          }
        }
      }
    });
  }

  // --- Event Listeners ---
  setupEventListeners() {
    // Dynamic Island Triggers
    document.getElementById('island-search-btn')?.addEventListener('click', () => this.openSpotlight());
    document.getElementById('island-add-btn')?.addEventListener('click', () => this.openAddModal());
    document.getElementById('island-theme-btn')?.addEventListener('click', () => this.toggleThemeMenu());
    document.getElementById('island-import-btn')?.addEventListener('click', () => this.openImportModal());

    // Theme selector
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        this.setTheme(theme);
        this.toggleThemeMenu(false);
      });
    });

    // Close theme menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#island-theme-btn') && !e.target.closest('#theme-menu')) {
        this.toggleThemeMenu(false);
      }
    });

    // View mode switchers (Grid, Card, List)
    document.querySelectorAll('.seg-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-view');
        this.setViewMode(mode);
      });
    });

    // Category Drawer
    document.getElementById('open-drawer-btn')?.addEventListener('click', () => this.toggleCategoryDrawer(true));
    document.getElementById('close-drawer-btn')?.addEventListener('click', () => this.toggleCategoryDrawer(false));
    document.getElementById('category-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'category-drawer-backdrop') {
        this.toggleCategoryDrawer(false);
      }
    });

    // Drawer Search Filter
    document.getElementById('drawer-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#drawer-categories-list .drawer-folder-item').forEach(el => {
        const text = el.textContent.toLowerCase();
        el.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });

    // Floating Dock Navigation
    document.querySelectorAll('.dock-item[data-dock]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-dock');
        this.handleDockAction(action);
      });
    });

    // Spotlight Input
    const spotlightInput = document.getElementById('spotlight-input');
    spotlightInput?.addEventListener('input', (e) => {
      this.handleSpotlightSearch(e.target.value);
    });

    // Close Spotlight backdrop
    document.getElementById('spotlight-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'spotlight-backdrop') {
        this.closeAllModals();
      }
    });

    // Modals Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) this.closeAllModals();
      });
    });

    // Bookmark Form (Add / Edit)
    document.getElementById('bookmark-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveBookmarkForm();
    });

    // Import / Export Triggers
    document.getElementById('load-preset-btn')?.addEventListener('click', () => this.loadPresetBookmarks());
    document.getElementById('export-html-btn')?.addEventListener('click', () => this.exportHTML());
    document.getElementById('export-json-btn')?.addEventListener('click', () => this.exportJSON());
    document.getElementById('clear-all-btn')?.addEventListener('click', () => this.clearAllData());

    // File Drop & Input
    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('import-file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleImportFile(e.target.files[0]);
      }
    });

    // Drag and Drop support
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.html') || file.name.endsWith('.json')) {
          this.handleImportFile(file);
        }
      }
    });
  }

  // --- Settings & Data Initialization ---
  async loadSettings() {
    this.currentTheme = await db.getSetting('theme', 'nebula');
    this.viewMode = await db.getSetting('viewMode', 'card');

    this.applyTheme(this.currentTheme);
    this.updateViewSegmentedButtons();
  }

  async loadData() {
    this.bookmarks = await db.getAllBookmarks();

    // If completely empty on first launch, load pre-parsed 1084 bookmarks
    if (this.bookmarks.length === 0) {
      await this.loadPresetBookmarks(false);
    } else {
      await this.refreshUI();
    }
  }

  async refreshUI() {
    this.bookmarks = await db.getAllBookmarks();
    this.categories = await db.getCategories();
    this.searchEngine.updateBookmarks(this.bookmarks);

    // Calculate total visits
    const totalVisits = this.bookmarks.reduce((sum, b) => sum + (b.visitCount || 0), 0);

    // Render Stats
    UIRenderer.renderStatsOverview(this.bookmarks.length, this.categories.length, totalVisits);

    // Render Widgets
    const frequentItems = await db.getFrequent(8);
    const recentItems = await db.getRecent(8);

    UIRenderer.renderFrequentWidget(frequentItems, (id) => this.handleOpenBookmark(id));
    UIRenderer.renderRecentWidget(recentItems, (id) => this.handleOpenBookmark(id));

    // Render Category Pills & Drawer
    UIRenderer.renderCategoryPills(this.categories, this.activeCategory, (cat) => this.handleSelectCategory(cat));
    UIRenderer.renderCategoryDrawer(this.categories, this.activeCategory, (cat) => this.handleSelectCategory(cat));

    // Render Breadcrumbs
    this.renderBreadcrumbs();

    // Render Main Bookmarks List
    this.renderFilteredBookmarks();
  }

  renderBreadcrumbs() {
    const el = document.getElementById('breadcrumbs-trail');
    if (!el) return;

    if (this.activeCategory === 'all') {
      el.innerHTML = `
        <span class="crumb-item crumb-active">📁 全部书签 (${this.bookmarks.length})</span>
      `;
    } else {
      el.innerHTML = `
        <a href="#" class="crumb-item" id="crumb-root">全部书签</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-item crumb-active">${UIRenderer.escapeHtml(this.activeCategory)}</span>
      `;
      document.getElementById('crumb-root')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSelectCategory('all');
      });
    }
  }

  renderFilteredBookmarks() {
    let filtered = this.bookmarks;
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(b => b.category === this.activeCategory || (b.categoryPath && b.categoryPath.includes(this.activeCategory)));
    }

    UIRenderer.renderBookmarks(filtered, this.viewMode, {
      onVisitClick: (id) => this.handleOpenBookmark(id),
      onToggleFavorite: (id) => this.handleToggleFavorite(id),
      onEdit: (id) => this.handleOpenEditModal(id),
      onDelete: (id) => this.handleDeleteBookmark(id),
      onOpenImport: () => this.openImportModal()
    });
  }

  // --- User Actions ---

  async handleOpenBookmark(id) {
    const item = this.bookmarks.find(b => b.id === id);
    if (!item) return;

    // Track visit in DB
    await db.recordVisit(id);

    // Open URL in new window
    window.open(item.url, '_blank', 'noopener,noreferrer');

    // Update frequent & recent widgets
    const frequentItems = await db.getFrequent(8);
    const recentItems = await db.getRecent(8);
    UIRenderer.renderFrequentWidget(frequentItems, (i) => this.handleOpenBookmark(i));
    UIRenderer.renderRecentWidget(recentItems, (i) => this.handleOpenBookmark(i));

    // Update stats
    const totalVisits = this.bookmarks.reduce((sum, b) => sum + (b.visitCount || 0), 0) + 1;
    UIRenderer.renderStatsOverview(this.bookmarks.length, this.categories.length, totalVisits);
  }

  async handleToggleFavorite(id) {
    await db.toggleFavorite(id);
    await this.refreshUI();
    UIRenderer.showToast('已更新收藏状态', '★');
  }

  handleSelectCategory(category) {
    this.activeCategory = category;
    this.toggleCategoryDrawer(false);
    this.refreshUI();

    // Scroll to bookmarks list
    document.getElementById('bookmarks-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    db.saveSetting('viewMode', mode);
    this.updateViewSegmentedButtons();
    this.renderFilteredBookmarks();
  }

  updateViewSegmentedButtons() {
    document.querySelectorAll('.seg-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === this.viewMode);
    });
  }

  setTheme(theme) {
    this.currentTheme = theme;
    db.saveSetting('theme', theme);
    this.applyTheme(theme);
    UIRenderer.showToast(`已切换主题风格`, '🎨');
  }

  applyTheme(theme) {
    if (theme === 'nebula') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-theme') === theme);
    });
  }

  toggleThemeMenu(show) {
    const menu = document.getElementById('theme-menu');
    if (!menu) return;
    if (typeof show === 'boolean') {
      menu.classList.toggle('active', show);
    } else {
      menu.classList.toggle('active');
    }
  }

  toggleCategoryDrawer(show) {
    const backdrop = document.getElementById('category-drawer-backdrop');
    const drawer = document.getElementById('category-drawer');
    if (backdrop && drawer) {
      backdrop.classList.toggle('active', show);
      drawer.classList.toggle('active', show);
    }
  }

  handleDockAction(action) {
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    document.querySelector(`.dock-item[data-dock="${action}"]`)?.classList.add('active');

    if (action === 'all') {
      this.handleSelectCategory('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'categories') {
      this.toggleCategoryDrawer(true);
    } else if (action === 'widgets') {
      document.getElementById('widgets-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'favorites') {
      const favorites = this.bookmarks.filter(b => b.isFavorite);
      if (favorites.length === 0) {
        UIRenderer.showToast('暂无收藏书签，点击书签右下角 ★ 即可收藏', 'ℹ');
      } else {
        this.activeCategory = '★ 收藏';
        UIRenderer.renderBookmarks(favorites, this.viewMode, {
          onVisitClick: (id) => this.handleOpenBookmark(id),
          onToggleFavorite: (id) => this.handleToggleFavorite(id),
          onEdit: (id) => this.handleOpenEditModal(id),
          onDelete: (id) => this.handleDeleteBookmark(id),
          onOpenImport: () => this.openImportModal()
        });
      }
    } else if (action === 'import') {
      this.openImportModal();
    }
  }

  // --- Spotlight Search Modal ---

  openSpotlight() {
    this.closeAllModals();
    const backdrop = document.getElementById('spotlight-backdrop');
    const input = document.getElementById('spotlight-input');
    if (backdrop && input) {
      backdrop.classList.add('active');
      input.value = '';
      input.focus();
      this.handleSpotlightSearch('');
    }
  }

  handleSpotlightSearch(query) {
    this.spotlightResults = this.searchEngine.search(query, { limit: 20 });
    this.spotlightIndex = 0;
    UIRenderer.renderSpotlightResults(this.spotlightResults, this.spotlightIndex, (id) => {
      this.handleOpenBookmark(id);
      this.closeAllModals();
    });
  }

  // --- Add / Edit Bookmark Modal ---

  openAddModal() {
    this.closeAllModals();
    this.editingBookmarkId = null;
    document.getElementById('bookmark-modal-title').textContent = '添加新书签';
    document.getElementById('form-title').value = '';
    document.getElementById('form-url').value = '';
    this.populateCategorySelect();
    document.getElementById('bookmark-modal-backdrop')?.classList.add('active');
    document.getElementById('form-title')?.focus();
  }

  handleOpenEditModal(id) {
    const item = this.bookmarks.find(b => b.id === id);
    if (!item) return;

    this.closeAllModals();
    this.editingBookmarkId = id;
    document.getElementById('bookmark-modal-title').textContent = '编辑书签';
    document.getElementById('form-title').value = item.title;
    document.getElementById('form-url').value = item.url;
    this.populateCategorySelect(item.category);
    document.getElementById('bookmark-modal-backdrop')?.classList.add('active');
  }

  populateCategorySelect(selectedCategory = '') {
    const select = document.getElementById('form-category');
    if (!select) return;

    let html = `<option value="">新建或选择已有分类...</option>`;
    for (const cat of this.categories) {
      html += `<option value="${UIRenderer.escapeHtml(cat.name)}" ${cat.name === selectedCategory ? 'selected' : ''}>${UIRenderer.escapeHtml(cat.name)}</option>`;
    }
    select.innerHTML = html;
  }

  async handleSaveBookmarkForm() {
    const title = document.getElementById('form-title').value.trim();
    const url = document.getElementById('form-url').value.trim();
    let category = document.getElementById('form-category').value.trim();
    const newCategoryInput = document.getElementById('form-new-category').value.trim();

    if (newCategoryInput) {
      category = newCategoryInput;
    }
    if (!category) {
      category = '常用书签';
    }

    if (!url) {
      UIRenderer.showToast('请输入有效的网址', '⚠');
      return;
    }

    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      domain = url;
    }

    if (this.editingBookmarkId) {
      await db.updateBookmark(this.editingBookmarkId, {
        title: title || domain || url,
        url,
        domain,
        category
      });
      UIRenderer.showToast('书签已保存', '✓');
    } else {
      const newBookmark = {
        id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: title || domain || url,
        url,
        domain,
        icon: '',
        category,
        categoryPath: category,
        addDate: Date.now(),
        visitCount: 0,
        lastVisited: null,
        isFavorite: false,
        tags: [category]
      };
      await db.saveBookmark(newBookmark);
      UIRenderer.showToast('新书签已添加', '✓');
    }

    this.closeAllModals();
    await this.refreshUI();
  }

  async handleDeleteBookmark(id) {
    if (confirm('确认删除该书签？')) {
      await db.deleteBookmark(id);
      await this.refreshUI();
      UIRenderer.showToast('书签已删除', '✕');
    }
  }

  // --- Import / Export Handlers ---

  openImportModal() {
    this.closeAllModals();
    document.getElementById('import-modal-backdrop')?.classList.add('active');
  }

  async loadPresetBookmarks(showToast = true) {
    try {
      UIRenderer.showToast('正在载入预设书签...', '⏳');
      const response = await fetch('./data/default-bookmarks.json');
      if (!response.ok) {
        throw new Error('Failed to load default-bookmarks.json');
      }
      const data = await response.json();
      const items = data.bookmarks || [];

      await db.saveBookmarksBulk(items);
      this.closeAllModals();
      await this.refreshUI();

      if (showToast) {
        UIRenderer.showToast(`成功载入 ${items.length} 条精选书签！`, '🎉');
      }
    } catch (err) {
      console.error('Error loading preset bookmarks:', err);
      UIRenderer.showToast('载入预设书签失败，请手动导入', '⚠');
    }
  }

  async handleImportFile(file) {
    try {
      UIRenderer.showToast(`正在解析 ${file.name}...`, '⏳');
      const text = await file.text();

      let items = [];
      if (file.name.endsWith('.json')) {
        items = BookmarkParser.parseJSON(text);
      } else {
        const parsed = BookmarkParser.parseHTML(text);
        items = parsed.bookmarks;
      }

      if (!items || items.length === 0) {
        UIRenderer.showToast('未在文件中发现有效书签', '⚠');
        return;
      }

      await db.saveBookmarksBulk(items);
      this.closeAllModals();
      await this.refreshUI();
      UIRenderer.showToast(`成功导入 ${items.length} 条书签！`, '🎉');
    } catch (err) {
      console.error('Error importing file:', err);
      UIRenderer.showToast('导入失败：' + err.message, '⚠');
    }
  }

  async exportHTML() {
    const all = await db.getAllBookmarks();
    if (all.length === 0) {
      UIRenderer.showToast('暂无书签可导出', '⚠');
      return;
    }

    const html = BookmarkParser.exportToNetscapeHTML(all);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    this.downloadFile(blob, `bookmarks_export_${new Date().toISOString().slice(0, 10)}.html`);
    UIRenderer.showToast('HTML 书签文件已导出', '📥');
  }

  async exportJSON() {
    const all = await db.getAllBookmarks();
    if (all.length === 0) {
      UIRenderer.showToast('暂无书签可导出', '⚠');
      return;
    }

    const json = BookmarkParser.exportToJSON(all);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    this.downloadFile(blob, `bookmarks_backup_${new Date().toISOString().slice(0, 10)}.json`);
    UIRenderer.showToast('JSON 备份文件已导出', '📥');
  }

  async clearAllData() {
    if (confirm('警告：确定要清空所有书签数据吗？此操作无法撤销。建议先导出备份。')) {
      await db.clearAll();
      this.closeAllModals();
      await this.refreshUI();
      UIRenderer.showToast('已清空全部数据', '🗑');
    }
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop, .spotlight-backdrop, .category-drawer-backdrop').forEach(el => {
      el.classList.remove('active');
    });
    this.toggleCategoryDrawer(false);
  }

  initBackgroundEffects() {
    // Subtle mouse tracking for ambient depth
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      const bg = document.querySelector('.ambient-particles');
      if (bg) {
        bg.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.__auroraApp = app;
});
