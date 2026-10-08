# Cloudflare Pages 部署指南

> **Author**: BAI YONGJIAN  
> **Date**: 2026-10-08  

Cloudflare Pages 提供极致的全球边缘分发网络（Anycast Edge CDN），对纯静态应用提供无缝支持、自动免费 HTTPS 证书与极速加载。

---

## 方式一：连接 GitHub 仓库自动部署（推荐）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧导航栏点击 **Workers & Pages** > **Overview** > **Create application** > **Pages**。
3. 选择 **Connect to Git**（连接到 Git），授权访问您的 GitHub 仓库并选中该项目。
4. 在配置页面中填入以下参数：
   - **Project name**（项目名称）：`aurora-bookmarks`（或自定义）
   - **Production branch**（生产分支）：`main`
   - **Framework preset**（框架预设）：选择 **None**
   - **Build command**（构建命令）：**保持为空**（不要输入任何命令）
   - **Build output directory**（构建输出目录）：输入 `.` 或保持默认根目录
5. 点击 **Save and Deploy**（保存并部署）。
6. Cloudflare 将在数十秒内完成部署，并提供专属访问链接：`https://aurora-bookmarks.pages.dev`。后续每次向 `main` 分支提交代码都会自动触发全球更新。

---

## 方式二：使用 Wrangler CLI 命令行部署

如果您需要直接从本地终端部署，无需经过 Git：

```bash
# 登录 Cloudflare 账号（首次需要）
npx wrangler login

# 直接部署当前目录为静态站点（无需任何编译命令）
npx wrangler pages deploy . --project-name=aurora-bookmarks
```

部署完成后，终端将直接输出部署 URL。

---

## 静态资源缓存与安全标头说明

本项目根目录已内置 [`_headers`](file:///home/bbb/projects/personal/apps/bookmarks/_headers) 配置文件，Cloudflare Pages 会自动读取并应用以下优化：
- `/assets/*`：持久强缓存 1 年 (`Cache-Control: public, max-age=31536000, immutable`)
- `/css/*`、`/js/*`、`/data/*`：公共缓存 1 天 (`Cache-Control: public, max-age=86400`)
- 全站配置 `X-Frame-Options`、`X-Content-Type-Options: nosniff` 以及安全的 `Referrer-Policy` 保护用户隐私。
