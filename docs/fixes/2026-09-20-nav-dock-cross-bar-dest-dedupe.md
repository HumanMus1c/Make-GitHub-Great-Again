# 2026-09-20 跨栏目的地等价去重(双标签条并存)

## 需求

v2026.10.11 后 show-whenNarrow 容器已不误收,但 Issues / Pull requests /
Security and quality 三项重复(iina/iina 截图);模拟移动端只重复 Issues。

## 取证

curl 抓取 iina/iina 服务端 HTML(此环境需 --ssl-no-revoke):
- 页面同时存在**两份仓库标签条**:新版 React 条与旧版 js-repo-nav
  UnderlineNav(aria-label 均为 "Repository");
- 两份的同一 tab 锚点 href 形态不同:React 条落地到当前路径/占位,
  旧条为真实 /issues 等路径;
- 精确 href|label 去重键无法命中 → 双条同项并存;计数感知键只在
  href 完全相等时命中,跨栏形态差异仍漏。

## 修改内容(v2026.10.12)

快照检查点 `257b1b8`。pushItem 去重升级为跨栏目的地等价:
- 规范化标签 = 去计数后缀 + 小写;
- 目的地等价 = 归一 href 相等 / 仅差尾斜杠 / 最后一段路径相同 /
  任一为 "#" 或当前路径的歧义形态;
- 标签等价且目的地等价 → 重复,先到先得(canonical 先索引);
- 歧义 href 先到时仍可被后续真实目的地补记(seenDest 可覆盖);
- 面板仍显示原始标签。

## 验证

- verify-mobile-e2e.js:双视口 PASS,react 仓库每项恰好一次。
- verify-partial-header-flow.js:1 次点击、3 溢出项入面板、scrollY=0。
- verify-responsive-late-switch.js / diag-scroll-oscillation.js:安静。
- node --check 通过。

## 教训

- GitHub 迁移期页面会**同时渲染新旧两套导航**(React 条 + 旧
  UnderlineNav),取证要直接抓服务端 HTML 看 href/结构,不要靠截图
  猜测;模拟页与真实页副本状态不同,验证矩阵须含真实仓库页。
- 去重的正确维度是"目的地等价"而非"字符串相等":同一路由可有多
  种 href 形态(当前路径、占位 #、尾斜杠、最后一段路径)。
