# MGGA 工作日志

## 2026-09-20 Dock 同名 tab 重复(v2026.10.13)

- 用户复测 v2026.10.12 后:桌面端仍重复 Issues/Pull requests/Security
  and quality 三项,模拟移动端只重复 Issues 一项。
- 未登录态双视口 e2e(react/iina)无法复现 → 重复仅在登录态出现;
  服务端取证确认登录页并存 React 条 + 旧版 UnderlineNav(同 aria-label
  "Repository"),同一 tab href 形态不同。
- 修复:pushItem 去重收敛为「同名 tab(去计数后缀)先到先得」,不再
  依赖 href 形态等价判定。提交 8e06c3f(快照 f127d81)。
- 10.13→10.14:两条收录路径标签提取不一致(直扫制除计数器 →
  "Issues",菜单收割不制 → "Issues1.8k";GitHub DOM 无空白字符),且旧
  计数剥尾正则只认空格+纯数字。10.14 提交 77270a3:extractMenuItems
  统一用 navDockAnchorLabel + 剥尾正则兼容 1.8k/无空格拼接/括号旧式。
- 10.14→10.15(ed6829a):用户复测重复更多,日志新增 Breadcrumbs 栏且
  各栏首点即成功 → 别名根因(旧条 "Security" vs 新条 "Security and
  quality");修复:目的地去重(归一路径相同只留首个,当前页路径豁免
  Code/README),与同名去重构成双保险。
- 关键取证手法:控制台日志行号可指纹版本(5634/5655=10.13,5626/5647
  =10.11,5653/5674=10.12);新探针 tools/verify-dup-counter-fuse.js
  注入预挂载 aria-hidden 菜单直接走收割路径,金丝雀项验证路径真实执行
  (探针空转时必须靠金丝雀识别,否则会误判 PASS)。
- 用户截图标题 v2026.10.11 与日志行号 10.13 矛盾,判断截图为旧证据;
  提醒用户确认 Tampermonkey 无双装。
- 新工具:tools/verify-dup-bar-fuse.js(合成平行栏 + 异形 href + 金丝雀
  验证注入栏被扫描——首轮探针曾空转,输出与注入前一致,靠金丝雀发现)。
- 验证:node --check / 合成探针 / react 双视口 e2e / iina 探针全 PASS。
- 待用户登录态复测确认。
