# 2026-09-20 纯图标溢出触发器识别(汉堡菜单)与结构自诊断日志

## 需求

登录态头部(body > ... > react-partial > div > header > nav > ul)的
"More"溢出项在模拟移动端下仍丢失(v2026.10.8 复测)。

## 根因定位

新增的结构自诊断日志([MGGA] scan)在探针中取证:

1. 模拟页中真实 GitHub 仓库栏出现此前识别不到的触发器:
   `scan "Repository" vis=6 trig=icon-btn` —— **纯图标弹出按钮**
   (aria-haspopup + aria-expanded,无文本),全部旧识别路径
   (text/aria-label 的 More 前缀匹配)都命不中。
2. 用户引用的全局头部 nav 里,窄视口溢出的"More"真身是
   **"Toggle navigation" 汉堡按钮**:isMoreLabel 只认 More 字样,
   永远找不到它。
3. 外显锚点数极少的栏(项几乎全部收进 More)会被
   findRepoHomeNavBars 的"含链接才保留"过滤掉,收割机会随之丢失。

## 修改内容(v2026.10.9)

1. 快照检查点 `6a0d807`。
2. findMoreTrigger:纯图标弹出按钮识别(haspopup + expanded 齐备且
   无文本);触发器查找向上扩至 3 层(每层要求首个 nav 是本栏)。
3. isMoreLabel 语义放宽:toggle/additional navigation 等可访问名。
4. findRepoHomeNavBars:保留外显锚点数 ≤1 的 nav。
5. 收割循环加 [MGGA] scan 结构自诊断日志(栏名/外显数/触发器,定位后
   可移除)。

## 验证

- verify-partial-header-flow.js:模拟链路 1 次点击、3 溢出项入面板;
  仓库栏 icon-btn 被识别。
- verify-mobile-e2e.js:双视口 PASS(移动 13 ≥ 桌面 11)。
- verify-responsive-late-switch / diag-scroll-oscillation /
  diag-scroll-loop:全部安静。
- node --check 通过。

## 教训

- "More"是语义假设,不是结构事实;真实触发器可能是任意可访问名的
  纯图标按钮。识别必须基于 ARIA 弹出语义(haspopup/expanded)而非
  字面文本。
- 结构自诊断日志(栏名+外显数+触发器)应尽早在调查初期加入,可终结
  盲猜式修复循环。
