/**
 * Aurora Bookmarks - iOS 27 UI Rendering Engine
 * Author: BAI YONGJIAN
 */

export class UIRenderer {
  /**
   * Generate colorful iOS-style gradient background based on domain/title hash
   */
  static getAvatarGradient(text = '') {
    const gradients = [
      'linear-gradient(135deg, #0A84FF, #5E5CE6)',
      'linear-gradient(135deg, #BF5AF2, #FF375F)',
      'linear-gradient(135deg, #FF9F0A, #FF375F)',
      'linear-gradient(135deg, #30D158, #40C8E0)',
      'linear-gradient(135deg, #64D2FF, #0A84FF)',
      'linear-gradient(135deg, #FF453A, #FF9F0A)',
      'linear-gradient(135deg, #5E5CE6, #BF5AF2)',
      'linear-gradient(135deg, #00C7BE, #30D158)'
    ];

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  /**
   * Format relative timestamp
   */
  static formatRelativeTime(timestamp) {
    if (!timestamp) return '未访问';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < 1 * minute) return '刚刚';
    if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
    if (diff < 24 * hour) return `${Math.floor(diff / hour)} 小时前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  /**
   * Render Squircle Icon or Letter Avatar
   */
  static renderIconHTML(item, sizeClass = 'bm-card-icon') {
    const initial = (item.title || item.domain || 'W').trim().charAt(0).toUpperCase();
    const gradient = this.getAvatarGradient(item.domain || item.title || 'web');

    if (item.icon && item.icon.startsWith('data:image')) {
      return `
        <div class="${sizeClass}">
          <img src="${item.icon}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'widget-letter-avatar\\' style=\\'background:${gradient}\\'>${initial}</div>'">
        </div>
      `;
    }

    // Try domain favicon service or fallback to letter avatar
    const domain = item.domain || '';
    if (domain && domain.includes('.')) {
      const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      return `
        <div class="${sizeClass}">
          <img src="${faviconUrl}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'widget-letter-avatar\\' style=\\'background:${gradient}\\'>${initial}</div>'">
        </div>
      `;
    }

    return `
      <div class="${sizeClass}">
        <div class="widget-letter-avatar" style="background: ${gradient}">${initial}</div>
      </div>
    `;
  }

  /**
   * Render Frequently Visited Widget Items
   */
  static renderFrequentWidget(items, onVisitClick) {
    const container = document.getElementById('frequent-widget-list');
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="widget-empty-hint" style="grid-column: 1 / -1;">
          <span>⚡ 暂无访问数据</span>
          <span style="font-size: 11px;">点击下方任意书签即可在此快速直达</span>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item, index) => `
      <div class="widget-item-tile" data-id="${item.id}" title="${this.escapeHtml(item.title)}">
        <span class="widget-item-rank">${index + 1}</span>
        ${this.renderIconHTML(item, 'widget-squircle-icon')}
        <div class="widget-item-title">${this.escapeHtml(item.title)}</div>
        <div class="widget-item-meta">${item.visitCount || 0} 次访问</div>
      </div>
    `).join('');

    container.querySelectorAll('.widget-item-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.getAttribute('data-id');
        onVisitClick(id);
      });
    });
  }

  /**
   * Render Recently Visited Widget Items
   */
  static renderRecentWidget(items, onVisitClick) {
    const container = document.getElementById('recent-widget-list');
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="widget-empty-hint" style="grid-column: 1 / -1;">
          <span>🕒 暂无最近记录</span>
          <span style="font-size: 11px;">打开过的书签会自动收纳在这里</span>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="widget-item-tile" data-id="${item.id}" title="${this.escapeHtml(item.title)}">
        ${this.renderIconHTML(item, 'widget-squircle-icon')}
        <div class="widget-item-title">${this.escapeHtml(item.title)}</div>
        <div class="widget-item-meta">${this.formatRelativeTime(item.lastVisited)}</div>
      </div>
    `).join('');

    container.querySelectorAll('.widget-item-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.getAttribute('data-id');
        onVisitClick(id);
      });
    });
  }

  /**
   * Render Stats Overview Widget
   */
  static renderStatsOverview(totalBookmarks, totalCategories, totalVisits) {
    const elBookmarks = document.getElementById('stat-total-bookmarks');
    const elCategories = document.getElementById('stat-total-categories');
    const elVisits = document.getElementById('stat-total-visits');

    if (elBookmarks) elBookmarks.textContent = totalBookmarks.toLocaleString();
    if (elCategories) elCategories.textContent = totalCategories.toLocaleString();
    if (elVisits) elVisits.textContent = totalVisits.toLocaleString();

    const islandCount = document.getElementById('island-stat-count');
    if (islandCount) islandCount.textContent = totalBookmarks.toLocaleString();
  }

  /**
   * Render Category Pills Navigation Bar
   */
  static renderCategoryPills(categories, activeCategory, onSelect) {
    const container = document.getElementById('category-pills-bar');
    if (!container) return;

    // Total bookmarks count
    const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

    let html = `
      <button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        <span>全部书签</span>
        <span class="pill-count">${totalCount}</span>
      </button>
    `;

    // Render top 25 categories
    for (const cat of categories.slice(0, 25)) {
      const isActive = activeCategory === cat.name;
      html += `
        <button class="category-pill ${isActive ? 'active' : ''}" data-cat="${this.escapeHtml(cat.name)}">
          <span>${this.escapeHtml(cat.name)}</span>
          <span class="pill-count">${cat.count}</span>
        </button>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        onSelect(cat);
      });
    });
  }

  /**
   * Render Category Explorer Drawer
   */
  static renderCategoryDrawer(categories, activeCategory, onSelect) {
    const container = document.getElementById('drawer-categories-list');
    if (!container) return;

    let html = `
      <div class="drawer-folder-item ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        <div class="drawer-folder-info">
          <span>📁</span>
          <span>全部书签</span>
        </div>
        <span class="pill-count">${categories.reduce((s, c) => s + c.count, 0)}</span>
      </div>
    `;

    for (const cat of categories) {
      const isActive = activeCategory === cat.name;
      html += `
        <div class="drawer-folder-item ${isActive ? 'active' : ''}" data-cat="${this.escapeHtml(cat.name)}">
          <div class="drawer-folder-info">
            <span>📂</span>
            <span title="${this.escapeHtml(cat.name)}">${this.escapeHtml(cat.name)}</span>
          </div>
          <span class="pill-count">${cat.count}</span>
        </div>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.drawer-folder-item').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.getAttribute('data-cat');
        onSelect(cat);
      });
    });
  }

  /**
   * Render Main Bookmarks Shelf based on current View Mode
   */
  static renderBookmarks(items, viewMode, handlers) {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    container.className = `bookmarks-container view-${viewMode}`;

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-title">未找到相关书签</div>
          <div class="empty-state-text">可以尝试切换其他分类，或导入您的浏览器书签文件。</div>
          <button class="action-pill-btn primary" id="empty-state-import-btn">
            <span>📥 导入书签</span>
          </button>
        </div>
      `;
      const btn = document.getElementById('empty-state-import-btn');
      if (btn) btn.addEventListener('click', handlers.onOpenImport);
      return;
    }

    if (viewMode === 'grid') {
      container.innerHTML = items.map(item => `
        <div class="bm-grid-item" data-id="${item.id}" title="${this.escapeHtml(item.title)}">
          ${item.visitCount > 0 ? `<span class="bm-grid-badge">${item.visitCount}</span>` : ''}
          ${this.renderIconHTML(item, 'bm-grid-icon-wrap')}
          <div class="bm-grid-title">${this.escapeHtml(item.title)}</div>
          <div class="bm-grid-category">${this.escapeHtml(item.category || '')}</div>
        </div>
      `).join('');
    } else if (viewMode === 'card') {
      container.innerHTML = items.map(item => `
        <div class="bm-card-item" data-id="${item.id}">
          <div class="bm-card-top" data-action="open">
            ${this.renderIconHTML(item, 'bm-card-icon')}
            <div class="bm-card-main">
              <div class="bm-card-title">${this.escapeHtml(item.title)}</div>
              <div class="bm-card-url">${this.escapeHtml(item.url)}</div>
            </div>
          </div>
          <div class="bm-card-footer">
            <span class="bm-card-tag">${this.escapeHtml(item.category || '未分类')}</span>
            <div class="bm-card-meta">
              <span>${item.visitCount || 0} 次访问</span>
              <div class="bm-card-actions">
                <button class="bm-icon-action ${item.isFavorite ? 'starred' : ''}" data-action="favorite" title="收藏">
                  ★
                </button>
                <button class="bm-icon-action" data-action="edit" title="编辑">
                  ✎
                </button>
                <button class="bm-icon-action" data-action="delete" title="删除">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      // List view
      container.innerHTML = items.map(item => `
        <div class="bm-list-item" data-id="${item.id}">
          <div class="bm-list-left" data-action="open">
            ${this.renderIconHTML(item, 'bm-list-icon')}
            <div class="bm-list-title">${this.escapeHtml(item.title)}</div>
            <div class="bm-list-url">${this.escapeHtml(item.url)}</div>
          </div>
          <div class="bm-list-right">
            <span class="bm-card-tag">${this.escapeHtml(item.category || '未分类')}</span>
            <span style="font-size: 11px; color: var(--text-tertiary);">${item.visitCount || 0} 次</span>
            <button class="bm-icon-action ${item.isFavorite ? 'starred' : ''}" data-action="favorite" title="收藏">
              ★
            </button>
            <button class="bm-icon-action" data-action="edit" title="编辑">
              ✎
            </button>
            <button class="bm-icon-action" data-action="delete" title="删除">
              ✕
            </button>
          </div>
        </div>
      `).join('');
    }

    // Attach event listeners
    container.querySelectorAll('[data-id]').forEach(el => {
      const id = el.getAttribute('data-id');

      // Click card or item to open
      el.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          const action = actionBtn.getAttribute('data-action');
          if (action === 'favorite') {
            e.stopPropagation();
            handlers.onToggleFavorite(id);
            return;
          }
          if (action === 'edit') {
            e.stopPropagation();
            handlers.onEdit(id);
            return;
          }
          if (action === 'delete') {
            e.stopPropagation();
            handlers.onDelete(id);
            return;
          }
        }
        // Direct click
        handlers.onVisitClick(id);
      });
    });
  }

  /**
   * Render Spotlight Search Results
   */
  static renderSpotlightResults(results, selectedIndex, onSelect) {
    const container = document.getElementById('spotlight-results');
    if (!container) return;

    if (!results || results.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-tertiary); font-size: 13px;">
          未找到匹配书签
        </div>
      `;
      return;
    }

    container.innerHTML = results.map((item, index) => `
      <div class="spotlight-item ${index === selectedIndex ? 'selected' : ''}" data-id="${item.id}" data-index="${index}">
        ${this.renderIconHTML(item, 'bm-list-icon')}
        <div class="spotlight-item-info">
          <div class="spotlight-item-title">${item.highlightTitle || this.escapeHtml(item.title)}</div>
          <div class="spotlight-item-url">${item.highlightUrl || this.escapeHtml(item.url)}</div>
        </div>
        <span class="bm-card-tag">${this.escapeHtml(item.category || '')}</span>
      </div>
    `).join('');

    container.querySelectorAll('.spotlight-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        onSelect(id);
      });
    });

    // Auto scroll to selected
    const selectedEl = container.querySelector('.spotlight-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Show iOS 27 Toast Message
   */
  static showToast(message, icon = '✓') {
    let toast = document.getElementById('ios-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ios-toast';
      toast.className = 'ios-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    toast.classList.add('active');

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('active');
    }, 2400);
  }

  static escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
