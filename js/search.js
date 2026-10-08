/**
 * Aurora Bookmarks - Fast Fuzzy & Token Search Engine
 * Author: BAI YONGJIAN
 */

export class SearchEngine {
  constructor(bookmarks = []) {
    this.bookmarks = bookmarks;
  }

  updateBookmarks(bookmarks) {
    this.bookmarks = bookmarks;
  }

  /**
   * Search bookmarks with multi-token matching, relevance scoring, and highlighting
   * @param {string} query
   * @param {object} options { category, tag, limit }
   */
  search(query, options = {}) {
    const rawQuery = (query || '').trim();
    const { category, tag, limit = 50 } = options;

    let pool = this.bookmarks;

    // Filter by category if specified
    if (category && category !== 'all') {
      pool = pool.filter(b => b.category === category || (b.categoryPath && b.categoryPath.includes(category)));
    }

    // Filter by tag if specified
    if (tag) {
      pool = pool.filter(b => b.tags && b.tags.includes(tag));
    }

    if (!rawQuery) {
      return pool.slice(0, limit).map(item => ({
        ...item,
        score: 0,
        highlightTitle: this.escapeHtml(item.title),
        highlightUrl: this.escapeHtml(item.url)
      }));
    }

    const tokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];

    for (const item of pool) {
      const titleLower = (item.title || '').toLowerCase();
      const urlLower = (item.url || '').toLowerCase();
      const domainLower = (item.domain || '').toLowerCase();
      const categoryLower = (item.category || '').toLowerCase();
      const categoryPathLower = (item.categoryPath || '').toLowerCase();
      const tagsLower = (item.tags || []).join(' ').toLowerCase();

      let matchedTokens = 0;
      let score = 0;

      for (const token of tokens) {
        let tokenMatched = false;

        // Exact match in title (highest weight)
        if (titleLower.includes(token)) {
          tokenMatched = true;
          score += 100;
          if (titleLower.startsWith(token)) score += 50;
        }

        // Domain match (high weight)
        if (domainLower.includes(token)) {
          tokenMatched = true;
          score += 80;
        }

        // Category match
        if (categoryLower.includes(token) || categoryPathLower.includes(token)) {
          tokenMatched = true;
          score += 60;
        }

        // Tag match
        if (tagsLower.includes(token)) {
          tokenMatched = true;
          score += 50;
        }

        // URL path match
        if (urlLower.includes(token)) {
          tokenMatched = true;
          score += 30;
        }

        if (tokenMatched) {
          matchedTokens++;
        }
      }

      // Check if all tokens matched
      if (matchedTokens === tokens.length) {
        // Boost by visit count and favorites
        score += Math.min(item.visitCount || 0, 50);
        if (item.isFavorite) score += 20;

        results.push({
          ...item,
          score,
          highlightTitle: this.highlight(item.title, tokens),
          highlightUrl: this.highlight(item.url, tokens)
        });
      }
    }

    // Sort by score desc, then by visitCount desc
    results.sort((a, b) => b.score - a.score || (b.visitCount || 0) - (a.visitCount || 0));

    return results.slice(0, limit);
  }

  highlight(text, tokens) {
    if (!text) return '';
    let escaped = this.escapeHtml(text);
    for (const token of tokens) {
      if (!token) continue;
      const escapedToken = this.escapeRegex(this.escapeHtml(token));
      const regex = new RegExp(`(${escapedToken})`, 'gi');
      escaped = escaped.replace(regex, '<mark class="ios-mark">$1</mark>');
    }
    return escaped;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
