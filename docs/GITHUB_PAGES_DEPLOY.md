# GitHub Pages 部署指南

> **Author**: BAI YONGJIAN  
> **Date**: 2026-10-08  

Aurora Bookmarks 是完全基于客户端标准技术（HTML5 / CSS3 / ES Modules）的纯静态应用，无需任何 Node.js 编译或打包步骤，可直接部署在 GitHub Pages 上。

---

## 方式一：使用 GitHub Actions 自动部署（推荐）

本项目已内置好自动化部署工作流文件 [`.github/workflows/deploy.yml`](file:///home/bbb/projects/personal/apps/bookmarks/.github/workflows/deploy.yml)。

### 1. 将项目推送到 GitHub 仓库

在终端中执行：
```bash
# 1. 确保已添加所有文件
git add .
git commit -m "feat: initial release of Aurora Bookmarks iOS 27"

# 2. 关联您的 GitHub 仓库（替换为您自己的仓库地址）
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 3. 推送主分支
git branch -M main
git push -u origin main
```

### 2. 在 GitHub 仓库设置中开启 Pages

1. 打开您的 GitHub 仓库页面。
2. 进入 **Settings**（设置） > **Pages**。
3. 在 **Build and deployment**（构建与部署）一栏：
   - **Source**（来源）：选择 **GitHub Actions**。
4. 推送代码后，工作流会自动触发，数秒内即可完成静态站点的全球分发。
5. 部署完成后，在页面顶部即可看到访问地址：`https://<your-username>.github.io/<your-repo-name>/`。

---

## 方式二：经典分支部署（无 Actions）

如果您更倾向于直接通过仓库分支托管：

1. 打开 GitHub 仓库页面，进入 **Settings** > **Pages**。
2. 在 **Source** 下拉菜单中选择 **Deploy from a branch**。
3. 分支选择 `main`（或 `master`），目录选择 `/ (root)`。
4. 点击 **Save**（保存）。
5. 约 1~2 分钟后站点即可上线。

> **提示**：本项目根目录已包含 [`.nojekyll`](file:///home/bbb/projects/personal/apps/bookmarks/.nojekyll) 文件，避免 GitHub Pages 默认的 Jekyll 引擎过滤下划线文件或资源目录。

---

## 自定义域名（可选）

如需绑定您自己的独立域名：
1. 在仓库根目录创建 `CNAME` 文件，内容填写您的域名（例如 `bookmarks.example.com`）。
2. 在您的 DNS 解析服务商处，添加一条 CNAME 解析记录指向 `<your-username>.github.io`。
3. 在 GitHub 仓库 **Settings** > **Pages** > **Custom domain** 中填入该域名并开启 **Enforce HTTPS**。
