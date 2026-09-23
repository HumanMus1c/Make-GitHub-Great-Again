# 2026-09-23 · nav dock：滚动条只覆盖条目区，不再涵盖标题栏

- **版本**：v2026.10.30
- **快照（回滚点）**：`0bf46afb7704663003efabd00130a5901d015c3e`
  （`git reset --hard 0bf46af` 可精确回退到改动前）
- **需求原话**：「那么滚动条应该排除标题栏区域，不再涵括标题栏
  （#mgga-nav-dock > div.mgga-nav-dock-header）。」
- **上一版**：`2026-09-23-navdock-sticky-header.md`（标题栏用 `position: sticky` 钉住）

## 一、根因：sticky 解决不了"滚动条盖住标题栏"

上一版的面板结构是「**面板自己既是容器又是滚动口**」：

```
#mgga-nav-dock        ← overflow-y:auto，滚动容器（滚动条由它绘制）
  ├─ .mgga-nav-dock-header   ← position:sticky，靠 sticky 钉在滚动口顶边
  └─ a / .mgga-nav-dock-divider …（全部直接子节点）
```

sticky 只让标题**视觉上不跟着滚走**，但滚动条是**滚动容器绘制**的 ——
它必然覆盖容器的整个 border-box 纵向范围。webkit 自定义滚动条也**没有**
「从第 N px 开始画」这种能力（`::-webkit-scrollbar-track` / `-thumb` 都不接受
纵向偏移约束），所以只要滚动容器还是面板本身，滚动条就一定会画过标题栏那一行。

⇒ 想让滚动条**按区域**排除标题栏，只能改结构：把标题栏移出滚动容器。

## 二、修复：标题栏移出滚动容器，滚动口下沉一层

```html
<div id="mgga-nav-dock">                 <!-- flex column + overflow:hidden -->
  <div class="mgga-nav-dock-header">…</div>   <!-- flex:0 0 auto，不滚 -->
  <div class="mgga-nav-dock-body">            <!-- flex:1 1 auto + min-height:0 -->
    <a>…</a> <div class="mgga-nav-dock-divider"></div> …  <!-- 滚动条只画在这里 -->
  </div>
</div>
```

```css
#mgga-nav-dock {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;      /* 面板自己不再滚 */
  /* max-height: calc(100dvh - 1em) 不变 */
}
#mgga-nav-dock > .mgga-nav-dock-body {
  flex: 1 1 auto !important;
  min-height: 0 !important;         /* 缺它会被内容撑破（经典 flex 滚动坑）*/
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
}
#mgga-nav-dock .mgga-nav-dock-header { flex: 0 0 auto !important; }
```

滚动条伪元素全部从 `#mgga-nav-dock::-webkit-scrollbar*` 改挂到
`#mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar*`；
Firefox 的 `@supports (-moz-appearance: none)` 兜底同样改挂到 body。

### 2.1 sticky 四件套全部作废

上一版为 sticky 配的 `position:sticky` / `top:0` / `z-index:2` /
不透明 `background` / 同色 `box-shadow` 补边，**本次全部删除**。

理由是它们解决的是同一个伪问题 —— 「滚动内容会从标题底下穿过」。
现在标题栏根本不在滚动容器里，滚动内容与它不在同一层，
标题既不会被卷走、也不会被滚动条压住，所以那五条一条都不需要了。
（`flex: 0 0 auto` 取代了它们的作用：面板被压短时只压缩 body。）

### 2.2 DOM 结构变更的副作用（要记住）

面板的直接子节点从「header + 所有条目」变成「**header + body**」两段，
条目与分割线**下沉一层**。用 `div:nth-child(N)` 定位分割线的写法要跟着改：

```css
/* 旧 */ #mgga-nav-dock > div:nth-child(N)        /* N 随 tab 数漂移 */
/* 新 */ #mgga-nav-dock > .mgga-nav-dock-body > div:nth-child(N)
```

`NAV_DOCK_STRUCT_VER` 从 `"16"` 升到 `"17"`，旧面板会被强制重建一次。

## 三、实测关键事实

真机（`tools/verify-live-navdock.js` 场景 7.5，内联 `max-height: 220px` 把面板压到必然溢出）：

| | 滚动宿主（滚动条画在它里面）| 宿主纵向范围 | 标题栏下沿 | 面板高 |
| --- | --- | --- | --- | --- |
| 改后 | `.mgga-nav-dock-body` | **39 → 213px** | 37px | 220px |
| 改前 | `#mgga-nav-dock`（面板自己）| **0 → 220px** | 37px | 220px |

- 改后宿主顶边 39px **≥ 标题栏下沿 37px** ⇒ 滚动条的纵向范围与标题栏**零重叠**；
- 改前宿主顶边 0px **< 37px** ⇒ 滚动条必然画过标题栏那 37px（含关闭按钮）。
- 两版 `scrollTop 0→160`、标题相对面板顶边 `7→7px`、首条目 `39→-121px` 完全一致：
  **"标题不动"这一点上一版已达成，本次纯属把滚动条的覆盖范围切出去**，
  没有回退上一版的成果。

## 四、验证

### 4.1 离线回归 `tools/smoke-load.js`：**73/73 PASS**

重写/新增的断言：

| 断言 | 内容 |
| --- | --- |
| 面板标题栏（DOM）| 标题栏必须是 `panel.firstElementChild`；必须有 `:scope > .mgga-nav-dock-body`、它紧跟标题栏、**标题栏不得落在滚动区里**、滚动区里必须有条目 |
| 滚动条（源码闸门）| ① `.mgga-nav-dock-body::-webkit-scrollbar` 必须存在、`#mgga-nav-dock::-webkit-scrollbar` 必须**不存在**；② 面板基座必须 `overflow:hidden` + `display:flex` + `flex-direction:column`；③ 滚动区必须 `overflow-y:auto` + `overscroll-behavior:contain` + `min-height:0`；④ 标题栏必须 `flex:0 0 auto`；⑤ 箭头 `display:none`、基座不得出现 `scrollbar-width`、Firefox 兜底齐全 |
| 标题栏（源码闸门）| `buildNavDockPanel` 里必须 `bodyEl.appendChild(frag)` + `panel.appendChild(bodyEl)`、且**不得**再有 `panel.appendChild(frag)`；`.mgga-nav-dock-header` 规则体内**不得**出现 `position:sticky`（出现即说明它又回到了滚动容器里）|
| 侧栏分组（DOM）| 分割线改从**滚动区**取子节点，并断言标题栏没混进滚动区 |

jsdom 无排版层 ⇒ 上面这些只能锁源码声明，**真正生效与否由真机场景 7.5 负责**。

### 4.2 红绿对照（离线）

```bash
git show 0bf46af:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-scroll-excludes-header.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-scroll-excludes-header.js node tools/smoke-load.js
```

⇒ **共 73 项，PASS 69，FAIL 4**，四条全部是本次触及的断言，其余 69 条不变：

```
FAIL  面板标题栏：标题为品牌名 MGGA，版本角标与关闭按钮仍在      面板缺少滚动区 .mgga-nav-dock-body
FAIL  导航面板滚动条：只覆盖条目区 + …                        webkit 滚动条规则没挂到 .mgga-nav-dock-body 上
FAIL  导航面板标题栏：不在滚动容器内（sticky 四件套已随结构隔离作废）  条目没有下沉到滚动区 body
FAIL  侧栏来源：作为独立分组排在文件区 tab 之后                   面板缺少滚动区 .mgga-nav-dock-body
```

### 4.3 真机验证（做到了）

```bash
node tools/verify-live-navdock.js --json .workbuddy/probe/live-excl-header-new.json
MGGA_SCRIPT=.workbuddy/probe/prev-before-scroll-excludes-header.js \
  node tools/verify-live-navdock.js --json .workbuddy/probe/live-excl-header-prev.json
```

| 被测脚本 | 总结果 | 7.5 | 滚动宿主 | 宿主纵向 | 面板 |
| --- | --- | --- | --- | --- | --- |
| 改后 | **30/30 PASS** | PASS | `.mgga-nav-dock-body` | **39–213px** | `overflow-y:hidden` |
| 改前 | 29/30（1 FAIL）| **FAIL** | `#mgga-nav-dock` | **0–220px** | `overflow-y:auto` |

改后完整记录：

```
PASS  7.5 滚动条只覆盖条目区（标题栏不在滚动口内）
      滚动宿主=.mgga-nav-dock-body（纵向 39-213px）、标题下沿 37px、面板高 220px
      （滚动条只能画在宿主纵向范围内 ⇒ 宿主顶边应 >= 标题下沿）；
      标题在滚动区内=false、position=static、面板 overflow-y=hidden；
      可滚 326px；scrollTop 0→160，标题相对面板顶边 7→7px（应前后一致）；
      首条目 39→-121px（应随滚动上移）；滚动条占位 0px
```

同一次运行其余 29 条（外露探测、四个文件区 tab 吸顶、`?tab=` 清理、跨页软导航等）
两版表现一致，说明本次改动没有波及既有行为。

> **判据踩坑（第二次栽在测量时机上）**：7.5 第一版把「滚动宿主的 rect」取在
> **设置 `max-height` 之前**，而「面板的 rect」取在之后。面板是
> `top:50% + translateY(-50%)` 居中，从 544px 收到 220px 时居中位置移动了 162px ⇒
> 两个坐标系混在一起，宿主范围量成 `-124 → 376px`，**误报 FAIL**。
> 同时新增的 `INFO 7.5d 布局诊断` 立刻指出 `bodyRectH=174 / bodyClientH=174`
> 两者一致、`flexGrow/Shrink/Basis = 1/1/auto`、`minHeight=0px` —— 说明脚本侧完全正常，
> 问题在探针。**修法：宿主的 rect 必须与面板的 rect 同一时刻取。**
> 教训与上一版同源：几何断言里，**参照系必须在同一帧内取齐**。

### 4.4 真机截图给不出结论（如实说明）

滚动条的绘制在 headless Chrome 里**不可验**：headless 用 overlay 滚动条、
不渲染经典滚动条，所以 `--webkit-scrollbar-*` 系列规则改与不改，截图一模一样
（本场景 `滚动条占位 0px` 就是 overlay 的证据）。因此本轮**没有**做改前改后截图，
改用**几何证据**：滚动条只可能画在滚动宿主的 border-box 内，
所以「宿主顶边 ≥ 标题栏下沿」就等价于「滚动条不会出现在标题栏那一行」。

## 五、未验证项（如实记录）

- 真机只跑了**默认浅色主题**，深色主题下标题栏与面板背景是否仍然一致（现在标题栏
  已透明，理论上必然一致）**未实测**。
- **Windows 经典滚动条下的实际观感未实测**（headless 是 overlay 滚动条）：
  真机上 body 的滚动条距面板右边框 6px（面板 `padding`），而标题栏的关闭按钮距右边框
  10px（`padding: 2px 4px 6px`）—— 两者相差 4px，**可能有轻微不对齐**。
  若观感不佳，加 `scrollbar-gutter: stable` 给滚动条永久留位即可对齐。
- Firefox / Safari 未实测（Firefox 无箭头、走 `scrollbar-width: thin` 兜底）。
- 面板**不溢出**时没有滚动条，属正常，不是没生效。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                       # → 共 73 项，PASS 73，FAIL 0

# 离线红绿对照
git show 0bf46af:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-scroll-excludes-header.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-scroll-excludes-header.js node tools/smoke-load.js
                                               # → 共 73 项，PASS 69，FAIL 4

# 真机（需要本机 Chrome；本机证书吊销检查失败，工具已内置 --ignore-certificate-errors）
node tools/verify-live-navdock.js --json .workbuddy/probe/live-excl-header-new.json
MGGA_SCRIPT=.workbuddy/probe/prev-before-scroll-excludes-header.js \
  node tools/verify-live-navdock.js --json .workbuddy/probe/live-excl-header-prev.json
```

## 回滚

```bash
git reset --hard 0bf46afb7704663003efabd00130a5901d015c3e
```
