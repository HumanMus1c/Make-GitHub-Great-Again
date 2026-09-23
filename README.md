# Make-GitHub-Great-Again!

# [English Version](https://github.com/HumanMus1c/Make-GitHub-Great-Again/blob/main/README_en.md)

让 GitHub 更伟大!

这是一个简单而实用的浏览器脚本，通过为 GitHub Release 页面的每个 Asset 添加自定义颜色的背景色，并自动识别文件名中的系统架构关键词，更改文件图标为对应系统架构，使下载列表更加清晰易读，减少视觉疲劳，_**防止下载错误文件**_。

![demo](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTgwOTA1LCJwdXIiOiJibG9iX2lkIn19--9a092f076ab9e141a88a4c0ec21746599ddae538/Honeycam%202025-06-21%2017-04-44.gif)

![demo_cn](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MjkyMjUxLCJwdXIiOiJibG9iX2lkIn19--60a7cfd4d30f706894e00e827121bb4d1cd083f3/demonstrate_cn_1mb.gif)


## ✨ 主要功能

- [⬤] **自定义背景色**：为 Release Assets 列表添加自定义颜色的背景色，提高资源条目的可读性和可区分性。
- [⬤] **文件平台架构识别**：根据文件名（如 Windows, Linux, Apple, Android, Source 等）自动将默认图标替换为对应的平台系统的 SVG 图标。
- [⬤] **架构关键词高亮**：自动识别文件名中的系统架构关键词（如 x86_64, aarch64, arm64 等）并高亮显示，支持自定义高亮任意文字。
- [⬤] **独立的主题适配**：适配 GitHub 的深色/浅色主题。支持分别设置暗色和亮色主题下的颜色，两种主题颜色相互独立互不影响。
- [⬤] **强大的控制面板**：提供直观的设置面板（支持自适应窗口内容大小）。不仅能自定义奇偶行颜色和悬停颜色，还可以即时开启/关闭任意功能，修改实时生效！
- [⬤] **内置专业级颜色选择器**：自主编写的颜色选择器，支持 HEX、RGB、HSL 多种模式切换，支持预设颜色，拖动实时预览页面效果。
- [⬤] **左侧悬浮导航**：在仓库主页，自动索引页内所有导航来源（全局头部、仓库标签条、文件区 tab、仓库文件树、右侧栏等），把折进 More 的项与既有导航项按顺序合并罗列在左侧悬浮导航栏中；点击为页内跳转，不触发整页重载。悬浮球常驻显示，点击悬浮球或油猴菜单「展开/收起悬浮导航」可展开/收起面板。
- [⬤] **统一且沉浸的面板外观**：导航面板与设置面板共用同一套标题栏与控件标准，面板内图标全部为 SVG，滚动条为沉浸式（无步进箭头、轨道透明、悬停显形）；面板字号随视口在 14~18px 之间自适应缩放。
- [◯] ~~**事件拦截优化**：深度优化事件冒泡机制，完美解决与 GitHub 原生脚本的冲突，确保操作无延迟、无控制台报错。~~

## 🚀 安装方法

1. 首先安装一个用户脚本管理器（如果还没有安装）：
   - Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. 点击下面的链接安装脚本：
   [安装 Make-GitHub-Great-Again](https://update.greasyfork.org/scripts/537852/Make-GitHub-Great-Again.user.js)

## 💡 使用方法

安装完成后，脚本会自动在 GitHub Release 页面与仓库主页生效：
1. 访问任意 GitHub 仓库的 **Release 页面**，在页面左下角点击 ⚙️ 图标打开设置面板，在其中自由调整各个功能。
2. 访问任意 GitHub 仓库的 **主页**，页面左侧常驻一枚悬浮球：点击它（或使用油猴菜单「展开/收起悬浮导航」）即可展开或收起左侧悬浮导航栏，逐条跳转到该页的全局头部、仓库标签条、文件区、文件树与侧栏导航项（点击为页内跳转，不触发整页重载）。
3. 设置面板的尺寸与字号会随窗口大小自适应缩放；所有功能实时生效，无需刷新页面。

## 🎯 使用场景

- 当项目发布包含多个平台版本的程序时。
- Release 包含大量相似名称的文件时。
- 需要快速确定某个特定平台或架构（如 x86_64 vs aarch64）的时候。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 📝 许可证

[MIT License](LICENSE)

---

**注意**：这个脚本仅对 GitHub Release 页面的 Assets 列表进行样式优化和图标替换，并在仓库主页提供一枚本地的悬浮导航栏，不会影响原本的文件链接或做出任何破坏性修改。
