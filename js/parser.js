/**
 * Aurora Bookmarks - Netscape HTML & JSON Parser & Exporter
 * Author: BAI YONGJIAN
 */

export class BookmarkParser {
  /**
   * Parse standard Netscape Bookmark HTML string into bookmark objects & categories
   */
  static parseHTML(htmlString) {
    const lines = htmlString.split('\n');
    const folderStack = [];
    const items = [];
    const folderSet = new Set();

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect folder heading: <H3 ...>Folder Name</H3>
      const h3Match = trimmed.match(/<H3[^>]*>([\s\S]*?)<\/H3>/i);
      if (h3Match) {
        const folderName = this.decodeHtmlEntities(h3Match[1]).trim();
        folderStack.push(folderName);
        folderSet.add(folderName);
        continue;
      }

      // Detect folder close: </DL>
      if (trimmed.includes('</DL>')) {
        if (folderStack.length > 0) {
          folderStack.pop();
        }
        continue;
      }

      // Detect bookmark link: <DT><A HREF="..." ...>Title</A>
      const aMatch = trimmed.match(/<A\s+([^>]+)>([\s\S]*?)<\/A>/i);
      if (aMatch) {
        const attrsStr = aMatch[1];
        let title = this.decodeHtmlEntities(aMatch[2]).trim();

        const hrefMatch = attrsStr.match(/HREF=\"([^\"]+)\"/i);
        const iconMatch = attrsStr.match(/ICON=\"([^\"]+)\"/i);
        const addDateMatch = attrsStr.match(/ADD_DATE=\"([^\"]+)\"/i);

        if (hrefMatch) {
          const url = hrefMatch[1].trim();
          const icon = iconMatch ? iconMatch[1] : '';
          const addDate = addDateMatch ? parseInt(addDateMatch[1], 10) * 1000 : Date.now();
          const currentCategory = folderStack.length > 0 ? folderStack[folderStack.length - 1] : '常用书签';
          const categoryPath = folderStack.length > 0 ? folderStack.join(' / ') : '常用书签';

          // Extract domain
          let domain = '';
          try {
            domain = new URL(url).hostname;
          } catch (e) {
            domain = url;
          }

          items.push({
            id: 'bm_' + (items.length + 1) + '_' + Math.random().toString(36).substring(2, 8),
            title: title || domain || url,
            url: url,
            domain: domain,
            icon: icon,
            category: currentCategory,
            categoryPath: categoryPath,
            folderPath: [...folderStack],
            addDate: addDate,
            visitCount: 0,
            lastVisited: null,
            isFavorite: false,
            tags: this.extractTags(title, currentCategory)
          });
        }
      }
    }

    return {
      bookmarks: items,
      categories: Array.from(folderSet)
    };
  }

  /**
   * Export bookmarks array into standard Netscape Bookmark HTML format
   */
  static exportToNetscapeHTML(bookmarks) {
    const timestamp = Math.floor(Date.now() / 1000);
    let output = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>
`;

    // Group by category
    const categoryMap = new Map();
    for (const b of bookmarks) {
      const cat = b.category || '未分类';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat).push(b);
    }

    for (const [category, items] of categoryMap.entries()) {
      output += `        <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${this.escapeHtml(category)}</H3>\n`;
      output += `        <DL><p>\n`;

      for (const item of items) {
        const itemDate = Math.floor((item.addDate || Date.now()) / 1000);
        const iconAttr = item.icon ? ` ICON="${item.icon}"` : '';
        output += `            <DT><A HREF="${this.escapeHtml(item.url)}" ADD_DATE="${itemDate}"${iconAttr}>${this.escapeHtml(item.title)}</A>\n`;
      }

      output += `        </DL><p>\n`;
    }

    output += `    </DL><p>\n</DL><p>\n`;
    return output;
  }

  /**
   * Export to clean JSON format
   */
  static exportToJSON(bookmarks) {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      author: 'BAI YONGJIAN',
      total: bookmarks.length,
      bookmarks: bookmarks
    }, null, 2);
  }

  /**
   * Parse JSON backup
   */
  static parseJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.bookmarks)) {
      return data.bookmarks;
    }
    throw new Error('Invalid JSON format: bookmarks array not found');
  }

  static decodeHtmlEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  static escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static extractTags(title, category) {
    const tags = [];
    if (category && category !== '未分类' && category !== '书签栏') {
      tags.push(category);
    }
    const lower = (title || '').toLowerCase();
    const commonKeywords = [
      'ai', 'github', 'vue', 'react', 'python', 'docker', 'cloud', 'aws',
      'api', 'node', 'linux', 'tool', 'doc', 'blog', 'design', 'chatgpt'
    ];
    for (const kw of commonKeywords) {
      if (lower.includes(kw) && !tags.includes(kw)) {
        tags.push(kw);
      }
    }
    return tags;
  }
}
