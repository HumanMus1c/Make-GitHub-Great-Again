# 2026-09-18 修复悬浮导航缺失头部导航与仓库文件区导航

## 问题

悬浮球面板(#mgga-mobile-nav-dock)只索引到两个无关导航项,缺少:

1. 全局头部导航
   (`header-wrapper.js-header-wrapper > react-partial > header > nav`)
2. 仓库文件区导航
   (`#repos-split-pane-content ... OverviewRepoFiles-module__Box_3 > nav`)

## 根因定位

1. **文件区 nav 扫描不到**:`findRepoHomeNavBars` 第 3 步只在"第一个
   `main`/`[role=main]`"内扫 `nav`。新版 React 仓库页的
   `#repos-split-pane-content` 分栏结构中,文件区 nav 不在首个 main 内,
   直接漏掉。
2. **头部 nav 注水前扫不到**:头部 nav 在 `react-partial` 内渐进注水,
   脚本首轮构建时往往还没渲染,`findHeaderNav()` 返回 null。
3. **零尺寸过滤误杀**:收集项时用 `getBoundingClientRect` 过滤零尺寸锚点,
   注水前锚点无尺寸被跳过,注水后没有重试机制补扫。
4. **空收割污染缓存**:首轮(注水前)收割不到 More 触发器 → 空结果被写入
   按路径缓存;后续重建复用空缓存,头部 More 下拉项永远收不到。
5. **观察范围不足**:MutationObserver 只监视头部区域,文件区注水永远不
   触发重建。

## 修复方案

1. 快照检查点 `dd329cb`。
2. `findRepoHomeNavBars` 改为全域扫描 `document.querySelectorAll("nav")`,
   排除 `footer` 内与自身 dock(`NAV_DOCK_ID`),保留 UnderlineNav 快速匹配;
   面板项由 href|label 去重收敛,全域扫描不会造成重复。
3. `collectRepoHomeNavItems` 取消零尺寸过滤,保留 `[hidden]` 与 footer
   过滤;隐藏项由属性判断,注水时序问题交由重试机制。
4. `buildNavDock`:空收割结果不再写入缓存(仅非空结果视为有效);
   空索引结果时有界重试(最多 6 次 x 500ms)等注水完成,成功后清零计数,
   仍为空才输出诊断并放弃。
5. `setupNavDockObserver` 监视范围扩到 `document.body`;循环风险由
   `data-mgga-mutation-guard` 守卫标记 + 签名短路(内容未变不重建)控制。
6. 版本 2026.9.24,update_log 新增条目。

## 验证

- `node --check` 语法通过(0 错误)。
- git diff 复查:五处修改点与计划一致;重试有上界、缓存判空有守卫、
  observer 无自触发循环(guard + 签名短路)。
- 实机验证建议:打开任意仓库主页,展开悬浮导航,应包含头部导航
  (Pull requests / Codespaces / Issues 等)、仓库标签条(Code / Issues /
  Pull requests / Actions 等)与文件区导航(文件树目录)全部条目。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + diff 复查
  替代双构建验证。
