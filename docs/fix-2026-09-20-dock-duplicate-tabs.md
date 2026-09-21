# 修复记录:面板同名 tab 重复(2026-09-20)

## 第五轮(v2026.10.16,提交 f66cd4b,快照 6612122)

- 用户复测 10.15 仍重复;完整控制台日志取证:行号 5679/5658 铁证已是
  10.15;两段长堆栈是广告拦截器挡 GitHub analytics 的异步归因,非
  MGGA 报错;Breadcrumbs 栏 kebab 收割成功入面板。
- 残余漏洞:① More 菜单可能拿绝对 URL,与直扫相对路径归一不等 →
  目的地去重漏放;② 10.15 的当前页豁免过宽,选中 tab 的别名副本
  (# + aria-current 落当前页)借豁免入面板。
- 修复:目的地改 URL 解析归一(同源才合并);当前页豁免收敛为
  code/readme 白名单。
- 探针升级:注入 href 改为绝对 URL 形态,全部拦下,PASS。

## 第四轮(v2026.10.15,提交 ed6829a,快照 33ac270)

- 用户复测 10.14:重复更多。日志新特征:Breadcrumbs 栏参与收割且
  Repository/files 栏首次点击即成功 → 三路收割产物同时入面板。
- 新根因:别名。GitHub 新旧导航对同一 tab 用不同名称(旧条
  "Security" vs 新条 "Security and quality"),按标签去重永远拦不住。
- 修复:pushItem 增加目的地去重 —— 归一真实路径相同只保留首个入口;
  当前页路径豁免(Code/README 两个真实 tab 共享,由标签去重管辖)。
- 探针升级:verify-dup-counter-fuse.js 注入同仓库路径 + 别名 Security
  + ?tab=all + 尾斜杠变体,金丝雀证明收割路径执行;校验时注意豁免
  基准要用页面真实 location.pathname(REPO 入口会被 301 到规范名)。
- 验证:专项探针 PASS、react 双视口 e2e PASS、iina 双视口 PASS。

## 第三轮(v2026.10.14,提交 77270a3,快照 19d4cd2)

- 用户复测 10.13 仍重复 Issues。日志行号(5634/5655)铁证已是 10.13。
- 根因:两条收录路径标签提取不一致 —— 直扫 navDockAnchorLabel(剔除
  计数器)得 "Issues",菜单收割 normalizedText 得 "Issues1.8k"
  (GitHub DOM 无空白字符);旧剥尾正则要求空格+纯数字,双双失效。
- 修复:extractMenuItems 统一用 navDockAnchorLabel;剥尾正则兼容
  1834 / 1.8k / 无空格拼接 / 括号旧式。
- 新探针 tools/verify-dup-counter-fuse.js(注入预挂载 aria-hidden 菜单
  直接走收割路径,金丝雀验证路径真实执行)。

## 症状

用户复测(v2026.10.12 后):
- 桌面端 Dock 面板仍重复 Issues / Pull requests / Security and quality 三项;
- 进入调试控制台的模拟移动端页面只重复 Issues 一项。

## 复现与取证

- 真实 GitHub 双视口 e2e(react / iina,400px 与 1280px):未登录态两个
  仓库、两个视口均无同名重复,v2026.10.12 修复对可见结构已生效。
- 服务端 HTML 取证(iina/iina):匿名页面仅一份 `aria-label="Repository"`
  标签条;登录态页面则并存新版 React 条与旧版 js-repo-nav UnderlineNav,
  同一 tab 在两条中 href 形态不同 —— 这正是上一轮修复的目标结构,重复
  仅在登录态出现,本地无法完整复现。

## 根因分析

v2026.10.12 的「同名标签 + 目的地等价」去重仍依赖 href 形态假设(归一
相等 / 尾斜杠 / 尾段相等 / 歧义落地)。登录态双标签条若出现未观测过的
href 形态,等价判定即可漏网 → 同名 tab 二次入面板。

## 修复

pushItem 跨栏去重收敛为单一规则:

- 规范化标签(去计数后缀、小写)相同 → 视作同一 tab,先到先得;
- 不再依赖 href 形态判定,同名项保证至多入面板一次;
- 面板仍显示原始标签(含计数)。

版本号 2026.10.12 → 2026.10.13。

## 验证

- `node --check` 通过。
- 合成探针 `tools/verify-dup-bar-fuse.js`:向真实 react 页注入平行双
  标签条,同名 tab 使用完全不同路径段(/issues/list、/pulls/index、
  /security/overview)的异形 href,金丝雀项确认注入栏被扫描;同名项
  零重复,PASS。
- 真实 GitHub 双视口 e2e(react):移动 13 / 桌面 11,每项恰好一次,
  PASS。
- iina 双视口探针:双视口同名重复 0,PASS。
- 回归面:README/Contributing/License/Security 文件区 tab 收割与
  react 的 Node/React Native 溢出项不受影响。

## 备注

- 用户侧验证需登录态(重复仅在登录态出现);若更新后仍复现,请抓取
  `[MGGA] scan` 控制台日志与面板截图进一步取证。
