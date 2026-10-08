# Aurora Bookmarks · 架构设计与 iOS 27 设计系统规范

> **Author**: BAI YONGJIAN  
> **Date**: 2026-10-08  
> **Status**: Production Ready  

---

## 1. 项目愿景与设计哲学

Aurora Bookmarks（极光书签）是一款面向未来的纯静态、高颜值、强隐私的个人书签管理工具站。本站采用 **iOS 27 Liquid Glass（液态空间玻璃）** 设计语言，将桌面端的高效管理与下一代 Apple 操作系统的轻盈灵动完美结合。

### 核心亮点
1. **纯客户端隐私安全（Zero Leakage）**：全部书签数据与访问统计均保存在浏览器 IndexedDB 本地数据库中，不经过任何第三方服务器，绝对保护用户隐私。
2. **零编译即开即用（Zero-Build Architecture）**：原生 HTML5 + CSS3 + ES Modules，无需 Node 构建步骤，直接部署于 GitHub Pages 和 Cloudflare Pages，秒级极速载入。
3. **多维智能分门别类**：支持无限层级目录抽屉、快捷分类胶囊、多级面包屑路径以及快捷标签筛选。
4. **最近与常访问网站智能微件（iOS 27 Smart Widgets）**：实时追踪用户点击频次与最后访问时间戳，在顶栏微件区智能呈现「🔥 常访问的网站」与「🕒 最近访问的网站」。
5. **全域瞬时搜索（Spotlight Command Palette）**：支持快捷键 `⌘K` / `/` 唤起，支持标题、网址、域名、分类、标签的多关键词高亮快速检索。

---

## 2. 视觉规范：iOS 27 Liquid Glass 设计系统

本系统遵循超精细的液态玻璃与柔光层次规范：

```
+-------------------------------------------------------------+
|             Dynamic Island (灵动岛悬浮顶胶囊)                 |
|  [● Aurora]  [11:15]  |  [🔍 快速搜索 ⌘K]  |  [+] [📥] [🎨]   |
+-------------------------------------------------------------+
|                                                             |
|   +-----------------------+   +-----------------------+     |
|   | 🔥 常访问的网站微件    |   | 🕒 最近访问的网站微件  |     |
|   | 1. GitHub (42次)      |   | 1. Notion (刚刚)      |     |
|   | 2. Cloudflare (38次)  |   | 2. Vercel (10分钟前)  |     |
|   +-----------------------+   +-----------------------+     |
|                                                             |
|   [全部书签 (1,084)] [AI] [编程] [云服务] [工具] [更多...]    |
|                                                             |
|   +-----------------------------------------------------+   |
|   | 书签展示区 (图标网格 / 详细卡片 / 紧凑列表)          |   |
|   +-----------------------------------------------------+   |
|                                                             |
|             Floating Dock (底部悬浮玻璃 Dock)               |
|            [全部]  [分类]  [微件]  [收藏]  [管理]            |
+-------------------------------------------------------------+
```

### 2.1 材质与效果 (Materials & Blurs)
- **液态玻璃 (Liquid Glass)**：`backdrop-filter: blur(40px) saturate(210%) brightness(1.1)`
- **镜面渐变微边框 (Specular Borders)**：`1px solid rgba(255, 255, 255, 0.18)` 配合线性渐变高光边
- **Apple 连续平滑圆角 (Squircle Curvature)**：8px (微件)、14px (图标)、20px (卡片)、32px (面板)、9999px (胶囊)
- **多重深度阴影 (Depth Shadows)**：`box-shadow: 0 16px 48px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.1) inset`

### 2.2 动态主题色板 (Dynamic Theme Wallpapers)
系统内置 5 套动态氛围壁纸切换：
1. **暗夜星云 (Nebula Deep Space)**：默认深色极光蓝紫
2. **深海极光 (Pacific Ocean)**：青碧与深邃海蓝
3. **日落暖阳 (Solar Flare)**：落日金橙与柔和绯红
4. **翡翠薄雾 (Emerald Forest)**：森林翡翠与薄荷苍翠
5. **液态钛金 (Liquid Titanium)**：清爽 Apple 极简浅色钛合金玻璃

---

## 3. 数据层架构 (Data Architecture)

### 3.1 IndexedDB 存储规范
使用原生浏览器 IndexedDB，数据库名 `AuroraBookmarksDB`（版本 1）：
- **Object Store: `bookmarks`** (主键: `id`)
  - 索引: `category` (分类名)
  - 索引: `visitCount` (访问次数)
  - 索引: `lastVisited` (最后访问时间戳)
  - 索引: `isFavorite` (是否收藏)
  - 索引: `addDate` (添加时间戳)
- **Object Store: `settings`** (主键: `key`)
  - 用户主题偏好 (`theme`)
  - 视图展示模式 (`viewMode`: `grid` | `card` | `list`)

### 3.2 书签数据结构定义
```typescript
interface BookmarkItem {
  id: string;               // 唯一标识 (如 bm_1_x8q92z)
  title: string;            // 书签名称
  url: string;              // 目标网址链接
  domain: string;           // 域名 (用于提取 Favicon)
  icon: string;             // Base64 图标数据或外部图片链接
  category: string;         // 所属分类 (如 'AI 原生算力公司')
  categoryPath: string;     // 分类路径 (如 '书签栏 / Company / AI')
  folderPath: string[];     // 层级数组
  addDate: number;          // 添加时间戳 (毫秒)
  visitCount: number;       // 累计点击访问次数 (用于常访问计算)
  lastVisited: number|null; // 最近访问时间戳 (用于最近访问计算)
  isFavorite: boolean;      // 收藏状态
  tags: string[];           // 自动提取及自定义标签
}
```

---

## 4. 核心功能实现逻辑

### 4.1 最近常访问网站算法 (Recent & Frequent Algorithm)
- 当用户在界面任意位置（卡片、网格、列表或微件）点击书签时：
  1. 调用 `db.recordVisit(id)`：原子递增 `visitCount += 1`，更新 `lastVisited = Date.now()`。
  2. 触发主线程即时刷新：
     - 常访问微件获取 `visitCount > 0` 且按降序排序的前 8 个条目。
     - 最近访问微件获取 `lastVisited != null` 且按降序排序的前 8 个条目。
  3. 通过 `window.open(url, '_blank', 'noopener,noreferrer')` 唤起新标签页。

### 4.2 Netscape 书签格式兼容性
- 完整支持 Google Chrome、Apple Safari、Microsoft Edge 及 Mozilla Firefox 导出的 Netscape Bookmark File 格式。
- 解析器使用流式状态栈追踪 `<H3>` 文件夹标签与 `</DL>` 闭合标签，准确还原数千条书签的多层级目录树与嵌入式 Base64 网页图标。
- 导出器输出标准符合 RFC 规范的 HTML 书签文件，可重新无缝导入任意现代浏览器。

### 4.3 瞬时搜索打分引擎 (Fast Scoring Engine)
- 分词匹配算法：支持空格分割的多关键词同时匹配。
- 权重计算体系：
  - 标题完全包含：+100 分
  - 标题首部包含：+50 分
  - 域名包含：+80 分
  - 分类及路径包含：+60 分
  - 标签包含：+50 分
  - 网址路径包含：+30 分
  - 访问热度加权：+Math.min(visitCount, 50) 分
  - 收藏加权：+20 分
- 高亮渲染：通过正则将命中关键词包裹在 `<mark class="ios-mark">` 中。

---

## 5. 免编译与部署优势

本项目完全免除现代前端常见的构建管道膨胀（No Webpack, No Vite build, No Babel, No npm compile）：
- 可以在 WSL、原生 Linux、macOS 或 Windows 下直接编辑。
- 杜绝一切 WSL 平台下大型前端构建导致的 CPU/内存溢出与死机风险。
- 部署至 GitHub Pages 时直接由工作流上传静态站点，不消耗额外的构建运行时间。
- 部署至 Cloudflare Pages 时直接设置根目录 `.` 即可生效。
