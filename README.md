# Aurora Bookmarks · iOS 27 极光书签管理器

> **iOS 27 Liquid Glass 风格高颜值个人书签管理工具站**  
> 纯客户端零依赖架构 · 支持快速导入导出 · 智能分类层级 · 全域毫秒搜索 · 最近常访问智能微件  
> **Author**: BAI YONGJIAN

---

## 🌟 核心特性

- 💎 **iOS 27 Liquid Glass（空间液态玻璃）视觉体系**
  - 超高清毛玻璃磨砂层次（`backdrop-filter` 硬件加速）与镜面光泽微边框。
  - 动态灵动岛（Dynamic Island）悬浮顶栏、Apple 经典 Squircle 连续平滑图标、弹性物理动画。
  - 5 套动态全景渐变主题：暗夜星云 (Nebula)、深海极光 (Pacific)、日落暖阳 (Solar)、翡翠薄雾 (Emerald)、液态钛金 (Titanium)。
- 📁 **分门别类全维度管理**
  - 支持多层级分类抽屉树（140+ 分类无损展示）。
  - 快捷横向滑动分类胶囊、多级路径面包屑导航。
  - 支持添加新书签、编辑书签、删除书签以及一键星标收藏。
- ⚡ **智能微件 Shelf（iOS 27 Smart Stack）**
  - **🔥 常访问的网站**：基于本地点击频次动态加权排序，呈现 Top 8 快捷入口与金银铜金牌徽标。
  - **🕒 最近访问的网站**：自动记录最后打开时间戳，直观展示「刚刚」、「10分钟前」、「昨天」足迹。
  - **📊 书签库概览**：实时统计收纳总数、分类数量及累计点击频次。
- 🔍 **全域瞬时搜索（Spotlight Command Palette）**
  - 支持快捷键 `⌘K`、`Ctrl+K` 或 `/` 随处唤起。
  - 毫秒级多关键词模糊分词、标题与网址实时高亮、键盘上下键焦点导航、回车一键直达。
- 📥 **兼容全主流浏览器导入与导出**
  - **一键载入预设书签**：内置已解析的 1,084 条精选书签，初次打开立即可用。
  - **标准 Netscape HTML**：拖拽或选择 Chrome、Edge、Safari、Firefox 导出的书签文件直接解析。
  - **备份与恢复**：一键导出标准 HTML 或 JSON 格式备份。
- 🔒 **纯客户端隐私安全（Zero Server Dependency）**
  - 所有书签与访问统计全量存放于本地浏览器的 IndexedDB 中。
  - 不经过任何外部后台服务器，绝对私密，断网亦可全功能使用。
- 🚀 **零编译一键部署（Zero-Build）**
  - 纯原生标准技术栈，无需任何 Node.js 打包或编译脚本。
  - 专为 **GitHub Pages** 与 **Cloudflare Pages** 优化设计。

---

## 🖥 快速本地预览

本项目无需安装任何庞大的编译工具链，直接启动任意简易静态服务即可体验：

```bash
# 使用 Python 启动本地静态服务
python3 -m http.server 8080
```

启动后在浏览器中访问：`http://localhost:8080`。

---

## 🚀 部署指南

详细部署说明请参阅 `docs` 目录中的文档：

- 📖 [GitHub Pages 部署指南](docs/GITHUB_PAGES_DEPLOY.md)（内置 GitHub Actions 自动部署工作流）
- 📖 [Cloudflare Pages 部署指南](docs/CLOUDFLARE_PAGES_DEPLOY.md)（支持 Git 自动关联与 Wrangler 边缘部署）
- 📐 [系统架构与设计规范文档](docs/ARCHITECTURE.md)

---

## 📁 目录结构

```
bookmarks/
├── index.html                   # 主应用界面 (iOS 27 Liquid Glass)
├── manifest.json                # PWA 渐进式应用配置文件
├── .nojekyll                    # GitHub Pages 静态模式声明
├── wrangler.toml                # Cloudflare Pages 部署配置文件
├── _headers                     # 边缘缓存与安全标头
├── css/
│   ├── tokens.css               # iOS 27 设计系统变量 (色彩、材质、圆角、物理曲线)
│   └── style.css                # 布局样式、灵动岛、智能微件、Dock、模态框
├── js/
│   ├── app.js                   # 应用协调器与状态驱动
│   ├── db.js                    # IndexedDB 存储引擎与访问频次统计
│   ├── parser.js                # Netscape HTML 与 JSON 解析/导出器
│   ├── search.js                # 分词检索、打分与高亮引擎
│   └── ui.js                    # UI 渲染组件库
├── data/
│   └── default-bookmarks.json   # 1,084 条精选书签种子数据
├── assets/
│   └── icons/                   # iOS 风格高精度矢量图标
└── docs/
    ├── ARCHITECTURE.md          # 详细架构与设计说明
    ├── GITHUB_PAGES_DEPLOY.md   # GitHub Pages 详细部署手册
    └── CLOUDFLARE_PAGES_DEPLOY.md # Cloudflare Pages 详细部署手册
```

---

## 📝 快捷键清单

| 快捷键 | 功能 |
| :--- | :--- |
| `⌘ + K` 或 `Ctrl + K` | 唤起 iOS 27 Spotlight 全局搜索 |
| `/` | 快速聚焦搜索栏 |
| `↑` / `↓` | 搜索结果上下导航 |
| `Enter` | 在新标签页打开选中书签并记录访问 |
| `Esc` | 关闭任意模态框或抽屉 |
