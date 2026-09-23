// ==UserScript==
// @name                    Make-GitHub-Great-Again
// @name:en                 Make GitHub Great Again
// @namespace               https://github.com
// @version                 2026.10.30
// @description             为 Release 的项目添加背景色，识别文件系统平台类型，以及高亮自定义关键词；修正移动端仓库页右侧空白列，新增移动端左侧悬浮导航
// @description:en          Add background colors to each Release Asset, identify the file system platform type and custom keywords highlighter. Fix empty right column on mobile.
// @author                  https://github.com/HumanMus1c
// @match                   https://github.com/*/*
// @grant                   GM_addStyle
// @grant                   GM_registerMenuCommand
// @grant                   GM_getValue
// @grant                   GM_setValue
// @license                 MIT
// ==/UserScript==

(function () {
  // 国际化配置
  const i18n = {
    isCN: navigator.language.startsWith("zh"),
    t: function (key) {
      const texts = {
        settingsTitle: { zh: "MGGA", en: "MGGA" },
        close: { zh: "关闭", en: "Close" },
        oddRow: { zh: "设置奇数行颜色", en: "Set Odd Row Color" },
        evenRow: { zh: "设置偶数行颜色", en: "Set Even Row Color" },
        hoverRow: { zh: "设置悬停颜色", en: "Set Hover Color" },
        svgIdentify: { zh: "识别系统平台", en: "Platform Identification" },
        highlightTitle: { zh: "自定义高亮关键词", en: "Custom Highlight Keywords" },
        newKeywordPlaceholder: { zh: "输入新关键词", en: "Enter new keyword" },
        add: { zh: "添加", en: "Add" },
        reset: { zh: "重置", en: "Reset" },
        cancel: { zh: "取消", en: "Cancel" },
        confirm: { zh: "确认", en: "Confirm" },
        resetTitle: { zh: "重置为当前主题默认颜色", en: "Reset to theme default colors" },
        enabledTitle: { zh: "已启用，点击禁用", en: "Enabled, click to disable" },
        disabledTitle: { zh: "已禁用，点击启用", en: "Disabled, click to enable" },
        promptOdd: { zh: "请输入奇数行背景色（HEX格式，如#f8f9fa）:", en: "Enter odd row background color (HEX, e.g., #f8f9fa):" },
        promptEven: { zh: "请输入偶数行背景色（HEX格式，如#ffffff）:", en: "Enter even row background color (HEX, e.g., #ffffff):" },
        promptHover: { zh: "请输入鼠标悬停颜色（HEX格式，如#e9ecef）:", en: "Enter hover color (HEX, e.g., #e9ecef):" },
        confirmReset: { zh: "确定要重置 {theme} 主题的自定义颜色吗？", en: "Are you sure you want to reset the custom colors for {theme} theme?" },
        darkTheme: { zh: "暗色", en: "Dark" },
        lightTheme: { zh: "亮色", en: "Light" },
        oddRowShort: { zh: "奇数行", en: "Odd row" },
        evenRowShort: { zh: "偶数行", en: "Even row" },
        hoverShort: { zh: "悬停", en: "Hover" },
        invalidColor: { zh: "颜色格式无效，请输入 6 位 HEX 颜色（如 #f8f9fa）", en: "Invalid color. Please enter a 6-digit HEX color (e.g. #f8f9fa)" },
        menuSettings: { zh: "⚙️ 设置", en: "⚙️ Settings" },
        menuOdd: { zh: "⚙️ 设置奇数行颜色", en: "⚙️ Set Odd Row Color" },
        menuEven: { zh: "⚙️ 设置偶数行颜色", en: "⚙️ Set Even Row Color" },
        menuHover: { zh: "⚙️ 设置悬停行颜色", en: "⚙️ Set Hover Row Color" },
        menuReset: { zh: "🔄 重置为默认颜色", en: "🔄 Reset to Default Colors" },
        keywordColor: { zh: "关键词颜色", en: "Keyword Color" },
        builtinPicker: { zh: "初始化内置颜色选择器...", en: "Initializing built-in color picker..." },
        formatToggle: { zh: "点击切换颜色格式（HEX ↔ RGB ↔ HSL）", en: "Click to toggle format (HEX ↔ RGB ↔ HSL)" },
        clear: { zh: "清除", en: "Clear" },
        noKeywords: { zh: "暂无自定义关键词", en: "No custom keywords" },
        defaultTag: { zh: "默认", en: "Default" },
        restore: { zh: "恢复", en: "Restore" },
        deleteRule: { zh: "删除", en: "Delete" },
        mobileFix: { zh: "修正仓库头按钮溢出", en: "Fix repo header button overflow" },
        navDock: { zh: "左侧悬浮导航", en: "Floating nav dock" },
        navDockMenuToggle: {
          zh: "展开/收起悬浮导航",
          en: "Expand/Collapse nav dock",
        },
        navDockExpand: { zh: "展开悬浮导航", en: "Expand nav dock" },
        navDockCollapse: { zh: "收起悬浮导航", en: "Collapse nav dock" },
        navDockSidebar: { zh: "侧栏", en: "Sidebar" },
        navDockUnavailable: {
          zh: "当前页面不是仓库主页，悬浮导航仅在 用户名/仓库 主页可用",
          en: "This page is not a repository home; the nav dock only works on owner/repo home pages",
        }
      };
      return texts[key] ? (this.isCN ? texts[key].zh : texts[key].en) : key;
    }
  };

  // === 颜色消毒工具：所有进入 innerHTML/样式表的颜色值统一走此函数 ===
  function sanitizeHexColor(value, fallback = "#ffeb3b") {
    if (typeof value !== "string") return fallback;
    const hex = value.trim();
    // 可选 # 前缀 + 3 位缩写展开 / 6 位完整形式
    const m = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.exec(hex);
    if (!m) return fallback;
    const raw = m[1];
    if (raw.length === 3) {
      const [a, b, c] = raw.split("");
      return ("#" + a + a + b + b + c + c).toLowerCase();
    }
    return ("#" + raw).toLowerCase();
  }

  // === HTML 文本转义工具 ===
  function escapeHtmlText(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // === 脚本版本号单一来源 ===
  // 元信息与 UI 展示共用，避免各处硬编码兜底值与 @version 脱节
  const FALLBACK_VERSION = "unknown";
  function getScriptVersion() {
    try {
      if (
        typeof GM_info !== "undefined" &&
        GM_info &&
        GM_info.script &&
        GM_info.script.version
      ) {
        return String(GM_info.script.version);
      }
    } catch (_) {
      /* GM_info 不可用时走兜底 */
    }
    return FALLBACK_VERSION;
  }

  // === 颜色工具区（模块级单一实现）===
  // 历史上这些转换在设置面板/高亮/确认保存处各写了一份，逐一收敛至此。
  // 全部为纯函数，无副作用，供设置面板、关键词高亮与图标算法共用。

  /** 数值 RGB → "#RRGGBB"（大写入参需为 0-255 整数） */
  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = Number(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
        .toUpperCase()
    );
  }

  /** "#RRGGBB" / "#RGB" → { r, g, b }；解析失败返回全 0 */
  function hexToRgb(hex) {
    let r = 0,
      g = 0,
      b = 0;
    const h = String(hex || "");
    if (h.length === 4) {
      r = parseInt(h[1] + h[1], 16);
      g = parseInt(h[2] + h[2], 16);
      b = parseInt(h[3] + h[3], 16);
    } else if (h.length === 7) {
      r = parseInt(h.substring(1, 3), 16);
      g = parseInt(h.substring(3, 5), 16);
      b = parseInt(h.substring(5, 7), 16);
    }
    return { r, g, b };
  }

  /**
   * CSS 颜色字符串 → "#RRGGBB"
   * 来源可能是元素 style（已是 HEX）或 getComputedStyle（"rgb(r, g, b)"）。
   * fallback 用于空值/transparent，各调用点语义不同故显式传入。
   */
  function cssColorToHex(color, fallback = "") {
    if (!color || color === "transparent") return fallback;
    if (color.startsWith("#")) return color;
    const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (m) {
      return rgbToHex(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    }
    return color;
  }

  /** HSL(0-360, 0-100, 0-100) → "#RRGGBB" */
  function hslToHex(h, s, l) {
    h = parseInt(h, 10);
    s = parseInt(s, 10) / 100;
    l = parseInt(l, 10) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0,
      g = 0,
      b = 0;

    if (hh <= 1) {
      r = c; g = x;
    } else if (hh <= 2) {
      r = x; g = c;
    } else if (hh <= 3) {
      g = c; b = x;
    } else if (hh <= 4) {
      g = x; b = c;
    } else if (hh <= 5) {
      r = x; b = c;
    } else {
      r = c; b = x;
    }

    const m = l - c / 2;
    const toHex = (n) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  /** "#RGB"/"#RRGGBB"/"rgb(...)" → { h:0-360, s:0-100, l:0-100 } */
  function hexToHSL(color) {
    let r, g, b;
    const c = String(color || "");

    if (c.startsWith("#")) {
      if (c.length === 4) {
        r = parseInt(c[1] + c[1], 16) / 255;
        g = parseInt(c[2] + c[2], 16) / 255;
        b = parseInt(c[3] + c[3], 16) / 255;
      } else {
        r = parseInt(c.slice(1, 3), 16) / 255;
        g = parseInt(c.slice(3, 5), 16) / 255;
        b = parseInt(c.slice(5, 7), 16) / 255;
      }
    } else if (c.startsWith("rgb")) {
      const match = c.match(/\d+/g);
      if (match) {
        r = parseInt(match[0], 10) / 255;
        g = parseInt(match[1], 10) / 255;
        b = parseInt(match[2], 10) / 255;
      }
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return { h: 0, s: 0, l: 50 };
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /** RGB(0-255) → { h:0-360, s:0-100, l:0-100 } */
  function rgbToHSL(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /** HSL(0-360, 0-100, 0-100) → { r, g, b } (0-255) */
  function hslToRGB(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /** 判断十六进制颜色是否偏暗（YIQ 亮度公式） */
  function isDarkColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  }

  // === 主题关键词颜色缓存（避免高亮函数在每次正则替换中反复 GM_getValue）===
  let cachedThemeColors = {
    userCustomKeywords: [],
    defaultColorOverrides: {},
    version: 0,
  };
  function refreshThemeColorsCache() {
    cachedThemeColors = {
      userCustomKeywords: GM_getValue("userCustomKeywords", []),
      defaultColorOverrides: GM_getValue("defaultColorOverrides", {}),
      version: cachedThemeColors.version + 1,
    };
    return cachedThemeColors;
  }
  refreshThemeColorsCache();

  // 更可靠的主题检测函数
  function getCurrentTheme() {
    // 检测GitHub的显式主题设置
    const explicitTheme =
      document.documentElement.getAttribute("data-color-mode");
    if (explicitTheme === "light" || explicitTheme === "dark") {
      return explicitTheme;
    }

    // 检测GitHub的类名主题设置
    if (document.documentElement.classList.contains("dark")) {
      return "dark";
    }

    // 检测系统级主题设置
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // 默认颜色配置（亮色主题）
  const defaultColorsLight = {
    oddRowColor: "#f8f9fa",
    evenRowColor: "#ffffff",
    hoverColor: "#e9ecef",
  };

  // 默认颜色配置（暗色主题）
  const defaultColorsDark = {
    oddRowColor: "#161b22",
    evenRowColor: "#0d1117",
    hoverColor: "#30363d",
  };

  // 获取当前主题的默认颜色
  function getDefaultColors() {
    return getCurrentTheme() === "dark"
      ? defaultColorsDark
      : defaultColorsLight;
  }

  // 检查是否为 Release 页面
  function isReleasesPage() {
    return /\/[^/]+\/[^/]+\/releases(\/.*)?$/i.test(window.location.pathname);
  }

  // 创建样式元素并添加到文档头部
  const styleElement = document.createElement("style");
  styleElement.id = "Make-GitHub-Great-Again-style";
  styleElement.setAttribute("data-mgga-mutation-guard", "1");
  document.head.appendChild(styleElement);

  // 应用颜色的函数 - 根据当前主题动态更新样式
  function applyColors(overrides = null) {
    if (!isReleasesPage()) {
      if (styleElement.textContent !== "") {
        styleElement.textContent = "";
        styleElement.remove();
        document.head.appendChild(styleElement);
      }
      return;
    }

    const theme = getCurrentTheme();
    const themeKey = `customColors${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const colors = (overrides && overrides.colors) || customColors || getDefaultColors();

    // 获取切换状态
    const isOddEnabled = overrides && overrides.toggles ? overrides.toggles.odd : GM_getValue("colorToggleOdd", true);
    const isEvenEnabled = overrides && overrides.toggles ? overrides.toggles.even : GM_getValue("colorToggleEven", true);
    const isHoverEnabled = overrides && overrides.toggles ? overrides.toggles.hover : GM_getValue("colorToggleHover", true);

    // 动态更新样式
    // 每条规则同时覆盖主选择器与 data-testid 兜底选择器，改版后仍能上色。
    // （选择器见 ASSET_SELECTORS；CSS 无法条件判断，故并列书写。）
    styleElement.textContent = `
            .Box.Box--condensed li.Box-row:nth-child(odd),
            [data-testid="release-assets"] li.Box-row:nth-child(odd) {
                background-color: ${isOddEnabled ? sanitizeHexColor(colors.oddRowColor, "#f8f9fa") : "transparent"} !important;
            }
            .Box.Box--condensed li.Box-row:nth-child(even),
            [data-testid="release-assets"] li.Box-row:nth-child(even) {
                background-color: ${isEvenEnabled ? sanitizeHexColor(colors.evenRowColor, "#ffffff") : "transparent"} !important;
            }
            .Box.Box--condensed li.Box-row:hover,
            [data-testid="release-assets"] li.Box-row:hover {
                background-color: ${isHoverEnabled ? sanitizeHexColor(colors.hoverColor, "#e9ecef") : "transparent"} !important;
            }
        `;

    // 如果对话框是打开的，更新对话框中的颜色 (仅在非预览模式下更新，防止实时调整被重置)
    const dialog = document.querySelector(".color-picker-dialog.visible");
    if (dialog && !overrides) {
      updateDialogColors();
    }
  }

  // === 视口自适应：保证面板永不超出屏幕 ===
  function getViewportMetrics() {
    const vv = window.visualViewport;
    if (vv) {
      return {
        width: vv.width,
        height: vv.height,
        offsetLeft: vv.offsetLeft,
        offsetTop: vv.offsetTop,
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
    };
  }

  /**
   * 将 fixed 元素完整放入视口内：限制最大宽高，并钳制 left/top。
   * options:
   *   margin        - 边距 (默认 8)
   *   centerY       - 是否垂直居中 (对话框 true, 子面板 false)
   *   preferLeft    - 优先使用的 left
   *   anchorRect    - 锚点矩形；提供时在锚点右侧弹出，放不下则翻到左侧
   *   scrollable    - 超出时是否允许自身滚动 (子面板 true；对话框 false，由内部 content 滚动)
   */
  function placeFixedInViewport(el, options = {}) {
    if (!el || !el.isConnected) return;

    const margin = options.margin != null ? options.margin : 8;
    const centerY = options.centerY !== false;
    const preferLeft = options.preferLeft != null ? options.preferLeft : margin;
    const anchorRect = options.anchorRect || null;
    const scrollable = options.scrollable !== false;

    const vp = getViewportMetrics();
    const maxW = Math.max(120, vp.width - margin * 2);
    const maxH = Math.max(80, vp.height - margin * 2);

    // 测量时临时去掉 transform / transition，避免滑入动画或居中偏移干扰
    const prevTransform = el.style.transform;
    const prevTransition = el.style.transition;
    el.style.transition = "none";
    el.style.transform = "none";
    el.style.maxWidth = maxW + "px";
    el.style.maxHeight = maxH + "px";
    el.style.boxSizing = "border-box";
    if (scrollable) {
      el.style.overflowX = "hidden";
      el.style.overflowY = "auto";
    }

    let rect = el.getBoundingClientRect();
    let left;
    let top;

    if (anchorRect) {
      // 相对锚点定位：优先右侧，放不下则左侧
      left = anchorRect.right + margin;
      top = anchorRect.top;
      if (left + rect.width > vp.offsetLeft + vp.width - margin) {
        left = anchorRect.left - rect.width - margin;
      }
      if (left < vp.offsetLeft + margin) {
        left = vp.offsetLeft + margin;
      }
      if (left + rect.width > vp.offsetLeft + vp.width - margin) {
        left = Math.max(vp.offsetLeft + margin, vp.offsetLeft + vp.width - rect.width - margin);
      }
      if (top + rect.height > vp.offsetTop + vp.height - margin) {
        top = vp.offsetTop + vp.height - rect.height - margin;
      }
      if (top < vp.offsetTop + margin) {
        top = vp.offsetTop + margin;
      }
    } else if (centerY) {
      // 垂直居中；若高度接近/超过视口则贴顶
      if (rect.height >= vp.height - margin * 2) {
        top = vp.offsetTop + margin / 2;
      } else {
        top = vp.offsetTop + (vp.height - rect.height) / 2;
      }
      left = preferLeft;
      if (rect.width >= maxW) {
        left = vp.offsetLeft + margin;
      } else {
        left = Math.max(
          vp.offsetLeft + margin,
          Math.min(left, vp.offsetLeft + vp.width - rect.width - margin),
        );
      }
      if (left + rect.width > vp.offsetLeft + vp.width - margin) {
        left = Math.max(vp.offsetLeft + margin, vp.offsetLeft + vp.width - rect.width - margin);
      }
    } else {
      top = vp.offsetTop + margin / 2;
      left = preferLeft;
      if (left + rect.width > vp.offsetLeft + vp.width - margin) {
        left = Math.max(vp.offsetLeft + margin, vp.offsetLeft + vp.width - rect.width - margin);
      }
      if (left < vp.offsetLeft + margin) left = vp.offsetLeft + margin;
    }

    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";

    // 还原 transform（交给 CSS 类控制滑入动画），并恢复 transition
    el.style.transform = prevTransform || "";
    el.style.transition = prevTransition;
    void el.offsetHeight;
  }

  function attachViewportAdaptation(el, onReflow) {
    if (!el || el._viewportHandler) return;
    let rafId = 0;
    const handler = () => {
      if (!document.body.contains(el)) {
        detachViewportAdaptation(el);
        return;
      }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!document.body.contains(el)) return;
        if (typeof onReflow === "function") onReflow();
      });
    };
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handler);
      window.visualViewport.addEventListener("scroll", handler);
    }
    el._viewportHandler = handler;
  }

  function detachViewportAdaptation(el) {
    if (!el || !el._viewportHandler) return;
    const handler = el._viewportHandler;
    window.removeEventListener("resize", handler);
    window.removeEventListener("orientationchange", handler);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", handler);
      window.visualViewport.removeEventListener("scroll", handler);
    }
    delete el._viewportHandler;
  }

  function clampElementInViewport(el, margin) {
    if (!el || !el.isConnected) return;
    // 对话框由 CSS 居中 + max-height 保证不越界，不要改写其 transform/top
    if (el.classList.contains("color-picker-dialog")) {
      syncDialogViewportLimit(el);
      return;
    }
    placeFixedInViewport(el, {
      margin: margin != null ? margin : 8,
      centerY: false,
      scrollable: true,
      preferLeft: 8,
    });
  }

  /**
   * 仅用布局视口同步对话框 max-height，不碰 transform/left/top，
   * 以保留滑入动画与 CSS 垂直居中（高度增长时自动回中，不会顶出屏幕底边）。
   */
  function syncDialogViewportLimit(dialog) {
    if (!dialog || !dialog.isConnected) return;
    const margin = 16;
    // fixed 元素相对布局视口定位，优先用 innerHeight（兼容性最好）
    const layoutH = window.innerHeight || getViewportMetrics().height;
    const layoutW = window.innerWidth || getViewportMetrics().width;
    const maxH = Math.max(120, layoutH - margin);
    const maxW = Math.max(160, layoutW - margin);
    dialog.style.maxHeight = maxH + "px";
    dialog.style.maxWidth = maxW + "px";
  }

  // 更新对话框中的颜色显示
  function updateDialogColors() {
    const dialog = document.querySelector(".color-picker-dialog");
    if (!dialog) return;

    const currentTheme = getCurrentTheme();
    const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const colors =
      customColors ||
      (currentTheme === "dark" ? defaultColorsDark : defaultColorsLight);

    // 更新标题
    const title = dialog.querySelector(".color-picker-title");
    const versionStr = getScriptVersion();
    if (title) {
      const themeLabel = currentTheme === "dark" ? i18n.t("darkTheme") : i18n.t("lightTheme");
      title.innerHTML = `<svg viewBox="0 0 16 16" width="1.1em" height="1.1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg> ${i18n.t("settingsTitle")} <span style="font-size: 0.8em; font-weight: normal; opacity: 0.7;">v${versionStr}</span> <span style="font-size: 0.6em; font-weight: normal; opacity: 0.5;">(${themeLabel})</span>`;
    }

    // 更新颜色按钮
    const oddRowColorBtn = dialog.querySelector("#oddRowColorBtn");
    const evenRowColorBtn = dialog.querySelector("#evenRowColorBtn");
    const hoverColorBtn = dialog.querySelector("#hoverColorBtn");

    if (oddRowColorBtn)
      oddRowColorBtn.style.backgroundColor = colors.oddRowColor;
    if (evenRowColorBtn)
      evenRowColorBtn.style.backgroundColor = colors.evenRowColor;
    if (hoverColorBtn) hoverColorBtn.style.backgroundColor = colors.hoverColor;
  }

  // 初始应用颜色
  applyColors();

  // 监听主题变化并动态更新样式
  function setupThemeObserver() {
    // 监听HTML元素的属性变化
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.attributeName === "data-color-mode" ||
          mutation.attributeName === "class"
        ) {
          if (isReleasesPage()) {
            applyColors();
          }
          break;
        }
      }
    });

    // 监听系统主题变化
    const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeMedia.addEventListener("change", () => {
      if (isReleasesPage()) {
        applyColors();
      }
    });

    // 开始观察文档元素
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-mode", "class"],
    });
  }

  // 设置主题观察器
  setupThemeObserver();

  // 添加CSS样式 - 对话框样式（固定不变）
  GM_addStyle(`
        :root {
            --mgga-text-scale: 1.0em;
            --mgga-btn-scale: 0.8em;
        }

        /* 对话框样式 - 修复主题跟随问题 */
        .color-picker-dialog {
            position: fixed;
            top: 50%; /* 垂直居中；高度变化时自动保持在视口内 */
            left: 1em; /* 距离左侧缩进跟随缩放 */
            transform: translateY(-50%) translateX(-100%);
            border-radius: 0.5em;
            padding: 1.25em;
            box-shadow: 0 0.15em 1.5em rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 0 !important;
            width: min(20em, calc(100% - 2em));
            max-width: calc(100% - 2em);
            /* 视口限高：内容再高也不会顶出屏幕，由内部滚动 */
            max-height: calc(100vh - 1em);
            max-height: calc(100dvh - 1em);
            font-family: inherit; /* 继承页面字体 */
            font-size: var(--mgga-text-scale); /* 文本字体总体缩放 */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            overscroll-behavior: contain;

            /* 初始状态 - 不可见 */
            opacity: 0;
            visibility: hidden;
            pointer-events: none;

            /* 过渡动画设置 */
            transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
        }

        /* 明亮主题样式 */
        @media (prefers-color-scheme: light) {
            .color-picker-dialog {
                background: #ffffff;
                border: 1px solid #d0d7de;
                color: #24292f;
            }

            .color-picker-header {
                border-bottom: 1px solid #d8dee4;
            }

            .color-picker-title {
                color: #24292f;
            }

            .color-picker-close {
                color: #57606a;
            }

            .color-picker-close:hover {
                color: #24292f;
            }

            .menu-command {
                color: #24292f;
            }

            .color-button {
                border: 1px solid #d0d7de;
                background: #f6f8fa;
            }
        }

        /* 暗色主题样式 */
        @media (prefers-color-scheme: dark) {
            .color-picker-dialog {
                background: #0d1117;
                border: 1px solid #30363d;
                color: #c9d1d9;
            }

            .color-picker-header {
                border-bottom: 1px solid #21262d;
            }

            .color-picker-title {
                color: #c9d1d9;
            }

            .color-picker-close {
                color: #8b949e;
            }

            .color-picker-close:hover {
                color: #c9d1d9;
            }

            .menu-command {
                color: #c9d1d9;
            }

            .color-button {
                border: 1px solid #30363d;
                background: #161b22;
            }
        }

        /* 对话框可见状态 */
        .color-picker-dialog.visible {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translateY(-50%) translateX(0);
        }

        .color-picker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1em;
            padding-bottom: 0.5em;
            flex-shrink: 0;
        }

        .color-picker-title {
            font-weight: bold;
            margin: 0;
            font-size: 1.25em;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .color-picker-close {
            cursor: pointer;
            padding: 0.3em 0.6em;
            font-size: 1.5em;
            transition: all 0.3s ease;
            flex-shrink: 0;
        }

        .color-picker-close:hover {
            transform: scale(1.1);
        }

        .color-picker-content {
            display: flex;
            flex-direction: column;
            gap: 0.75em;
            /* min-height:0 允许在 max-height 下收缩并滚动，按钮行保持可见 */
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            overscroll-behavior: contain;
            /* 负 margin 吃掉对话框 padding，滚动条贴边 */
            margin: 0 -0.35em;
            padding: 0 0.35em;
        }

        .color-picker-row {
            display: flex;
            align-items: center;
            gap: 0.75em;
            justify-content: space-between;
            flex-wrap: wrap;
            min-width: 0;
        }

        .menu-command {
            font-size: 1em;
            font-weight: 500;
            min-width: 0;
            max-width: 100%;
            display: inline-flex;
            align-items: center;
            gap: 0.3em;
            flex-wrap: nowrap;
            flex: 1 1 auto;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .button-row {
            display: flex;
            justify-content: flex-end;
            gap: 0.75em;
            margin-top: 0.75em;
            flex-shrink: 0;
            flex-wrap: wrap;
            padding-top: 0.35em;
        }

        .dialog-button {
            padding: 0.5em 1em;
            border: none;
            border-radius: 0.4em;
            cursor: pointer;
            font-weight: bold;
            font-size: var(--mgga-btn-scale);
            transition: all 0.3s ease;
            font-family: inherit;
        }

        /* 按钮颜色保持不变 */
        .cancel-button {
            background-color: #007bff; /* 蓝色背景 */
            color: white;
        }

        .cancel-button:hover {
            background-color: #0069d9;
            transform: translateY(-2px);
        }

        .confirm-button {
            background-color: #ffa500; /* 橙黄色背景 */
            color: black;
        }

        .confirm-button:hover {
            background-color: #e69500;
            transform: translateY(-2px);
        }

        /* 新添加的重置按钮样式 */
        .reset-button {
            background-color: #ff6b6b; /* 浅红色背景 */
            color: white;
        }

        .reset-button:hover {
            background-color: #ff5252; /* 悬停时加深红色 */
            transform: translateY(-2px);
        }

        .color-button {
            font-size: var(--mgga-btn-scale);
            width: 2em;
            height: 2em;
            border-radius: 0.4em;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .color-button:hover {
            transform: scale(1.1);
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }

        #svgToggleBtn:hover, #highlightToggleBtn:hover {
            transform: none !important;
            box-shadow: none !important;
        }

        .color-picker-container {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 0.2em;
        }

        .color-picker-container input[type="color"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
        }

        .color-picker-container .color-button {
            position: relative;
        }

        /* 悬浮设置按钮样式 */
        #mgga-float-btn {
            position: fixed;
            left: 1em;
            top: 50%;
            /* 保证居中显示，拖动时我们会修改top实现位移 */
            transform: translateY(-50%);
            width: 2.8em;
            height: 2.8em;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid #d0d7de;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--mgga-btn-scale); /* 按钮控件缩放 */
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            user-select: none;
            transition: opacity 0.4s ease, margin-left 0.4s ease, background 0.2s ease;
        }

        #mgga-float-btn:hover {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        #mgga-float-btn:active {
            cursor: grabbing;
        }

        @media (prefers-color-scheme: dark) {
            #mgga-float-btn {
                background: rgba(30, 30, 30, 0.85);
                border-color: #30363d;
            }
            #mgga-float-btn:hover {
                background: rgba(50, 50, 50, 1);
            }
        }

        /* 悬浮按钮动画隐藏状态 (向右隐藏) */
        #mgga-float-btn.hidden-to-right {
            opacity: 0;
            pointer-events: none;
            /* 向右位移 */
            margin-left: 2em;
        }

        /* 拖拽时的强制禁用动画类 */
        #mgga-float-btn.is-dragging {
            transition: none !important;
        }

        /* 自定义关键词高亮样式 */
        #customKeywordsContainer {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4em;
            align-content: flex-start;
        }

        .custom-keyword-item {
            display: inline-flex;
            align-items: center;
            gap: 0.35em;
            padding: 0.25em 0.45em;
            background: rgba(125, 125, 125, 0.1);
            border-radius: 0.3em;
            font-size: 0.9em;
            width: fit-content;
            max-width: 100%;
        }

        .custom-keyword-item .keyword-text {
            font-weight: bold;
            white-space: nowrap;
        }

        .custom-keyword-item .keyword-color-swatch {
            width: 1.1em;
            height: 1.1em;
            min-width: 1.1em;
            border-radius: 0.3em;
            border: 1px solid rgba(125, 125, 125, 0.3);
            flex-shrink: 0;
            cursor: pointer;
            padding: 0;
            margin: 0;
            box-shadow: none;
            display: inline-block;
        }

        .custom-keyword-item .keyword-action-btn {
            cursor: pointer;
            font-weight: bold;
            font-size: 1em;
            line-height: 1;
            padding: 0 0.25em;
            border-radius: 0.2em;
            flex-shrink: 0;
            user-select: none;
        }

        .custom-keyword-item .keyword-remove {
            color: #d73a49;
        }

        .custom-keyword-item .keyword-remove:hover {
            color: #cb2431;
        }

        .custom-keyword-item .keyword-restore {
            color: #2da44e;
        }

        .custom-keyword-item .keyword-restore:hover {
            color: #218838;
        }

        .custom-keyword-item.pending-delete {
            background: rgba(215, 58, 73, 0.1);
            opacity: 0.65;
        }

        .custom-keyword-item.pending-delete .keyword-text {
            text-decoration: line-through;
            font-weight: normal;
        }

        .custom-keyword-item.default-keyword-item {
            background: rgba(125, 125, 125, 0.04);
        }

        .custom-keyword-item .keyword-default-tag {
            font-size: 0.68em;
            font-weight: bold;
            padding: 0.1em 0.45em;
            border-radius: 0.3em;
            background: #0969da;
            color: #fff;
            flex-shrink: 0;
            letter-spacing: 0.02em;
            white-space: nowrap;
        }

        #customKeywordsContainer .keyword-empty-hint {
            width: 100%;
            color: gray;
            font-size: 0.9em;
            text-align: center;
            padding: 0.5em 0;
        }

        #newKeywordInput { min-width: 0; } #newKeywordColorBtn { flex-shrink: 0; } #addKeywordBtn { white-space: nowrap; flex-shrink: 0; } .color-toggle-btn {
            font-size: var(--mgga-btn-scale);
            width: 1.8em;
            height: 1.8em;
            padding: 0;
            border-radius: 0.3em;
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: transparent;
            border: 1px solid rgba(125, 125, 125, 0.3);
            color: inherit;
            margin-right: 0.5em;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .color-toggle-btn:hover {
            background-color: rgba(100, 150, 255, 0.1);
            border-color: #0969da;
            color: #0969da;
            transform: scale(1.05);
        }

        .color-toggle-btn.disabled {
            opacity: 0.5;
            background-color: rgba(125, 125, 125, 0.1);
            border-color: rgba(125, 125, 125, 0.3);
            color: rgba(125, 125, 125, 0.6);
        }

        /* 自定义color picker子面板样式 */
        .custom-color-picker-panel {
            position: fixed;
            background: inherit;
            border: 1px solid rgba(125, 125, 125, 0.3);
            border-radius: 0.4em;
            padding: 0.8em;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 0.6em;
            width: max-content;
            min-width: min(14em, calc(100vw - 1em));
            max-width: min(90vw, calc(100vw - 1em));
            max-height: calc(100vh - 1em);
            max-height: calc(100dvh - 1em);
            overflow-x: hidden;
            overflow-y: auto;
            overscroll-behavior: contain;
            box-sizing: border-box;
        }

        .custom-color-picker-panel input[type="text"] {
            padding: 0.3em 0.4em;
            border: 1px solid rgba(125, 125, 125, 0.3);
            border-radius: 0.3em;
            background: transparent;
            color: inherit;
            font-family: monospace;
            font-size: 0.9em;
            width: 100%;
            box-sizing: border-box;
        }

        .custom-color-picker-panel input[type="text"]:focus {
            outline: none;
            border-color: #0969da;
            box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.1);
        }

        .color-picker-controls {
            display: flex;
            gap: 0.3em;
            align-items: center;
        }

        .color-picker-preview {
            width: 2em;
            height: 2em;
            border: 1px solid rgba(125, 125, 125, 0.3);
            border-radius: 0.3em;
            cursor: pointer;
            flex-shrink: 0;
        }

        .color-picker-preview:hover {
            transform: scale(1.05);
        }

        .color-picker-clear-btn {
            padding: 0.3em 0.6em;
            border: 1px solid rgba(125, 125, 125, 0.3);
            border-radius: 0.3em;
            background: transparent;
            color: #d73a49;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
            font-size: 0.85em;
        }

        .color-picker-clear-btn:hover {
            background-color: rgba(255, 0, 0, 0.1);
            border-color: #d73a49;
        }

        /* 三库并排容器 */
        .color-picker-libraries-container {
            display: flex;
            gap: 1em;
            flex-wrap: wrap;
            align-items: flex-start;
            max-width: 100%;
            min-width: 0;
        }

        .color-picker-library-item {
            flex: 0 1 auto;
            min-width: min(12em, 100%);
            max-width: 100%;
            padding: 0.6em;
            border: 1px solid rgba(125, 125, 125, 0.2);
            border-radius: 0.3em;
            background: rgba(125, 125, 125, 0.05);
            box-sizing: border-box;
        }

        .color-picker-library-label {
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 0.4em;
            opacity: 0.7;
            display: block;
        }

        /* 内置颜色选择器样式 */
        .builtin-color-picker-container {
            display: flex;
            flex-direction: column;
            gap: 0.8em;
            padding: 0.8em;
            background: rgba(125, 125, 125, 0.05);
            border-radius: 0.3em;
            width: min(250px, 100%); /* 常规固定宽度，窄屏时收缩 */
            max-width: 100%;
            box-sizing: border-box;
        }

        .builtin-picker-top-section {
            display: flex;
            gap: 0.6em;
            align-items: stretch;
        }

        .builtin-color-area-section {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .builtin-color-area-main {
            position: relative;
            width: 100%;
            height: 150px;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            cursor: crosshair;
            overflow: hidden;
        }

        #color-area-canvas {
            width: 100%;
            height: 100%;
            display: block;
        }

        .builtin-color-picker-point {
            position: absolute;
            width: 10px;
            height: 10px;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3),
                        inset 0 0 0 1px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            top: 0;
            left: 0;
            transform: translate(-50%, -50%);
        }

        .builtin-hue-alpha-section {
            display: flex;
            flex-direction: column;
            gap: 0.4em;
            width: 20px;
        }

        .builtin-hue-slider-container {
            position: relative;
            width: 100%;
            height: 150px;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            cursor: pointer;
            overflow: hidden;
        }

        .builtin-hue-strip {
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom,
                hsl(0,   100%, 50%),
                hsl(30,  100%, 50%),
                hsl(60,  100%, 50%),
                hsl(90,  100%, 50%),
                hsl(120, 100%, 50%),
                hsl(150, 100%, 50%),
                hsl(180, 100%, 50%),
                hsl(210, 100%, 50%),
                hsl(240, 100%, 50%),
                hsl(270, 100%, 50%),
                hsl(300, 100%, 50%),
                hsl(330, 100%, 50%),
                hsl(360, 100%, 50%)
            );
        }

        .builtin-hue-picker {
            position: absolute;
            left: 0;
            width: 100%;
            height: 2px;
            background: white;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
            top: 0;
            pointer-events: none;
            transform: translateY(-50%);
        }

        .builtin-picker-bottom-section {
            display: flex;
            flex-direction: column;
            gap: 0.6em;
        }

        .builtin-input-group {
            display: flex;
            align-items: center;
            gap: 0.4em;
            width: 100%;
            box-sizing: border-box;
        }

        .builtin-input-group label {
            font-size: 0.8em;
            font-weight: 600;
            min-width: 3em;
            opacity: 0.7;
        }

        .builtin-format-toggle-btn {
            font-size: 0.8em;
            font-weight: 600;
            min-width: 3.5em;
            padding: 0.3em 0.4em;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            background: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.2s ease;
            color: inherit;
            text-align: center;
            flex-shrink: 0;
        }

        .builtin-format-toggle-btn:hover {
            background: rgba(255, 255, 255, 0.5);
            border-color: #0969da;
            color: #0969da;
        }

        .builtin-format-toggle-btn:active {
            transform: scale(0.95);
        }

        @media (prefers-color-scheme: dark) {
            .builtin-format-toggle-btn {
                background: rgba(100, 100, 100, 0.2);
                border-color: rgba(100, 100, 100, 0.3);
            }

            .builtin-format-toggle-btn:hover {
                background: rgba(100, 100, 100, 0.4);
                border-color: #58a6ff;
                color: #58a6ff;
            }
        }

        .builtin-color-hex-input {
            flex: 1;
            min-width: 0;
            padding: 0.3em 0.5em;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            font-size: 0.85em;
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.5);
            box-sizing: border-box;
        }

        .builtin-color-hex-input:focus {
            outline: none;
            border-color: #0969da;
            background: white;
        }

        /* RGB/HSL三输入框容器样式 */
        .builtin-multi-input-container {
            display: flex;
            gap: 0.3em;
            align-items: center;
            flex: 1;
            min-width: 0;
            box-sizing: border-box;
        }

        .builtin-color-value-input {
            flex: 1;
            width: 0;
            min-width: 0;
            padding: 0.3em 0.2em;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            font-size: 0.85em;
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.5);
            text-align: center;
            box-sizing: border-box;
        }

        .builtin-color-value-input:focus {
            outline: none;
            border-color: #0969da;
            background: white;
        }

        @media (prefers-color-scheme: dark) {
            .builtin-color-hex-input {
                background: rgba(100, 100, 100, 0.2);
                border-color: rgba(100, 100, 100, 0.3);
                color: inherit;
            }

            .builtin-color-hex-input:focus {
                background: rgba(100, 100, 100, 0.3);
                border-color: #58a6ff;
            }

            .builtin-color-value-input {
                background: rgba(100, 100, 100, 0.2);
                border-color: rgba(100, 100, 100, 0.3);
                color: inherit;
            }

            .builtin-color-value-input:focus {
                background: rgba(100, 100, 100, 0.3);
                border-color: #58a6ff;
            }
        }

        .builtin-clear-btn {
            padding: 0.3em 0.6em;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.2em;
            background: rgba(255, 255, 255, 0.3);
            color: #d73a49;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.85em;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .builtin-clear-btn:hover {
            background: rgba(255, 0, 0, 0.15);
            border-color: #d73a49;
            color: #cb2431;
        }

        .builtin-clear-btn:active {
            transform: scale(0.95);
        }

        .builtin-preset-colors-row {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(1.5em, 1fr));
            gap: 0.3em;
        }

        .builtin-preset-color-swatch {
            width: 100%;
            aspect-ratio: 1;
            border: 1px solid rgba(0, 0, 0, 0.15);
            border-radius: 0.15em;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .builtin-preset-color-swatch:hover {
            border-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.2);
            transform: scale(1.1);
        }

        /* Pickr库样式适配 */
        .pcr-app {
            font-size: 0.9em !important;
        }

        /* Huebee库样式适配 */
        .huebee {
            font-size: 0.9em !important;
        }

        /* Spectrum库样式适配 */
        .sp-container {
            font-size: 0.9em !important;
        }
    `);

  /**
   * 设置面板 HTML 模板（纯函数，便于与交互逻辑分离维护）。
   * 所有插值均已消毒：颜色走 sanitizeHexColor，文案走 i18n 静态字典。
   */
  function buildSettingsDialogHTML(customColors) {
    return `
            <div class="color-picker-header">
                <h3 class="color-picker-title"><svg viewBox="0 0 16 16" width="1.1em" height="1.1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg> ${i18n.t("settingsTitle")} <span style="font-size: 0.8em; font-weight: normal; opacity: 0.7;">v${getScriptVersion()}</span></h3>
                <span class="color-picker-close" title="${i18n.t("close")}">&times;</span>
            </div>
            <div class="color-picker-content">
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleOddRowBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("oddRow")}</span>
                    <button class="color-button" id="oddRowColorBtn" style="background-color: ${sanitizeHexColor(customColors.oddRowColor, "#f8f9fa")}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleEvenRowBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("evenRow")}</span>
                    <button class="color-button" id="evenRowColorBtn" style="background-color: ${sanitizeHexColor(customColors.evenRowColor, "#ffffff")}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleHoverBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("hoverRow")}</span>
                    <button class="color-button" id="hoverColorBtn" style="background-color: ${sanitizeHexColor(customColors.hoverColor, "#e9ecef")}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="svgToggleBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("svgIdentify")}</span>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="mobileFixToggleBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("mobileFix")}</span>
                </div>
                <div style="margin-top: 0.75em; border-top: 1px solid rgba(125, 125, 125, 0.2); padding-top: 0.75em;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                        <span class="menu-command"><button class="color-toggle-btn" id="highlightToggleBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("highlightTitle")}</span>
                    </div>
                    <div id="customKeywordsContainer" style="max-height: min(16em, 28vh); overflow-y: auto; margin-bottom: 0.5em;">
                        <!-- 动态渲染关键词列表 -->
                    </div>
                    <div style="display: flex; gap: 0.5em; align-items: center; flex-wrap: wrap;">
                        <input type="text" id="newKeywordInput" placeholder="${i18n.t("newKeywordPlaceholder")}" style="flex: 1 1 8em; min-width: 0; padding: 0.4em; border-radius: 0.3em; border: 1px solid var(--arch-border, #d0d7de); background: transparent; color: inherit; font-size: 1em;">
                        <button class="color-button" id="newKeywordColorBtn" style="background-color: #ffeb3b; width: 2.2em; height: 2.2em; padding: 0; border: 1px solid rgba(125,125,125,0.3); cursor: pointer; border-radius: 0.3em; flex-shrink: 0;"></button>
                        <button id="addKeywordBtn" title="${i18n.t("add")}" style="background: #2da44e; color: white; border: none; border-radius: 0.3em; padding: 0.4em 0.8em; cursor: pointer; font-weight: bold; font-size: var(--mgga-btn-scale); white-space: nowrap; flex-shrink: 0;">${i18n.t("add")}</button>
                    </div>
                </div>
            </div>
            <div class="button-row" style="margin-top: 1em;">
                <button class="dialog-button reset-button" title="${i18n.t("resetTitle")}">${i18n.t("reset")}</button>
                <div style="margin-left: auto; display: flex; gap: 0.75em; flex-wrap: wrap;">
                    <button class="dialog-button cancel-button" id="cancelDialogBtn">${i18n.t("cancel")}</button>
                    <button class="dialog-button confirm-button" id="confirmDialogBtn">${i18n.t("confirm")}</button>
                </div>
            </div>
        `;
  }

  /**
   * 内置颜色选择器子面板（模块级）。
   * 通过参数接收 refreshRealtimeStyles，不再隐式捕获 createColorPickerDialog 的闭包。
   */
  function createColorPickerPanel(colorBtn, colorName, defaultColor, onChange, refreshRealtimeStyles) {
    const panel = document.createElement("div");
    panel.className = "custom-color-picker-panel";
    panel.innerHTML = `
                <div class="color-picker-libraries-container" id="libraries-container"></div>
            `;

    const librariesContainer = panel.querySelector("#libraries-container");

    // 定义变量以便在 updateAllPickers 中访问
    let hexInput, preview;

    // 共用颜色状态
    let currentColor = defaultColor;

    // 颜色转换统一走模块级工具区（rgbToHex / hexToRgb / hslToHex / hexToHSL 等）

    const updateAllPickers = (newColor) => {
      currentColor = newColor;
      if (hexInput) hexInput.value = newColor;
      if (preview) preview.style.backgroundColor = newColor;

      // 关键修复：直接修改 colorBtn 的 style 属性
      if (colorBtn) {
        colorBtn.style.backgroundColor = newColor;
        colorBtn.title = `${colorName}: ${newColor}`; // 实时更新按钮提示文字
      }

      // 通知外部（如关键词规则）颜色已变更
      if (typeof onChange === "function") onChange(newColor);

      // 实时刷新页面样式
      if (typeof refreshRealtimeStyles === "function") {
        refreshRealtimeStyles();
      }

      // 更新三个库的色值
      if (window.Pickr && panel._pickr) {
        panel._pickr.setColor(newColor);
      }
      if (window.Huebee && panel._huebee) {
        panel._huebee.setColor(newColor);
      }
      if (window.$ && panel._spectrum) {
        panel._spectrum.spectrum("set", newColor);
      }
    };

    // 初始化内置颜色选择器（无需外部库）
    const initializeLibraries = () => {
      console.log(`[MGGA] ${i18n.t("builtinPicker")}`);

      const hsl = hexToHSL(defaultColor);

      // 创建内置颜色选择器 HTML - 仿浏览器原生色彩器
      const pickerHTML = `
                    <div class="builtin-color-picker-container">
                        <!-- 颜色预览区域 -->
                        <div class="color-picker-preview" id="builtin-color-preview" style="background-color: ${defaultColor}"></div>

                        <!-- 主色彩区域和色调条 -->
                        <div class="builtin-picker-top-section">
                            <!-- 主色彩区 (左) -->
                            <div class="builtin-color-area-section">
                                <div class="builtin-color-area-main" id="color-area-main">
                                    <canvas id="color-area-canvas" width="200" height="150"></canvas>
                                    <div class="builtin-color-picker-point" id="color-picker-point"></div>
                                </div>
                            </div>

                            <!-- 色调条、透明度条 (右) -->
                            <div class="builtin-hue-alpha-section">
                                <!-- 色调条 -->
                                <div class="builtin-hue-slider-container">
                                    <div class="builtin-hue-strip" id="hue-strip"></div>
                                    <div class="builtin-hue-picker" id="hue-picker" style="top: ${(hsl.h / 360) * 100}%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 输入和预设颜色区域 -->
                        <div class="builtin-picker-bottom-section">
                            <!-- 颜色输入框 + 清除按钮 -->
                            <div class="builtin-input-group">
                                <button class="builtin-format-toggle-btn" title="${i18n.t("formatToggle")}">HEX</button>
                                <!-- HEX单输入框 -->
                                <input type="text" class="builtin-color-hex-input builtin-hex-single-input" value="${defaultColor}" maxlength="7" placeholder="#000000" />
                                <!-- RGB/HSL三输入框容器 -->
                                <div class="builtin-multi-input-container" style="display: none;">
                                    <input type="text" class="builtin-color-value-input builtin-input-1" placeholder="Val1" maxlength="3" />
                                    <input type="text" class="builtin-color-value-input builtin-input-2" placeholder="Val2" maxlength="3" />
                                    <input type="text" class="builtin-color-value-input builtin-input-3" placeholder="Val3" maxlength="3" />
                                </div>
                                <button class="builtin-clear-btn" title="${i18n.t("clear")}">✕</button>
                            </div>

                            <!-- 预设颜色 -->
                            <div class="builtin-preset-colors-row"></div>
                        </div>
                    </div>
                `;

      librariesContainer.innerHTML = pickerHTML;
      librariesContainer.style.padding = "0";
      librariesContainer.style.border = "none";
      librariesContainer.style.background = "none";

      // 获取元素
      const colorAreaMain =
        librariesContainer.querySelector("#color-area-main");
      const colorAreaCanvas =
        librariesContainer.querySelector("#color-area-canvas");
      const colorPickerPoint = librariesContainer.querySelector(
        "#color-picker-point",
      );
      const hueStrip = librariesContainer.querySelector("#hue-strip");
      const huePicker = librariesContainer.querySelector("#hue-picker");

      // 赋值给外部作用域变量
      hexInput = librariesContainer.querySelector(
        ".builtin-hex-single-input",
      );
      preview = librariesContainer.querySelector("#builtin-color-preview");

      const multiInputContainer = librariesContainer.querySelector(
        ".builtin-multi-input-container",
      );
      const valueInput1 =
        librariesContainer.querySelector(".builtin-input-1");
      const valueInput2 =
        librariesContainer.querySelector(".builtin-input-2");
      const valueInput3 =
        librariesContainer.querySelector(".builtin-input-3");
      const presetContainer = librariesContainer.querySelector(
        ".builtin-preset-colors-row",
      );
      const formatToggleBtn = librariesContainer.querySelector(
        ".builtin-format-toggle-btn",
      );

      const ctx = colorAreaCanvas.getContext("2d");
      let currentH = hsl.h,
        currentS = hsl.s,
        currentL = hsl.l;
      let currentFormat = "HEX"; // 'HEX', 'HSL', 'RGB'

      // 颜色转换统一走模块级工具区（rgbToHSL / hslToRGB / rgbToHex）

      // 格式化显示值
      const formatDisplayValue = (format) => {
        if (format === "HEX") {
          return hslToHex(currentH, currentS, currentL);
        } else if (format === "HSL") {
          return `${currentH} ${currentS}% ${currentL}%`;
        } else {
          // RGB
          const rgb = hslToRGB(currentH, currentS, currentL);
          return `${rgb.r} ${rgb.g} ${rgb.b}`;
        }
      };

      // 更新输入框显示
      const updateInputDisplay = () => {
        if (currentFormat === "HEX") {
          hexInput.style.display = "block";
          multiInputContainer.style.display = "none";
          hexInput.value = formatDisplayValue("HEX");
        } else if (currentFormat === "RGB") {
          hexInput.style.display = "none";
          multiInputContainer.style.display = "flex";
          const rgb = hslToRGB(currentH, currentS, currentL);
          valueInput1.value = rgb.r;
          valueInput2.value = rgb.g;
          valueInput3.value = rgb.b;
          valueInput1.placeholder = "R";
          valueInput2.placeholder = "G";
          valueInput3.placeholder = "B";
        } else if (currentFormat === "HSL") {
          hexInput.style.display = "none";
          multiInputContainer.style.display = "flex";
          valueInput1.value = currentH;
          valueInput2.value = currentS;
          valueInput3.value = currentL;
          valueInput1.placeholder = "H";
          valueInput2.placeholder = "S";
          valueInput3.placeholder = "L";
        }
      };

      // 格式切换按钮点击事件
      if (formatToggleBtn) {
        formatToggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();

          const formats = ["HEX", "RGB", "HSL"];
          const currentIndex = formats.indexOf(currentFormat);
          currentFormat = formats[(currentIndex + 1) % formats.length];

          formatToggleBtn.textContent = currentFormat;
          updateInputDisplay();

          // 聚焦到新的输入框
          if (currentFormat === "HEX") {
            hexInput.focus();
            hexInput.select();
          } else {
            valueInput1.focus();
            valueInput1.select();
          }
        });
      }

      // 初始化输入框显示
      updateInputDisplay();

      // 绘制色调条（竖条）
      const drawHueStrip = () => {
        const stripHeight = hueStrip.offsetHeight || 150;
        const stripCanvas = document.createElement("canvas");
        stripCanvas.width = 20;
        stripCanvas.height = stripHeight;
        const stripCtx = stripCanvas.getContext("2d");

        for (let i = 0; i < stripHeight; i++) {
          const h = (i / stripHeight) * 360;
          stripCtx.fillStyle = `hsl(${h}, 100%, 50%)`;
          stripCtx.fillRect(0, i, 20, 1);
        }

        hueStrip.style.backgroundImage = `url(${stripCanvas.toDataURL()})`;
        hueStrip.style.backgroundSize = "100% 100%";
      };

      // 绘制主色彩区 (饱和度和亮度) - 优化版：使用双重渐变减少循环
      const drawColorArea = () => {
        const width = colorAreaCanvas.width;
        const height = colorAreaCanvas.height;

        // 1. 清除画布
        ctx.clearRect(0, 0, width, height);

        // 2. 填充基础色（纯色，由当前色相决定）
        ctx.fillStyle = `hsl(${currentH}, 100%, 50%)`;
        ctx.fillRect(0, 0, width, height);

        // 3. 叠加白色渐变（从左到右，饱和度从0到100%）
        const whiteGradient = ctx.createLinearGradient(0, 0, width, 0);
        whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = whiteGradient;
        ctx.fillRect(0, 0, width, height);

        // 4. 叠加黑色渐变（从下到上，亮度从0到100%）
        const blackGradient = ctx.createLinearGradient(0, height, 0, 0);
        blackGradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        blackGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
        blackGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        blackGradient.addColorStop(1, "rgba(255, 255, 255, 1)");
        ctx.fillStyle = blackGradient;
        ctx.fillRect(0, 0, width, height);

        // 更新选择器位置
        colorPickerPoint.style.left = currentS + "%";
        colorPickerPoint.style.top = 100 - currentL + "%";
      };

      // 初始化绘制
      drawHueStrip();
      drawColorArea();

      // 颜色区点击和拖拽处理
      const handleColorAreaClick = (e) => {
        if (e) {
          e.stopPropagation();
          if (e.type === "mousedown") e.preventDefault();
        }
        const rect = colorAreaCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentS = Math.max(0, Math.min(100, (x / rect.width) * 100));
        currentL = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));

        drawColorArea();
        updateColor();
      };

      // 色调条点击处理
      const handleHueClick = (e) => {
        if (e) {
          e.stopPropagation();
          if (e.type === "mousedown") e.preventDefault();
        }
        const rect = hueStrip.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const h = Math.max(0, Math.min(360, (y / rect.height) * 360));

        currentH = h;
        huePicker.style.top = (y / rect.height) * 100 + "%";
        drawColorArea();
        updateColor();
      };

      // 更新颜色
      const updateColor = () => {
        const newColor = hslToHex(currentH, currentS, currentL);
        updateInputDisplay();
        updateAllPickers(newColor);
      };

      // 获取清除按钮
      const clearBtn = librariesContainer.querySelector(".builtin-clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const defaultHsl = hexToHSL(defaultColor);
          currentH = defaultHsl.h;
          currentS = defaultHsl.s;
          currentL = defaultHsl.l;
          currentFormat = "HEX";

          formatToggleBtn.textContent = currentFormat;
          updateInputDisplay();
          huePicker.style.top = (currentH / 360) * 100 + "%";
          drawColorArea();
          updateAllPickers(defaultColor);
        });
      }

      // 处理HEX输入框的change事件
      hexInput.addEventListener("change", (e) => {
        const value = e.target.value.trim();
        if (/^#[0-9A-F]{6}$/i.test(value)) {
          const newHsl = hexToHSL(value);
          currentH = newHsl.h;
          currentS = newHsl.s;
          currentL = newHsl.l;

          huePicker.style.top = (currentH / 360) * 100 + "%";
          drawColorArea();
          updateColor();
        } else {
          updateInputDisplay();
        }
      });

      // 处理HEX输入框的input事件（实时转换）
      hexInput.addEventListener("input", (e) => {
        const value = e.target.value.trim();
        if (/^#[0-9A-F]{6}$/i.test(value)) {
          const newHsl = hexToHSL(value);
          currentH = newHsl.h;
          currentS = newHsl.s;
          currentL = newHsl.l;

          huePicker.style.top = (currentH / 360) * 100 + "%";
          drawColorArea();
          updateAllPickers(value);
        }
      });

      // 处理RGB/HSL三输入框的共用函数
      const handleValueInputChange = () => {
        const val1 = parseInt(valueInput1.value) || 0;
        const val2 = parseInt(valueInput2.value) || 0;
        const val3 = parseInt(valueInput3.value) || 0;

        if (currentFormat === "RGB") {
          // RGB模式
          if (
            val1 >= 0 &&
            val1 <= 255 &&
            val2 >= 0 &&
            val2 <= 255 &&
            val3 >= 0 &&
            val3 <= 255
          ) {
            const newHsl = rgbToHSL(val1, val2, val3);
            currentH = newHsl.h;
            currentS = newHsl.s;
            currentL = newHsl.l;

            const hexColor = rgbToHex(val1, val2, val3);
            huePicker.style.top = (currentH / 360) * 100 + "%";
            drawColorArea();
            updateAllPickers(hexColor);
          }
        } else if (currentFormat === "HSL") {
          // HSL模式
          if (
            val1 >= 0 &&
            val1 <= 360 &&
            val2 >= 0 &&
            val2 <= 100 &&
            val3 >= 0 &&
            val3 <= 100
          ) {
            currentH = val1;
            currentS = val2;
            currentL = val3;

            const hexColor = hslToHex(val1, val2, val3);
            huePicker.style.top = (currentH / 360) * 100 + "%";
            drawColorArea();
            updateAllPickers(hexColor);
          }
        }
      };

      // 为三个输入框添加事件监听
      [valueInput1, valueInput2, valueInput3].forEach((input) => {
        input.addEventListener("change", handleValueInputChange);
        input.addEventListener("input", handleValueInputChange);
      });

      // 绑定事件
      colorAreaMain.addEventListener("click", handleColorAreaClick);
      colorAreaMain.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const handleMove = (moveE) => {
          moveE.stopPropagation();
          handleColorAreaClick(moveE);
        };
        const handleUp = (upE) => {
          upE.stopPropagation();
          document.removeEventListener("mousemove", handleMove);
          document.removeEventListener("mouseup", handleUp);
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
        handleColorAreaClick(e); // 初始点击也触发一次
      });

      hueStrip.addEventListener("click", handleHueClick);
      hueStrip.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const handleMove = (moveE) => {
          moveE.stopPropagation();
          handleHueClick(moveE);
        };
        const handleUp = (upE) => {
          upE.stopPropagation();
          document.removeEventListener("mousemove", handleMove);
          document.removeEventListener("mouseup", handleUp);
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
        handleHueClick(e); // 初始点击也触发一次
      });

      // 创建预设颜色
      const presetColors = [
        "#000000",
        "#FFFFFF",
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#808080",
        "#FFB6C1",
        "#FFC0CB",
        "#FF69B4",
        "#FF6347",
        "#FFA500",
        "#FFD700",
        "#90EE90",
        "#87CEEB",
        "#4169E1",
      ];

      presetColors.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.className = "builtin-preset-color-swatch";
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.addEventListener("click", (e) => {
          e.stopPropagation();
          const newHsl = hexToHSL(color);
          currentH = newHsl.h;
          currentS = newHsl.s;
          currentL = newHsl.l;
          currentFormat = "HEX";

          formatToggleBtn.textContent = currentFormat;
          updateInputDisplay();
          huePicker.style.top = (currentH / 360) * 100 + "%";
          drawColorArea();
          updateColor();
        });
        presetContainer.appendChild(swatch);
      });

      console.log("[MGGA] 内置颜色选择器初始化完成");
    };

    // 立即初始化内置颜色选择器
    initializeLibraries();

    return panel;
  }

  /** 打开/关闭颜色选择器子面板（模块级） */
  function toggleColorPickerPanel(colorBtn, colorName, defaultColor, onChange, onClose, refreshRealtimeStyles) {
    // 关闭其他开放的面板
    document.querySelectorAll(".custom-color-picker-panel").forEach((p) => {
      if (p._closeHandler) {
        document.removeEventListener("click", p._closeHandler);
      }
      if (p._resizeObserver) {
        p._resizeObserver.disconnect();
      }
      p.remove();
      // 如果面板有关联的按钮，清除引用
      if (p._associatedBtn) {
        p._associatedBtn._panel = null;
      }
    });

    if (colorBtn._panel && document.body.contains(colorBtn._panel)) {
      // 如果点击的是已经打开的按钮，上面的逻辑已经关闭它了，这里不需要额外操作
      colorBtn._panel = null;
    } else {
      let panel;
      try {
        panel = createColorPickerPanel(
            colorBtn,
            colorName,
            defaultColor,
            onChange,
            refreshRealtimeStyles,
          );
      } catch (err) {
        console.error("[MGGA] createColorPickerPanel error:", err);
        return;
      }
      panel._associatedBtn = colorBtn; // 建立双向引用以便清理

      document.body.appendChild(panel);
      colorBtn._panel = panel;

      const repositionPanel = () => {
        if (!document.body.contains(panel)) return;
        placeFixedInViewport(panel, {
          margin: 8,
          centerY: false,
          scrollable: true,
          anchorRect: colorBtn.getBoundingClientRect(),
        });
      };
      repositionPanel();

      // 内容异步加载/尺寸变化时重新夹紧，保证始终在屏幕内
      if (typeof ResizeObserver !== "undefined") {
        let roRaf = 0;
        const ro = new ResizeObserver(() => {
          if (roRaf) cancelAnimationFrame(roRaf);
          roRaf = requestAnimationFrame(repositionPanel);
        });
        ro.observe(panel);
        panel._resizeObserver = ro;
      }
      // 双 rAF + 延迟兜底：等内置取色器等子内容完成布局
      requestAnimationFrame(() => {
        requestAnimationFrame(repositionPanel);
      });
      setTimeout(repositionPanel, 80);
      setTimeout(repositionPanel, 250);

      // 点击其他地方关闭面板
      const closeHandler = (e) => {
        // 检查是否点击了颜色按钮本身，如果是则不关闭（因为会再次打开）
        if (e.target === colorBtn || colorBtn.contains(e.target)) return;

        // 检查是否在面板内部点击
        if (panel.contains(e.target)) return;

        // 执行关闭
        if (panel._resizeObserver) {
          panel._resizeObserver.disconnect();
        }
        panel.remove();
        colorBtn._panel = null;
        document.removeEventListener("click", closeHandler);
        if (typeof onClose === "function") onClose();
      };
      panel._closeHandler = closeHandler; // 保存引用以便外部清理
      setTimeout(() => document.addEventListener("click", closeHandler), 0);
    }
  }

  /**
   * 绑定设置面板顶部的三个功能开关：图标识别 / 移动端布局修正 / 关键词高亮。
   * 三者行为完全同构（读存储 → 绘制态 → 点击翻转 → 写存储 → 重新应用），
   * 故合并为一次实现，避免三段近乎逐字重复的代码各自漂移。
   */
  function bindFeatureToggleButtons(dialog) {
    const bindToggle = (selector, storageKey, reapplied) => {
      const btn = dialog.querySelector(selector);
      if (!btn) return;

      let enabled = GM_getValue(storageKey, true);
      const paint = (on) => {
        btn.classList.toggle("disabled", !on);
        btn.innerHTML = on ? "✓" : "✕";
        btn.title = on ? i18n.t("enabledTitle") : i18n.t("disabledTitle");
      };

      paint(enabled);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        enabled = !enabled;
        GM_setValue(storageKey, enabled);
        paint(enabled);
        reapplied();
      });
    };

    bindToggle("#svgToggleBtn", "svgEnabled", processAssets);
    bindToggle("#mobileFixToggleBtn", "mobileLayoutFix", applyMobileLayoutFix);
    bindToggle("#highlightToggleBtn", "highlightEnabled", processAssets);
  }

  /**
   * 自定义关键词规则控制器（模块级工厂）。
   * 掌管「预设架构关键词 + 用户自定义关键词」的渲染、增删、颜色覆盖与持久化。
   * 原先这约 200 行内联在 createColorPickerDialog 里，只依赖 dialog 与
   * refreshRealtimeStyles 两个外部引用，故整体上提。
   */
  function createKeywordRulesController(dialog, refreshRealtimeStyles) {
    // 处理自定义关键词列表的渲染
    const deletedDefaults = GM_getValue("deletedDefaults", []);
    const defaultColorOverrides = GM_getValue("defaultColorOverrides", {});
    let rules = [
      ...archKeywords
        .filter((arch) => !deletedDefaults.includes(arch))
        .map((arch) => ({
          text: arch,
          color: defaultColorOverrides[arch] || null,
          isDefault: true,
          isOverridden: !!defaultColorOverrides[arch],
          pendingDelete: false,
        })),
      ...GM_getValue("userCustomKeywords", []).map((kw) => ({
        text: kw.text,
        color: kw.color,
        isDefault: false,
        isOverridden: false,
        pendingDelete: false,
      })),
    ];

    const archClassNameOf = (text) =>
      `arch-${text.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-")}`;

    const clearPendingDeletes = (rerender = true) => {
      let changed = false;
      rules.forEach((r) => {
        if (r.pendingDelete) {
          r.pendingDelete = false;
          changed = true;
        }
      });
      if (changed && rerender) renderKeywords();
    };

    const regenerateHighlight = () => {
      const existingStyle = document.getElementById("MGGA-custom-arch-style");
      if (existingStyle) existingStyle.remove();
      initializeArchStyles();
      // 同步主题色缓存（自定义关键词/覆盖可能已变化）
      refreshThemeColorsCache();
      if (typeof processAssets === "function") {
        queryAssetRows().forEach((item) => {
          if (item.dataset.highlightProcessed === "true") {
            const link = queryAssetLink(item);
            if (link && item._originalFileName) {
              // 恢复时重建 GitHub 原生结构（span.text-bold 包裹），保持加粗样式
              const restoreSpan = document.createElement("span");
              restoreSpan.className = "text-bold";
              restoreSpan.textContent = item._originalFileName;
              link.replaceChildren(restoreSpan);
            }
            item.dataset.highlightProcessed = "false";
          }
        });
        setTimeout(() => processAssets(), 10);
      }
    };

    const renderKeywords = () => {
      const container = dialog.querySelector("#customKeywordsContainer");
      if (!container) return;
      container.innerHTML = "";

      if (rules.length === 0) {
        const emptyHint = document.createElement("div");
        emptyHint.className = "keyword-empty-hint";
        emptyHint.textContent = i18n.t("noKeywords");
        container.appendChild(emptyHint);
        return;
      }

      rules.forEach((rule, index) => {
        const item = document.createElement("div");
        const classes = ["custom-keyword-item"];
        if (rule.isDefault) classes.push("default-keyword-item");
        if (rule.pendingDelete) classes.push("pending-delete");
        item.className = classes.join(" ");

        const useAutoColor = rule.isDefault && !rule.isOverridden;
        const safeRuleText = escapeHtmlText(rule.text);
        const swatchClass = useAutoColor
          ? `keyword-color-swatch arch-highlight ${archClassNameOf(rule.text)}`
          : "keyword-color-swatch";
        const swatchStyle = useAutoColor
          ? ""
          : `background-color: ${sanitizeHexColor(rule.color, "#ffeb3b")};`;
        const actionClass = rule.pendingDelete
          ? "keyword-action-btn keyword-restore"
          : "keyword-action-btn keyword-remove";
        const actionIcon = rule.pendingDelete ? "↩" : "×";
        const actionTitle = rule.pendingDelete
          ? i18n.t("restore")
          : i18n.t("deleteRule");

        item.innerHTML = `
                    <span class="${swatchClass}" style="${swatchStyle}" data-swatch="${index}" title="${i18n.t("keywordColor")}"></span>
                    <span class="keyword-text">${safeRuleText}</span>
                    ${rule.isDefault ? `<span class="keyword-default-tag">${i18n.t("defaultTag")}</span>` : ""}
                    <span class="${actionClass}" data-action="${index}" title="${actionTitle}">${actionIcon}</span>
                `;
        container.appendChild(item);
      });

      // 关键词区变化后同步一次视口限高（保持 CSS 居中，不改 transform）
      syncDialogViewportLimit(dialog);

      // 颜色编辑：点击色块
      container.querySelectorAll(".keyword-color-swatch").forEach((sw) => {
        sw.addEventListener("click", (e) => {
          e.stopPropagation();
          clearPendingDeletes(false);
          const idx = parseInt(sw.dataset.swatch);
          const rule = rules[idx];
          if (!rule) return;
          const startColor =
            rule.isOverridden || !rule.isDefault
              ? rule.color || "#ffeb3b"
              : window.getComputedStyle(sw).backgroundColor || "#ffeb3b";
          toggleColorPickerPanel(
            sw,
            i18n.t("keywordColor"),
            startColor,
            (newColor) => {
              rule.color = newColor;
              rule.isOverridden = true;
            },
            () => {
              renderKeywords();
            },
            refreshRealtimeStyles,
          );
        });
      });

      // 删除/恢复：点击操作按钮
      container.querySelectorAll(".keyword-action-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.action);
          const rule = rules[idx];
          if (!rule) return;
          rule.pendingDelete = !rule.pendingDelete;
          renderKeywords();
        });
      });
    };

    // 初始化渲染
    renderKeywords();

    // 添加新关键词按钮功能
    const addKeywordBtn = dialog.querySelector("#addKeywordBtn");
    const newKeywordInput = dialog.querySelector("#newKeywordInput");
    const newKeywordColorBtn = dialog.querySelector("#newKeywordColorBtn");

    if (newKeywordColorBtn) {
      newKeywordColorBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleColorPickerPanel(
          newKeywordColorBtn,
          i18n.t("keywordColor"),
          newKeywordColorBtn.style.backgroundColor || "#ffeb3b",
          undefined,
          undefined,
          refreshRealtimeStyles,
        );
      });
    }

    if (addKeywordBtn && newKeywordInput && newKeywordColorBtn) {
      addKeywordBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearPendingDeletes();
        const text = newKeywordInput.value.trim();
        const color =
          newKeywordColorBtn.style.backgroundColor || "#ffeb3b";

        // 将可能存在的 RGB 格式转换为 HEX 以保持一致性
        const hexColor = sanitizeHexColor(cssColorToHex(color), "#ffeb3b");

        if (text) {
          const existingIndex = rules.findIndex(
            (kw) => kw.text.toLowerCase() === text.toLowerCase(),
          );
          if (existingIndex !== -1) {
            rules[existingIndex].color = hexColor;
            rules[existingIndex].isOverridden = true;
            rules[existingIndex].pendingDelete = false;
          } else {
            rules.push({
              text,
              color: hexColor,
              isDefault: false,
              isOverridden: false,
              pendingDelete: false,
            });
          }

          newKeywordInput.value = "";
          renderKeywords();
        }
      });
    }

    /** 持久化规则：预设删除项 / 预设颜色覆盖 / 用户自定义关键词 */
    const persist = () => {
      const savedUserKeywords = [];
      const savedOverrides = {};
      const savedDeletedDefaults = [...GM_getValue("deletedDefaults", [])];
      rules.forEach((r) => {
        if (r.pendingDelete) {
          if (r.isDefault) {
            if (!savedDeletedDefaults.includes(r.text)) {
              savedDeletedDefaults.push(r.text);
            }
          }
        } else {
          if (r.isDefault) {
            if (r.isOverridden && r.color) {
              savedOverrides[r.text] = cssColorToHex(r.color) || r.color;
            }
          } else {
            savedUserKeywords.push({
              text: r.text,
              color: cssColorToHex(r.color) || r.color || "#ffeb3b",
            });
          }
        }
      });
      GM_setValue("userCustomKeywords", savedUserKeywords);
      GM_setValue("defaultColorOverrides", savedOverrides);
      GM_setValue("deletedDefaults", savedDeletedDefaults);
    };

    return {
      renderKeywords,
      regenerateHighlight,
      clearPendingDeletes,
      persist,
      hasPendingDelete: () => rules.some((r) => r.pendingDelete),
    };
  }


  // 创建颜色选择器对话框
  function createColorPickerDialog() {
    // 关键修复：如果对话框已存在，先移除旧的，确保每次打开都是全新的状态和作用域
    const existingDialog = document.querySelector(".color-picker-dialog");
    if (existingDialog) {
      detachViewportAdaptation(existingDialog);
      existingDialog.remove();
    }

    // 获取当前主题
    const currentTheme = getCurrentTheme();

    // 获取当前主题的自定义颜色（如果存在）
    let customColors = GM_getValue(
      `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`,
      null,
    );

    // 如果没有自定义颜色，使用当前主题的默认颜色
    if (!customColors) {
      customColors =
        currentTheme === "dark" ? defaultColorsDark : defaultColorsLight;
    }

    // 创建新的对话框（显式声明，避免在 IIFE 非严格模式下泄漏为隐式全局 window.dialog）
    const dialog = document.createElement("div");
    dialog.className = "color-picker-dialog";
    dialog.innerHTML = buildSettingsDialogHTML(customColors);

    document.body.appendChild(dialog);

    // 打开对话框并应用滑入动画
    openDialog(dialog);

    // 获取元素引用
    const oddRowColorBtn = dialog.querySelector("#oddRowColorBtn");
    const evenRowColorBtn = dialog.querySelector("#evenRowColorBtn");
    const hoverColorBtn = dialog.querySelector("#hoverColorBtn");

    // === 禁用/启用上色功能切换按钮 ===
    const colorToggleState = {
      odd: GM_getValue("colorToggleOdd", true),
      even: GM_getValue("colorToggleEven", true),
      hover: GM_getValue("colorToggleHover", true),
    };

    // 实时刷新样式的函数
    const refreshRealtimeStyles = () => {
      // 每次刷新都从 DOM 中实时获取最新的按钮引用，确保闭包不会失效
      const btnOdd = dialog.querySelector("#oddRowColorBtn");
      const btnEven = dialog.querySelector("#evenRowColorBtn");
      const btnHover = dialog.querySelector("#hoverColorBtn");

      applyColors({
        colors: {
          oddRowColor: cssColorToHex(btnOdd ? btnOdd.style.backgroundColor : "", "#000000"),
          evenRowColor: cssColorToHex(btnEven ? btnEven.style.backgroundColor : "", "#000000"),
          hoverColor: cssColorToHex(btnHover ? btnHover.style.backgroundColor : "", "#000000"),
        },
        toggles: colorToggleState,
      });
    };

    // 三个功能开关（图标识别 / 移动端布局修正 / 关键词高亮）
    // 见模块级 bindFeatureToggleButtons：三段原本近乎逐字重复，已合并为一次实现
    bindFeatureToggleButtons(dialog);

    // 获取元素引用
    const closeBtn = dialog.querySelector(".color-picker-close");
    const cancelBtn = dialog.querySelector(".cancel-button");
    const confirmBtn = dialog.querySelector(".confirm-button");
    const resetBtn = dialog.querySelector(".reset-button");

    // HEX 验证/规范化统一使用全局 sanitizeHexColor（见文件头部工具区）

    const defaultColors =
      getCurrentTheme() === "dark" ? defaultColorsDark : defaultColorsLight;

    // 创建自定义color picker子面板
    // createColorPickerPanel / toggleColorPickerPanel 已抽至模块级作用域
    // （见 createColorPickerDialog 之前的同名函数声明）

    // 颜色按钮点击事件
    const handleColorBtnClick = (e, btn, key, displayName) => {
      e.stopPropagation();
      const currentColor = btn.style.backgroundColor ||
                          (key === "odd" ? customColors.oddRowColor :
                           key === "even" ? customColors.evenRowColor :
                           customColors.hoverColor);
      toggleColorPickerPanel(
        btn,
        displayName || key,
        currentColor,
        undefined,
        undefined,
        refreshRealtimeStyles,
      );
    };

    oddRowColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, oddRowColorBtn, "odd", i18n.t("oddRowShort"));
    });

    evenRowColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, evenRowColorBtn, "even", i18n.t("evenRowShort"));
    });

    hoverColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, hoverColorBtn, "hover", i18n.t("hoverShort"));
    });

    // === 禁用/启用上色功能切换按钮 ===
    const updateToggleBtnUI = (btn, isEnabled) => {
      if (isEnabled) {
        btn.classList.remove("disabled");
        btn.innerHTML = "✓";
        btn.title = i18n.t("enabledTitle");
      } else {
        btn.classList.add("disabled");
        btn.innerHTML = "✕";
        btn.title = i18n.t("disabledTitle");
      }
    };

    // 初始化切换按钮状态
    const toggleOddRowBtn = dialog.querySelector("#toggleOddRowBtn");
    const toggleEvenRowBtn = dialog.querySelector("#toggleEvenRowBtn");
    const toggleHoverBtn = dialog.querySelector("#toggleHoverBtn");

    updateToggleBtnUI(toggleOddRowBtn, colorToggleState.odd);
    updateToggleBtnUI(toggleEvenRowBtn, colorToggleState.even);
    updateToggleBtnUI(toggleHoverBtn, colorToggleState.hover);

    // 切换按钮事件监听
    toggleOddRowBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      colorToggleState.odd = !colorToggleState.odd;
      updateToggleBtnUI(toggleOddRowBtn, colorToggleState.odd);
      refreshRealtimeStyles();
    });

    toggleEvenRowBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      colorToggleState.even = !colorToggleState.even;
      updateToggleBtnUI(toggleEvenRowBtn, colorToggleState.even);
      refreshRealtimeStyles();
    });

    toggleHoverBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      colorToggleState.hover = !colorToggleState.hover;
      updateToggleBtnUI(toggleHoverBtn, colorToggleState.hover);
      refreshRealtimeStyles();
    });

    // 关闭按钮功能 - 应用滑出动画
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeDialog(dialog);
      applyColors(); // 恢复到已保存的状态
    });

    // 取消按钮功能 - 应用滑出动画
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeDialog(dialog);
      applyColors(); // 恢复到已保存的状态
    });

    // 新增的重置按钮功能
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const resetTheme = getCurrentTheme(); // 动态获取当前主题

      if (
        confirm(
          i18n.t("confirmReset").replace(
            "{theme}",
            resetTheme === "dark" ? i18n.t("darkTheme") : i18n.t("lightTheme"),
          ),
        )
      ) {
        // 删除当前主题的自定义颜色设置
        GM_setValue(
          `customColors${resetTheme.charAt(0).toUpperCase() + resetTheme.slice(1)}`,
          null,
        );

        // 关闭对话框并更新颜色
        closeDialog(dialog);
        applyColors();
      }
    });

    // 关键词规则控制器（模块级工厂，见 createKeywordRulesController）
    const keywordRules = createKeywordRulesController(dialog, refreshRealtimeStyles);

    // 确认按钮功能 - 修复：只保存到当前主题
    confirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // 动态获取当前主题
      const saveTheme = getCurrentTheme();

      // 颜色转换统一走模块级 cssColorToHex（空值/transparent 返回 ""，便于下方降级判断）

      // 直接从按钮元素的 style 属性获取最新值
      const btnOdd = dialog.querySelector("#oddRowColorBtn");
      const btnEven = dialog.querySelector("#evenRowColorBtn");
      const btnHover = dialog.querySelector("#hoverColorBtn");

      const newOddColor = cssColorToHex(btnOdd ? btnOdd.style.backgroundColor : "");
      const newEvenColor = cssColorToHex(btnEven ? btnEven.style.backgroundColor : "");
      const newHoverColor = cssColorToHex(btnHover ? btnHover.style.backgroundColor : "");

      // 如果 style 为空，则作为降级方案获取计算样式
      const finalOddColor = newOddColor || cssColorToHex(btnOdd ? window.getComputedStyle(btnOdd).backgroundColor : "");
      const finalEvenColor = newEvenColor || cssColorToHex(btnEven ? window.getComputedStyle(btnEven).backgroundColor : "");
      const finalHoverColor = newHoverColor || cssColorToHex(btnHover ? window.getComputedStyle(btnHover).backgroundColor : "");

      // 保存为当前主题的自定义颜色
      const newCustomColors = {
        oddRowColor: finalOddColor,
        evenRowColor: finalEvenColor,
        hoverColor: finalHoverColor,
      };

      // 保存到对应主题的存储键
      GM_setValue(
        `customColors${saveTheme.charAt(0).toUpperCase() + saveTheme.slice(1)}`,
        newCustomColors,
      );

      // 保存切换状态
      GM_setValue("colorToggleOdd", colorToggleState.odd);
      GM_setValue("colorToggleEven", colorToggleState.even);
      GM_setValue("colorToggleHover", colorToggleState.hover);

      // 保存关键词规则（含预设的删除/颜色覆盖与用户规则）
      keywordRules.persist();

      // 同步主题色缓存（高亮函数使用）
      refreshThemeColorsCache();

      closeDialog(dialog);
      applyColors(); // 动态更新颜色

      // 重新应用高亮及图标
      keywordRules.regenerateHighlight();
    });

    // 点击其它按钮（非删除/恢复/确认）时撤销"待删除"标记
    dialog.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.closest(".keyword-action-btn")) return;
        if (btn.id === "confirmDialogBtn") return;
        if (keywordRules.hasPendingDelete()) {
          keywordRules.clearPendingDeletes();
        }
      },
      true,
    );

    // 添加ESC键关闭支持
    const handleEsc = function (e) {
      if (e.key === "Escape") {
        closeDialog(dialog);
      }
    };
    document.addEventListener("keydown", handleEsc);

    // 点击外部关闭
    const handleOutsideClick = function (e) {
      // 如果点击的是悬浮按钮，不作为外部点击处理（即使有stopPropagation也是双重保险）
      let target = e.target;
      while (target) {
        if (target.id === "mgga-float-btn") return;
        // 检查是否点击了颜色选择器面板或其内容，如果是则不关闭对话框
        if (
          target.classList &&
          (target.classList.contains("custom-color-picker-panel") ||
            target.classList.contains("builtin-color-picker-container"))
        )
          return;
        target = target.parentElement;
      }
      if (dialog && !dialog.contains(e.target)) {
        if (keywordRules.hasPendingDelete()) {
          keywordRules.clearPendingDeletes();
          return;
        }
        closeDialog(dialog);
      }
    };
    document.addEventListener("click", handleOutsideClick);

    // 将事件清理函数挂载到 dialog 上，供 closeDialog 调用
    dialog._cleanupEvents = function () {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("click", handleOutsideClick);
    };
  }

  // 打开对话框并应用滑入动画
  function openDialog(dialog) {
    // 确保对话框在DOM中
    if (!document.body.contains(dialog)) {
      document.body.appendChild(dialog);
    }

    // 只同步 max-height/width，绝不动 transform/top/left —— 否则滑入动画会退化成渐隐，
    // 且按「打开瞬间高度」写死 top 会在关键词等内容加载后顶出屏幕底边。
    syncDialogViewportLimit(dialog);
    attachViewportAdaptation(dialog, () => {
      syncDialogViewportLimit(dialog);
      // 同步夹紧已打开的颜色子面板
      document.querySelectorAll(".custom-color-picker-panel").forEach((p) => {
        if (p._associatedBtn && document.body.contains(p._associatedBtn)) {
          placeFixedInViewport(p, {
            margin: 8,
            centerY: false,
            scrollable: true,
            anchorRect: p._associatedBtn.getBoundingClientRect(),
          });
        } else {
          clampElementInViewport(p, 8);
        }
      });
    });

    // 触发重绘
    void dialog.offsetHeight;

    // 添加可见类触发动画（CSS: translateY(-50%) translateX(-100%) → translateX(0)）
    dialog.classList.add("visible");

    // 隐藏悬浮按钮
    const floatBtn = document.getElementById("mgga-float-btn");
    if (floatBtn) {
      floatBtn.classList.add("hidden-to-right");
    }
  }

  // 关闭对话框并应用滑出动画
  function closeDialog(dialog) {
    // 移除可见类触发滑出动画
    dialog.classList.remove("visible");
    detachViewportAdaptation(dialog);

    // 同时关闭所有打开的颜色选择器子面板
    document.querySelectorAll(".custom-color-picker-panel").forEach((p) => {
      if (p._closeHandler) {
        document.removeEventListener("click", p._closeHandler);
      }
      if (p._resizeObserver) {
        p._resizeObserver.disconnect();
      }
      p.remove();
    });

    // 恢复悬浮按钮
    const floatBtn = document.getElementById("mgga-float-btn");
    if (floatBtn) {
      floatBtn.classList.remove("hidden-to-right");
      clampFloatButton(floatBtn);
    }

    // 清理绑定的全局事件，防止内存泄漏和重复触发
    if (typeof dialog._cleanupEvents === "function") {
      dialog._cleanupEvents();
    }

    // 动画完成后移除对话框
    setTimeout(() => {
      if (dialog && dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 300); // 300ms是动画持续时间
  }

  function clampFloatButton(btn) {
    if (!btn || !document.body.contains(btn)) return;
    const vp = getViewportMetrics();
    const rect = btn.getBoundingClientRect();
    if (!rect.height) return;
    const half = rect.height / 2;
    let centerY = rect.top + half;
    const minCenter = vp.offsetTop + half + 4;
    const maxCenter = vp.offsetTop + vp.height - half - 4;
    if (maxCenter < minCenter) {
      centerY = vp.offsetTop + vp.height / 2;
    } else {
      centerY = Math.max(minCenter, Math.min(centerY, maxCenter));
    }
    // top 语义为按钮中心（配合 transform: translateY(-50%)）
    btn.style.top = centerY + "px";
    btn.style.transform = "translateY(-50%)";
  }

  // 注册油猴菜单选项
  GM_registerMenuCommand(i18n.t("mobileFix"), () => {
    const next = !GM_getValue("mobileLayoutFix", true);
    GM_setValue("mobileLayoutFix", next);
    applyMobileLayoutFix();
  });
  GM_registerMenuCommand(i18n.t("navDockMenuToggle"), () => {
    toggleNavDockPanelFromMenu();
  });
  GM_registerMenuCommand(i18n.t("menuSettings"), createColorPickerDialog);

  // 独立的菜单命令
  GM_registerMenuCommand(i18n.t("menuOdd"), () => {
    const currentTheme = getCurrentTheme();
    const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const defaultColors =
      currentTheme === "dark" ? defaultColorsDark : defaultColorsLight;

    const currentColor = customColors
      ? customColors.oddRowColor
      : defaultColors.oddRowColor;

    const newColor = prompt(
      i18n.t("promptOdd"),
      currentColor,
    );
    if (newColor) {
      const sanitizedColor = sanitizeHexColor(newColor, "");
      if (!sanitizedColor) {
        alert(i18n.t("invalidColor"));
        return;
      }
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.oddRowColor = sanitizedColor;

      // 保存更新
      GM_setValue(themeKey, updatedColors);
      applyColors(); // 动态更新颜色
    }
  });

  GM_registerMenuCommand(i18n.t("menuEven"), () => {
    const currentTheme = getCurrentTheme();
    const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const defaultColors =
      currentTheme === "dark" ? defaultColorsDark : defaultColorsLight;

    const currentColor = customColors
      ? customColors.evenRowColor
      : defaultColors.evenRowColor;

    const newColor = prompt(
      i18n.t("promptEven"),
      currentColor,
    );
    if (newColor) {
      const sanitizedColor = sanitizeHexColor(newColor, "");
      if (!sanitizedColor) {
        alert(i18n.t("invalidColor"));
        return;
      }
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.evenRowColor = sanitizedColor;

      // 保存更新
      GM_setValue(themeKey, updatedColors);
      applyColors(); // 动态更新颜色
    }
  });

  GM_registerMenuCommand(i18n.t("menuHover"), () => {
    const currentTheme = getCurrentTheme();
    const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const defaultColors =
      currentTheme === "dark" ? defaultColorsDark : defaultColorsLight;

    const currentColor = customColors
      ? customColors.hoverColor
      : defaultColors.hoverColor;

    const newColor = prompt(
      i18n.t("promptHover"),
      currentColor,
    );
    if (newColor) {
      const sanitizedColor = sanitizeHexColor(newColor, "");
      if (!sanitizedColor) {
        alert(i18n.t("invalidColor"));
        return;
      }
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.hoverColor = sanitizedColor;

      // 保存更新
      GM_setValue(themeKey, updatedColors);
      applyColors(); // 动态更新颜色
    }
  });

  // 重置为当前主题的默认颜色
  GM_registerMenuCommand(i18n.t("menuReset"), () => {
    const currentTheme = getCurrentTheme();
    const themeLabel = currentTheme === "dark" ? i18n.t("darkTheme") : i18n.t("lightTheme");

    if (
      confirm(
        i18n.t("confirmReset").replace("{theme}", themeLabel),
      )
    ) {
      // 删除当前主题的自定义颜色设置
      GM_setValue(
        `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`,
        null,
      );
      applyColors(); // 动态更新颜色
    }
  });

  // === BEGIN SVG Replace Functionality ===
  // 定义图标规则
  const iconRules = [
    {
      name: "Windows",
      keywords: [".exe", ".msi", "win", "windows", "setup"],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" data-custom-icon="true">
                <path d="M56.888889 113.777778h398.222222v398.222222H56.888889z" fill="#F54F25"></path>
                <path d="M56.888889 568.888889h398.222222v398.222222H56.888889z" fill="#02A4EF"></path>
                <path d="M512 568.888889h398.222222v398.222222H512z" fill="#FEB801"></path>
                <path d="M512 113.777778h398.222222v398.222222H512z" fill="#81B902"></path>
            </svg>`,
    },
    {
      name: "Linux",
      keywords: [
        ".deb",
        ".rpm",
        ".appimage",
        "linux",
        "ubuntu",
        "fedora",
        "arch",
        "debian",
        "centos",
        "redhat",
        "opensuse",
        "bsd",
        "freebsd",
        "openbsd",
        "netbsd",
      ],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-custom-icon="true">
                <path fill="#202020" d="M13.338 12.033c-.1-.112-.146-.319-.197-.54-.05-.22-.107-.457-.288-.61v-.001a.756.756 0 00-.223-.134c.252-.745.153-1.487-.1-2.157-.312-.823-.855-1.54-1.27-2.03-.464-.586-.918-1.142-.91-1.963.014-1.254.138-3.579-2.068-3.582-.09 0-.183.004-.28.012-2.466.198-1.812 2.803-1.849 3.675-.045.638-.174 1.14-.613 1.764-.515.613-1.24 1.604-1.584 2.637-.162.487-.24.984-.168 1.454-.023.02-.044.041-.064.063-.151.161-.263.357-.388.489-.116.116-.282.16-.464.225-.183.066-.383.162-.504.395v.001a.702.702 0 00-.077.339c0 .108.016.217.032.322.034.22.068.427.023.567-.144.395-.163.667-.061.865.102.199.31.286.547.335.473.1 1.114.075 1.619.342l.043-.082-.043.082c.54.283 1.089.383 1.526.284a.99.99 0 00.706-.552c.342-.002.717-.146 1.318-.18.408-.032.918.145 1.503.113a.806.806 0 00.068.183l.001.001c.227.455.65.662 1.1.627.45-.036.928-.301 1.315-.762l-.07-.06.07.06c.37-.448.982-.633 1.388-.878.203-.123.368-.276.38-.499.013-.222-.118-.471-.418-.805z"/>
                <path fill="#F8BF11" d="M13.571 12.828c-.007.137-.107.24-.29.35-.368.222-1.019.414-1.434.918-.362.43-.802.665-1.19.696-.387.03-.721-.13-.919-.526v-.002c-.123-.233-.072-.6.031-.987s.251-.785.271-1.108v-.001c.02-.415.044-.776.114-1.055.07-.28.179-.468.373-.575a.876.876 0 01.027-.014c.022.359.2.725.514.804.343.09.838-.204 1.047-.445l.122-.004c.184-.005.337.006.495.143v.001c.121.102.179.296.229.512.05.217.09.453.239.621.287.32.38.534.371.672zM6.592 13.843v.003c-.034.435-.28.672-.656.758-.377.086-.888 0-1.398-.266-.565-.3-1.237-.27-1.667-.360-.216-.045-.357-.113-.421-.238-.064-.126-.066-.345.071-.720v-.001l.001-.002c.068-.209.018-.438-.015-.653-.033-.214-.049-.41.024-.546l.001-.001c.094-.181.232-.246.403-.307.17-.062.373-.11.533-.270l.001-.001h.001c.148-.157.26-.353.39-.492.11-.117.22-.195.385-.196h.005a.61.61 0 01.093.008c.22.033.411.187.596.437l.533.971v.001c.142.296.441.622.695.954.254.333.45.666.425.921z"/>
                <path fill="#D6A312" d="M9.25 4.788c-.043-.084-.13-.164-.28-.225-.31-.133-.444-.142-.617-.254-.28-.181-.513-.244-.706-.244a.834.834 0 00-.272.047c-.236.08-.392.25-.49.342-.02.019-.044.035-.104.80-.06.043-.15.11-.28.208-.117.086-.154.2-.114.332.04.132.167.285.4.417h.001c.145.085.244.2.358.291a.801.801 0 00.189.117c.072.031.156.052.26.058.248.15.43-.06.59-.151.16-.092.296-.204.452-.255h.001c.32-.1.548-.301.62-.493a.324.324 0 00-.008-.27z"/>
                <path fill="#202020" d="M8.438 5.26c-.255.133-.552.294-.869.294-.316 0-.566-.146-.745-.289-.09-.07-.163-.142-.218-.193-.096-.075-.084-.181-.045-.178.066.008.076.095.117.134.056.052.126.12.211.187.17.135.397.266.68.266.284 0 .614-.166.816-.28.115-.064.26-.179.379-.266.09-.067.087-.147.162-.138.075.009.02.089-.085.18-.105.092-.27.214-.403.283z"/>
                <path fill="#ffffff" d="M12.337 10.694a1.724 1.724 0 00-.104 0h-.01c.088-.277-.106-.48-.621-.713-.534-.235-.96-.212-1.032.265-.005.025-.009.05-.011.076a.801.801 0 00-.12.054c-.252.137-.389.386-.465.692-.076.305-.098.674-.119 1.09-.013.208-.099.49-.186.79-.875.624-2.09.894-3.122.19-.07-.11-.15-.22-.233-.328a13.85 13.85 0 00-.16-.205.65.65 0 00.268-.05.34.34 0 00.186-.192c.063-.17 0-.408-.202-.68-.201-.273-.542-.58-1.043-.888-.368-.23-.574-.51-.67-.814-.097-.305-.084-.635-.01-.96.143-.625.51-1.233.743-1.614.063-.046.023.086-.236.567-.232.44-.667 1.455-.072 2.248.016-.564.15-1.14.377-1.677.329-.747 1.018-2.041 1.072-3.073.029.02.125.086.169.11.126.075.221.184.344.283a.85.85 0 00.575.2c.24 0 .427-.079.582-.168.17-.096.304-.204.433-.245.27-.085.486-.235.608-.41.21.83.7 2.027 1.014 2.611.167.31.5.969.643 1.762.091-.002.191.01.299.038.375-.973-.319-2.022-.636-2.314-.128-.124-.135-.18-.07-.177.343.304.795.917.96 1.608.075.315.09.646.01.973.04.017.08.034.12.054.603.293.826.548.719.897z"/>
                <path fill="#E6E6E6" d="M8.04 8.062c-.556.002-1.099.251-1.558.716-.46.464-.814 1.122-1.018 1.888l.061.038v.004c.47.298.805.598 1.012.878.219.296.316.584.223.834a.513.513 0 01-.27.283l-.041.015c.074.097.146.197.213.3.944.628 2.042.396 2.867-.172.08-.278.153-.536.163-.698.021-.415.042-.792.124-1.12.082-.33.242-.63.544-.795.017-.10.034-.015.051-.023a.756.756 0 01.022-.094c-.242-.622-.591-1.14-1.01-1.5-.42-.36-.897-.551-1.382-.554zm2.37 2.155l-.002.005v-.002l.001-.004z"/>
                <path fill="#ffffff" d="M9.278 3.833a1.05 1.05 0 01-.215.656 4.119 4.119 0 00-.218-.90l-.127-.045c.029-.035.085-.075.107-.127a.669.669 0 00.05-.243l.001-.10a.673.673 0 00-.035-.236.434.434 0 00-.108-.184.223.223 0 00-.156-.07H8.57a.228.228 0 00-.151.06.434.434 0 00-.122.175.676.676 0 00-.05.243v.10a.718.718 0 00.009.14 1.773 1.773 0 00-.354-.120 1.196 1.196 0 01-.01-.133v-.013a1.035 1.035 0 01.088-.447.793.793 0 01.25-.328.554.554 0 01.346-.123h.006c.125 0 .232.036.342.116a.78.78 0 01.257.324c.063.138.094.273.097.433l.001.012zM7.388 3.997a1.05 1.05 0 00-.277.125.623.623 0 00.002-.150v-.008a.651.651 0 00-.048-.192.37.37 0 00-.096-.141.158.158 0 00-.119-.045c-.042.004-.077.024-.110.065a.372.372 0 00-.070.156.626.626 0 00-.013.205v.008a.634.634 0 00.048.193.367.367 0 00.116.156l-.102.08-.078.056a.706.706 0 01-.160-.240c-.053-.12-.082-.24-.090-.381v-.001a1.071 1.071 0 01.045-.390.668.668 0 01.167-.292.359.359 0 01.264-.118c.084 0 .158.028.235.090a.68.68 0 01.199.271c.053.12.080.24.089.382v.001c.003.06.003.115-.002.170z"/>
                <path fill="#202020" d="M7.806 4.335c.01.034.065.029.097.045.027.014.05.045.08.046.03.001.076-.01.80-.04.005-.038-.052-.063-.088-.077-.047-.019-.107-.028-.151-.003-.10.005-.021.018-.018.30zM7.484 4.335c-.01.034-.065.029-.096.045-.028.014-.05.045-.081.046-.03.001-.076-.01-.080-.04-.005-.038.052-.063.088-.077.047-.019.108-.028.152-.003.10.005.02.018.017.30z"/>
            </svg>`,
    },
    {
      name: "Android",
      keywords: [".apk", ".apkx", ".abb", "android", "mobile"],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" data-custom-icon="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5915 3.88444C13.6002 3.32107 14.7626 3 16 3C17.2374 3 18.3998 3.32107 19.4085 3.88444L20.1464 3.14645C20.3417 2.95118 20.6583 2.95118 20.8536 3.14645C21.0488 3.34171 21.0488 3.65829 20.8536 3.85355L20.2612 4.44595C21.9266 5.72558 23 7.73743 23 10H9C9 7.73743 10.0734 5.72558 11.7388 4.44595L11.1464 3.85355C10.9512 3.65829 10.9512 3.34171 11.1464 3.14645C11.3417 2.95118 11.6583 2.95118 11.8536 3.14645L12.5915 3.88444ZM14 7C14 7.55228 13.5523 8 13 8C12.4477 8 12 7.55228 12 7C12 6.44772 12.4477 6 13 6C13.5523 6 14 6.44772 14 7ZM19 8C19.5523 8 20 7.55228 20 7C20 6.44772 19.5523 6 19 6C18.4477 6 18 6.44772 18 7C18 7.55228 18.4477 8 19 8Z" fill="#87C527"/>
                <path d="M5 12.5C5 11.6716 5.67157 11 6.5 11C7.32843 11 8 11.6716 8 12.5V18.5C8 19.3284 7.32843 20 6.5 20C5.67157 20 5 19.3284 5 18.5V12.5Z" fill="#87C527"/>
                <path d="M12 24V27.5C12 28.3284 12.6716 29 13.5 29C14.3284 29 15 28.3284 15 27.5V24H17V27.5C17 28.3284 17.6716 29 18.5 29C19.3284 29 20 28.3284 20 27.5V24H21C22.1046 24 23 23.1046 23 22V11H9V22C9 23.1046 9.89543 24 11 24H12Z" fill="#87C527"/>
                <path d="M24 12.5C24 11.6716 24.6716 11 25.5 11C26.3284 11 27 11.6716 27 12.5V18.5C27 19.3284 26.3284 20 25.5 20C24.6716 20 24 19.3284 24 18.5V12.5Z" fill="#87C527"/>
            </svg>`,
    },
    {
      name: "Apple",
      keywords: [
        ".dmg",
        ".pkg",
        "macos",
        ".app",
        "darwin",
        "apple",
        "mac",
        "osx",
        "mac-installer",
      ],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-custom-icon="true">
                <path fill="#a6a6a6" d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97C14.32,22,13.89,21.18,12.37,21.18C10.84,21.18,10.37,21.95,9.1,22C7.79,22.05,6.8,20.68,5.96,19.47C4.25,17,2.94,12.45,4.7,9.39C5.57,7.87,7.13,6.91,8.82,6.88C10.1,6.86,11.32,7.75,12.11,7.75C12.89,7.75,14.37,6.68,15.92,6.84C16.57,6.87,18.39,7.1,19.56,8.82C19.47,8.88,17.39,10.1,17.41,12.63C17.44,15.65,20.06,16.66,20.09,16.67C20.06,16.74,19.67,18.11,18.71,19.5M13,3.5C13.73,2.67,14.94,2.04,15.94,2C16.07,3.17,15.6,4.35,14.9,5.19C14.21,6.04,13.07,6.7,11.95,6.61C11.8,5.46,12.36,4.26,13,3.5"></path>
            </svg>`,
    },
    {
      name: "Source",
      keywords: ["source", "src", "code", "src"],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-custom-icon="true">
                <path fill="#6e7781" d="M2.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073H2.75zM1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V1.75z"></path>
                <path fill="#6e7781" d="M4.75 5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zM4 7.75A.75.75 0 0 1 4.75 7h2a.75.75 0 0 1 0 1.5h-2A.75.75 0 0 1 4 7.75zm3 2.25a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5H7z"></path>
            </svg>`,
    },
    {
      name: "iOS",
      keywords: [
        "ios",
        "iphone",
        "ipad",
        "ipod",
        ".ipa",
      ],
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-custom-icon="true">
                <path fill="#a6a6a6" d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97C14.32,22,13.89,21.18,12.37,21.18C10.84,21.18,10.37,21.95,9.1,22C7.79,22.05,6.8,20.68,5.96,19.47C4.25,17,2.94,12.45,4.7,9.15C5.52,7.68,6.83,6.73,8.27,6.73C9.68,6.73,10.56,7.55,12.35,7.55C14.1,7.55,14.78,6.73,16.29,6.73C17.78,6.73,18.92,7.68,19.74,9.15C19.43,9.32,18.29,10.05,18.29,11.5C18.29,13.25,19.78,13.83,19.82,13.85C19.82,13.9,19.18,16.05,18.71,19.5M15.27,5.55C15.9,4.8,16.38,3.7,16.18,2.6C15.24,2.65,14.1,3.25,13.42,4.05C12.82,4.75,12.25,5.85,12.47,6.95C13.5,7,14.62,6.3,15.27,5.55Z"></path>
            </svg>`,
    },
  ];

  // 压缩包文件扩展名列表
  const archiveExtensions = [
    ".zip",
    ".rar",
    ".7z",
    ".tar.gz",
    ".tar.bz2",
    ".tar.xz",
    ".tgz",
    ".gz",
    ".bz2",
    ".xz",
  ];

  // 系统关键词列表
  const systemKeywords = [
    "windows",
    "win",
    "macos",
    "osx",
    "mac",
    "apple",
    "linux",
    "ubuntu",
    "debian",
    "fedora",
    "arch",
    "centos",
    "redhat",
    "bsd",
    "freebsd",
    "openbsd",
    "netbsd",
    "android",
    "ios",
    "iphone",
    "ipad",
    "ipod",
    "darwin",
    "mobile",
    "desktop",
    "server",
  ];

  // 架构关键词列表（按长度降序排序）
  const archKeywords = [
    "x86_64",
    "aarch64",
    "mips64le",
    "mips64",
    "riscv64",
    "ppc64le",
    "s390x",
    "armv7hf",
    "arm64",
    "armel",
    "armhf",
    "amd64",
    "loong64",
    "armv7",
    "i686",
    "universal",
    "mipsle",
    "mips",
    "x64",
    "x86",
    "386",
    "arm",
  ].sort((a, b) => b.length - a.length); // 按长度降序排序

  // ===== 文件名架构识别算法 (v2) =====
  // OS 别名归一表：别名 → 规范名
  const osAliasTable = {
    windows: "windows", win: "windows", win32: "windows", win64: "windows", nt: "windows",
    macos: "macos", mac: "macos", osx: "macos", darwin: "macos", apple: "macos",
    linux: "linux", gnu: "linux", glibc: "linux", musl: "linux",
    ubuntu: "linux", debian: "linux", fedora: "linux", arch: "linux",
    centos: "linux", redhat: "linux", rhel: "linux", opensuse: "linux", suse: "linux",
    alpine: "linux", gentoo: "linux", manjaro: "linux",
    android: "android",
    ios: "ios", iphone: "ios", iphoneos: "ios", ipad: "ios", ipod: "ios",
    freebsd: "freebsd", fbsd: "freebsd",
    openbsd: "openbsd", obsd: "openbsd",
    netbsd: "netbsd", nbsd: "netbsd",
    dragonfly: "dragonfly", dfbsd: "dragonfly",
    solaris: "solaris", sunos: "solaris",
    aix: "aix",
    haiku: "haiku",
  };

  // 架构别名归一表：别名 → 规范名
  const archAliasTable = {
    x86_64: "x86_64", x64: "x86_64", amd64: "x86_64", "x86-64": "x86_64",
    aarch64: "aarch64", arm64: "aarch64", armv8: "aarch64", "arm64-v8a": "aarch64",
    armv7: "armv7", armv7hf: "armv7", armhf: "armv7", armv7l: "armv7", "armeabi-v7a": "armv7",
    armv6: "armv6", armv6hf: "armv6", armv6l: "armv6",
    armel: "armel", armv5: "armel",
    i386: "i386", x86: "i386", ia32: "i386", "386": "i386", "486": "i386", "586": "i386",
    i686: "i686",
    mips: "mips", mipseb: "mips",
    mipsle: "mipsle", mipsel: "mipsle",
    mips64: "mips64", mips64eb: "mips64",
    mips64le: "mips64le", mips64el: "mips64le",
    ppc64: "ppc64", powerpc64: "ppc64",
    ppc64le: "ppc64le", powerpc64le: "ppc64le",
    riscv64: "riscv64", rv64: "riscv64",
    riscv32: "riscv32", rv32: "riscv32",
    s390x: "s390x",
    loong64: "loong64", loongarch64: "loong64",
    universal: "universal", fat: "universal", all: "universal", any: "universal", noarch: "universal",
    arm: "arm",
  };

  // 格式检测表（复合扩展名优先）
  const formatTable = [
    { ext: ".tar.gz", format: "tar.gz" }, { ext: ".tar.bz2", format: "tar.bz2" },
    { ext: ".tar.xz", format: "tar.xz" }, { ext: ".tar.zst", format: "tar.zst" },
    { ext: ".tar", format: "tar" }, { ext: ".tgz", format: "tar.gz" },
    { ext: ".tbz2", format: "tar.bz2" }, { ext: ".txz", format: "tar.xz" },
    { ext: ".zip", format: "zip" }, { ext: ".rar", format: "rar" },
    { ext: ".7z", format: "7z" }, { ext: ".gz", format: "gz" },
    { ext: ".bz2", format: "bz2" }, { ext: ".xz", format: "xz" },
    { ext: ".exe", format: "exe" }, { ext: ".msi", format: "msi" },
    { ext: ".dmg", format: "dmg" }, { ext: ".pkg", format: "pkg" },
    { ext: ".deb", format: "deb" }, { ext: ".rpm", format: "rpm" },
    { ext: ".apk", format: "apk" }, { ext: ".appimage", format: "AppImage" },
    { ext: ".snap", format: "snap" }, { ext: ".flatpak", format: "flatpak" },
    { ext: ".iso", format: "iso" }, { ext: ".img", format: "img" },
    { ext: ".bin", format: "bin" }, { ext: ".jar", format: "jar" },
    { ext: ".war", format: "war" }, { ext: ".whl", format: "whl" },
    { ext: ".egg", format: "egg" }, { ext: ".crate", format: "crate" },
    { ext: ".gem", format: "gem" }, { ext: ".asar", format: "asar" },
    { ext: ".ipa", format: "ipa" }, { ext: ".aab", format: "aab" },
  ];

  /**
   * 文件名架构识别算法 (v2)
   * 输入: filename 字符串 (如 "tool-v1.0.0-windows-x64.zip")
   * 输出: { os, arch, format, confidence, osAlias, archAlias, raw }
   */
  function parseFileNameArchitecture(filename) {
    if (!filename || typeof filename !== "string") {
      return { os: null, arch: null, format: null, confidence: 0, osAlias: null, archAlias: null, raw: filename || "" };
    }

    const lower = filename.toLowerCase().trim();
    const result = {
      os: null, arch: null, format: null,
      confidence: 0, osAlias: null, archAlias: null,
      raw: filename,
    };

    // --- Phase 1: 格式检测 (从末尾匹配，复合扩展名优先) ---
    for (const { ext, format } of formatTable) {
      if (lower.endsWith(ext)) {
        result.format = format;
        break;
      }
    }
    if (!result.format) {
      const m = lower.match(/\.([a-z0-9]+)$/i);
      if (m) result.format = m[1];
    }

    // --- Phase 2: 分词 (按分隔符拆分，保留位置信息) ---
    const delimiterRegex = /[-.+\s]/g; // 不拆下划线，保留 x86_64 等复合关键词
    const tokens = [];
    let lastIdx = 0;
    let m;
    while ((m = delimiterRegex.exec(lower)) !== null) {
      if (m.index > lastIdx) {
        tokens.push({ text: lower.substring(lastIdx, m.index), start: lastIdx, end: m.index });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < lower.length) {
      tokens.push({ text: lower.substring(lastIdx), start: lastIdx, end: lower.length });
    }

    // --- Phase 3: OS 检测 (精确 token → 子串边界) ---
    const osMatches = [];
    for (const token of tokens) {
      const t = token.text;
      if (Object.prototype.hasOwnProperty.call(osAliasTable, t)) {
        osMatches.push({ canonical: osAliasTable[t], alias: t, quality: 1.0, token });
        continue;
      }
      // 下划线二次拆分（n-gram 最长优先，如 x86_64 优先于 x86）
      const subTokens = t.split("_");
      if (subTokens.length > 1) {
        const matched = new Array(subTokens.length).fill(false);
        let subFound = false;
        for (let n = subTokens.length; n >= 1; n--) {
          for (let i = 0; i + n <= subTokens.length; i++) {
            if (matched.slice(i, i + n).some((v) => v)) continue;
            const joined = subTokens.slice(i, i + n).join("_");
            if (Object.prototype.hasOwnProperty.call(osAliasTable, joined)) {
              osMatches.push({ canonical: osAliasTable[joined], alias: joined, quality: 1.0, token });
              for (let k = i; k < i + n; k++) matched[k] = true;
              subFound = true;
            }
          }
        }
        if (subFound) continue;
      }
      for (const [alias, canonical] of Object.entries(osAliasTable)) {
        if (alias.length >= 3 && t.includes(alias)) {
          const idx = t.indexOf(alias);
          const before = idx > 0 ? t[idx - 1] : "";
          const after = idx + alias.length < t.length ? t[idx + alias.length] : "";
          // OS 常跟版本号(如 macos11, win10)，after 放宽：仅禁止字母
          if (!/[a-z0-9]/.test(before) && !/[a-z]/.test(after)) {
            osMatches.push({ canonical, alias, quality: 0.6, token });
          }
        }
      }
    }

    // --- Phase 4: 架构检测 (精确 token → 子串边界) ---
    const archMatches = [];
    for (const token of tokens) {
      const t = token.text;
      if (Object.prototype.hasOwnProperty.call(archAliasTable, t)) {
        archMatches.push({ canonical: archAliasTable[t], alias: t, quality: 1.0, token });
        continue;
      }
      // 下划线二次拆分（n-gram 最长优先，如 x86_64 优先于 x86）
      const subTokens = t.split("_");
      if (subTokens.length > 1) {
        const matched = new Array(subTokens.length).fill(false);
        let subFound = false;
        for (let n = subTokens.length; n >= 1; n--) {
          for (let i = 0; i + n <= subTokens.length; i++) {
            if (matched.slice(i, i + n).some((v) => v)) continue;
            const joined = subTokens.slice(i, i + n).join("_");
            if (Object.prototype.hasOwnProperty.call(archAliasTable, joined)) {
              archMatches.push({ canonical: archAliasTable[joined], alias: joined, quality: 1.0, token });
              for (let k = i; k < i + n; k++) matched[k] = true;
              subFound = true;
            }
          }
        }
        if (subFound) continue;
      }
      for (const [alias, canonical] of Object.entries(archAliasTable)) {
        if (alias.length >= 2 && t.includes(alias)) {
          const idx = t.indexOf(alias);
          const before = idx > 0 ? t[idx - 1] : "";
          const after = idx + alias.length < t.length ? t[idx + alias.length] : "";
          if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
            archMatches.push({ canonical, alias, quality: 0.6, token });
          }
        }
      }
    }

    // --- Phase 5: 冲突消解 & 置信度计算 ---
    if (osMatches.length > 0) {
      const osGroups = {};
      for (const match of osMatches) {
        if (!osGroups[match.canonical]) osGroups[match.canonical] = [];
        osGroups[match.canonical].push(match);
      }
      let bestOS = null, bestScore = 0;
      // OS 优先级：ios 优先于 macos（更具体的平台名）
      const osPriority = { ios: 0.01, android: 0.01 };
      for (const [canonical, matches] of Object.entries(osGroups)) {
        const maxQuality = Math.max(...matches.map((m2) => m2.quality));
        const groupBonus = matches.length > 1 ? 0.15 : 0;
        const priorityBonus = osPriority[canonical] || 0;
        const score = maxQuality + groupBonus + priorityBonus;
        if (score > bestScore) {
          bestScore = score;
          bestOS = canonical;
          result.osAlias = matches[0].alias;
        }
      }
      result.os = bestOS;
      result.confidence += Math.min(bestScore, 1.0) * 0.5;
    }

    if (archMatches.length > 0) {
      const archGroups = {};
      for (const match of archMatches) {
        if (!archGroups[match.canonical]) archGroups[match.canonical] = [];
        archGroups[match.canonical].push(match);
      }
      let bestArch = null, bestScore = 0;
      for (const [canonical, matches] of Object.entries(archGroups)) {
        const maxQuality = Math.max(...matches.map((m2) => m2.quality));
        const groupBonus = matches.length > 1 ? 0.15 : 0;
        const score = maxQuality + groupBonus;
        if (score > bestScore) {
          bestScore = score;
          bestArch = canonical;
          result.archAlias = matches[0].alias;
        }
      }
      result.arch = bestArch;
      result.confidence += Math.min(bestScore, 1.0) * 0.5;
    }

    if (result.format) {
      result.confidence = Math.min(result.confidence + 0.1, 1.0);
    }
    // --- Phase 6: 格式反推 OS (.ipa → iOS) ---
    if (!result.os && result.format === "ipa") {
      result.os = "ios";
      result.osAlias = "ipa";
      result.confidence = Math.max(result.confidence, 0.6);
    }

    if (!result.os && !result.arch && !result.format) {
      result.confidence = 0;
    } else if (!result.os && !result.arch) {
      result.confidence = Math.min(result.confidence, 0.2);
    }

    return result;
  }

  // ===== 基于识别算法 v2 的图标兑底匹配 =====
  // 既有三重关键词规则（扩展名 → 压缩包系统词 → 全关键词）都未命中时，
  // 用 parseFileNameArchitecture 的 OS 归一识别（含 win64/win32/nt 等
  // systemKeywords 未收录的别名，以及下划线复合词拆分）反查 iconRules。
  // 只映射到已有的六个规则，不会引入新图标，故零回归风险。
  const OS_CANON_TO_RULE_NAME = {
    windows: "Windows",
    macos: "Apple",
    linux: "Linux",
    android: "Android",
    ios: "iOS",
    freebsd: "Linux",
    openbsd: "Linux",
    netbsd: "Linux",
    dragonfly: "Linux",
  };

  function findIconRuleV2(fileNameLower) {
    const parsed = parseFileNameArchitecture(fileNameLower);
    if (!parsed.os) return null;
    const ruleName = OS_CANON_TO_RULE_NAME[parsed.os];
    if (!ruleName) return null;
    return iconRules.find((rule) => rule.name === ruleName) || null;
  }

  // 初始化样式和动态关键词的函数
  let allCombinedKeywords = [...archKeywords];

  // 收敛到 IIFE 内部：此前挂在 window 上但无任何外部消费者，
  // 反而给页面脚本留下覆盖/探测面。
  function initializeArchStyles() {
    let dynamicStyles = "";

    // 基础图标及静态样式
    let baseStyles = `
            /* 图标样式 */
            .custom-svg-icon {
                width: 1.5em; height: 1.5em; min-width: 1.5em;
                vertical-align: middle; flex-shrink: 0; margin-right: 8px;
            }
            .Box-row .d-flex.flex-justify-start.col-12.col-lg-6,
            .Box-row > div.d-flex.flex-justify-start {
                display: flex; align-items: center;
            }
            /* 架构关键词基础高亮样式 */
            .arch-highlight {
                padding: 1px 6px; border-radius: 4px; font-weight: bold;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin: 0 2px;
                display: inline-block; font-size: 0.9em;
                background-color: var(--arch-bg, #FFEB3B);
                color: var(--arch-color, #000);
                border: 1px solid var(--arch-border, transparent);
            }
            .file-name-container {
                display: inline-block; margin-left: 4px;
            }
            `;

    // 处理默认架构关键词颜色
    const goldenRatioConjugate = 0.618033988749895;
    let currentHue = 0.4; // 初始色相
    let x86_64Hue = null; // 保存 x86_64 的色相值

    const deletedDefaults = GM_getValue("deletedDefaults", []);
    const defaultColorOverrides = GM_getValue("defaultColorOverrides", {});
    const overriddenDefaults = Object.keys(defaultColorOverrides).map((text) => ({
      text,
      color: defaultColorOverrides[text],
    }));

    archKeywords.forEach((arch) => {
      let hue;
      if (arch.toLowerCase() === "amd64") {
        // amd64 使用与 x86_64 相同的颜色
        if (x86_64Hue !== null) {
          hue = x86_64Hue;
        } else {
          currentHue += goldenRatioConjugate;
          currentHue %= 1;
          hue = Math.floor(currentHue * 360);
        }
      } else if (arch.toLowerCase() === "aarch64") {
        // aarch64 与 arm64 同为 ARM 系，共用同一颜色（桔红色）
        hue = 15;
      } else if (arch.toLowerCase() === "x64") {
        // x64 使用与 x86_64 相同的颜色
        if (x86_64Hue !== null) {
          hue = x86_64Hue;
        } else {
          currentHue += goldenRatioConjugate;
          currentHue %= 1;
          hue = Math.floor(currentHue * 360);
        }
      } else if (arch.toLowerCase() === "x86_64") {
        // x86_64 使用第一个生成的颜色（亮绿色）
        currentHue += goldenRatioConjugate;
        currentHue %= 1;
        hue = Math.floor(currentHue * 360);
        x86_64Hue = hue; // 保存 x86_64 的色相值供其他关键词使用
      } else if (arch.toLowerCase() === "arm64") {
        hue = 15; // 桔红色
      } else {
        currentHue += goldenRatioConjugate;
        currentHue %= 1;
        hue = Math.floor(currentHue * 360);
      }

      // 已删除或已自定义颜色的默认关键词：跳过自动配色（仍推进色相状态以保持其余配色不变）
      if (
        deletedDefaults.includes(arch) ||
        Object.prototype.hasOwnProperty.call(defaultColorOverrides, arch)
      )
        return;

      const className = `arch-${arch.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-")}`;

      dynamicStyles += `
            .arch-highlight.${className} {
                --arch-bg: hsl(${hue}, 85%, 90%);
                --arch-color: hsl(${hue}, 90%, 30%);
                --arch-border: hsl(${hue}, 85%, 80%);
            }
            html.dark .arch-highlight.${className},
            html[data-color-mode="dark"] .arch-highlight.${className} {
                --arch-bg: hsl(${hue}, 70%, 20%);
                --arch-color: hsl(${hue}, 85%, 75%);
                --arch-border: hsl(${hue}, 70%, 30%);
            }
            @media (prefers-color-scheme: dark) {
                html:not([data-color-mode="light"]):not(.light) .arch-highlight.${className} {
                    --arch-bg: hsl(${hue}, 70%, 20%);
                    --arch-color: hsl(${hue}, 85%, 75%);
                    --arch-border: hsl(${hue}, 70%, 30%);
                }
            }
            `;
    });

    // 处理自定义关键词（含已自定义颜色的默认关键词）
    const userKeywords = GM_getValue("userCustomKeywords", []);
    const customColorRules = [...overriddenDefaults, ...userKeywords];

    customColorRules.forEach((kw) => {
      const className = `user-kw-${kw.text.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-")}`;
      const bgColor = kw.color;
      // 简单判断对比度给予适当字体颜色以防看不清
      const textColor = isDarkColor(bgColor) ? "#ffffff" : "#000000";
      const borderColor = isDarkColor(bgColor) ? "#000000" : "#cccccc";

      dynamicStyles += `
            .arch-highlight.${className} {
                --arch-bg: ${bgColor} !important;
                --arch-color: ${textColor} !important;
                --arch-border: ${borderColor} !important;
            }
            `;
    });

    const style = document.createElement("style");
    style.id = "MGGA-custom-arch-style";
    style.textContent = baseStyles + dynamicStyles;
    document.head.appendChild(style);

    // 更新词典：自定义颜色规则 + 未删除的默认架构关键词
    const activeArchKeywords = archKeywords.filter(
      (arch) =>
        !deletedDefaults.includes(arch) &&
        !Object.prototype.hasOwnProperty.call(defaultColorOverrides, arch),
    );
    allCombinedKeywords = [
      ...customColorRules.map((k) => k.text),
      ...activeArchKeywords,
    ].sort((a, b) => b.length - a.length); // 确保长词优先匹配
  }

  // 初始化样式（并同步主题色缓存，供高亮函数使用）
  refreshThemeColorsCache();
  initializeArchStyles();

  // 高亮架构关键词（包含自定义关键词）
  function highlightArchKeywords(text) {
    if (!text) return text;

    let result = text;

    // 确保匹配列表不为空
    if (allCombinedKeywords.length === 0) return result;

    const regex = new RegExp(
      `(${allCombinedKeywords
        .map(
          (kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), // 转义
        )
        .join("|")})`,
      "gi",
    );

    result = result.replace(regex, (match) => {
      const lowerMatch = match.toLowerCase();
      const userKeywords = cachedThemeColors.userCustomKeywords;
      const defaultColorOverrides = cachedThemeColors.defaultColorOverrides;
      const isCustomKwd =
        userKeywords.some((kw) => kw.text.toLowerCase() === lowerMatch) ||
        Object.prototype.hasOwnProperty.call(
          defaultColorOverrides,
          lowerMatch,
        );

      let className = "";
      if (isCustomKwd) {
        className = `user-kw-${lowerMatch.replace(/[^a-zA-Z0-9]/g, "-")}`;
      } else {
        className = `arch-${lowerMatch.replace(/[^a-zA-Z0-9]/g, "-")}`;
      }
      return `<span class="arch-highlight ${className}">${match}</span>`;
    });

    return result;
  }

  // === Release 资产列表选择器（集中管理 + 结构兜底）===
  // 这些是 GitHub 的页面内部类名，不属于稳定契约。全部集中于此并在主选择器
  // 失效时按 data-testid / 语义结构兜底，避免改版后整块功能静默失效；
  // 将来改版也只需在这里改一处。
  const ASSET_SELECTORS = {
    row: ".Box.Box--condensed li.Box-row",
    cell: "div.d-flex.flex-justify-start.col-12.col-lg-6",
    link: "div.d-flex.flex-justify-start.col-12.col-lg-6 a",
    listBox: ".Box.Box--condensed",
  };

  /** Release 资产容器（GitHub 新版稳定契约）与"资产链接特征" */
  const ASSET_HOST_TESTID = '[data-testid="release-assets"]';
  const ASSET_LINK_HINT =
    /\/releases\/(?:latest\/)?download\/|\/archive\/|\/releases\/expanded_assets\//;

  /**
   * 全部 Release 资产行：主选择器 → 容器级兜底 → 特征级兜底。
   *
   * 兜底必须**严格收窄**（2026-09-21 事故）：历史实现含裸
   * `ul[data-view-component] li.Box-row` / `section[data-testid=...] li`，
   * 主选择器失配时会把页面其它无关 `li.Box-row`（动态流、贡献者列表等）
   * 也当作资产行返回，而 `queryAssetCell` 的 `|| row` 兜底会让
   * `link.innerHTML = ""` 直接清空无关行的内容 → 触发 React 重渲染 →
   * 观察器再次调用 processAssets → 无限重试循环（本仓库已记录两次）。
   */
  function queryAssetRows(root = document) {
    const primary = root.querySelectorAll(ASSET_SELECTORS.row);
    if (primary.length) return primary;
    // 兜底 1：只在 release-assets 容器内取行（容器本身就是稳定契约）
    const scoped = root.querySelectorAll(
      ASSET_HOST_TESTID + " li.Box-row, " + ASSET_HOST_TESTID + " li",
    );
    if (scoped.length) return scoped;
    // 兜底 2：按"行内确有下载/归档链接"这一语义特征过滤，绝不裸选
    return Array.from(
      root.querySelectorAll(
        "ul[data-view-component] li.Box-row, .Box.Box--condensed li.Box-row",
      ),
    ).filter((li) =>
      Array.from(li.querySelectorAll("a[href]")).some((a) =>
        ASSET_LINK_HINT.test(a.getAttribute("href") || ""),
      ),
    );
  }

  /**
   * 资产行内的「文件名单元格」：主选择器 → 第一个 flex 起始容器 → 整行。
   * 末位兜底保留 `row`：GitHub 改版时单元格类名可能整体更换（如仅剩
   * `div.d-flex`），此时仍应能定位；安全性由**行选择收窄**与
   * `queryAssetLink` 的可信度判定共同保证，不靠这里的 null 兜底。
   */
  function queryAssetCell(row) {
    return (
      row.querySelector(ASSET_SELECTORS.cell) ||
      row.querySelector("div.d-flex.flex-justify-start") ||
      row
    );
  }

  /**
   * 文件名链接：主选择器 → 单元格内首个 a。改版路径（主单元格类名失配）
   * 下额外做可信度判定，宁可跳过也不误改无关节点 —— 历史上这里返回了
   * 无关行的首个 a，紧接着 `link.innerHTML = ""` 清空其内容，触发 React
   * 重渲染 → 观察器再调 processAssets → 无限重试循环。
   */
  function queryAssetLink(row, cell) {
    const primaryCell = row.querySelector(ASSET_SELECTORS.cell);
    if (primaryCell) {
      return (
        row.querySelector(ASSET_SELECTORS.link) ||
        primaryCell.querySelector("a") ||
        null
      );
    }
    const link = (cell || row).querySelector("a");
    if (!link) return null;
    // 放行条件（任一）：1) 链接具备下载/归档特征；2) 链接位于可信的
    // release-assets 容器内（覆盖改版初期/测试夹具中的占位 href）
    if (ASSET_LINK_HINT.test(link.getAttribute("href") || "")) return link;
    if (link.closest(ASSET_HOST_TESTID)) return link;
    return null;
  }

  // 统筹处理文件资源的SVG图标和高亮
  function processAssets() {
    const isSvgEnabled = GM_getValue("svgEnabled", true);
    const isHighlightEnabled = GM_getValue("highlightEnabled", true);
    const assetItems = queryAssetRows();

    assetItems.forEach((item) => {
      const svgContainer = queryAssetCell(item);
      const link = queryAssetLink(item, svgContainer);
      if (!link || !svgContainer) return;

      const fileName = link.textContent;

      // 缓存原始文件和Svg
      if (!item._originalFileName && fileName) {
        // 如果是从其他状态恢复或者初次加载，确保取到最净的文本
        item._originalFileName = fileName;
      }

      const currentSvg = svgContainer.querySelector("svg");
      if (currentSvg && !currentSvg.classList.contains("custom-svg-icon")) {
        if (!item._originalSvg) item._originalSvg = currentSvg;
      }

      const originalFileName = item._originalFileName;
      if (!originalFileName) return;

      const fileNameLower = originalFileName.toLowerCase();
      const cleanFileName = fileNameLower.replace(/\s+/g, " ").trim();

      const isSourceCode =
        cleanFileName === "source code (zip)" ||
        cleanFileName === "source code (tar.gz)" ||
        cleanFileName === "source code";

      // === SVG 图标处理 ===
      if (isSvgEnabled && !isSourceCode) {
        if (item.dataset.svgProcessed !== "true") {
          let matchedRule = null;
          let fileExtension = "";

          const extensionMatch = originalFileName.match(/\.([a-z0-9]+)$/i);
          if (extensionMatch) fileExtension = extensionMatch[0].toLowerCase();

          const hasKeyword = (filename, keyword) => {
            const lowerFileName = filename.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();
            if (lowerKeyword.startsWith("."))
              return lowerFileName.includes(lowerKeyword);
            const escapedKeyword = lowerKeyword.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );
            // 改进正则：支持连字符作为边界，支持开头和结尾
            const regex = new RegExp(
              `(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`,
              "i",
            );
            return regex.test(lowerFileName);
          };

          for (const rule of iconRules) {
            if (
              fileExtension &&
              rule.keywords.some(
                (keyword) =>
                  keyword.startsWith(".") &&
                  fileExtension.includes(keyword.toLowerCase()),
              )
            ) {
              matchedRule = rule;
              break;
            }
          }

          if (!matchedRule && archiveExtensions.includes(fileExtension)) {
            const systemMatch = systemKeywords.find((keyword) =>
              hasKeyword(fileNameLower, keyword),
            );
            if (systemMatch) {
              matchedRule = iconRules.find((rule) =>
                rule.keywords.some(
                  (keyword) =>
                    keyword.toLowerCase() === systemMatch.toLowerCase(),
                ),
              );
            }
          }

          if (!matchedRule) {
            for (const rule of iconRules) {
              if (
                rule.keywords.some((keyword) =>
                  hasKeyword(fileNameLower, keyword),
                )
              ) {
                matchedRule = rule;
                break;
              }
            }
          }

          // 兑底：识别算法 v2（OS 别名归一 + 复合词拆分 + 置信度）
          if (!matchedRule) {
            matchedRule = findIconRuleV2(fileNameLower);
          }

          if (matchedRule) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = matchedRule.svg;
            const newSvg = tempDiv.firstChild;
            newSvg.classList.add("custom-svg-icon");
            newSvg.setAttribute("data-mgga-mutation-guard", "1");

            const activeSvg = svgContainer.querySelector("svg");
            if (activeSvg && activeSvg.parentNode) {
              // GitHub 新 DOM 中 svg 的父节点可能是内部 span，使用父节点替换以兼容新旧结构
              activeSvg.parentNode.replaceChild(newSvg, activeSvg);
            }
          }
          item.dataset.svgProcessed = "true";
        }
      } else {
        if (item.dataset.svgProcessed === "true") {
          const customSvg = svgContainer.querySelector("svg.custom-svg-icon");
          if (customSvg && customSvg.parentNode) {
            // 使用父节点替换，兼容 GitHub 新旧 DOM 结构
            customSvg.parentNode.replaceChild(item._originalSvg, customSvg);
          }
          item.dataset.svgProcessed = "false";
        }
      }

      // === 关键词高亮处理 ===
      if (isHighlightEnabled) {
        if (item.dataset.highlightProcessed !== "true") {
          const fileNameContainer = document.createElement("span");
          // 加入 text-bold 保持 GitHub 新版原生加粗样式
          fileNameContainer.className = "file-name-container text-bold";
          fileNameContainer.setAttribute("data-mgga-mutation-guard", "1");
          fileNameContainer.innerHTML = highlightArchKeywords(originalFileName);
          link.innerHTML = "";
          link.appendChild(fileNameContainer);

          item.dataset.highlightProcessed = "true";
        }
      } else {
        if (item.dataset.highlightProcessed === "true") {
          // 重建 span.text-bold 保持 GitHub 新版原生加粗样式
          const restoreSpan = document.createElement("span");
          restoreSpan.className = "text-bold";
          restoreSpan.textContent = originalFileName;
          link.replaceChildren(restoreSpan);
          item.dataset.highlightProcessed = "false";
        }
      }
    });
  }

  // 设置观察器监听assets列表变化
  let assetsObserver = null;
  function setupAssetsObserver() {
    // 断开旧观察器，防止 SPA 导航时内存泄漏
    if (assetsObserver) {
      assetsObserver.disconnect();
      assetsObserver = null;
    }

    if (!isReleasesPage()) return;

    assetsObserver = new MutationObserver((mutations) => {
      let needsUpdate = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // 忽略本脚本自身产生的变更（样式标签 / 高亮 span 容器）
          const t = mutation.target;
          if (
            t &&
            t.nodeType === 1 &&
            t.closest &&
            t.closest("[data-mgga-mutation-guard]")
          ) {
            continue;
          }
          let isSelf = false;
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === 1 &&
              node.closest &&
              node.closest("[data-mgga-mutation-guard]")
            ) {
              isSelf = true;
              break;
            }
          }
          if (isSelf) continue;
          needsUpdate = true;
          break;
        }
      }

      if (needsUpdate) {
        processAssets();
      }
    });

    // 缩小监听范围：Release 资产所在主内容区，找不到时才兑底到 body
    const assetListRoot =
      document.querySelector("main") ||
      document.querySelector(ASSET_SELECTORS.listBox) ||
      document.querySelector('[data-testid="release-assets"]') ||
      document.body;
    assetsObserver.observe(assetListRoot, {
      childList: true,
      subtree: true,
    });
  }

  // 初始化悬浮齿轮按钮
  function createFloatingButton() {
    if (!isReleasesPage()) return;
    if (document.getElementById("mgga-float-btn")) return;

    const btn = document.createElement("div");
    btn.id = "mgga-float-btn";
    btn.innerHTML = "⚙️";
    btn.title = "Make-GitHub-Great-Again 设置";
    document.body.appendChild(btn);

    let isDragging = false;
    let startY, startTop;

    const onMouseMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dy) > 5) {
        // 稍微提高拖动判断阈值，防止点击时手抖误判为拖拽
        isDragging = true;
        btn.classList.add("is-dragging");
        const vp = getViewportMetrics();
        const btnH = btn.offsetHeight || 44;
        const half = btnH / 2;
        const minCenter = vp.offsetTop + half + 4;
        const maxCenter = vp.offsetTop + vp.height - half - 4;
        let nextTop = startTop + dy;
        if (maxCenter >= minCenter) {
          nextTop = Math.max(minCenter, Math.min(nextTop, maxCenter));
        } else {
          nextTop = vp.offsetTop + vp.height / 2;
        }
        btn.style.top = `${nextTop}px`;
      }
    };

    const onMouseUp = (e) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      setTimeout(() => {
        btn.classList.remove("is-dragging");
        setTimeout(() => {
          isDragging = false;
        }, 50);
      }, 50); // 稍微延迟移除，避免释放瞬间立刻触发过渡动画导致闪烁
    };

    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      // 移除 e.preventDefault() 即可放行原生的点击行为
      isDragging = false;
      startY = e.clientY;
      // 获得精确的中心 currentTop
      const rect = btn.getBoundingClientRect();
      startTop = rect.top + rect.height / 2;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // 重新改回通过纯正的 click 事件来判定
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止事件冒泡到 document，防止触发对话框外部点击事件导致秒关
      if (!isDragging) {
        createColorPickerDialog();
      }
    });

    // 如果面板已经是打开状态，按钮应该初始被隐藏
    const dialog = document.querySelector(".color-picker-dialog.visible");
    if (dialog) {
      btn.classList.add("hidden-to-right");
    }

    // 分辨率 / 缩放 / 窗口尺寸变化时，保证悬浮按钮始终在屏幕内
    const floatBtnViewportHandler = () => {
      if (!document.body.contains(btn)) {
        window.removeEventListener("resize", floatBtnViewportHandler);
        window.removeEventListener("orientationchange", floatBtnViewportHandler);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", floatBtnViewportHandler);
        }
        return;
      }
      clampFloatButton(btn);
    };
    window.addEventListener("resize", floatBtnViewportHandler);
    window.addEventListener("orientationchange", floatBtnViewportHandler);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", floatBtnViewportHandler);
    }
    // 初始也夹紧一次，防止极端缩放下初始 50% 落在屏幕外
    clampFloatButton(btn);
  }

  // 移除悬浮按钮
  function removeFloatingButton() {
    const btn = document.getElementById("mgga-float-btn");
    if (btn) btn.remove();
  }

  // 监听 GitHub 原生 include-fragment 异步懒加载事件
  document.addEventListener("include-fragment-replace", () => {
    if (isReleasesPage()) {
      setTimeout(processAssets, 10);
    }
  });
  document.addEventListener("include-fragment-replaced", () => {
    if (isReleasesPage()) {
      setTimeout(processAssets, 10);
    }
  });

  // === 仓库头操作按钮行溢出修正 ===
  // 真因（实机）：新版仓库头 narrow 布局里，Watch/Fork/Star/Sponsor 等按钮所在的
  // flex 行未按屏幕宽度换行/收缩，最后一个 Sponsor 按钮顶出主列，把文档撑宽，
  // 右侧因此出现一整列空白。
  // 对策：只改这一行按钮的布局行为（强制 wrap + 允许收缩 + 容器限宽），默认开启。
  const HEADER_BTN_FIX_STYLE_ID = "mgga-header-btn-fix-style";
  let headerBtnObserver = null;
  let headerBtnDebounce = null;
  let headerBtnBootstrapTimer = null;

  function isMobileLayoutFixEnabled() {
    return GM_getValue("mobileLayoutFix", true);
  }

  function injectHeaderBtnFixStyle() {
    const existing = document.getElementById(HEADER_BTN_FIX_STYLE_ID);
    if (!isMobileLayoutFixEnabled()) {
      if (existing) existing.remove();
      document.documentElement.classList.remove("mgga-header-btn-fix");
      return;
    }
    if (existing) return;

    const style = document.createElement("style");
    style.id = HEADER_BTN_FIX_STYLE_ID;
    style.setAttribute("data-mgga-mutation-guard", "1");
    style.textContent = `
      /* MGGA: repo header action row — wrap / shrink so Sponsor cannot overflow */
      html.mgga-header-btn-fix #repos-split-pane-content header,
      html.mgga-header-btn-fix #repos-split-pane-content header [class*="HeaderContent"],
      html.mgga-header-btn-fix #repos-split-pane-content header .show-whenNarrow {
        max-width: 100% !important;
        min-width: 0 !important;
      }

      /* 外层 flex 行（含 .tmp-mb-3.flex-wrap）：必须换行，且不超过主列宽度 */
      html.mgga-header-btn-fix #repos-split-pane-content header .show-whenNarrow .d-flex,
      html.mgga-header-btn-fix #repos-split-pane-content header .tmp-mb-3,
      html.mgga-header-btn-fix header .d-flex.gap-2.tmp-mb-3 {
        flex-wrap: wrap !important;
        max-width: 100% !important;
        min-width: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 行内的按钮组 div：自身也允许换行/收缩 */
      html.mgga-header-btn-fix #repos-split-pane-content header .show-whenNarrow .d-flex > div,
      html.mgga-header-btn-fix header .d-flex.gap-2.tmp-mb-3 > div {
        min-width: 0 !important;
        max-width: 100% !important;
        flex: 1 1 auto !important;
        flex-wrap: wrap !important;
        box-sizing: border-box !important;
      }

      /* 组内按钮（Watch / Fork / Star / Sponsor…）：允许收缩，不再用 max-content 顶宽 */
      html.mgga-header-btn-fix #repos-split-pane-content header .show-whenNarrow button,
      html.mgga-header-btn-fix #repos-split-pane-content header .show-whenNarrow a,
      html.mgga-header-btn-fix header .d-flex.gap-2.tmp-mb-3 button,
      html.mgga-header-btn-fix header .d-flex.gap-2.tmp-mb-3 a {
        min-width: 0 !important;
        max-width: 100% !important;
        flex-shrink: 1 !important;
        flex-grow: 0 !important;
        box-sizing: border-box !important;
      }
    `;
    document.documentElement.classList.add("mgga-header-btn-fix");
    document.head.appendChild(style);
  }

  // 对目标按钮行打标并强制 wrap（兼容 GitHub 换 class 后仍命中结构）
  function applyHeaderBtnRowLayout() {
    if (!isMobileLayoutFixEnabled()) return;
    const selectors = [
      "#repos-split-pane-content header .show-whenNarrow .d-flex",
      "#repos-split-pane-content header .tmp-mb-3",
      "header .d-flex.gap-2.tmp-mb-3",
    ];
    const rows = document.querySelectorAll(selectors.join(","));
    let appliedCount = 0;
    rows.forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      // 幂等短路：已打过标且样式未丢失时跳过，避免与自身 observer 形成循环
      if (
        row.dataset.mggaHeaderBtnRow === "1" &&
        row.style.flexWrap === "wrap"
      ) {
        appliedCount++;
        return;
      }
      appliedCount++;
      row.dataset.mggaHeaderBtnRow = "1";
      row.style.flexWrap = "wrap";
      row.style.maxWidth = "100%";
      row.style.minWidth = "0";
      row.style.width = "100%";
      row.style.boxSizing = "border-box";
      Array.from(row.children).forEach((group) => {
        if (!(group instanceof HTMLElement)) return;
        group.style.flexWrap = "wrap";
        group.style.maxWidth = "100%";
        group.style.minWidth = "0";
        group.style.flex = "1 1 auto";
        group.style.boxSizing = "border-box";
        group.querySelectorAll("button, a").forEach((btn) => {
          if (!(btn instanceof HTMLElement)) return;
          btn.style.minWidth = "0";
          btn.style.maxWidth = "100%";
          btn.style.flexShrink = "1";
        });
      });
    });
    return appliedCount;
  }

  function scheduleHeaderBtnFix() {
    if (!isMobileLayoutFixEnabled()) return;
    if (headerBtnDebounce) clearTimeout(headerBtnDebounce);
    headerBtnDebounce = setTimeout(() => {
      headerBtnDebounce = null;
      applyHeaderBtnRowLayout();
    }, 80);
  }

  // 目标按钮行尚未出现在 DOM 时的兑底轮询（最多 20 次 × 250ms，成功即停止）
  function startHeaderBtnBootstrap() {
    let attempts = 0;
    const tryApply = () => {
      if (!isMobileLayoutFixEnabled()) return;
      const applied = applyHeaderBtnRowLayout();
      if (applied > 0) {
        setupHeaderBtnObserver();
        return;
      }
      if (++attempts >= 20) return;
      headerBtnBootstrapTimer = setTimeout(tryApply, 250);
    };
    tryApply();
  }

  function teardownHeaderBtnObserver() {
    if (headerBtnObserver) {
      headerBtnObserver.disconnect();
      headerBtnObserver = null;
    }
    if (headerBtnBootstrapTimer) {
      clearTimeout(headerBtnBootstrapTimer);
      headerBtnBootstrapTimer = null;
    }
  }

  function setupHeaderBtnObserver() {
    teardownHeaderBtnObserver();
    if (!isMobileLayoutFixEnabled()) return;
    if (!document.body) return;
    // 缩小监听范围：仅观察仓库页头部区域，避免全页 subtree 监听的持续开销
    const watchRoot =
      document.querySelector("#repos-split-pane-content header") ||
      document.querySelector("header.AppHeader") ||
      document.querySelector("header") ||
      document.body; // 头部未渲染时的兑底（每次 SPA 导航重置）
    headerBtnObserver = new MutationObserver((mutations) => {
      // 忽略本脚本自身产生的变更（如样式标签插入）
      for (const mutation of mutations) {
        const t = mutation.target;
        if (
          t &&
          t.nodeType === 1 &&
          t.closest &&
          t.closest("[data-mgga-mutation-guard]")
        ) {
          continue;
        }
        scheduleHeaderBtnFix();
        return;
      }
    });
    headerBtnObserver.observe(watchRoot, { childList: true, subtree: true });
  }

  function applyMobileLayoutFix() {
    injectHeaderBtnFixStyle();
    if (!isMobileLayoutFixEnabled()) {
      teardownHeaderBtnObserver();
      return;
    }
    applyHeaderBtnRowLayout();
    startHeaderBtnBootstrap();
  }

  // 对全站仓库页生效（不限于 Release），初始与视口变化时校正
  if (document.body) {
    applyMobileLayoutFix();
  } else {
    document.addEventListener("DOMContentLoaded", () => applyMobileLayoutFix(), { once: true });
  }
  window.addEventListener("resize", scheduleHeaderBtnFix);
  window.addEventListener("orientationchange", scheduleHeaderBtnFix);
  window.addEventListener("resize", scheduleNavDockViewportCheck);
  window.addEventListener("orientationchange", scheduleNavDockViewportCheck);

  // === 仓库主页：左侧悬浮导航（复用 More 检测与下拉收割逻辑） ===
  // 策略：
  // 1) 在 /:owner/:repo 仓库主页启用，**所有设备**（含桌面）均可使用，不复按
  //    视口/UA 判定；悬浮球常驻，面板由用户按需展开。
  // 2) 扫描主页所有含 More Toggle 的导航条形栏（全局头部 nav、仓库标签条 UnderlineNav、主内容区 nav 容器）。
  // 3) 逐栏**免点击**读取导航项：直扫本栏锚点 + 读取预渲染的溢出副本
  //    （[data-menu-item] / aria-controls 目标，见 readPrerenderedBarItems）。
  // 4) 将各栏读取项按顺序合并、去重，渲染为左侧悬浮导航栏（悬浮球 + 可展开面板）。
  // 5) 不改动原生页面 DOM（原生 More 行为保持不变）；SPA 导航后按新路径重建。
  // 6) 点击模拟已从主路径退役：溢出项自 SSR 首帧起就在 DOM 里，点击 More
  //    不产生任何新信息（见 readPrerenderedBarItems 的证据链），却会触发
  //    primer-react 焦点还原引发滚动跳动。点击流程仅在"某栏零点击一项都取
  //    不到、且存在可见 More 触发器"时作为兜底启用（2026-09-21 免点击改造）。
  // 7) 兜底闸门有三重限定（判定唯一入口 navDockBarClickAllowed）：非 dock 栏
  //    不点、零点击已能取到项不点、**纯面包屑/上下文栏不点** —— 后者指
  //    nav[aria-label="Breadcrumbs"] 这类锚点全为 owner/owner-repo 的栏，
  //    其"零点击可得项"恒为 0，若不单独排除会被闸门永久放行，每会话点开其
  //    无名图标按钮（仓库选择器 picker），把 picker 链接当导航项塞进面板
  //    （2026-09-20~21 反复实证的重复项来源）。
  const NAV_DOCK_ID = "mgga-nav-dock";
  const NAV_DOCK_TOGGLE_ID = "mgga-nav-dock-toggle";
  const NAV_DOCK_STYLE_ID = "mgga-nav-dock-style";
  /**
   * 面板标题栏显示的品牌名。品牌不是文案，两种语言下都写作 "MGGA"，
   * 因此不走 i18n（面板的无障碍名仍是 i18n.t("navDock")）。
   */
  const NAV_DOCK_BRAND = "MGGA";
  let navDockObserver = null;
  let navDockDebounce = null;
  /** 空结果后的延迟重试定时器（一次性，见 scheduleNavDockRetry） */
  let navDockRetryTimer = null;
  let navDockBuilding = false;
  let navDockExpanded = false;
  /**
   * 一次性收割会话：进入仓库页/刷新/SPA 跨路径时开启（load run 级）。
   * 每个触发器元素在页面生命周期内至多点击一次：收割到条目即入缓存（面板
   * 与收割产物此后不再变化），点击后为空则记入失败（本页面内该元素绝不
   * 再点击）。按**元素**而非按栏记录 —— GitHub 重排（切 Responsive）/React
   * 重渲染会重建触发器节点，按元素记录让新节点获得一次收割机会，同时
   * 同一元素绝不重复点击（防振荡）。视口变化重建只读既有缓存。
   */
  let navDockHarvestSession = null;
  /** 全局点击上限（整页生命周期），防御性兜底（正常远达不到） */
  const NAV_DOCK_SESSION_MAX_CLICKS = 12;
  /** load run 序号：每次进入/刷新/SPA 跨路径 +1，构成会话键的一部分 */
  let navDockLoadRunSeq = 0;
  /** 上次应用 dock 的路径，用于识别"进入新页面" */
  let navDockLastBuiltPath = null;
  /** 面板结构版本：DOM 结构变更时递增，旧面板强制重建一次 */
  const NAV_DOCK_STRUCT_VER = "17";
  /**
   * 续排自限守卫（2026-09-21 无限重扫修复）：
   * navDockDirty —— 构建期间到达的 body 变更（此时观察器回调被
   *   navDockBuilding 守卫吞掉），构建结束后必须补一轮，否则 React 注水
   *   出来的头部 More 会永久失去收割机会。
   * navDockRebuildStreak —— 连续"有进展"轮次计数；超过上限即停表。
   *   真机实测（2026-09-21）：桌面全宽、所有导航项外显、无需下拉时，
   *   "[MGGA] scan" 曾以 ~14 条/秒永不停止，主线程被持续唤醒、页面永不
   *   进入空闲态，DevTools 控制台被刷屏看不到前端代码。
   */
  let navDockDirty = false;
  let navDockRebuildStreak = 0;
  const NAV_DOCK_MAX_REBUILD_STREAK = 5;

  /** 同步悬浮球与面板的展开态 UI（点击悬浮球与油猴菜单共用，过渡对齐 Release 设置面板） */
  function setNavDockExpanded(expanded) {
    navDockExpanded = !!expanded;
    const panel = document.getElementById(NAV_DOCK_ID);
    const fab = document.getElementById(NAV_DOCK_TOGGLE_ID);
    if (panel) {
      panel.setAttribute("data-expanded", navDockExpanded ? "true" : "false");
      // 对齐 Release 设置面板：.visible 类驱动 translateX(-100%) → 0 滑入滑出
      panel.classList.toggle("mgga-visible", navDockExpanded);
    }
    if (fab) {
      fab.setAttribute("aria-expanded", navDockExpanded ? "true" : "false");
      fab.title = navDockExpanded ? i18n.t("navDockCollapse") : i18n.t("navDockExpand");
      fab.setAttribute("aria-label", fab.title);
      // 面板展开时悬浮球像 Release 悬浮按钮被设置面板接管时一样右移淡出
      fab.classList.toggle("mgga-dock-fab-hidden", navDockExpanded);
    }
  }

  /** 油猴菜单：仅切换面板展开/收起；悬浮球未就绪时先即时构建，非仓库主页时通知提示 */
  async function toggleNavDockPanelFromMenu() {
    if (!isRepoHomePath()) {
      console.info(
        "[MGGA] nav dock: menu toggle ignored, not a repo home path",
        location.pathname
      );
      try {
        if (typeof GM_notification === "function") {
          GM_notification({
            text: i18n.t("navDockUnavailable"),
            title: i18n.t("navDock"),
          });
        }
      } catch (_) {
        /* ignore */
      }
      return;
    }
    // 悬浮球尚未出现（页面初始化中或早退）时先构建一次
    if (!document.getElementById(NAV_DOCK_TOGGLE_ID)) {
      await applyNavDock();
    }
    if (!document.getElementById(NAV_DOCK_TOGGLE_ID)) {
      console.warn("[MGGA] nav dock: FAB unavailable after build");
      return;
    }
    setNavDockExpanded(!navDockExpanded);
  }

  function isRepoHomePath() {
    const m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (!m) return false;
    const reserved = new Set([
      "orgs", "topics", "collections", "trending", "features", "marketplace",
      "pulls", "issues", "notifications", "explore", "sponsors", "settings",
      "account", "search", "gist", "about", "pricing", "apps", "codespaces",
      "developer", "security", "enterprise", "login", "logout", "join",
      "new", "import", "dashboard", "watching", "forks", "stars"
    ]);
    return !reserved.has(m[1]) && !reserved.has(m[2]);
  }

  function injectNavDockStyle() {
    if (document.getElementById(NAV_DOCK_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = NAV_DOCK_STYLE_ID;
    style.setAttribute("data-mgga-mutation-guard", "1");
    style.textContent = `
      /* MGGA: repo home floating nav dock */
      #mgga-nav-dock-toggle {
        position: fixed !important;
        left: 1em !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 2147483000 !important;
        width: 44px !important;
        height: 44px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 50% !important;
        border: 1px solid var(--borderColor-default, var(--color-border-default, rgba(125, 125, 125, 0.45))) !important;
        background: var(--bgColor-default, var(--color-canvas-default, #ffffff)) !important;
        color: var(--fgColor-default, var(--color-fg-default, #1f2328)) !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        line-height: 1 !important;
      }

      /* 对齐 Release 悬浮按钮：拖拽/显隐过渡节奏一致 */
      #mgga-nav-dock-toggle {
        transition: opacity 0.4s ease, margin-left 0.4s ease, background 0.2s ease !important;
      }

      /* 面板展开时悬浮球像 Release 设置面板打开时一样右移淡出 */
      #mgga-nav-dock-toggle.mgga-dock-fab-hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        margin-left: 2em !important;
      }

      #mgga-nav-dock-toggle > svg {
        width: 18px !important;
        height: 18px !important;
        pointer-events: none !important;
      }

      #mgga-nav-dock-toggle .mgga-nav-dock-badge {
        position: absolute !important;
        top: -4px !important;
        right: -4px !important;
        min-width: 16px !important;
        height: 16px !important;
        padding: 0 4px !important;
        border-radius: 8px !important;
        background: #0969da !important;
        color: #ffffff !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        line-height: 16px !important;
        text-align: center !important;
        pointer-events: none !important;
      }

      /* 对齐 Release 设置面板：初始左侧屏外 + 淡出，展开滑入；
         垂直居中锚定，高度随内容自适应但绝不出屏 */
      #mgga-nav-dock {
        position: fixed !important;
        left: 1em !important;
        top: 50% !important;
        z-index: 2147483001 !important;
        width: fit-content !important;
        min-width: min(56vw, 220px) !important;
        max-width: min(80vw, 360px) !important;
        max-height: calc(100vh - 1em) !important;
        max-height: calc(100dvh - 1em) !important;
        /* 面板自己**不再滚动** —— 滚动交给内部的 .mgga-nav-dock-body。
           面板若也滚，滚动条必然从面板顶边画到底边、顺带压住标题栏那一行：
           webkit 自定义滚动条无法只覆盖"下半截"（track/thumb 都不接受"从第
           7px 开始"这种约束）。要按区域排除标题栏，唯一可靠的做法就是把标题栏
           **移出滚动容器**，让它根本不在滚动口里。
           配套：flex 纵向排列，body 才能靠 flex:1 + min-height:0 自己约束高度。*/
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        padding: 6px !important;
        border-radius: 12px !important;
        border: 1px solid var(--borderColor-default, var(--color-border-default, rgba(125, 125, 125, 0.45))) !important;
        background: var(--bgColor-default, var(--color-canvas-default, #ffffff)) !important;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transform: translateY(-50%) translateX(-100%) !important;
        transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease !important;
      }

      #mgga-nav-dock.mgga-visible {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        transform: translateY(-50%) translateX(0) !important;
      }

      /* 滚动区：条目与分割线都住在这里，标题栏在外 —— 所以滚动条只覆盖本区，
         永远不会出现在标题栏那一行（用户诉求）。三条缺一不可：
         ① flex:1 + min-height:0 —— flex 子项默认 min-height:auto，会被内容撑破、
            面板整个溢出，而不是内部出滚动条（经典 flex 滚动坑）；
         ② overscroll-behavior:contain —— 滚到两端不再把滚动接力给整页；
         ③ -webkit-overflow-scrolling:touch —— 触屏惯性滚动，原挂在面板上。*/
      #mgga-nav-dock > .mgga-nav-dock-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
      }

      /* 沉浸式滚动条：① 干掉 Windows 经典滚动条的上下步进箭头（那对箭头是
         「::-webkit-scrollbar-button」渲染出来的伪元素，不是内容）；② 轨道完全
         透明，滑块默认只是一抹淡灰、悬停才变实；③ 8px 轨道里用 2px 透明描边 +
         padding-box 裁切，视觉厚度只有 4px。
         注意：**不能**给这里补「scrollbar-width」—— 在 Chromium 121+ 上只要它
         不是 auto，整组「::-webkit-scrollbar」规则会被直接忽略（箭头又会回来）。
         Firefox 天然没有箭头，用标准属性单独喂（见下方 @supports 块）。*/
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
        background: transparent !important;
      }

      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-track,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-track-piece {
        background: transparent !important;
        border: none !important;
      }

      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-button,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-button:vertical:decrement,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-button:vertical:increment,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-button:horizontal:decrement,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-button:horizontal:increment,
      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-corner {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }

      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-thumb {
        background-color: rgba(127, 127, 127, 0.28) !important;
        border: 2px solid transparent !important;
        background-clip: padding-box !important;
        border-radius: 8px !important;
      }

      #mgga-nav-dock:hover .mgga-nav-dock-body::-webkit-scrollbar-thumb,
      #mgga-nav-dock:focus-within .mgga-nav-dock-body::-webkit-scrollbar-thumb {
        background-color: rgba(127, 127, 127, 0.5) !important;
      }

      #mgga-nav-dock .mgga-nav-dock-body::-webkit-scrollbar-thumb:hover {
        background-color: rgba(127, 127, 127, 0.72) !important;
      }

      /* Firefox 专属：「::-webkit-scrollbar-button」不被识别（好在 Gecko 本来
         就不给滚动条画箭头），改用标准属性拿细条。@supports 探测在 Chromium
         恒为 false，不会污染上面的 webkit 规则。*/
      @supports (-moz-appearance: none) {
        #mgga-nav-dock > .mgga-nav-dock-body {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(127, 127, 127, 0.5) transparent !important;
        }
      }

      /* 面板标题栏：对齐 Release 设置面板 header + 关闭按钮。
         关键：它**不在滚动容器里**。面板是 flex 列，标题栏是第一个 flex 子项，
         滚动口（.mgga-nav-dock-body）从它下沿才开始。所以：
         · 标题永远不会被滚上去、也不会被容器裁掉 —— 上一版是给 position:sticky
           打补丁（前提是"面板自己滚"），现在那个前提被直接去掉了，更彻底；
         · 滚动条只画在 body 上 ⇒ 标题栏那一行不会出现滚动条（本次诉求）。
         于是上一版 sticky 的三条配套（不透明背景 / z-index / 同色补边）全部作废：
         它们都是为"滚动内容会从标题底下穿过"而生，而现在滚动内容根本不在同一层。
         唯一必须留的是 flex-shrink:0 —— 面板被 max-height 压短时标题栏不许被
         压缩，收缩的只能是 body（这样滚动条才落在标题栏下方）。*/
      #mgga-nav-dock .mgga-nav-dock-header {
        flex: 0 0 auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 2px 4px 6px !important;
        margin-bottom: 2px !important;
        border-bottom: 1px solid var(--borderColor-muted, var(--color-border-muted, rgba(125, 125, 125, 0.25))) !important;
      }

      #mgga-nav-dock .mgga-nav-dock-header-title {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--fgColor-muted, var(--color-fg-muted, #59636e)) !important;
      }

      #mgga-nav-dock .mgga-nav-dock-header-version {
        font-size: 10px !important;
        font-weight: normal !important;
        color: var(--fgColor-muted, var(--color-fg-muted, #59636e)) !important;
        opacity: 0.7 !important;
        margin-left: 6px !important;
        white-space: nowrap !important;
      }

      #mgga-nav-dock .mgga-nav-dock-close {
        background: transparent !important;
        border: none !important;
        color: var(--fgColor-muted, var(--color-fg-muted, #59636e)) !important;
        cursor: pointer !important;
        padding: 2px 6px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        line-height: 1.2 !important;
      }

      #mgga-nav-dock .mgga-nav-dock-close:hover {
        color: var(--fgColor-default, var(--color-fg-default, #1f2328)) !important;
        background: var(--bgColor-neutral-muted, var(--color-neutral-muted, rgba(127, 127, 127, 0.18))) !important;
      }

      /* 克隆复用的原控件：布局由面板接管，视觉（配色/字号/内边距/hover）
         交给 GitHub 原生类（UnderlineNav-item 等），保证与页面无差异。
         行内溢出隐藏：克隆 nowrap 长文本不再横向撑开面板 */
      #mgga-nav-dock a {
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
      }

      /* 手工兑底条目（无源锚点可克隆时）沿用原面板视觉 */
      #mgga-nav-dock a.mgga-nav-dock-fallback {
        gap: 8px !important;
        padding: 8px 10px !important;
        border-radius: 8px !important;
        color: var(--fgColor-default, var(--color-fg-default, #1f2328)) !important;
        text-decoration: none !important;
        font-size: 14px !important;
        line-height: 1.35 !important;
        background: transparent !important;
      }

      #mgga-nav-dock a.mgga-nav-dock-fallback:hover,
      #mgga-nav-dock a.mgga-nav-dock-fallback:active {
        background: var(--bgColor-neutral-muted, var(--color-neutral-muted, rgba(127, 127, 127, 0.18))) !important;
        text-decoration: none !important;
      }

      #mgga-nav-dock a > svg {
        width: 16px !important;
        height: 16px !important;
        flex: 0 0 auto !important;
      }

      /* 计数器胶囊：克隆自 GitHub 原生 .Counter，视觉样式由原生 CSS 生效；
         此处仅防缩水不覆盖观感 */
      #mgga-nav-dock .Counter {
        flex: 0 0 auto !important;
        white-space: nowrap !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      #mgga-nav-dock .mgga-nav-dock-label {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      /* 克隆条目内的文本节点：GitHub tab 文本有两种形态（data-content 或
         data-component=text）。仅防溢出（min-width+hidden+ellipsis），
         不拉伸 —— flex:1 会把短文本推离行首，破坏各项统一左对齐 */
      #mgga-nav-dock a > span[data-content],
      #mgga-nav-dock a > span[data-component='text'] {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* 跨栏轻微分割线：主题自适应。只画线 —— 栏名小标题已取消，
         所以这条规则不再需要 flex 布局与文字相关属性 */
      #mgga-nav-dock .mgga-nav-dock-divider {
        margin: 6px 4px 4px !important;
        border-top: 1px solid var(--borderColor-muted, var(--color-border-muted, rgba(125, 125, 125, 0.25))) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeNavDock() {
    const panel = document.getElementById(NAV_DOCK_ID);
    if (panel) panel.remove();
    const fab = document.getElementById(NAV_DOCK_TOGGLE_ID);
    if (fab) fab.remove();
    navDockExpanded = false;
  }

  function findHeaderNav() {
    const selectors = [
      ".js-header-wrapper header nav",
      ".header-wrapper header nav",
      "header.AppHeader nav",
      ".AppHeader nav",
      ".header-wrapper nav",
      "header nav",
    ];
    for (const sel of selectors) {
      const nav = document.querySelector(sel);
      if (nav) return nav;
    }
    return null;
  }

  function normalizedText(el) {
    return (el && el.textContent ? el.textContent : "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 锚点纯净标签：剔除计数器节点后取文本。
   * GitHub 导航 tab 的 textContent 形如 "Issues1.8k (1.8k)"（可见计数器 +
   * 响应式替换计数器），直接取会污染标签并在面板里与胶囊重复。
   */
  function navDockAnchorLabel(a) {
    if (!a) return "";
    const clone = a.cloneNode(true);
    clone
      .querySelectorAll(
        ".Counter, [data-component='Counter'], .js-nav-count-replace, [class*='ounter']"
      )
      .forEach((el) => el.remove());
    return normalizedText(clone);
  }

  function isMoreLabel(text) {
    if (!text) return false;
    // 文件区导航的 More 按钮文本为 "More items"（带隐藏后缀），需前缀匹配
    const t = String(text).replace(/\s+/g, " ").trim().toLowerCase();
    if (/^(more|更多|더보기|もっと見る|mehr|plus|⋯|\.\.\.|more items)/i.test(t) && t.length <= 16) return true;
    // 登录态头部（react-partial）可能只渲染省略号图标 + aria-label 之外的
    // 可访问名（如 "Additional navigation" / "More navigation"），按语义放宽
    if (/more|additional|navigation|nav/i.test(t) && t.length <= 40) return true;
    return false;
  }

  function findMoreTrigger(nav) {
    if (!nav) return null;
    // 已接管的 toggle 优先
    const candidates = nav.querySelectorAll("button, a, summary, [role=button]");
    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("data-more") ||
        normalizedText(el);
      if (isMoreLabel(label)) return el;
      // 纯图标 More 触发器（省略号 ⋯ / 三点图标，无可访问名文本）：
      // 文本匹配不到时，按 aria-haspopup + aria-expanded 的弹出语义识别
      if (
        el.getAttribute("aria-haspopup") &&
        el.getAttribute("aria-expanded") !== null
      ) {
        if (isMoreLabel(label)) return el;
        if (!normalizedText(el)) return el;
      }
      if (
        el.getAttribute("aria-haspopup") === "true" &&
        el.getAttribute("aria-expanded") !== null &&
        isMoreLabel(normalizedText(el.closest("li,div")))
      ) {
        return el;
      }
    }
    const details = nav.querySelector("details");
    if (details) {
      const summary = details.querySelector("summary");
      if (summary && isMoreLabel(normalizedText(summary))) return summary;
    }
    // 新版登录态头部（react-partial）可能把 More 触发器渲染为 nav 的
    // 兄弟节点（nav 与触发器平级、同属一个 header 容器），甚至挂在 nav
    // 的更上层容器里。逐步向上扩大查找（至多 3 层），每层要求：外层容器
    // 的首个 nav 是本栏（多栏容器不扩大，避免把相邻栏的 More 误认为
    // 本栏触发器），且候选不归属于其它 nav。
    let scope = nav;
    for (let up = 0; up < 3; up++) {
      const outer = scope.parentElement;
      if (!outer) break;
      scope = outer;
      if (scope.querySelector("nav") !== nav) continue;
      // 仓库页头部内容区（PageLayout-HeaderContent / show-whenNarrow）里的
      // "⋯" 元数据 kebab（stars/forks/watching/branches/tags/Activity 等）
      // 也是纯图标弹出按钮，会被本扩展误认成仓库标签栏的溢出触发器，
      // 把统计链接收割成"导航项"。头部内容区不是标签栏的溢出宿主，跳过。
      if (scope.matches("[class*='HeaderContent'], [class*='show-whenNarrow']")) {
        continue;
      }
      const outerCandidates = scope.querySelectorAll(
        "button, a, summary, [role=button]"
      );
      for (const el of outerCandidates) {
        if (!(el instanceof HTMLElement)) continue;
        if (nav.contains(el)) continue;
        const ownerNav = el.closest("nav");
        if (ownerNav && ownerNav !== nav) continue;
        // 位于仓库头部内容区（含 kebab 元数据菜单）内的候选不认领
        if (
          el.closest(
            "[class*='HeaderContent'], [class*='show-whenNarrow']"
          )
        ) {
          continue;
        }
        const label =
          el.getAttribute("aria-label") ||
          el.getAttribute("data-more") ||
          normalizedText(el);
        if (isMoreLabel(label)) return el;
        // 纯图标弹出按钮兜底（见上）
        if (
          el.getAttribute("aria-haspopup") &&
          el.getAttribute("aria-expanded") !== null &&
          !normalizedText(el)
        ) {
          return el;
        }
      }
    }
    return null;
  }

  /**
   * 定位 More 触发器对应的菜单。
   * allowGlobalFallback=false 时仅接受所有权明确的菜单（aria-controls 指向、
   * 触发器容器内），用于未点击的预检 —— 避免把页面上恰好可见的其它菜单
   * 误认为本栏菜单（假成功收割，目标栏从此永不重试）。
   * 点击后的收割传 true，允许扫 body 下的 ActionMenu portal（GitHub Primer
   * 新版把菜单渲染到 body，容器不在触发器附近）。
   */
  function findMoreMenu(trigger, allowGlobalFallback) {
    if (!trigger) return null;
    if (trigger instanceof HTMLDetailsElement) return trigger;
    if (trigger.tagName === "SUMMARY" && trigger.parentElement) {
      return trigger.parentElement;
    }

    // aria-controls 是触发器与菜单的所有权链接，隐藏 portal 也算本栏菜单
    const controls = trigger.getAttribute("aria-controls");
    if (controls) {
      const byId = document.getElementById(controls);
      if (byId) return byId;
    }

    const wrapper = trigger.closest(
      "li, [class*='ActionMenu'], [class*='action-menu'], details, div"
    );
    if (wrapper) {
      // 含 nav 的容器是导航条本身（More 与 tab 列表同容器的新版头部正是
      // 此结构），绝不能当菜单 —— 否则预检收割到本栏外显项即"假成功"，
      // 此后永不点击 More，溢出项永久丢失（登录态头部实证）。
      const wrapperContainsNav = !!wrapper.querySelector("nav");
      if (!wrapperContainsNav) {
        const menus = wrapper.querySelectorAll(
          "[class*='ActionList'], [class*='SelectMenu'], [class*='dropdown-menu'], [role='menu'], ul, [hidden]"
        );
        // 本栏导航内容防御：More 按钮与 tab 列表同处一个容器时，候选
        // "菜单"可能是本栏导航列表本身或其内部节点（首个 tab 锚点、溢出
        // 隐藏 li 等）。把它们当菜单收割会得到与可见项重复/残缺的条目，
        // 预检假成功后不再点击 More，溢出项永久丢失。预检阶段一律拒绝
        // 本栏 nav 内部的候选；真实菜单由点击后的全局兑底（仅收可见）
        // 或 aria-controls / details 所有权路径提供。
        const hostNav = trigger.closest("nav");
        const isInsideHost = (m) => !!(hostNav && hostNav.contains(m));
        for (let i = menus.length - 1; i >= 0; i--) {
          const m = menus[i];
          if (isInsideHost(m)) continue;
          return m;
        }
        if (
          wrapper !== trigger &&
          wrapper.querySelectorAll("a[href]").length &&
          !isInsideHost(wrapper)
        ) {
          return wrapper;
        }
      }
    }

    if (!allowGlobalFallback) return null;

    // body 下的 ActionMenu overlay portal：仅接受实际可见的菜单（React
    // 关闭后 portal 可能仍挂载，抓到隐藏旧菜单会把其他栏的下拉项误认为
    // 本栏的），且不在触发器自身内部（否则 wrapper 分支已处理）
    const openMenus = Array.from(
      document.querySelectorAll(
        "[data-target~='action-menu.overlay'], .ActionMenu-Overlay, [class*='ActionMenu'] [role='menu'], [role='menu'], div[class*='Overlay'] [class*='ActionList'], div[class*='Overlay'] ul[role='listbox']"
      )
    ).filter((m) => isVisibleMenu(m) && !trigger.contains(m));
    if (openMenus.length) return openMenus[openMenus.length - 1];
    return null;
  }

  /** 菜单元素当前是否实际可见（过滤关闭后仍挂载的隐藏 portal） */
  function isVisibleMenu(el) {
    if (!el) return false;
    if (el.hasAttribute("hidden")) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
    } catch (_) {
      /* ignore */
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function extractMenuItems(menuRoot) {
    if (!menuRoot) return [];
    const items = [];
    const seen = new Set();
    const anchors = menuRoot.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      if (!(a instanceof HTMLAnchorElement)) return;
      const href = a.getAttribute("href");
      // href="#" 的溢出 tab（React 客户端路由项）放行：pushItem 侧按
      // 白名单/选中态解析或丢弃，与文件区直扫规则一致，避免溢出的
      // License/Contributing 类 tab 在收割层被提前丢掉
      if (!href || href.startsWith("javascript:")) return;
      const label = a.getAttribute("aria-label") || navDockAnchorLabel(a);
      if (!label) return;
      if (isMoreLabel(label)) return;
      const key = href + "|" + label;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ href, label, source: a });
    });
    return items;
  }

  /**
   * 免点击读取本栏"预渲染"的导航项。
   *
   * 依据（2026-09-21 六仓库 SSR 实测 + GitHub 自身 behaviors 源码逐字核对）：
   * GitHub 的 .js-responsive-underlinenav 行为体（githubassets/assets/
   * behaviors-*.js 模块 G7）每次只在可见项与菜单副本之间**切换可见性**：
   *     item.style.visibility = overflow ? "hidden" : "";
   *     document.querySelector(`[data-menu-item=${tab}]`).hidden = !overflow;
   * 它**从不插入或生成菜单项节点** —— 溢出项自服务端首帧起就已在 DOM 中。
   * 实测对照（vscode / node / iina / react / linux / kubernetes）：
   * 直扫所得集合 ⊇ 本函数所得集合，且"本函数独有项"恒为空集 —— 即点击
   * More 不产生任何新信息，其唯一实际效果是焦点还原与页面滚动跳动。
   *
   * 两类零点击来源（合并返回，顺序即 DOM 顺序；调用方负责去重）：
   *  ① 本栏内的 [data-menu-item] 锚点：仓库标签栏的溢出副本，与可见项
   *     [data-tab-item] 一一对应（6 仓库实测双向覆盖，7=7 / 8=8）。
   *  ② 本栏 More 触发器 aria-controls 指向的下拉容器：覆盖"菜单被渲染到
   *     本栏 nav 之外"的结构（登录态头部 react-partial / ActionMenu）。
   *     容器位于本栏内部时跳过 —— 直扫已覆盖，重复提取无意义。
   */
  function readPrerenderedBarItems(bar) {
    const out = [];
    const seen = new Set();
    const push = (a) => {
      if (!(a instanceof HTMLAnchorElement)) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("javascript:")) return;
      const label = a.getAttribute("aria-label") || navDockAnchorLabel(a);
      if (!label || isMoreLabel(label)) return;
      const key = href + "|" + label;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ href, label, source: a });
    };

    // ① SSR 直出的溢出菜单副本
    bar.querySelectorAll("[data-menu-item]").forEach((node) => {
      push(node instanceof HTMLAnchorElement ? node : node.querySelector("a[href]"));
    });

    // ② aria-controls 指向的预渲染下拉容器（仅当它不在本栏内时补取）
    bar.querySelectorAll("[aria-controls]").forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const id = btn.getAttribute("aria-controls");
      if (!id) return;
      const target = document.getElementById(id);
      if (!target || bar.contains(target)) return;
      target.querySelectorAll("a[href]").forEach(push);
    });

    return out;
  }

  /**
   * 点击收割（**兜底路径，非主路径**）。
   * 仅当某栏经 readPrerenderedBarItems + 直扫后**一项都取不到**、且存在
   * 可见 More 触发器时才被调用（闸门见 buildNavDock 的 zeroClick 计数）。
   * 现网 SSR 实测下该分支恒不触发；保留它是为"菜单项既不预渲染在 nav 内、
   * 也不由 aria-controls 指认"的未知结构（如登录态头部改版）留一条活路。
   */
  async function harvestMoreItems(trigger, diag) {
    // 文件区 wrap 模式的 More 按钮常驻 display:none(data-overflow-mode=wrap,
    // 永不展开):点击它纯属浪费且其菜单(若有)由换行直扫覆盖,直接跳过
    if (trigger instanceof HTMLElement) {
      const triggerStyle = window.getComputedStyle(trigger);
      if (triggerStyle.display === "none" || triggerStyle.visibility === "hidden") {
        if (diag) diag.skipped = "trigger-hidden";
        return [];
      }
      const rect = trigger.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        if (diag) diag.skipped = "trigger-zero-size";
        return [];
      }
    }
    // 预检不带全局兜底：未点击时页面上其它菜单的可见残留会造成假成功
    let menu = findMoreMenu(trigger, false);
    let items = extractMenuItems(menu);
    if (items.length) {
      if (diag) {
        diag.clicked = false;
        diag.path = "precheck-menu-already-open";
        diag.menu = navDockDescribeNode(menu);
      }
      return items;
    }

    // 点击收割期间锁定页面滚动：More 触发器可能在视口外，click 打开与
    // Escape 关闭都会让 primer-react 把焦点还原/移交给触发器或菜单项，
    // 浏览器随之平滑滚动使目标可见（取证：focus 调用栈来自 primer-react）。
    // 收割窗口内锁死 html 滚动，焦点还原滚不动页面，结束后立即恢复。
    lockPageScrollForHarvest();
    try {
      return await harvestMoreItemsLocked(trigger, diag);
    } finally {
      unlockPageScrollForHarvest();
    }
  }

  /** 节点简述（诊断日志用）：tag#id.class(前 40 字) */
  function navDockDescribeNode(el) {
    if (!el) return "null";
    return (
      el.tagName.toLowerCase() +
      (el.id ? "#" + el.id : "") +
      "." +
      String(el.className || "").slice(0, 40)
    );
  }

  async function harvestMoreItemsLocked(trigger, diag) {
    // 注意:本函数与外层包装各自持有独立的 menu/items —— 拆分时若漏声明,
    // 非严格模式下赋值成隐式全局、读取未赋值变量直接抛 ReferenceError,
    // 会导致点击收割整栏失败且被上层 catch 静默吞掉(v2026.10.5-10.7 实证)。
    let menu = null;
    let items = [];
    const originallyOpen =
      trigger.getAttribute("aria-expanded") === "true" ||
      (trigger instanceof HTMLDetailsElement && trigger.open) ||
      (trigger.tagName === "SUMMARY" &&
        trigger.parentElement &&
        trigger.parentElement instanceof HTMLDetailsElement &&
        trigger.parentElement.open);

    if (!originallyOpen) {
      try {
        trigger.click();
        if (diag) diag.clicked = true; // 确实点了（区别于"本就展开"路径）
      } catch (_) {
        /* ignore */
      }
      // 点击后允许全局兜底 —— Primer 新版把菜单 portal 渲染到 body 下。
      // React 创建 portal 有延迟：总计 2.5s（250ms 步进）有界等待可见菜单
      const start = Date.now();
      while (Date.now() - start < 2500) {
        menu = findMoreMenu(trigger, true);
        if (menu && isVisibleMenu(menu)) {
          items = extractMenuItems(menu);
          if (items.length) break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!items.length && menu) items = extractMenuItems(menu);
      if (diag) diag.menu = navDockDescribeNode(menu);
      // 最终通用兜底：文档顺序中本触发器之后的第一个可见含锚点菜单/列表
      // （覆盖任意 portal 结构与 class 命名，如登录态头部 react-partial
      // 渲染的非标 ActionMenu）。仅收可见节点，避免抓到隐藏旧 portal。
      if (!items.length) {
        const all = Array.from(
          document.querySelectorAll(
            "[role='menu'], [role='listbox'], [class*='ActionList'], [class*='ActionMenu'], ul"
          )
        ).filter(
          (m) =>
            isVisibleMenu(m) &&
            !trigger.contains(m) &&
            m !== menu &&
            m.querySelector("a[href]")
        );
        const after = all.filter((m) =>
          trigger.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING
        );
        const fallback = after[0] || null;
        if (fallback) {
          const fbItems = extractMenuItems(fallback);
          // 全局兜底必须严格多于预检所见才有意义，否则是假成功
          if (fbItems.length > items.length) items = fbItems;
        }
      }
      try {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      } catch (_) {
        /* ignore */
      }
      if (
        trigger.getAttribute("aria-expanded") === "true" ||
        (trigger instanceof HTMLDetailsElement && trigger.open)
      ) {
        try {
          trigger.click();
          if (diag) diag.closedBySecondClick = true;
        } catch (_) {
          /* ignore */
        }
      }
    } else {
      // 本就展开：菜单应已可见，允许全局兜底但同样只收可见菜单
      if (diag) {
        diag.clicked = false;
        diag.path = "trigger-reported-expanded";
      }
      menu = findMoreMenu(trigger, true);
      if (menu && isVisibleMenu(menu)) items = extractMenuItems(menu);
      if (diag) diag.menu = navDockDescribeNode(menu);
    }
    return items;
  }

  // === 收割期间滚动锁定（防止焦点还原引发页面跳动） ===
  const NAV_DOCK_SCROLL_LOCK_STYLE_ID = "mgga-nav-dock-scroll-lock-style";
  let navDockScrollLockCount = 0;
  let navDockScrollSnapY = 0;
  let navDockScrollSnapHandler = null;
  /**
   * 回弹抑制截止时刻：dock 条目点击的"立即定位"会瞬时移动滚动位置，
   * 而 unlockPageScrollForHarvest 的 1.5s 宽限期回弹只认 snapY，
   * 会把这次定位拉回原处。抑制窗口内不回弹。
   */
  let navDockScrollRebounceSuppressUntil = 0;

  /**
   * 锁定页面滚动：①html/body overflow hidden（挡用户输入滚动）；
   * ②scroll 捕获阶段瞬时回弹 —— 程序化滚动（焦点还原、scrollIntoView）
   * 依规范可滚动 overflow:hidden 容器，仅 overflow 锁不住，必须把
   * 窗口 scrollY 实时拉回锁定时的位置。
   */
  function lockPageScrollForHarvest() {
    navDockScrollLockCount++;
    if (navDockScrollLockCount > 1) return;
    navDockScrollSnapY = window.scrollY;
    document.documentElement.classList.add("mgga-harvest-scroll-lock");
    if (!document.getElementById(NAV_DOCK_SCROLL_LOCK_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = NAV_DOCK_SCROLL_LOCK_STYLE_ID;
      style.setAttribute("data-mgga-mutation-guard", "1");
      style.textContent =
        "html.mgga-harvest-scroll-lock, html.mgga-harvest-scroll-lock body { overflow: hidden !important; }";
      (document.head || document.documentElement).appendChild(style);
    }
    navDockScrollSnapHandler = () => {
      if (window.scrollY !== navDockScrollSnapY) {
        window.scrollTo(0, navDockScrollSnapY);
      }
    };
    window.addEventListener("scroll", navDockScrollSnapHandler, {
      capture: true,
      passive: true,
    });
  }

  /** 解锁页面滚动：引用计数归零时才真正恢复 */
  function unlockPageScrollForHarvest() {
    navDockScrollLockCount = Math.max(0, navDockScrollLockCount - 1);
    if (navDockScrollLockCount > 0) return;
    if (navDockScrollSnapHandler) {
      window.removeEventListener("scroll", navDockScrollSnapHandler, {
        capture: true,
      });
      navDockScrollSnapHandler = null;
    }
    document.documentElement.classList.remove("mgga-harvest-scroll-lock");
    const style = document.getElementById(NAV_DOCK_SCROLL_LOCK_STYLE_ID);
    if (style) style.remove();
    // 在途平滑滚动（焦点还原触发的）会在解锁后继续走完动画并停在
    // 触发器位置 —— 立即恢复锁定位置，并在 1.5s 宽限期内有界回弹
    // （只覆盖仍在飞向错误位置的动画，不干扰用户主动滚动）。
    const snapY = navDockScrollSnapY;
    window.scrollTo(0, snapY);
    const graceEnd = Date.now() + 1500;
    const rebounce = () => {
      // 用户主动定位（dock 条目点击的 scrollIntoView）优先于回弹：
      // 抑制窗口内不回弹，否则"点了 README 刚滚过去就被拉回原处"。
      if (Date.now() < navDockScrollRebounceSuppressUntil) return;
      if (Date.now() > graceEnd || window.scrollY === snapY) return;
      window.scrollTo(0, snapY);
      setTimeout(rebounce, 50);
    };
    setTimeout(rebounce, 50);
  }

  // === dock 条目点击：页内立即定位 / 交还 GitHub 原生 AJAX ===
  /**
   * 概览文件区块的 id 约定（GitHub 自己的页内锚点）：
   *   `#readme-ov-file` / `#contributing-ov-file` / `#License-1-ov-file`
   * 右侧 About→Resources 区就是用这些锚点跳文件区里已渲染的概览文件。
   * 实证：.workbuddy/probe/iina.html（真实 SSR）第 311759/312621/314267 字节处。
   */
  const NAV_DOCK_OV_FILE_ANCHOR_RE = /-ov-file$/i;

  /** 标签归一：只留字母数字与中日韩，用于跨命名匹配（"Readme" ↔ "README"） */
  function navDockLabelKey(label) {
    return String(label || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
  }

  /**
   * 概览文件区块元素：id 以 -ov-file 结尾且与标签同前缀（readme ↔ readme-ov-file）。
   *
   * ⚠ 实测结论（2026-09-21，证据取自 GitHub 自身 bundle）：**正常情况下这个元素
   * 不存在**。`-ov-file` 是 OverviewRepoFiles 组件的 React 路由键（见
   * navDockHandleFileTabClick 的实证注释），只出现在 href/`aria-current`/`?tab=`
   * 三处，页面里没有元素带这个 id。此函数保留为**尽力而为的额外候选**：真要
   * 哪天 GitHub 把 id 挂上，定位会自动升级为"精确锚点"；挂不上也不影响主路径。
   */
  function navDockFindOvFileElement(key) {
    if (!key) return null;
    let found = null;
    document.querySelectorAll("[id]").forEach((el) => {
      if (found) return;
      const id = el.id || "";
      if (!NAV_DOCK_OV_FILE_ANCHOR_RE.test(id)) return;
      if (navDockLabelKey(id).startsWith(key)) found = el;
    });
    return found;
  }

  /**
   * 页面上 GitHub 自己的 `-ov-file` 锚点里，与该标签同名的那个 id。
   * 右侧 About→Resources 区即 `<a href="#readme-ov-file">Readme</a>` —— 这是
   * GitHub 自己的路由键（点击靠 hashchange 触发 tab 切换），比我们猜 slug 可靠。
   * 注意：它命中的是 **id 字符串**（`?tab=` / hash 的取值），不代表存在该 id 的
   * 元素 —— 取元素请一律走 `document.getElementById(...) || null` 的判空分支。
   */
  function navDockOvFileAnchorIdFor(key) {
    if (!key) return "";
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const id = (a.getAttribute("href") || "").slice(1);
      if (!id || !NAV_DOCK_OV_FILE_ANCHOR_RE.test(id)) continue;
      if (a.closest("#" + NAV_DOCK_ID)) continue;
      const t = navDockLabelKey(
        a.getAttribute("aria-label") || normalizedText(a) || ""
      );
      if (t && t === key) return id;
    }
    return "";
  }

  /**
   * 文件区里已渲染的概览文件正文块（README 等）。
   * 选择器取自真实 SSR 实证：`#repos-split-pane-content`（文件区内容容器，
   * id 稳定）+ `article.markdown-body.entry-content`（GitHub 渲染 markdown 的
   * 固定组合类）。hashed 模块类名（OverviewRepoFiles-module__Box_3__*）不入选择器
   * —— 构建哈希一变即失效。
   */
  function navDockOverviewArticleEl() {
    return document.querySelector(
      "#repos-split-pane-content article.markdown-body, " +
        "#repos-split-pane-content .markdown-body, " +
        "#repo-content-pjax-container article.markdown-body.entry-content"
    );
  }

  /**
   * 原锚点是否已被 React 接管：React 把 `__reactProps$…` / `__reactFiber$…`
   * 挂成 DOM 节点的**自有属性**，而 `cloneNode` 不复制自有属性 —— 这既是
   * "面板克隆点不动 React 客户端路由"的根因，也是这里唯一可靠的接管探针。
   * 未接管的 `href="#"` 锚点交还点击只会让浏览器跳到页首（fragment 为空），
   * 因此必须先探测再决定是否交还。
   */
  function navDockAnchorIsReactManaged(anchor) {
    if (!anchor) return false;
    try {
      return Object.keys(anchor).some((k) => k.startsWith("__react"));
    } catch (_) {
      return false;
    }
  }

  /**
   * 求条目的**页内目标元素**（能立即定位就不该重新加载页面）。
   *
   * 两个来源，**优先取已存在的元素**（顺序很关键：真实 SSR 下 GitHub 的
   * `-ov-file` 锚点只有 href、目标 id 从未渲染，若只看 id 就会把点击判成
   * "等渲染"，目标永远不会出现 → 点击变空操作）：
   *   A) GitHub 自己的 `-ov-file` 路由键对应的 id（`a[href="#xxx-ov-file"]`）
   *      所指元素 —— 实测该元素通常不存在，只留 id 供日志与"等渲染完再定位"；
   *   B) 该条目是文件区**当前选中**的概览文件 tab（`aria-current`）时，
   *      认领文件区里已渲染的 markdown 正文块。
   *      这一条正是 README 的处境：README 是默认选中的 tab，正文就在页面上，
   *      原实现却把 href 落成 `location.pathname`，点击等于"重载当前页"，
   *      滚动位置清零 ⇒ 表现为"点了 README 却没能立即定位到 README"。
   *      非选中 tab 的正文尚未换出，此函数**故意不认领**（否则会把 README 的
   *      正文当成 License 的目标），交由 navDockHandleFileTabClick 先切后定位。
   *
   * @returns {{id:string, el:Element|null}|null} 两者皆无时返回 null
   */
  function navDockInPageTarget(item) {
    if (!item) return null;
    const key = navDockLabelKey(item.label);
    if (!key) return null;

    const id = navDockOvFileAnchorIdFor(key);
    let el = id ? document.getElementById(id) : null;

    if (!el) {
      // 仅"当前选中"的概览文件 tab 才认领文件区正文块，否则会把 License 的
      // 正文当成 README 的目标
      const src = item.source;
      const selected =
        src instanceof HTMLAnchorElement &&
        (src.hasAttribute("aria-current") || src.hasAttribute("data-selected"));
      if (selected && isFileAreaTabLabel(item.label)) {
        el = navDockOverviewArticleEl();
      }
    }
    if (!id && !el) return null;
    return { id: id || "", el: el || null };
  }

  /**
   * 条目所属的栏。面板条目持有**原锚点**（item.source）且原锚点仍在文档里，
   * 向上找最近的 nav 最可靠；仅当原锚点缺失/已脱离文档时按 aria-label 回退。
   */
  function navDockOwningBar(src) {
    try {
      if (src && src.closest) {
        const bar = src.closest("nav");
        if (bar) return bar;
      }
    } catch (_) {
      /* ignore */
    }
    return document.querySelector('nav[aria-label="Repository files"]');
  }

  /** 栏内当前选中 tab 的归一标签键（栏内没有选中态时返回 ""） */
  function navDockBarSelectedKey(bar) {
    if (!bar) return "";
    const sel = bar.querySelector(
      'a[aria-current], a[data-selected], [aria-selected="true"]'
    );
    if (!sel) return "";
    return navDockLabelKey(
      sel.getAttribute("aria-label") || normalizedText(sel) || ""
    );
  }

  /**
   * 内容区根容器：仓库页内容主体（含文件列表与正文）。
   * `#repos-split-pane-content` 带 `tabindex="0"` + 同名 `data-selector`
   * —— GitHub 用它标记"键盘可滚区域"，即**它自己就是滚动容器**，因此定位它
   * 除了对齐外框，还得把它内部滚动一起归零（见 navDockScrollElementToTop）。
   */
  function navDockContentRootEl() {
    return (
      document.getElementById("repos-split-pane-content") ||
      document.getElementById("repo-content-pjax-container") ||
      document.querySelector("main") ||
      null
    );
  }

  /**
   * 当前 URL 是否停在某个**文件区概览 tab** 上（`?tab=readme-ov-file` /
   * `?tab=MIT-1-ov-file` / `?tab=contributing-ov-file` …）。
   *
   * `-ov-file` 是 React 路由键（见 navDockHandleFileTabClick 的实证注释），
   * 它出现在 URL 上就意味着"路径虽然是仓库首页，但正文停在某个概览文件"。
   * 此时点同页的 Code 不能只滚回顶部 —— 否则用户"点了 Code 还在看 License"。
   */
  function navDockHasFileTabParam() {
    try {
      const tab = new URLSearchParams(location.search).get("tab");
      return !!tab && /-ov-file$/i.test(tab);
    } catch (_) {
      return false;
    }
  }

  /**
   * 面板条目的落地路径是否**就是当前页**（已在 Code 页时点 Code、已在 Issues
   * 页时点 Issues）。这类条目原生点击 = 一次同 URL 导航：Turbo/React Router
   * 会重取并替换整块内容、再把滚动归零，用户感知就是"重载"。
   * 既然目标页就是本页，正确行为是**一次导航都不发**，只把内容滚回顶部。
   */
  function navDockIsSamePageHref(item) {
    const dest = (item && item.href) || "";
    if (!dest) return false;
    const norm = (p) => String(p || "").replace(/\/+$/, "") || "/";
    try {
      const u = new URL(dest, location.origin);
      if (u.origin !== location.origin) return false;
      return norm(u.pathname) === norm(location.pathname);
    } catch (_) {
      return norm(dest.split(/[?#]/)[0]) === norm(location.pathname);
    }
  }

  /**
   * 文件区 tab 的定位目标：真要存在的 `-ov-file` 元素（若有）→ 已渲染正文块
   * → 内容区根容器。三级都有兜底，任何一级命中都不会让点击变成空操作。
   */
  function navDockFileTabLocateTarget(item) {
    return (
      navDockFindOvFileElement(navDockLabelKey(item && item.label)) ||
      navDockOverviewArticleEl() ||
      navDockContentRootEl()
    );
  }

  /**
   * 文件区 tab 是否已切到我们点的那个：栏内 `aria-current` 迁移过去即完成。
   * 栏不可判（原锚点已脱离、找不到栏）时视作已完成 —— 不做无谓等待。
   */
  function navDockFileTabSwitched(bar, key) {
    if (!bar || !key) return true;
    return navDockBarSelectedKey(bar) === key;
  }

  // === 定位滚动引擎：显式分层 + 有界重定位 ===
  //
  // 用户反馈「Repositories 的三个导航每次定位都会发生下移而不是置顶」。
  // 原因是 `el.scrollIntoView()` 一把梭：它会把**所有**祖先滚动容器一并滚，
  // 而每层的偏移量按**同一份初始几何**一次性算完 —— GitHub 新版仓库页里
  // 内容区自己就是 overflow 容器（`#repos-split-pane-content` 带 tabindex，
  // 典型的"键盘可滚区域"），层数一多各层结果互相抵消，目标就停在视口偏下
  // 而非顶部。这里改为显式分层计算：内层容器先滚（扣掉容器内"已贴顶"的
  // 粘性子导航），窗口最后统一对齐（扣掉固定/粘性顶栏，并尊重站点自己的
  // scroll-padding-top）。定位后再有界重定位 ~1.2s，抵消注水 / 焦点还原 /
  // 粘性重排造成的二次滚动；一旦探测到用户自己在滚（滚轮/触摸/按键）立即
  // 收手，绝不跟用户抢滚动条。
  let navDockLocateToken = 0;
  let navDockLocateUserMoved = false;
  let navDockLocateWatchInstalled = false;
  /** 最近一次定位的实测值（供 locate 日志与 drift 日志复用） */
  let navDockLastLocateMeasure = null;

  /** 用户主动滚动探测：只装一次，passive 不拦默认行为 */
  function navDockInstallLocateWatch() {
    if (navDockLocateWatchInstalled) return;
    navDockLocateWatchInstalled = true;
    const mark = () => {
      navDockLocateUserMoved = true;
    };
    try {
      window.addEventListener("wheel", mark, { passive: true, capture: true });
      window.addEventListener("touchstart", mark, { passive: true, capture: true });
      window.addEventListener("keydown", mark, true);
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * 顶部让位：固定/粘性顶栏（GitHub 全局头部）的实测高度，
   * 与站点自身的 `scroll-padding-top` 取大者 —— 只有让位对了，
   * "置顶"才等于"内容首行可见"。
   */
  function navDockStickyTopOffset() {
    let off = 0;
    const cands = document.querySelectorAll(
      "header, [class*='js-header-wrapper'], [data-testid='repository-container-header']"
    );
    cands.forEach((el) => {
      let cs = null;
      try {
        cs = getComputedStyle(el);
      } catch (_) {
        return;
      }
      if (cs.position !== "fixed" && cs.position !== "sticky") return;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top <= 1 && r.bottom > 1) off = Math.max(off, r.bottom);
    });
    try {
      const sp = parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop || "0"
      );
      if (isFinite(sp) && sp > off) off = sp;
    } catch (_) {
      /* ignore */
    }
    return Math.round(off);
  }

  /**
   * 容器内让位：目标上方**当前已贴在该容器顶部**的粘性条（文件区 tabs 等）。
   * 不扣它，目标会被粘性条压住顶部；扣多了目标又不在顶部。
   */
  function navDockStickyOffsetWithin(container, el) {
    const cr = container.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    let off = 0;
    const cands = container.querySelectorAll(
      "nav, header, [style*='sticky'], [class*='sticky'], [class*='Sticky']"
    );
    cands.forEach((n) => {
      if (n === el || n.contains(el) || el.contains(n)) return;
      let cs = null;
      try {
        cs = getComputedStyle(n);
      } catch (_) {
        return;
      }
      if (cs.position !== "sticky" && cs.position !== "fixed") return;
      const r = n.getBoundingClientRect();
      if (r.height <= 0) return;
      if (r.top > cr.top + 12) return; // 尚未贴顶，不参与让位
      if (r.bottom > er.top + 4) return; // 位于目标之下，不遮挡
      off = Math.max(off, r.bottom - cr.top);
    });
    return Math.round(Math.max(0, off));
  }

  /** 目标的可滚动祖先（内层 → 外层；window 不在此列，单独处理） */
  function navDockScrollableAncestors(el) {
    const out = [];
    let n = el.parentElement;
    let guard = 0;
    while (n && n !== document.documentElement && guard++ < 40) {
      let cs = null;
      try {
        cs = getComputedStyle(n);
      } catch (_) {
        cs = null;
      }
      const oy = cs ? cs.overflowY || cs.overflow || "" : "";
      if (
        /^(auto|scroll|overlay)$/.test(oy) &&
        n.scrollHeight > n.clientHeight + 1
      ) {
        out.push(n);
      }
      n = n.parentElement;
    }
    return out;
  }

  /**
   * 直接写窗口滚动位置：显式 `behavior:"instant"`（`"auto"` 会跟随 CSS 的
   * `scroll-behavior: smooth`，动画中途被打断正是"停在下移位置"的常见成因），
   * 并在 scrollTo 被覆写/吃掉时用 scrollTop 兜底。
   */
  function navDockSetWindowScrollTop(top) {
    const x = typeof window.scrollX === "number" ? window.scrollX : 0;
    try {
      window.scrollTo({ top, left: x, behavior: "instant" });
    } catch (_) {
      try {
        window.scrollTo(x, top);
      } catch (__) {
        /* ignore */
      }
    }
    if (Math.abs((window.scrollY || 0) - top) > 2) {
      try {
        document.documentElement.scrollTop = top;
      } catch (_) {
        /* ignore */
      }
      try {
        if (document.body) document.body.scrollTop = top;
      } catch (_) {
        /* ignore */
      }
    }
  }

  /** 目标顶到视口顶部时，窗口应有的滚动位置（已扣让位并夹在可滚范围内） */
  function navDockTargetScrollTop(el, offset) {
    if (!el || !el.isConnected) return null;
    const off = typeof offset === "number" ? offset : navDockStickyTopOffset();
    const rect = el.getBoundingClientRect();
    const y = window.scrollY || 0;
    let top = Math.round(rect.top + y - off);
    const doc = document.documentElement;
    const max = Math.max(0, (doc.scrollHeight || 0) - (window.innerHeight || 0));
    if (top < 0) top = 0;
    if (max > 0 && top > max) top = max;
    return top;
  }

  /**
   * 分层滚动到目标：内层容器先各滚各的，目标自身若也是滚动容器则内部归零，
   * 窗口最后统一对齐。
   * @returns 实测值 {offset, top, y, elTop, inner, self}（供日志与断言）
   */
  function navDockScrollElementToTop(el) {
    if (!el || !el.isConnected) return null;
    const inner = navDockScrollableAncestors(el);
    for (const c of inner) {
      const cr = c.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const off = navDockStickyOffsetWithin(c, el);
      const delta = Math.round(er.top - cr.top - off);
      if (delta !== 0) {
        try {
          c.scrollTop = c.scrollTop + delta;
        } catch (_) {
          /* ignore */
        }
      }
    }
    // 目标自身就是滚动容器（如内容区 #repos-split-pane-content）：只对齐外框
    // 是不够的 —— 它内部还停在半路，"回到内容顶部"就落了空。归零它自己的
    // scrollTop，语义即"从该元素的开头显示"。
    let selfReset = false;
    try {
      if (el.scrollHeight > el.clientHeight + 1 && el.scrollTop !== 0) {
        el.scrollTop = 0;
        selfReset = true;
      }
    } catch (_) {
      /* ignore */
    }
    const offset = navDockStickyTopOffset();
    const top = navDockTargetScrollTop(el, offset);
    if (top != null) navDockSetWindowScrollTop(top);
    return {
      offset,
      top: top == null ? -1 : top,
      y: Math.round(window.scrollY || 0),
      elTop: Math.round(el.getBoundingClientRect().top),
      inner: inner.length,
      self: selfReset,
    };
  }

  /**
   * 定位后的有界重定位：目标被注水 / 焦点还原 / 粘性重排挪走时拉回顶部。
   * 只在"用户没自己滚、目标还在文档里、且确实偏了 >2px"时才动。
   */
  function navDockStartLocateReassert(el, token) {
    const deadline = Date.now() + 1200;
    let frames = 0;
    const step = () => {
      if (token !== navDockLocateToken) return; // 已有更新的定位，让位
      if (navDockLocateUserMoved) return; // 用户接管滚动，立即收手
      if (!el.isConnected) return;
      if (Date.now() > deadline) {
        const m = navDockLastLocateMeasure;
        if (m && m.reassert) {
          console.info(
            `[MGGA] nav dock: locate re-asserted ${m.reassert}x ` +
              `(top=${m.top} y=${m.y} off=${m.offset}) — 定位后被别的滚动挪走过`
          );
        }
        return;
      }
      if (++frames % 3 === 0) {
        const want = navDockTargetScrollTop(el, navDockStickyTopOffset());
        if (want != null && Math.abs((window.scrollY || 0) - want) > 2) {
          navDockScrollElementToTop(el);
          if (navDockLastLocateMeasure) {
            navDockLastLocateMeasure.reassert =
              (navDockLastLocateMeasure.reassert || 0) + 1;
          }
        }
      }
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(step);
      else setTimeout(step, 64);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(step);
    else setTimeout(step, 64);
  }

  /**
   * 立即定位（瞬时跳转，不带动画）：要求"立即"，故不用平滑滚动。
   * 同时把"收割滚动回弹"压制一小段时间 —— unlockPageScrollForHarvest 的
   * 1.5s 宽限期回弹只认 snapY，会把用户主动定位的滚动拉回去。
   * @returns 实测值（见 navDockScrollElementToTop），未定位时返回 null
   */
  function navDockScrollToTarget(el) {
    if (!el || !el.isConnected) return null;
    navDockInstallLocateWatch();
    navDockLocateUserMoved = false;
    const token = ++navDockLocateToken;
    navDockScrollRebounceSuppressUntil = Date.now() + 2000;
    const m = navDockScrollElementToTop(el);
    navDockLastLocateMeasure = m;
    navDockStartLocateReassert(el, token);
    return m;
  }

  /**
   * 有界轮询等待目标出现（AJAX 内容渲染完成后）再定位。
   * @param findEl   返回目标元素（或 null）的取值函数
   * @param timeoutMs 等待上限
   * @param onTimeout 超时仍未命中时的回调（用于"交还点击后什么也没发生"的兜底）
   */
  function navDockScrollWhenReady(findEl, timeoutMs, onTimeout) {
    const deadline = Date.now() + (timeoutMs || 1500);
    const tick = () => {
      let el = null;
      try {
        el = findEl();
      } catch (_) {
        /* ignore */
      }
      if (el) {
        navDockScrollToTarget(el);
        return;
      }
      if (Date.now() > deadline) {
        if (typeof onTimeout === "function") {
          try {
            onTimeout();
          } catch (_) {
            /* ignore */
          }
        }
        return;
      }
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick);
      else setTimeout(tick, 64);
    };
    tick();
  }

  /**
   * 定位决策日志：与 logNavDockClickDecision 同源，点击即自证走了哪条路。
   * 带上实测滚动值（top=目标应有滚动位置 / y=实际 / off=顶部让位 /
   * elTop=定位后目标视口坐标 / inner=参与滚动的内层容器数），
   * 让"没置顶""被挪走"这类现象在日志里可判读，不必靠猜。
   * @param m 实测值；传 null 表示本次没有定位（如 pass-through）；不传取最近一次
   */
  function logNavDockLocate(item, path, id, m) {
    const mm = m === undefined ? navDockLastLocateMeasure : m;
    const extra = mm
      ? ` top=${mm.top} y=${mm.y} off=${mm.offset} elTop=${mm.elTop} inner=${mm.inner}` +
        (mm.self ? " self=0" : "")
      : "";
    console.info(
      `[MGGA] nav dock: locate "${String((item && item.label) || "").slice(
        0,
        24
      )}" via=${path}${id ? ' id="' + id + '"' : ""}${extra} href="${String(
        (item && item.href) || ""
      ).slice(0, 60)}"`
    );
  }

  /**
   * 文件区概览 tab 点击（README / Contributing / License / Code of conduct…）：
   * 先立即吸顶一次，再等"选中态迁移"（＝切换完成）后对新正文重新对齐一次。
   *
   * 为什么 README 一直是对的、其余 tab 会"下移一段距离"：
   * README 是默认选中项，正文已在页面上 ⇒ 走路径 2 直接定位；其余 tab 要点击
   * 后才换出正文，而旧版判断"切换完成"的依据是
   * `getElementById("<tab>-ov-file")` —— 那个 id **从来不是元素 id**。
   *
   * 实证（取自 GitHub 自己的 bundle，本仓库 `.workbuddy/probe/code-view.js`）：
   * `-ov-file` 是 OverviewRepoFiles 组件的 **React 路由键**，全库只出现在三处 ——
   *   ① 侧栏 / 移动菜单的 `href="#contributing-ov-file"`（靠 hashchange 触发路由）
   *   ② nav 项的 `aria-current` 比较值（`"readme-ov-file"===ep?"page":void 0`）
   *   ③ `?tab=<id>` 查询参数（`setSearchParams({tab:id},{replace:true,
   *      preventScrollReset:true})`）
   * 组件把"切 tab"实现为 query 参数变更 + 禁止滚动重置，页面里**没有任何元素
   * 带这个 id**。因此旧版必然等满 1500ms 超时、从不定位 ⇒ tab 切了、页面没动，
   * 看上去就是"点 Contributing/License 只下移一段距离"。
   *
   * 现在：完成信号改为**选中态迁移**（栏内 `aria-current` 落到被点的 tab），
   * 目标改为**已渲染的正文块**（退内容区根容器）。先立即吸顶是为了慢网络下
   * 也有即时反馈，切换完成后补一次对齐把最终落点钉住。
   * @returns 恒为 true（已接管）
   */
  function navDockHandleFileTabClick(event, anchor, item, srcAnchor, canDelegate) {
    event.preventDefault();
    const bar = navDockOwningBar(srcAnchor);
    const key = navDockLabelKey(item && item.label);
    const dest = (item && item.href) || "";
    const hrefAtClick = location.href;
    const locate = () => navDockScrollToTarget(navDockFileTabLocateTarget(item));

    if (canDelegate && srcAnchor && srcAnchor.isConnected) {
      try {
        srcAnchor.click();
      } catch (_) {
        /* ignore */
      }
    }
    locate(); // 立即对齐一次：切换还在等路由数据时，用户已先落在文件区顶部

    const deadline = Date.now() + 1800;
    const tick = () => {
      if (navDockFileTabSwitched(bar, key)) {
        locate(); // 切换完成 → 对新正文重新对齐
        logNavDockLocate(item, "file-tab", "", navDockLastLocateMeasure);
        return;
      }
      if (Date.now() > deadline) {
        // 切换始终没发生（未注水，React 没接住这次点击）→ 回放一次**面板锚点
        // 自身**：它带真实 href，交 Turbo 软导航，仍然不是整页重载。
        // 已接管时不回放，避免与 React 的路由撞车（双重导航）。
        if (
          !canDelegate &&
          dest &&
          dest !== location.pathname &&
          location.href === hrefAtClick &&
          anchor &&
          anchor.isConnected
        ) {
          try {
            anchor.setAttribute("data-mgga-replay", "1");
            anchor.click();
            anchor.removeAttribute("data-mgga-replay");
          } catch (_) {
            /* ignore */
          }
        }
        logNavDockLocate(
          item,
          canDelegate ? "file-tab-await" : "await-render",
          "",
          navDockLastLocateMeasure
        );
        return;
      }
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick);
      else setTimeout(tick, 64);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick);
    else setTimeout(tick, 64);
    return true;
  }

  /**
   * dock 条目点击分诊：**能页内定位就绝不导航；目标就是本页就连一次导航都不发；
   * 需要导航时只走 GitHub 自己的软导航，绝不自己 location.assign（＝整页重载）。**
   *
   * 分诊路径：
   *   1) 修饰键 / 非主键 / target=_blank → 不接管，交还浏览器原生（新标签页等）；
   *   2) 页内目标已在 DOM（已渲染正文块 / `-ov-file` 元素若真存在）
   *      → 接管，立即定位（不导航、不重载）。README 走此路：它是默认选中 tab，
   *      正文本来就在页面上；
   *   3) 文件区概览 tab 且原锚点是 `href="#"` 占位 → 接管，切换后对新正文吸顶
   *      （见 navDockHandleFileTabClick）。覆盖 Contributing / License /
   *      Code of conduct 等"要点一下才换出正文"的 tab。**路径 3 不套用外露探测**：
   *      这些 tab 的落地路径是反推来的，被收纳时放行会踩到兜底的错文件名
   *      （真机实测整页重载）—— 原因见该分支内侧注释；
   *   4) 落地路径就是当前页（Code / Issues…）→ 按**页面外露探测**二选一：
   *      · 页面上这一项**外露**（没被收纳进 More）⇒ 接管，直接定位到**它自身**，
   *        **一次导航都不发**（`via=page-item`）。原生同 URL 导航会重取整块内容
   *        + 滚动归零，那正是用户口中的"重载"；
   *      · 页面上这一项**已被收纳进 More** ⇒ 页面上没有可见落点，不做任何定位，
   *        放行这次点击让真实导航走完（`via=page-item-hidden`）。
   *      **例外**（优先于上面的探测）：当前 URL 带 `?tab=<x>-ov-file`（正文停在
   *      某个概览文件上）时一律放行，让这次点击作为真实导航走完，由**页面自己
   *      那层文档级拦截**把它做成软导航、顺带把参数清成规范路径
   *      （`via=same-page-cleartab`，见 navDockHasFileTabParam）—— 不这么做，
   *      用户会"点了 Code 却还看着 License"；
   *   5) 其余（真实 URL 的社区文件链接、跨页 tab）→ **不接管**：面板锚点自身
   *      就是真实 href，Turbo / React Router 的全局拦截器会接管它做软导航，
   *      比我们替换更保真。
   *
   * 反例一（上一轮）：等不到目标时执行 `location.assign(item.href)` —— 那是
   * **整页重载**。用户实测「点 LICENSE 会跳到 /blob/develop/LICENSE」就是它干的：
   * 面板 href 由 resolveFileAreaTabHref 解析而来，恰好等于该 URL。
   * 反例二（本轮）：把 `-ov-file` 当作元素 id 来等待（见
   * navDockHandleFileTabClick 的实证注释）⇒ 必然超时 ⇒ 切了 tab 却从不定位。
   *
   * 静态回归闸：本函数体内不得出现 `location.assign/replace`（冒烟测试直接断言）。
   * @returns 是否已接管本次点击（true 表示调用方无需再处理）
   */
  function handleNavDockItemClick(event, anchor, item) {
    if (!event || event.defaultPrevented) return false;
    if (event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return false;
    if (!item) return false;
    // 回放点击（见路径 3/5 的兜底）不再拦截，否则会自己吞掉自己
    if (anchor && anchor.hasAttribute("data-mgga-replay")) return false;

    const src = item.source;
    const srcAnchor = src instanceof HTMLAnchorElement ? src : null;
    if (srcAnchor) {
      const tgt = (srcAnchor.getAttribute("target") || "").toLowerCase();
      if (tgt && tgt !== "_self") return false;
    }

    const hit = navDockInPageTarget(item);
    // 占位 tab：源锚点 href="#" 的 React 客户端路由项（README/License/…）
    const placeholderTab =
      !!srcAnchor && srcAnchor.getAttribute("href") === "#";
    const canDelegate =
      !!srcAnchor &&
      srcAnchor.isConnected &&
      navDockAnchorIsReactManaged(srcAnchor);

    // 路径 2：页内目标已渲染 → 直接定位，连导航都不需要
    if (hit && hit.el) {
      event.preventDefault();
      logNavDockLocate(item, "in-page", hit.id, navDockScrollToTarget(hit.el));
      return true;
    }

    // 页面可见性探测：该条目在页面上**外露**，还是已被 GitHub **收纳进 More**。
    // 这是本轮新增的探测层，也是下面两条分诊规则的依据 ——
    //   外露 ⇒ 页面上的入口就在用户眼前，直接定位到它，一次导航都不发；
    //   收进 More ⇒ 页面上没有可见入口，定位无处可落，放行这次点击让真实
    //   （Turbo / React 软）导航走完，不再做任何定位。
    const vis = navDockSourceVisibility(item);

    // 路径 3：文件区概览 tab 的占位锚点 → 切换 tab 后对新正文吸顶
    // （见 navDockHandleFileTabClick）。覆盖 Contributing / License /
    // Code of conduct 等"要点一下才换出正文"的 tab。
    //
    // ⚠ 这里**故意不套用**"被收纳进 More 就放行导航"那条规则（路径 4 用）：
    // 这些 tab 的落地路径是 resolveFileAreaTabHref 从页面证据**反推**的，反推
    // 失败时是兜底猜的文件名（`/blob/HEAD/license`）—— 而 vscode 的真实文件叫
    // `LICENSE.txt`。真机实测（400px，`MIT license` 被折进 More 时放行）落到
    // 不存在的路径、被 301 成**整页重载**（docId 变化），比原行为明显更差。
    // 切 tab 走的是 React 客户端路由、不依赖那个 href，所以这里维持原路径。
    if (isFileAreaTabLabel(item.label) && placeholderTab) {
      return navDockHandleFileTabClick(event, anchor, item, srcAnchor, canDelegate);
    }

    // 路径 4：落地路径就是当前页（Code / Issues…）→ 按页面外露探测二分诊：
    // 页面上这一项还在且外露 ⇒ 定位到它自身；已被收纳进 More ⇒ 不定位、放行导航
    if (navDockIsSamePageHref(item)) {
      // 例外（优先于外露探测）：当前 URL 带 `?tab=<x>-ov-file` 时，"同页"只是
      // **路径**相同 —— 正文其实停在某个概览文件上（License / Contributing / …），
      // 定位到页面上的 Code tab 会让用户"点了 Code 却还看着 License"。此时
      // **不接管**，让这次点击作为一次真实导航走完，把参数清成规范路径。
      //
      // 谁来完成这次导航：**页面自己**。实测（真机点击取证）面板锚点被点中时
      // `defaultPrevented` 已经是 true，而我们这条分支并没有 preventDefault ——
      // 说明有一层文档级的拦截器接住了它：面板锚点是**页面锚点的克隆**，
      // cloneNode 只带属性，React Router 靠属性认领（`data-discover`），
      // 于是它把这次点击当自己的软导航处理（URL 采样序列一步直达
      // `/iina/iina`，docId 不变）。所以这里唯一正确的动作就是**别跟它抢**。
      //
      // 试过一版"自己 preventDefault + 把导航委派给 item.source 的源锚点"
      // （复用路径 3 的做法），已被回退：真机上 item.source 不带 `__react*`
      // 自有键 ⇒ canDelegate 恒为 false，那一段从未执行过（只在 jsdom 夹具里
      // 手工盖章才跑得动），属于既无收益、又多带一次合成导航的死代码。
      if (!navDockHasFileTabParam()) {
        // 页面上这一项还在、且外露 ⇒ 直接定位到**它自身**，不导航、不重载
        if (vis.state === "exposed") {
          event.preventDefault();
          logNavDockLocate(
            item,
            "page-item",
            "",
            navDockScrollToTarget(vis.el)
          );
          return true;
        }
        // 已被收纳进 More（页面上没有可见入口）⇒ 不再定位，放行这次点击
        // 让它作为一次真实导航走完
        logNavDockLocate(item, "page-item-hidden", "", null);
        return false;
      }
      logNavDockLocate(item, "same-page-cleartab", "", null);
      return false;
    }

    // 路径 5：其余 → 不接管，交还 Turbo / React Router 的全局软导航。
    // （只在需要时才顺手等目标出现，不改 URL、不吞点击）
    const narrowFinder = () => {
      if (hit && hit.id) {
        const el = document.getElementById(hit.id);
        if (el) return el;
      }
      return navDockFindOvFileElement(navDockLabelKey(item.label));
    };
    navDockScrollWhenReady(narrowFinder, 1500, null);
    logNavDockLocate(item, "pass-through", (hit && hit.id) || "", null);
    return false;
  }

  /** 给面板条目挂上分诊点击（克隆节点与手工回退节点共用） */
  function attachNavDockItemClick(anchor, item) {
    if (!anchor || !item) return anchor;
    anchor.addEventListener("click", (e) => {
      handleNavDockItemClick(e, anchor, item);
    });
    return anchor;
  }

  /** 导航条形栏的稳定缓存键：aria-label + 类名前缀 */
  function navBarKey(bar) {
    if (!bar) return "";
    const aria = bar.getAttribute("aria-label") || "";
    const cls = String(bar.className || "").slice(0, 100);
    return aria + "|" + cls;
  }

  /**
   * 面包屑/上下文档的 aria-label 特征（登录态头部 AppHeader 的
   * `nav[aria-label="Breadcrumbs"]` 即此类）。
   * 这类栏的锚点全是 owner / owner-repo 链接，会被取数链整体当作面包屑剔除，
   * 因此它的"零点击可得项"**恒为 0** —— 若让它留在点击闸门里，闸门会永远
   * 为它放行，每会话必然点开它的图标按钮（仓库选择器 picker），把 picker 里
   * 的链接当导航项塞进面板（2026-09-20 起反复实证的重复/垃圾项来源，
   * 见 docs/fix-2026-09-20-dock-duplicate-tabs.md）。
   */
  const NAV_DOCK_CONTEXT_BAR_LABEL_RE = /breadcrumb|面包屑|当前位置/i;

  /**
   * 该栏是否属于 dock 的索引范围：排除页脚、全局 Marketing 头部
   * （未登录首页大菜单，不是仓库导航）与面包屑/上下文档（见上）。
   * 供 collectRepoHomeNavItems 索引与点击闸门**共用** —— 非 dock 栏既不索引
   * 也不允许点击，避免闸门因"该栏没有 zeroClick 计数"而漏放触发器。
   */
  function isDockEligibleBar(bar) {
    if (!bar) return false;
    if (bar.closest("footer")) return false;
    const aria = (bar.getAttribute("aria-label") || "").trim();
    const lower = aria.toLowerCase();
    if (lower === "global" || lower === "footer") return false;
    if (NAV_DOCK_CONTEXT_BAR_LABEL_RE.test(aria)) return false;
    return true;
  }

  /** 视口宽度分桶（100px 一桶）：桌面切移动端调试时桶变化触发重收割 */
  function navDockViewportBucket() {
    return Math.round(window.innerWidth / 100);
  }

  // === 仓库侧栏区块（PaneWrapper 内的 borderGrid）===
  //
  // 侧栏区块**不是 `<nav>`**：实测四个视口场景下 `nav` 恒为 4 个
  // （Global / Repository / Repository files / Footer），PaneWrapper 内 nav 数 = 0。
  // 因此 findRepoHomeNavBars() 永远收不到它们，必须单独取数 —— 这是设计内的
  // 空缺，不是缺陷（见 docs/fixes/2026-09-22-sidebar-pane-dom-evidence.md）。
  //
  // 结构（真实 DOM，2026-09-22 三仓库 iina/vscode/kubernetes 逐字一致）：
  //   #repos-split-pane-content … div[class*="borderGrid"]
  //     └ div[class*="sidebarSection"]                     ← 一个区块
  //         └ h2[data-component="Heading"]
  //             ├ span[class*="headingLinkWrapper"]        ← 标题是链接的区块
  //             │   ├ a[data-component="Link"][href="/o/r/releases"]
  //             │   ├ span[data-component="CounterLabel"]53
  //             │   └ span[class*="VisuallyHidden"]"(53)"  ← 读屏副本
  //             └ 纯文本 span（About / Sponsor this project / Languages）
  //
  // 选择器只用 [class*=] 前缀与 data-component（GitHub 设计系统的稳定标记），
  // 不用带构建哈希的完整模块类名（`SidebarSection-module__sectionHeading__TG36m`
  // 那类 —— 哈希一变即失效）。

  /** 侧栏 borderGrid：PaneWrapper 内唯一挂 borderGrid 的那层 */
  function repoHomeSidebarGrid() {
    const scope = document.getElementById("repos-split-pane-content") || document;
    return (
      scope.querySelector("[class*='borderGrid']") ||
      document.querySelector("[class*='PageLayout-PaneWrapper'] [class*='borderGrid']") ||
      null
    );
  }

  /** 区块标题的纯名（剥掉计数徽章与读屏副本）："Releases53 (53)" → "Releases" */
  function repoHomeSidebarHeadingLabel(h2) {
    if (!h2) return "";
    const clone = h2.cloneNode(true);
    clone
      .querySelectorAll("[data-component='CounterLabel'], [class*='VisuallyHidden']")
      .forEach((el) => el.remove());
    return normalizedText(clone);
  }

  /**
   * 侧栏区块 → dock 条目（一个区块一条主链接）的解析。
   *
   * 主链接优先级：
   *  ① 标题内的 `<a href>` —— Releases / Contributors / Used by / Deployments /
   *     Packages：GitHub 把这几类区块的标题本身做成了链接；
   *  ② 区块内 `a[href^="/sponsors/"]` —— "Sponsor this project" 没有标题链接，
   *     但它必然含一条指向出资页的链接（`/sponsors/<owner>`，注意要带尾斜杠，
   *     才能把页脚的 `/sponsors` 这种"了解更多"排除在外）；
   *  ③ 区块内 `a[href*="/search?l="]` —— "Languages" 也没有标题链接，取占比
   *     最高的那个语言。
   *
   * 三级都落空 ⇒ **跳过该区块**。About 走的正是这条路：它的可导航内容
   * （Readme / License / Contributing）已由文件区 tab 覆盖，而 Activity /
   * Custom properties / forks 不是"区块主链接"，硬塞进来只会让面板语义变浑。
   *
   * @returns [{href, label, counter}] counter 为无则空串
   */
  function repoHomeSidebarSectionEntries() {
    const grid = repoHomeSidebarGrid();
    if (!grid) return [];
    const out = [];
    Array.from(grid.children).forEach((section) => {
      const h2 = section.querySelector("h2");
      if (!h2) return;
      let href = "";
      const headingLink = h2.querySelector("a[href]");
      if (headingLink) {
        href = headingLink.getAttribute("href") || "";
      } else {
        const sponsorLink = section.querySelector('a[href^="/sponsors/"]');
        const langLink = section.querySelector('a[href*="/search?l="]');
        href =
          (sponsorLink && sponsorLink.getAttribute("href")) ||
          (langLink && langLink.getAttribute("href")) ||
          "";
      }
      // `#...-ov-file` 是 React 路由键（不是元素 id，也不该由侧栏重复提供）
      if (!href || href.startsWith("#")) return;
      // 同源校验：仓库官网、ko-fi / liberapay 这类站外链接不进面板
      try {
        if (new URL(href, location.origin).origin !== location.origin) return;
      } catch (_) {
        return;
      }
      const label = repoHomeSidebarHeadingLabel(h2);
      if (!label) return;
      const counterEl = h2.querySelector("[data-component='CounterLabel']");
      const counter = counterEl ? (counterEl.textContent || "").trim() : "";
      out.push({ href, label, counter });
    });
    return out;
  }

  /**
   * 该锚点是否是「被剪裁的导航项」—— Primer UnderlineNav 用来标记
   * "当前放不下、已折进 More" 的 tab。
   *
   * 事实（@primer/react 38.40 `UnderlineNavItem` 源码；组件类名与本地留档
   * SSR 逐字一致：`prc-UnderlineNav-UnderlineNavItem-*` / `ItemsList-oj8gN` /
   * `MoreButtonContainer-*` / `data-overflow-mode="wrap"`）：
   *
   *   const isOverflowing = useIsClipped(ref);            // IntersectionObserver
   *   <li aria-hidden={isOverflowing || undefined}>        // ← 溢出即整项 aria-hidden
   *     <a href={href} tabIndex={isOverflowing ? -1 : undefined}>
   *
   * 即：**溢出项本体仍在 DOM 里、href 完整**，只是所在 `<li>` 被标 aria-hidden；
   * More 菜单（`ActionMenu.Overlay`，运行时 id 形如 `_R_1afl_`）只在展开时才渲染，
   * 菜单里那几份是同一批项的**副本**，不是唯一来源。剪裁由 CSS 完成
   * （`--UnderlineNav_moreButton-display` 由 `data-has-overflow` 切换、
   * 单行 `overflow` 容器 + IntersectionObserver 判定）。
   *
   * 所以「`[aria-hidden="true"]` 祖先一律不索引」这条规则会误杀它们：
   * 移动端**首帧就在窄视口初始化**时，放不下的 tab 早已全部 aria-hidden
   * ⇒ 面板只剩外显的一两个（"收纳进 More 的项丢失"）；而桌面首帧再缩小
   * 之所以看似正常，是因为廉价签名只统计 href、结构未变就不重建面板，
   * 早先收到的那批侥幸留着 —— 一旦别的原因触发重建同样会掉。
   *
   * 判据三重收紧，只放行「单个导航项容器」，装饰/重复包装层照旧剔除：
   *   ① 最近的 aria-hidden="true" 祖先是 `<li>`（项容器，不是包装 div/ul）；
   *   ② 该容器内 `a[href]` 恰好 1 个；
   *   ③ 那个锚点就是本锚点。
   * 类名带构建哈希（`-syRjR`）不可依赖，故只用结构与 href 判定。
   * 放行后仍走 pushItem 的同名 / 同目的地去重链，重复项不会因此泄漏。
   *
   * @param a               待判定锚点
   * @param ariaHiddenHolder 调用方已算好的 `a.closest('[aria-hidden="true"]')`
   */
  function isClippedNavItemAnchor(a, ariaHiddenHolder) {
    const holder = ariaHiddenHolder || a.closest('[aria-hidden="true"]');
    if (!holder || holder.tagName !== "LI") return false;
    const anchors = holder.querySelectorAll("a[href]");
    return anchors.length === 1 && anchors[0] === a;
  }

  /**
   * 锚点最近的**水平可剪裁祖先**（Primer 把放不下的 tab 用单行 overflow
   * 容器裁掉，`--UnderlineNav_moreButton-display` 由 `data-has-overflow` 切换）。
   * 只认 `overflow-x` 为 hidden/clip 的祖先，且**越不过自己的 nav** ——
   * 页面级滚动容器（`#repos-split-pane-content`，overflow-y:auto）不算剪裁，
   * 那只是内容滚出视口，不改变"这个入口在不在栏里"。
   */
  function navDockClippingAncestor(a) {
    let el = a.parentElement;
    let depth = 0;
    while (el && depth++ < 8) {
      if (el.tagName === "NAV" || el.tagName === "BODY") return null;
      let cs = null;
      try {
        cs = window.getComputedStyle(el);
      } catch (_) {
        return null;
      }
      if (cs && (cs.overflowX === "hidden" || cs.overflowX === "clip")) return el;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * 条目源锚点在**页面上的可见性分类**（分诊 + 日志共用）：
   *
   *   "detached" 源锚点不在文档里 / 该条目根本没有源锚点（仓库侧栏来源）
   *   "gone"     源锚点在文档里，但被 `[hidden]` 或 CSS（display/visibility/
   *              opacity）藏起来
   *   "more"     已被 GitHub **收纳进 More**：Primer 的剪裁标记
   *              （`<li aria-hidden="true">` 内唯一锚点）或几何上被单行
   *              overflow 容器裁到栏外
   *   "exposed"  **外露可见** —— 页面上的这个入口用户看得见
   *
   * 为什么几何判据要加 `cr.width && ar.width` 这道门：没有排版层时（jsdom、
   * 元素 display:none）两侧 rect 都是 0，此时"无交集"是假象而非剪裁证据，
   * 必须跳过、交给上面的属性与样式判据。
   *
   * @returns {{state:string, el:Element|null}}
   */
  function navDockSourceVisibility(item) {
    const src = item && item.source;
    if (!(src instanceof HTMLAnchorElement) || !src.isConnected) {
      return { state: "detached", el: null };
    }
    // ① Primer 剪裁标记：折进 More 的项，本体仍在 DOM 里
    if (isClippedNavItemAnchor(src)) return { state: "more", el: src };
    // ② 显式 hidden（溢出副本 li[data-menu-item][hidden] 等）
    if (src.closest("[hidden]")) return { state: "gone", el: src };
    // ③ 计算样式：display / visibility / opacity 三件套
    let cs = null;
    try {
      cs = window.getComputedStyle(src);
    } catch (_) {
      /* ignore */
    }
    if (cs) {
      if (cs.display === "none" || cs.visibility === "hidden") {
        return { state: "gone", el: src };
      }
      const op = parseFloat(cs.opacity);
      if (isFinite(op) && op === 0) return { state: "gone", el: src };
    }
    // ④ 几何剪裁：被单行 overflow 容器裁到栏外（aria-hidden 只是伴生标记）
    const clip = navDockClippingAncestor(src);
    if (clip) {
      const cr = clip.getBoundingClientRect();
      const ar = src.getBoundingClientRect();
      if (cr.width && ar.width && !(ar.right > cr.left && ar.left < cr.right)) {
        return { state: "more", el: src };
      }
    }
    return { state: "exposed", el: src };
  }

  /** 便捷判据：条目在页面上是否外露（`navDockSourceVisibility` 的布尔形式） */
  function navDockSourceExposed(item) {
    return navDockSourceVisibility(item).state === "exposed";
  }

  /**
   * 合并各栏导航项为 dock 数据源。
   *
   * 每栏的取数顺序：直扫锚点 → 预渲染溢出副本（readPrerenderedBarItems）
   * → 点击收割产物（harvestedByBar，兜底，通常为空）。三条来源都经同一
   * pushItem 去重链，按标签归一 + 目的地归一双保险。
   *
   * 另有一条**不依赖 nav 的独立来源**：仓库侧栏区块
   * （repoHomeSidebarSectionEntries，一个区块一条主链接）。它不是 `<nav>`，
   * 上面这个 navList 循环永远收不到，所以在循环之后单独追加，并同样经
   * pushItem 去重（`barKey="repo-sidebar"` 让它与仓库 tab 之间有一条分割线）。
   *
   * @param navList        导航栏元素数组
   * @param harvestedByBar 点击收割产物（barKey → items），兜底用，可为 null
   * @param statsOut       可选出参：
   *                       - zeroClickItems: Map<barKey, count> 每栏"零点击即可
   *                         取到"的项数。buildNavDock 用它作为点击闸门 —— 本栏
   *                         只要 >0 就永不进入点击流程。
   *                       - barBuckets: Map<Element, buckets> 每栏直扫的逐条
   *                         过滤分桶（kept/hidden/ariaHidden/breadcrumb/…）。
   *                         闸门用它识别"纯面包屑栏"（锚点全被剔除且触发器
   *                         无可访问名 ⇒ 点了只会拿到 picker 链接），并作为
   *                         点击决策日志的证据链。
   */
  function collectRepoHomeNavItems(navList, harvestedByBar, statsOut) {
    const items = [];
    const seen = new Set();
    /** 规范化标签 → 已收录 href(跨栏同名去重) */
    const seenDest = new Map();
    /** 归一目的地路径 → 已收录(跨栏别名去重) */
    const seenDestByPath = new Map();
    // React 客户端路由 tab（如文件区 README）的 href 为 "#"，
    // 但带 aria-current 选中态，是真实导航项；落地到当前页路径
    const pushItem = (href, label, source) => {
      if (!href || href.startsWith("javascript:")) return;
      const selectedAnchor =
        source instanceof HTMLAnchorElement &&
        (source.hasAttribute("aria-current") || source.hasAttribute("data-selected"));
      if (href === "#" && !selectedAnchor) {
        // 文件区白名单 tab（License/Contributing 等）：React 客户端路由占位，
        // 按页面证据解析真实路径；解析失败仍丢弃
        if (
          source instanceof HTMLAnchorElement &&
          isFileAreaPlaceholderTab(source)
        ) {
          const resolved = resolveFileAreaPlaceholderTabHref(
            source,
            source.getAttribute("aria-label") || navDockAnchorLabel(source) || ""
          );
          if (resolved) {
            href = resolved;
          } else {
            return;
          }
        } else {
          return;
        }
      }
      if (href === "#" && selectedAnchor) {
        href = location.pathname;
      }
      if (!label) return;
      label = String(label).replace(/\s+/g, " ").trim();
      if (!label || isMoreLabel(label)) return;
      // 同名 tab 跨栏去重：新版 React 标签条与旧版 UnderlineNav 并存
      // （aria-label 均可为 "Repository"），同一 tab 的 href 形态不同
      // （React 路由条落地到当前路径/片段，旧条为真实路径），精确
      // href|label 键无法命中。规则：规范化标签（去计数后缀、小写）
      // 相同 → 视作同一 tab，先到先得（canonical 可见 tab 先索引），
      // 无论 href 形态如何（登录态双条曾以未知 href 形态漏过目的地
      // 等价判定）。面板仍显示原始标签。
      // 规范化标签：去尾部计数后缀（兼容 "Issues 1834" / "Issues 1.8k" /
      // 无空格拼接的 "Issues1.8k" / 旧式括号 "Issues (18)"），再小写。
      // GitHub DOM 里图标/文字/计数器之间常无空白字符，且新旧条计数格式
      // 不同（1.8k vs 1834），必须统一剥掉才能命中同名去重。
      const normLabel = String(label)
        .replace(/[\s\u00a0]*\(?[\d][\d.,]*[kmb]?\)?[\s\u00a0]*$/i, "")
        .trim()
        .toLowerCase();
      if (seenDest.has(normLabel)) return;
      seenDest.set(normLabel, href);
      // 目的地去重（别名拦截）：GitHub 新旧导航对同一 tab 使用不同名称
      // （旧条 "Security" vs 新条 "Security and quality"），按标签去重
      // 永远拦不住；同一真实路径只保留首个入口，与标签去重双保险。
      // URL 解析归一：More 菜单收割可能拿到绝对 URL，与直扫的相对路径
      // 必须归到同一键；跨源或不可解析则保留原始形态（不同源不合并）。
      const destOf = (raw) => {
        try {
          const u = new URL(raw, location.origin);
          if (u.origin !== location.origin) return null;
          return (u.pathname.replace(/\/+$/, "") || "/").toLowerCase();
        } catch (_) {
          return null;
        }
      };
      const hereKey = destOf(location.pathname);
      const destKey = destOf(href);
      // 当前页路径豁免收紧：仅 Code/README 两个真实 tab 共享当前页路径，
      // 它们由标签去重管辖；More 菜单里选中 tab 的别名副本也落在当前
      // 页路径，不做豁免（白名单收敛到 code/readme）。
      const normForExempt = normLabel.replace(/\s+/g, "");
      const hereExempt =
        destKey === hereKey &&
        (normForExempt === "code" || normForExempt === "readme");
      if (
        destKey &&
        !hereExempt &&
        seenDestByPath.has(destKey)
      ) {
        return;
      }
      if (destKey) seenDestByPath.set(destKey, true);
      const stripSlash = (h) => String(h || "").replace(/\/+$/, "");
      const normKey =
        stripSlash(href) + "|" + normLabel;
      const exactKey = href + "|" + label;
      if (seen.has(normKey) || seen.has(exactKey)) return;
      seen.add(normKey);
      seen.add(exactKey);
      items.push({ href, label, source: source || null, barKey: currentBarKey, barLabel: currentBarLabel });
    };

    // 当前正在索引的栏（用于面板分组与收割重试）
    let currentBarKey = "";
    let currentBarLabel = "";

    // 仓库主页路径下无导航意义的锚点：面包屑 owner/repo、当前路径自链。
    // 注意：真实 tab（Code/README）也可能命中这些 href，但它们带选中态
    // 标记（aria-current / data-selected），据此放行。
    const repoHomeRe = /^\/[^/]+(\/[^/]+)?\/?$/;
    const isSelectedTab = (a) =>
      a.hasAttribute("aria-current") ||
      a.hasAttribute("data-selected") ||
      a.getAttribute("data-selected-links") != null;
    const ownerRepo = location.pathname.split("/").slice(1, 3).join("/");
    const fileAreaTabHrefCache = new Map();
    const resolveFileAreaPlaceholderTabHref = (a, label) => {
      const key = label.toLowerCase();
      if (!fileAreaTabHrefCache.has(key)) {
        fileAreaTabHrefCache.set(
          key,
          resolveFileAreaTabHref(label, ownerRepo)
        );
      }
      return fileAreaTabHrefCache.get(key);
    };
    // 文件区白名单 tab（License/Contributing/"MIT license" 等）：href="#"
    // 但有真实路由（React 拦截点击做客户端路由），可由页面证据解析落地路径
    const isFileAreaPlaceholderTab = (a) => {
      if (a.getAttribute("href") !== "#") return false;
      if (isSelectedTab(a)) return false;
      const label = (
        a.getAttribute("aria-label") ||
        navDockAnchorLabel(a) ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
      return isFileAreaTabLabel(label);
    };
    const isBreadcrumbish = (a) => {
      if (isFileAreaPlaceholderTab(a)) return false;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href === location.pathname) return !isSelectedTab(a);
      if (!repoHomeRe.test(href)) return false;
      return !isSelectedTab(a);
    };

    // 遍历每个导航条形栏，按 DOM 顺序索引既有导航项
    (navList || []).forEach((nav) => {
      // 全局 Marketing 头部（未登录首页大菜单）与页脚不属仓库导航
      if (!isDockEligibleBar(nav)) return;

      // 记录当前栏归属（分组与收割重试用）
      currentBarKey = navBarKey(nav);
      currentBarLabel =
        nav.getAttribute("aria-label") ||
        navDockAnchorLabel(nav.querySelector("a[href]")) ||
        "";
      /** 本栏零点击可得项数（直扫 + 预渲染），供点击闸门判定 */
      let zeroClickCount = 0;
      /**
       * 本栏直扫分桶：逐条记录锚点被哪一条过滤规则剔除。
       * 两个用途：① 点击闸门判定"纯面包屑/上下文栏"（kept=0 且锚点全被剔除）；
       * ② 点击决策日志的证据链。仅在本轮真正点击时打印，常态零成本。
       * **任何新增过滤条件都必须在这里记一笔**，否则日志与真实取数结果脱节，
       * 诊断价值归零。
       */
      const buckets = {
        total: 0,
        kept: 0,
        hidden: 0,
        ariaHidden: 0,
        outside: 0, // footer / dock 自身
        moreLabel: 0,
        breadcrumb: 0,
        prerendered: 0,
        sampleRejected: "",
      };
      const reject = (a, why) => {
        buckets[why]++;
        if (!buckets.sampleRejected) {
          buckets.sampleRejected = String(a.outerHTML || "")
            .replace(/\s+/g, " ")
            .slice(0, 200);
        }
      };

      nav.querySelectorAll("a[href]").forEach((a) => {
        if (!(a instanceof HTMLAnchorElement)) return;
        buckets.total++;
        // 文件区白名单占位 tab：即使 GitHub 在窄视口下隐藏了所在 li，
        // 也在 dock 中保留（可解析真实路由；换行模式下这些项在页面上
        // 无任何入口，dock 提供它们正是补充导航）
        const isFileTab = isFileAreaPlaceholderTab(a);
        if (a.matches("[hidden]") && !isFileTab) return reject(a, "hidden");
        // 隐藏包装元素（UnderlineNav wrap spacer 等）内的内容不索引 —— 但
        // Primer UnderlineNav 的**剪裁项容器**（li[aria-hidden] 内唯一锚点）
        // 里那个锚点正是折进 More 的导航项本身，必须索引
        // （见 isClippedNavItemAnchor；移动端首帧窄视口初始化时全靠它）
        const ariaHiddenHolder = a.closest('[aria-hidden="true"]');
        if (
          !isFileTab &&
          ariaHiddenHolder &&
          !isClippedNavItemAnchor(a, ariaHiddenHolder)
        )
          return reject(a, "ariaHidden");
        if (a.closest("footer")) return reject(a, "outside");
        // 跳过 dock 自身条目与标题栏关闭按钮等
        if (a.closest(`#${NAV_DOCK_ID}`)) return reject(a, "outside");
        const label = a.getAttribute("aria-label") || navDockAnchorLabel(a);
        if (isMoreLabel(label)) return reject(a, "moreLabel");
        // 面包屑类条目（owner、owner/repo、页内锚点）无导航意义，剔除
        if (isBreadcrumbish(a)) return reject(a, "breadcrumb");
        zeroClickCount++;
        buckets.kept++;
        pushItem(a.getAttribute("href"), label, a);
      });

      // 免点击补足：本栏预渲染的溢出副本（[data-menu-item] 与 aria-controls
      // 目标）。仓库标签栏的溢出项就藏在 nav 内的 li[data-menu-item][hidden]
      // 里 —— hidden 挂在 li 上、不在 a 上，上面的直扫其实已能拿到；此处
      // 覆盖的是"菜单被渲染到本栏 nav 之外"的结构（登录态头部）。
      const prerendered = readPrerenderedBarItems(nav);
      buckets.prerendered = prerendered.length;
      prerendered.forEach((it) => {
        zeroClickCount++;
        pushItem(it.href, it.label, it.source);
      });

      if (statsOut && statsOut.zeroClickItems) {
        statsOut.zeroClickItems.set(currentBarKey, zeroClickCount);
        if (statsOut.barBuckets) {
          // 按**栏元素**键存：元素身份在一轮内稳定，免疫 React 对
          // className / aria-label 的改写（字符串键会因此查不到而误判 0）
          statsOut.barBuckets.set(nav, {
            ...buckets,
            barKey: currentBarKey,
            barLabel: currentBarLabel,
            zeroClick: zeroClickCount,
          });
        }
      }

      // 本栏 More 下拉收割项紧跟在本栏可见项之后：溢出项在 GitHub 侧
      // 本就位于本栏尾部，按栏归位可还原正确的导航顺序。
      // 注：这是**兜底**来源，现网 SSR 下 readPrerenderedBarItems 已全量覆盖，
      // 该 Map 通常为空；保留仅为未知结构留活路。
      const barHarvest = harvestedByBar && harvestedByBar.get(navBarKey(nav));
      if (barHarvest) {
        barHarvest.forEach((it) => pushItem(it.href, it.label, it.source));
      }
    });

    // === 仓库侧栏区块（PaneWrapper 内，**不是 `<nav>`**，上面的循环收不到）===
    // 一个区块一条主链接，排在文件区 tab 之后。条目走**无源锚点**路径：由
    // buildNavDockPanel 手工绘制 + 内置 octicon + 计数胶囊，与克隆条目同一套
    // 视觉 —— 直接克隆侧栏标题链接会带上 data-muted 等标题专用样式，反而与
    // 面板其它条目不一致。
    const sidebarEntries = repoHomeSidebarSectionEntries();
    if (sidebarEntries.length) {
      currentBarKey = "repo-sidebar";
      currentBarLabel = i18n.t("navDockSidebar");
      sidebarEntries.forEach((sec) => {
        pushItem(sec.href, sec.label, null);
        // 计数徽章在标题链接之外（兄弟节点），cloneNode 带不出来 ——
        // 记在 item.counterText 上，由 buildNavDockPanel 补一个 .Counter 胶囊
        if (!sec.counter) return;
        const pushed = items.find((x) => x.href === sec.href && !x.counterText);
        if (pushed) pushed.counterText = sec.counter;
      });
    }

    return items;
  }

  /** 仓库主页所有导航条形栏：全域扫描 nav 容器（含头部、仓库标签条、文件区），排除页脚与自身 dock */
  /** 文件区白名单 tab 固定名 */
  const FILE_AREA_TAB_NAMES_EXACT = new Set([
    "license",
    "licence",
    "contributing",
    "code of conduct",
    "security",
    "citation",
    "readme",
  ]);

  /**
   * 文件区 tab 白名单判定：固定名（License/Contributing/...）或
   * 许可证类型前缀名（"MIT license"/"Apache-2.0 licence" 等，尾 token 匹配）。
   * resolveFileAreaTabHref 与 collectRepoHomeNavItems 的占位 tab 判定共用。
   */
  function isFileAreaTabLabel(label) {
    const lower = String(label || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!lower) return false;
    if (FILE_AREA_TAB_NAMES_EXACT.has(lower)) return true;
    const tokens = lower.split(" ");
    const tail = tokens[tokens.length - 1];
    return tail === "license" || tail === "licence";
  }

  /**
   * 解析文件区 nav 中 href="#" 的 React 路由 tab（License / Contributing /
   * Code of conduct 等）的真实落地路径。新版 GitHub 文件区用
   * data-overflow-mode="wrap" 溢出模式，这些 tab 直接渲染在 nav 内且
   * href 为占位符，点击由 React 拦截 —— 必须从页面证据反推真实路径。
   * 证据链：
   *  1) 页面已有指向 /blob|/tree/.../<识别名> 的锚点（如侧栏 License 链接）
   *  2) 内嵌 React flight JSON 中的 tab 条目（"tabName":"License" + path/refName）
   *  3) 社区文件约定名 + GitHub 通用的 blob/HEAD 引用
   * 返回 null 表示无法确定，调用方保持丢弃。
   */
  function resolveFileAreaTabHref(tabLabel, ownerRepo) {
    if (!tabLabel) return null;
    const label = String(tabLabel).trim();
    if (!isFileAreaTabLabel(label)) return null;
    const lower = label.toLowerCase();
    const FILE_AREA_TAB_WHITELIST = [
      { tab: "license", names: ["license", "license.md", "licence", "licence.md"] },
      { tab: "contributing", names: ["contributing", "contributing.md"] },
      { tab: "code of conduct", names: ["code_of_conduct", "code_of_conduct.md", "code of conduct", "code of conduct.md"] },
      { tab: "security", names: ["security", "security.md", "security policy"] },
      { tab: "citation", names: ["citation", "citation.cff"] },
      { tab: "readme", names: ["readme", "readme.md"] },
    ];
    let entry = FILE_AREA_TAB_WHITELIST.find((e) => e.tab === lower);
    let labelForData = label;
    if (!entry) {
      const tokens = lower.split(/\s+/);
      const tail = tokens[tokens.length - 1];
      if (tail === "license" || tail === "licence") {
        // 许可证名前缀（MIT/Apache-2.0/...）：类型未知，不猜测具体文件名，
        // 只依赖证据 1/2（页面锚点、内嵌数据）；约定名兜底用 license.md
        entry = FILE_AREA_TAB_WHITELIST[0];
        labelForData = "License";
      }
    }
    if (!entry) return null;

    // 证据 1: 页面上已渲染的 blob/tree 锚点（文件列表、侧栏等）
    const hrefRe = new RegExp(
      "^/" + ownerRepo + "/(blob|tree)/[^/]+/(" +
      entry.names
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|") +
      ")$",
      "i"
    );
    const match = Array.from(
      document.querySelectorAll(
        'a[href^="/' + ownerRepo + '/blob/"], a[href^="/' + ownerRepo + '/tree/"]'
      )
    ).find((a) => hrefRe.test(a.getAttribute("href") || ""));
    if (match) return match.getAttribute("href");

    // 证据 2: 内嵌 React flight payload 中的 tab 定义（tabName + path + refName）
    try {
      const scripts = Array.from(
        document.querySelectorAll("script:not([src])")
      );
      for (const s of scripts) {
        const txt = s.textContent || "";
        if (txt.length < 20 || txt.length > 4000000) continue;
        const re = new RegExp(
          "\\\"tabName\\\":\\\"" + labelForData.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "\\\"[^}]{0,600}?\\\"path\\\":\\\"([^\\\"]+)\\\"[^}]{0,600}?\\\"refName\\\":\\\"([^\\\"]+)\\\"",
          "i"
        );
        const m = txt.match(re);
        if (m && m[1] && m[2]) {
          return "/" + ownerRepo + "/blob/" + m[2] + "/" + m[1];
        }
      }
    } catch (_) {
      /* ignore */
    }

    // 证据 3: 社区文件约定名 + GitHub 通用的 blob/HEAD 引用
    return "/" + ownerRepo + "/blob/HEAD/" + entry.names[0];
    }

  function findRepoHomeNavBars() {
    const bars = [];
    const seen = new Set();
    const addBar = (el) => {
      if (!el || seen.has(el)) return;
      if (el.closest("footer")) return;
      if (el.id === NAV_DOCK_ID) return;
      seen.add(el);
      bars.push(el);
    };

    // 1) 全局头部导航（React 注水后出现，可能为空）
    addBar(findHeaderNav());

    // 2) 仓库标签条（UnderlineNav / 仓库页 tab 栏）
    document
      .querySelectorAll(
        ".UnderlineNav, nav.UnderlineNav, [class*='UnderlineSoup'], .js-repo-nav"
      )
      .forEach(addBar);

    // 3) 全域扫描 nav 语义容器：新版 React 仓库页的分栏/文件区 nav 不在首个 main 内，
    //    需扫整个 body；页脚与自身 dock 已排除，面板项由去重收敕
    document.querySelectorAll("nav").forEach(addBar);

    // 仅保留含 More 触发器或导航链接的条形栏。外显锚点数 ≤1 的 nav 也
    // 保留：新版权限/偏好头部在窄视口可能把几乎全部项收进 More，外显
    // 项极少但正是需要收割的栏。
    // 窄视口专用 chrome（GitHub show-whenNarrow 工具类，仓库头部内容区
    // 用它渲染窄屏版仓库条：计数 tab 快捷片 + "⋯" 元数据 kebab）整体
    // 排除 —— canonical 导航仍在 DOM 中（CSS 控制显隐，直扫不过滤 CSS
    // 可见性），索引这份窄屏副本只会得到重复 tab（Issues/Pull requests/
    // Security and quality 计数项两份）与 stars/forks/... 元数据项。
    // 全部 nav 都被排除时回退为不过滤（防过度排除导致 dock 消失）。
    const eligible = (allowNarrowChrome) =>
      bars.filter((bar) => {
        if (!allowNarrowChrome && bar.closest("[class*='show-whenNarrow']")) {
          return false;
        }
        if (findMoreTrigger(bar)) return true;
        return bar.querySelectorAll("a[href]").length >= 1;
      });
    const filtered = eligible(false);
    return filtered.length ? filtered : eligible(true);
  }

  function navDockSignature(items) {
    const s = items.map((it) => it.href + "\u0001" + it.label).join("\u0002");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return items.length + ":" + h;
  }

  /**
   * 廉价结构签名：只统计"栏 + 栏内锚点 href"，**不收敕、不点击、不打印日志**。
   * 用于在重扫之前判断"这一轮是否可能有新东西" —— 缓存定稿后的稳态下每轮
   * 成本 O(栏数 × 锚点数)，零副作用，是控制台刷屏/主线程持续唤醒的第一道闸。
   */
  function navDockCheapSignature(navBars) {
    const parts = [];
    for (const bar of navBars) {
      const hrefs = [];
      for (const a of bar.querySelectorAll("a[href]")) {
        hrefs.push(a.getAttribute("href") || "");
      }
      parts.push(navBarKey(bar) + "\u0003" + hrefs.join("\u0004"));
    }
    // 侧栏区块不属于任何 `<nav>`，必须单独进签名。否则会这样卡死：
    // 第一次构建时侧栏还是 SSR 骨架（锚点数 0），注水后条目才出现，而
    // 早短路只比对 navBars 的签名 ⇒ 判定"没变化"直接返回 ⇒ 侧栏条目
    // 永远不出现。取「标题文本 + 标题链接 href」两项：前者覆盖"骨架 → 内容"，
    // 后者覆盖"标题从无链接变成有链接"。
    const sidebar = repoHomeSidebarGrid();
    if (sidebar) {
      const rows = Array.from(sidebar.children).map((sec) => {
        const h2 = sec.querySelector("h2");
        const a = h2 ? h2.querySelector("a[href]") : null;
        return (
          (h2 ? normalizedText(h2).slice(0, 48) : "") +
          "\u0005" +
          (a ? a.getAttribute("href") || "" : "")
        );
      });
      parts.push("sidebar\u0003" + rows.join("\u0004"));
    }
    const s = parts.join("\u0002");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return parts.length + ":" + h;
  }

  /**
   * 触发器是否带可访问名（More / More items / Toggle navigation …）。
   * 纯图标按钮（无可访问名，仅 aria-haspopup + aria-expanded）在页面上有
   * 多重身份：可能是导航溢出触发器（旧版仓库标签栏的 action-menu 按钮），
   * 也可能是仓库选择器 picker、元数据 kebab。闸门用它区分"有名字的导航开关"
   * 与"无名图标的语境菜单"。
   */
  function navDockTriggerHasName(trigger) {
    if (!trigger) return false;
    const label =
      trigger.getAttribute("aria-label") ||
      trigger.getAttribute("data-more") ||
      normalizedText(trigger);
    return !!String(label || "").replace(/\s+/g, " ").trim();
  }

  /**
   * 该栏当下是否允许进入点击收割 —— **点击路径的唯一判定入口**，
   * navDockHasPendingTrigger / navDockEarliestRetryAt / 初次收割循环 /
   * hasUndecided / missedBars 五处共用，保证"待收割判定"与"实际点击"同源。
   *
   * 允许条件（须全部满足）：
   *   1) 属于 dock 索引范围（isDockEligibleBar：排除页脚、全局 Marketing 头部、
   *      面包屑/上下文档）；
   *   2) 本栏"零点击可得项"为 0 —— 否则溢出项已在 DOM 里，点击零收益；
   *   3) 存在触发器；
   *   4) 不是"纯面包屑/上下文栏"：锚点一个都没留下（kept=0）**且**触发器没有
   *      可访问名。典型样本是登录态 AppHeader 的 `nav[aria-label="Breadcrumbs"]`
   *      —— 它的锚点只有 owner / owner-repo，被取数链整体当面包屑剔除，
   *      因此"零点击可得项"恒为 0，条件 2 永远为真；点开它的无名图标按钮
   *      拿到的是仓库选择器 picker 里的链接，作为"导航项"塞进面板只会变成
   *      重复/垃圾项（2026-09-20 起连续多轮实证，见
   *      docs/fix-2026-09-20-dock-duplicate-tabs.md）。
   *      保留条件：栏内**一个锚点都没有**（结构未知、菜单可能全靠 JS 注入，
   *      如登录态头部 react-partial）或触发器**有可访问名**（More / Toggle
   *      navigation）时仍允许点击 —— 保留兜底活路，不因噎废食。
   *
   * @param bar        候选栏
   * @param trigger    findMoreTrigger(bar) 的结果（由调用方算好传入，避免重复查询）
   * @param zeroClick  Map<barKey, 零点击可得项数>
   * @param barBuckets Map<Element, 直扫分桶>（collectRepoHomeNavItems 产出）
   * @returns 允许点击该栏的触发器时返回 true
   */
  function navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets) {
    if (!isDockEligibleBar(bar)) return false;
    if (zeroClick && (zeroClick.get(navBarKey(bar)) || 0) > 0) return false;
    if (!trigger) return false;
    const buckets = barBuckets && barBuckets.get(bar);
    if (
      buckets &&
      buckets.total > 0 &&
      buckets.kept === 0 &&
      !navDockTriggerHasName(trigger)
    ) {
      return false;
    }
    return true;
  }

  /**
   * 点击决策日志：**只在真正决定点击时打印**，常态化零成本。
   * 目的：一次点击即可自证"是哪一栏、闸门为何放行"。此前只有
   * `harvest click #n ok on "?"` —— 栏名缺失，且该行是"收割结论"而非
   * "确实点过"（harvestMoreItemsLocked 在触发器自报 expanded 时会跳过
   * click 直接等菜单），排查只能逐字比对历史日志（2026-09-21 实证）。
   */
  function logNavDockClickDecision(bar, trigger, buckets) {
    const b = buckets || {};
    const trigLabel =
      normalizedText(trigger) || trigger.getAttribute("aria-label") || "?";
    console.info(
      `[MGGA] nav dock: click decision bar="${
        bar.getAttribute("aria-label") || "(no aria)"
      }" key="${navBarKey(bar).slice(0, 48)}" anchors=${b.total || 0} kept=${
        b.kept || 0
      } hidden=${b.hidden || 0} ariaHidden=${b.ariaHidden || 0} outside=${
        b.outside || 0
      } moreLabel=${b.moreLabel || 0} breadcrumb=${b.breadcrumb || 0} prerendered=${
        b.prerendered || 0
      } trigger="${String(trigLabel).slice(0, 24)}"`
    );
    if (b.sampleRejected) {
      console.info(`[MGGA] nav dock: rejected sample "${b.sampleRejected}"`);
    }
  }

  /**
   * 是否还存在"可点击但尚未收割"的触发器（廉价判定：不点击、不打印）。
   * 与会话点击状态机同源，保证早短路不会吞掉真实的收割机会。
   *
   * @param zeroClick Map<barKey, 零点击可得项数>；某栏 >0 即视为"已覆盖"，
   *                  永不进入点击流程 —— 这是免点击改造的核心闸门
   *                  （点击 More 不产生任何 DOM 里没有的节点）。
   * @param barBuckets Map<Element, 直扫分桶>，供 navDockClickableTrigger
   *                  判定"纯面包屑/上下文栏"（点了只会有垃圾项）
   */
  function navDockHasPendingTrigger(navBars, session, zeroClick, barBuckets) {
    if (!session) return true;
    if (session.clickTotal >= NAV_DOCK_SESSION_MAX_CLICKS) return false;
    for (const bar of navBars) {
      const trigger = findMoreTrigger(bar);
      if (!navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets)) continue;
      const st = session.clickState.get(trigger);
      if (!st) return true; // 从未点击过：还有机会
      if (st.ok) continue; // 已成功收割：不再点
      if (st.count >= 2) continue; // 两次机会用尽：不再点
      if (Date.now() - st.at >= 2500) return true; // 空结果后的唯一重试窗口已到
    }
    return false;
  }

  /**
   * 最早可重试时刻（ms 时间戳）；无待重试触发器时返回 null。
   * 用于把"空结果后的 2.5s 唯一重试"排成**一次性**定时器 —— 收窄 finally 的
   * 无条件续排后，若没有别的唤醒源，这个重试窗口会永远等不到轮次
   * （React 注水慢、菜单延迟挂载时曾靠它成功收割）。一次性排程有界：
   * 每元素至多 2 次点击、全局至多 12 次，落地后即回报 null，不会成环。
   */
  function navDockEarliestRetryAt(navBars, session, zeroClick, barBuckets) {
    if (!session) return null;
    if (session.clickTotal >= NAV_DOCK_SESSION_MAX_CLICKS) return null;
    let min = null;
    for (const bar of navBars) {
      // 与 navDockHasPendingTrigger 同一闸门：非 dock 栏、零点击已覆盖的栏、
      // 纯面包屑/上下文栏都不参与重试
      const trigger = findMoreTrigger(bar);
      if (!navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets)) continue;
      const st = session.clickState.get(trigger);
      if (!st || st.ok || st.count >= 2) continue;
      const at = st.at + 2500;
      if (min === null || at < min) min = at;
    }
    return min;
  }

  /**
   * 整体复用原控件：深克隆源锚点，图标/文本/原生计数器胶囊/主题样式全部保留。
   * 不移动原节点 —— GitHub React 需要原节点留在原位，克隆是安全且样式保真的折中。
   * 克隆后仅做净化：去重复 id/热键/分析属性、修正 # 占位 href、
   * 保留首个非零计数器胶囊、移除响应式重复计数器与图标的响应式隐藏类。
   */
  function collectNavDockOriginalAnchor(item) {
    const src = item.source;
    if (!(src instanceof HTMLAnchorElement)) return null;
    const clone = src.cloneNode(true);

    // 去除会引发框架接管/重复行为的属性
    const dropAttrs = [
      "id",
      "aria-current",
      "aria-expanded",
      "aria-controls",
      "data-selected",
      "data-selected-links",
      "data-hotkey",
      "data-command-id",
      "data-tab-item",
      "data-react-nav",
      "data-analytics-event",
      "data-pjax",
      "data-pjax-replace",
      "data-turbo-frame",
      "data-turbo-replace",
      "data-target",
      "data-action",
    ];
    dropAttrs.forEach((attr) => clone.removeAttribute(attr));

    // href 修正：# 占位 tab（README 等）落地为当前页路径
    let href = item.href || clone.getAttribute("href") || "";
    if (href === "#") href = location.pathname;
    clone.setAttribute("href", href);

    // 克隆内部：去 id，防 DOM 重复；去框架接管属性
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone
      .querySelectorAll(
        "[data-pjax], [data-pjax-replace], [data-turbo-frame], [data-turbo-replace]"
      )
      .forEach((el) => {
        el.removeAttribute("data-pjax");
        el.removeAttribute("data-pjax-replace");
        el.removeAttribute("data-turbo-frame");
        el.removeAttribute("data-turbo-replace");
      });

    // 计数器胶囊：仅保留首个非零原生 .Counter，移除响应式重复计数
    const counterEls = Array.from(
      clone.querySelectorAll("[class*='Counter']")
    );
    const primary = counterEls[0];
    counterEls.slice(1).forEach((el) => el.remove());
    if (primary) {
      const t = (primary.textContent || "").trim();
      if (!t || t === "0") {
        primary.remove();
      } else {
        primary.removeAttribute("hidden");
      }
    }
    // 响应式替换计数（形如 "(1.8k)" 的孤立胶囊）不进入面板，避免读屏/视觉重复
    clone.querySelectorAll("span").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (/^\([\d.,]+[kKmM]?\)$/.test(t)) el.remove();
    });

    // 图标：剥离 GitHub 响应式隐藏类，窄面板下图标不再消失
    clone.querySelectorAll("svg").forEach((svg) => {
      svg.classList.remove("d-none", "d-sm-inline", "d-md-inline", "d-lg-inline");
    });

    clone.classList.add("mgga-nav-dock-clone");
    clone.setAttribute("data-mgga-mutation-guard", "1");
    return clone;
  }

  /**
   * 把 `item.counterText` 渲染成一个 `.Counter` 胶囊。
   *
   * 用于"计数不在被克隆的锚点内部"的来源：仓库侧栏区块的真实结构是
   * `h2 > span.headingLinkWrapper > [a("Releases"), span[data-component=CounterLabel]("53"),
   * span.VisuallyHidden("(53)")]` —— 计数是标题链接的**兄弟节点**，
   * `cloneNode` 带不出来，所以只能另行补一个。
   * 已经有原生计数器的条目（克隆自 tab 的 `.Counter`）直接跳过，不重复加。
   */
  function appendNavDockCounterText(el, item) {
    if (!el || !item) return null;
    const text = String(item.counterText || "").trim();
    if (!text) return null;
    if (el.querySelector(".Counter, [data-component='CounterLabel']")) return null;
    const counter = document.createElement("span");
    counter.className = "Counter";
    counter.textContent = text;
    el.appendChild(counter);
    return counter;
  }

  function buildNavDockPanel(items) {
    const panel = document.createElement("div");
    panel.id = NAV_DOCK_ID;
    panel.setAttribute("role", "navigation");
    panel.setAttribute("aria-label", i18n.t("navDock"));
    panel.setAttribute("data-expanded", navDockExpanded ? "true" : "false");
    panel.classList.toggle("mgga-visible", navDockExpanded);
    panel.setAttribute("data-mgga-mutation-guard", "1");

    // 标题栏 + 关闭按钮：对齐 Release 设置面板结构
    const header = document.createElement("div");
    header.className = "mgga-nav-dock-header";
    const title = document.createElement("span");
    title.className = "mgga-nav-dock-header-title";
    // 品牌名，不是可本地化文案（与 verSpan 的 "Make-GitHub-Great-Again" 同理）；
    // 面板的无障碍名仍走 panel 的 aria-label = i18n.t("navDock")
    title.textContent = NAV_DOCK_BRAND;
    // 脚本版本号（与设置面板一致）
    const verSpan = document.createElement("span");
    verSpan.className = "mgga-nav-dock-header-version";
    verSpan.textContent = "v" + getScriptVersion();
    verSpan.title = "Make-GitHub-Great-Again";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "mgga-nav-dock-close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", i18n.t("close"));
    closeBtn.title = i18n.t("close");
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setNavDockExpanded(false);
    });
    header.appendChild(title);
    header.appendChild(verSpan);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 滚动区单独包一层：标题栏留在滚动容器**外**，滚动条就只会出现在条目区。
    // 面板是 flex 列，header / body 各占一段，只有 body 内滚。
    // 副作用：面板的直接子节点变成 [header, body]，条目与分割线都下沉一层 ——
    // 按 div:nth-child(N) 定位分割线要写成
    // 「#mgga-nav-dock > .mgga-nav-dock-body > div:nth-child(N)」。
    const bodyEl = document.createElement("div");
    bodyEl.className = "mgga-nav-dock-body";
    bodyEl.setAttribute("data-mgga-mutation-guard", "1");

    const frag = document.createDocumentFragment();
    let lastBarKey = null;
    let isFirst = true;
    items.forEach((item) => {
      // 跨栏插入轻微分割线（首个条目前不加）。
      // 分割线**只留线，不留栏名小标题** —— 分区标题已取消，分组靠这条细线表达。
      // item.barLabel 仍由 collectRepoHomeNavItems 采集（点击决策日志的证据链用），
      // 只是不再渲染，别当死字段删掉。
      const barKey = item.barKey || "";
      if (!isFirst && lastBarKey !== null && barKey && barKey !== lastBarKey) {
        const divider = document.createElement("div");
        divider.className = "mgga-nav-dock-divider";
        divider.setAttribute("data-mgga-mutation-guard", "1");
        frag.appendChild(divider);
      }
      lastBarKey = barKey || lastBarKey;
      isFirst = false;

      // 优先整体复用原控件（含图标与原生计数器胶囊），仅无源锚点时手工绘制
      const reused = collectNavDockOriginalAnchor(item);
      if (reused) {
        reused.title = item.label;
        reused.setAttribute("aria-label", item.label);
        // 点击分诊：能页内定位就定位，目标可 AJAX 就交还原锚点，
        // 否则保持原生 href 导航（见 handleNavDockItemClick）
        attachNavDockItemClick(reused, item);
        appendNavDockCounterText(reused, item);
        frag.appendChild(reused);
        return;
      }

      const a = document.createElement("a");
      a.className = "mgga-nav-dock-fallback";
      a.href = item.href;
      // 计数器先提取：回退路径会同步清理 item.label，
      // 保证 title / aria-label / 可见文案三者一致
      const counter = extractNavDockCounter(item);
      a.title = item.label;
      a.setAttribute("aria-label", item.label);

      // 图标：源锚点内联 svg 优先；收割项（ActionMenu）常无图标，
      // 回退到源锚点外层 li 的图标，再回退到内置 octicon 路径映射
      const icon = item.source ? item.source.querySelector("svg") : null;
      if (icon) {
        a.appendChild(icon.cloneNode(true));
      } else {
        const liIcon =
          item.source && item.source.closest
            ? item.source.closest("li")?.querySelector("svg")
            : null;
        if (liIcon) {
          a.appendChild(liIcon.cloneNode(true));
        } else {
          const fallback = buildNavDockFallbackIcon(item.label);
          if (fallback) a.appendChild(fallback);
        }
      }

      const label = document.createElement("span");
      label.className = "mgga-nav-dock-label";
      label.textContent = item.label;
      a.appendChild(label);

      if (counter) {
        a.appendChild(counter);
      } else {
        // 标签尾没有计数文本、但来源另有计数（侧栏区块标题）时补上
        appendNavDockCounterText(a, item);
      }
      attachNavDockItemClick(a, item);
      frag.appendChild(a);
    });
    bodyEl.appendChild(frag);
    panel.appendChild(bodyEl);
    return panel;
  }

  /** 内置 octicon 16x16 路径映射：收割项无图标时的兑底 */
  function buildNavDockFallbackIcon(label) {
    const ICON_PATHS = {
      code: "M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06Zm6.56 0a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L14.44 8Z",
      // 以下四条供仓库侧栏来源使用（Releases / Contributors / Languages /
      // Sponsor this project）。路径取自 @primer/octicons 官方 16px 数据，
      // 不手写，避免一个字符错导致图标整块变形。
      tag: "M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
      people: "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z",
      globe: "M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM5.78 8.75a9.64 9.64 0 0 0 1.363 4.177c.255.426.542.832.857 1.215.245-.296.551-.705.857-1.215A9.64 9.64 0 0 0 10.22 8.75Zm4.44-1.5a9.64 9.64 0 0 0-1.363-4.177c-.307-.51-.612-.919-.857-1.215a9.927 9.927 0 0 0-.857 1.215A9.64 9.64 0 0 0 5.78 7.25Zm-5.944 1.5H1.543a6.507 6.507 0 0 0 4.666 5.5c-.123-.181-.24-.365-.352-.552-.715-1.192-1.437-2.874-1.581-4.948Zm-2.733-1.5h2.733c.144-2.074.866-3.756 1.58-4.948.12-.197.237-.381.353-.552a6.507 6.507 0 0 0-4.666 5.5Zm10.181 1.5c-.144 2.074-.866 3.756-1.58 4.948-.12.197-.237.381-.353.552a6.507 6.507 0 0 0 4.666-5.5Zm2.733-1.5a6.507 6.507 0 0 0-4.666-5.5c.123.181.24.365.353.552.714 1.192 1.436 2.874 1.58 4.948Z",
      heart: "m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z",
      issue: "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
      pull: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.25 2.25 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.25 2.25 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
      shield: "M7.467.133a1.75 1.75 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.956 3.582-2.104 4.366-3.298C13.225 9.666 13.5 8.36 13.5 7V3.48a.251.251 0 0 0-.174-.237l-5.25-1.68ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
      graph: "M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0L9 7.94l4.72-4.72a.75.75 0 1 1 1.06 1.06Z",
      eye: "M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z",
      play: "M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM6.379 5.227A.25.25 0 0 0 6 5.442v5.117a.25.25 0 0 0 .379.214l4.264-2.559a.25.25 0 0 0 0-.428Z",
      table: "M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25ZM6.5 6.5v8h7.75a.25.25 0 0 0 .25-.25V6.5Zm8-1.5V1.75a.25.25 0 0 0-.25-.25H6.5V5Zm-9.5 1.5H1.5v7.75c0 .138.112.25.25.25H5Zm0-1.5V1.5H1.75a.25.25 0 0 0-.25.25V5Z",
      gear: "M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.039.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z",
    };
    const key = String(label || "").toLowerCase();
    let d = null;
    if (key.includes("security")) d = ICON_PATHS.shield;
    else if (key.includes("insight")) d = ICON_PATHS.graph;
    // 仓库侧栏来源（Releases / Contributors / Languages / Sponsor this project）
    else if (key.includes("release")) d = ICON_PATHS.tag;
    else if (key.includes("contributor")) d = ICON_PATHS.people;
    else if (key.includes("language")) d = ICON_PATHS.globe;
    else if (key.includes("sponsor")) d = ICON_PATHS.heart;
    else if (key.includes("pull")) d = ICON_PATHS.pull;
    else if (key.includes("issue")) d = ICON_PATHS.issue;
    else if (key.includes("action")) d = ICON_PATHS.play;
    else if (key.includes("project")) d = ICON_PATHS.table;
    else if (key.includes("discussion")) d = ICON_PATHS.gear;
    else if (key.includes("watch")) d = ICON_PATHS.eye;
    else if (key.includes("code")) d = ICON_PATHS.code;
    if (!d) return null;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "currentColor");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  }

  /**
   * 提取计数器胶囊：优先克隆源锚点内的原生 .Counter（保真样式），
   * 回退从标签文本尾部括号计数（如 "Pull requests97 (97)"）重建一个。
   */
  function extractNavDockCounter(item) {
    const src = item.source;
    if (src && src.querySelector) {
      const native = src.querySelector(".Counter, [data-component='Counter']");
      if (native) {
        const clone = native.cloneNode(true);
        clone.removeAttribute("id");
        return clone;
      }
    }
    // 回退：标签尾部的 "1.8k (1.8k)" 或 "97 (97)" 形式（GitHub 侧计数器
    // 与文本紧贴，无空白分隔），读屏文本重复
    const m = String(item.label || "").match(/((?:[\d.,]+[kKmM]?)\s*\((?:[\d.,]+[kKmM]?)\))$/);
    if (!m) return null;
    const counter = document.createElement("span");
    counter.className = "Counter";
    counter.textContent = m[1].split("(")[0].trim();
    item.label = item.label.slice(0, m.index).trim();
    return counter;
  }

  function buildNavDockFab() {
    const fab = document.createElement("button");
    fab.id = NAV_DOCK_TOGGLE_ID;
    fab.type = "button";
    fab.title = navDockExpanded ? i18n.t("navDockCollapse") : i18n.t("navDockExpand");
    fab.setAttribute("aria-label", fab.title);
    fab.setAttribute("aria-expanded", navDockExpanded ? "true" : "false");
    fab.setAttribute("aria-controls", NAV_DOCK_ID);
    fab.setAttribute("data-mgga-mutation-guard", "1");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("fill", "currentColor");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"
    );
    icon.appendChild(path);
    fab.appendChild(icon);
    return fab;
  }

  function updateNavDockFabBadge(fab, count) {
    if (!fab) return;
    let badge = fab.querySelector(".mgga-nav-dock-badge");
    if (!count) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "mgga-nav-dock-badge";
      fab.appendChild(badge);
    }
    badge.textContent = count > 99 ? "99+" : String(count);
  }

  function bindNavDockFab(fab, panel) {
    fab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setNavDockExpanded(!navDockExpanded);
    });
  }

  async function buildNavDock() {
    if (navDockBuilding) {
      // 构建期间到达的变更（首次构建时观察器尚未安装、或回调被守卫吞掉）
      // 必须记账，构建结束后补一轮；否则 React 注水出来的头部 More 会
      // 永久失去收割机会。
      navDockDirty = true;
      return;
    }
    navDockBuilding = true;
    /** 本轮是否有实质进展（面板重建 / 收割产物更新） */
    let roundProgress = false;
    /** 本轮结束后是否还有分批/重试收割需求 */
    let roundPending = false;
    /** 本轮上下文：finally 与 try 不共享块级作用域，需提升到函数作用域 */
    let navBars = null;
    let session = null;
    /**
     * 每栏零点击可得项数（barKey → count）。
     * 必须提升到函数作用域：finally 里要用它做重试排程的闸门判定；
     * 若用 const 声明在 try 内，finally 读取会抛 ReferenceError
     * （与下方 navBars/session 同一坑，2026-09-21 冒烟测试实证）。
     */
    let zeroClick = null;
    /**
     * 每栏直扫分桶（Map<Element, buckets>）。按**栏元素**键：元素身份在一轮内
     * 稳定，免疫 React 对 className / aria-label 的改写（用字符串键会因此查不到
     * 而把该栏误判成"零点击可得项 = 0"，闸门随之误放 —— 与上一条同源）。
     */
    let barBuckets = null;
    try {
      // 不依赖全局头部 nav：移动端可能无头部 nav 元素，直接扫描所有导航条形栏
      navBars = findRepoHomeNavBars();

      // === 零点击可得性统计（免点击改造的总闸门）===
      // 先以 harvestedByBar=null 跑一次合并，只取每栏"零点击即可取到"的项数。
      // 某栏 >0 ⇒ 该栏的溢出项已在 DOM 里 ⇒ 点击 More 零收益，该栏永久退出
      // 点击流程：既不会产生点击副作用，也不会因"从未点击过"而反复补收，
      // 更不会让 session.byBar 定不了稿（后者正是 2026-09-21 自激励循环的
      // 成因之一）。成本与 navDockCheapSignature 同级（都遍历一次本栏锚点）。
      const zeroClickStats = { zeroClickItems: new Map(), barBuckets: new Map() };
      collectRepoHomeNavItems(navBars, null, zeroClickStats);
      zeroClick = zeroClickStats.zeroClickItems;
      barBuckets = zeroClickStats.barBuckets;

      // === 一次性收割会话 ===
      // 用户语义：每次进入仓库页/刷新时只收割一次。会话键 = loadRun 序号 +
      // 路径 + 视口桶；loadRun 序号仅在进入/刷新/SPA 跨路径时递增，因此
      // 视口变化（桌面拖 Responsive、缩放）沿用同一会话 —— 面板与收割产物
      // 完全不变，从根上杜绝重排流里的反复点击。
      const cacheKey = navDockLoadRunSeq + "#" + location.pathname;
      const prev = navDockHarvestSession;
      session =
        prev && prev.key === cacheKey
          ? prev
          : {
              key: cacheKey,
              clickState: new WeakMap(),
              byBar: null,
              clickTotal: 0,
            };
      if (session !== prev) {
        navDockHarvestSession = session;
        clearNavDockRetry(); // 新会话开启：旧会话遗留的重试排程作废
      }
      /**
       * 每触发器元素状态机：每个元素至多点击 2 次 —— 首次点击后为空
       * （常见于切 Responsive 瞬间 React 仍在重渲染、菜单未挂载的竞态）
       * 允许 2.5s 后重试一次；成功或有两次点击后该元素永不再点。
       * 按元素记录使重渲染/重排重建的新节点获得收割机会，同一元素
       * 绝不无限重复点击（防振荡根源）。全局 12 次上限兜底。
       */
      const canClickTrigger = (trigger) => {
        if (session.clickTotal >= NAV_DOCK_SESSION_MAX_CLICKS) return false;
        const st = session.clickState.get(trigger);
        if (!st) return true;
        if (st.ok) return false;
        if (st.count >= 2) return false;
        // 空结果后的唯一重试：延迟 ≥2.5s（等 React 重渲染/菜单挂载完成）
        return Date.now() - st.at >= 2500;
      };
      const recordClick = (trigger, ok, diag) => {
        const st = session.clickState.get(trigger) || { count: 0 };
        st.count++;
        st.at = Date.now();
        st.ok = ok;
        session.clickState.set(trigger, st);
        session.clickTotal++;
        roundPending = true; // 状态机推进过，需再看一轮（受 12 次全局上限约束）
        // 措辞取证：本行是**收割结论**，不等于"确实点过" ——
        // harvestMoreItemsLocked 在触发器自报 aria-expanded="true" 时会跳过
        // click 直接等菜单出现，命中预检/全局兜底同样不点击。clicks= 字段
        // 说明本轮真实点击次数（0 / 1 开+1 关=2）。
        const clicks = diag
          ? (diag.clicked ? 1 : 0) + (diag.closedBySecondClick ? 1 : 0)
          : null;
        console.info(
          `[MGGA] nav dock: harvest #${st.count} ${
            ok ? "ok" : "empty"
          } on "${(normalizedText(trigger) || trigger.getAttribute("aria-label") || "?").slice(0, 24)}"` +
            (clicks === null ? "" : ` clicks=${clicks}`) +
            (diag && diag.menu && diag.menu !== "null" ? ` menu="${diag.menu}"` : "") +
            (diag && diag.skipped ? ` skipped=${diag.skipped}` : "")
        );
      };

      // === 早短路（必须在任何重扫/日志/DOM 写入之前）===
      // 条件：会话收割产物已定稿 + 面板结构版本一致 + 廉价结构签名一致 +
      // 无待收割触发器。命中即本轮无事可做，直接返回。
      // 这是"控制台被 [MGGA] scan 刷屏 / 页面永不空闲"的第一道闸：旧实现把
      // 签名短路放在重扫**之后**，桌面全宽常态下每 200ms 白扫一遍全栏并打印，
      // 真机实测 ~14 条/秒且永不停止（2026-09-21）。
      // 免点击改造后：所有栏的 zeroClick 均 >0 ⇒ navDockHasPendingTrigger
      // 直接返回 false ⇒ 常态下首轮之后即命中本短路，点击路径彻底不进入。
      const existingEarly = document.getElementById(NAV_DOCK_ID);
      const earlyCheapSig = navDockCheapSignature(navBars);
      if (
        existingEarly &&
        session.byBar &&
        !navDockHasPendingTrigger(navBars, session, zeroClick, barBuckets) &&
        existingEarly.dataset.mggaNavDockVer === NAV_DOCK_STRUCT_VER &&
        existingEarly.dataset.mggaNavDockCheapSig === earlyCheapSig
      ) {
        return;
      }

      // 收割缓存：会话缓存命中即只读复用（含视口变化重建）；未命中则本轮
      // 直扫 + 对"从未点击过"的触发器逐栏收割（每元素至多一次）
      let harvestedByBar = null;
      if (session.byBar) {
        harvestedByBar = session.byBar;
      } else {
        harvestedByBar = new Map();
        for (const bar of navBars) {
          const trigger = findMoreTrigger(bar);
          // 结构自诊断：真实登录态问题排查用（显示每栏名、外显锚点数、
          // 触发器识别结果）。用 console.debug —— Chrome/Edge 控制台默认
          // 不显示 Verbose，避免刷屏遮住页面自身日志；排查时切 Verbose 即可。
          const visAnchors = Array.from(bar.querySelectorAll("a[href]")).filter(
            (a) => a.offsetParent !== null || a.getClientRects().length > 0
          ).length;
          console.debug(
            `[MGGA] scan "${(bar.getAttribute("aria-label") || navBarKey(bar)).slice(0, 28)}" vis=${visAnchors} trig=${trigger ? (normalizedText(trigger) || trigger.getAttribute("aria-label") || "icon-btn").slice(0, 18) : "null"} zeroClick=${zeroClick.get(navBarKey(bar)) || 0}`
          );
          // 闸门：非 dock 栏 / 本栏零点击已能取到条目 / 纯面包屑栏 / 无触发器
          // ⇒ 一律不点击（免点击改造主路径，判定唯一入口 navDockBarClickAllowed）
          if (!navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets)) {
            continue;
          }
          if (!canClickTrigger(trigger)) continue;
          let menuItems = [];
          const harvestDiag = {};
          try {
            menuItems = extractMenuItems(findMoreMenu(trigger, false));
            if (!menuItems.length) {
              logNavDockClickDecision(bar, trigger, barBuckets.get(bar));
              menuItems = await harvestMoreItems(trigger, harvestDiag);
              recordClick(trigger, menuItems.length > 0, harvestDiag);
            }
          } catch (err) {
            console.warn("[MGGA] nav dock: harvest failed for one bar:", err);
            recordClick(trigger, false, harvestDiag);
          }
          if (menuItems.length) {
            harvestedByBar.set(navBarKey(bar), menuItems);
          }
        }
        // 会话结果定稿。**关键修复**：旧逻辑只在"有任一成功收割"时定稿，
        // 于是"桌面全宽、全部导航项外显、根本无需下拉"这一常态下缓存永远
        // 写不上 → 每轮都走未命中分支重扫 + 打日志 → 配合 finally 的无条件
        // 续排形成约 5Hz 的自激励死循环（2026-09-21 真机实证，改前/改后
        // 逐位一致，与本次 9 项整改无关）。
        // 空产物同样定稿是安全的：面板项由 collectRepoHomeNavItems 直接读
        // 实时 DOM 得到，缓存只补充"被收进 More 里的隐藏项"；晚出现的触发器
        // 仍由下方 missedBars 补收分支（每轮独立重算）获得点击机会，并在成功
        // 时回写 session.byBar。
        // 仍保留一条保护：只要还有"从未点击过"的触发器，就不定稿，留给补收轮。
        // 免点击改造后必须叠加同一闸门 —— 否则零点击已覆盖的栏会永远被算作
        // "未决"，session.byBar 定不了稿，每轮重扫+打日志，自激励循环复现。
        const hasUndecided = navBars.some((bar) => {
          const t = findMoreTrigger(bar);
          if (!navDockBarClickAllowed(bar, t, zeroClick, barBuckets)) return false;
          return !!t && !session.clickState.get(t);
        });
        if (
          harvestedByBar.size ||
          !hasUndecided ||
          session.clickTotal >= NAV_DOCK_SESSION_MAX_CLICKS
        ) {
          session.byBar = harvestedByBar;
          if (harvestedByBar.size) roundProgress = true;
        }
      }
      // 待补触发器每轮重算（无论缓存是否命中）：晚出现的触发器
      // （如切 Responsive 后 react-partial 重渲染出的头部 More）即使
      // 会话产物已定稿，也要在这里获得收割机会 —— 定稿的是"收割产物"，
      // 不是"收割机会"。（曾因缓存命中分支不计算 missedBars 导致晚现
      // 触发器永不被点击，v2026.10.8 前实证。）
      const missedBars = navBars.filter((bar) => {
        // 闸门：非 dock 栏、零点击已覆盖的栏、纯面包屑栏永不进入点击补收
        const t = findMoreTrigger(bar);
        if (!navDockBarClickAllowed(bar, t, zeroClick, barBuckets)) return false;
        if (harvestedByBar.has(navBarKey(bar))) return false;
        return canClickTrigger(t);
      });

      // 签名短路（收割后、补收前）：本轮收割结果与现有面板一致、且没有
      // 待补收栏时直接返回，不再进入补收/增量补扫 —— 杜绝"任何 body 变更
      // 都重扫并重新点击 More"的无限重试循环（曾引发模拟移动端时页面在
      // 顶部与 README 区之间振荡）。有待补栏时不短路，让补收继续进行。
      // 覆盖场景：触发器已点击过且处于 2.5s 空结果重试窗口内（missedBars
      // 暂空、session.byBar 未定稿），此时无重排必要，等重试窗口开启。
      const existingPreHarvest = document.getElementById(NAV_DOCK_ID);
      const preHarvestSignature = navDockSignature(
        collectRepoHomeNavItems(navBars, harvestedByBar)
      );
      if (
        existingPreHarvest &&
        !missedBars.length &&
        existingPreHarvest.dataset.mggaNavDockSig === preHarvestSignature &&
        existingPreHarvest.dataset.mggaNavDockVer === NAV_DOCK_STRUCT_VER
      ) {
        return;
      }

      // 补收：状态机内还有"从未点击过"余量的触发器（每元素至多点击一次）。
      // 全部元素点击过后本分支自然失效，不再产生任何点击。
      if (missedBars.length) {
        const retryBars = missedBars.splice(0, 2);
        for (const bar of retryBars) {
          const trigger = findMoreTrigger(bar);
          if (!trigger || !canClickTrigger(trigger)) continue;
          const harvestDiag = {};
          try {
            logNavDockClickDecision(bar, trigger, barBuckets.get(bar));
            const menuItems = await harvestMoreItems(trigger, harvestDiag);
            recordClick(trigger, menuItems.length > 0, harvestDiag);
            if (menuItems.length) {
              harvestedByBar.set(navBarKey(bar), menuItems);
              session.byBar = harvestedByBar;
              roundProgress = true;
            }
          } catch (_) {
            recordClick(trigger, false, harvestDiag);
          }
        }
        // 本轮只补收 2 栏：还有剩余就再排一轮把它们吃完（分批是有界的，
        // 因为每个触发器最多点击 2 次、全局最多 12 次）
        if (missedBars.length) roundPending = true;
      }

      const items = collectRepoHomeNavItems(navBars, harvestedByBar);
      if (!items.length) {
        // React 渐进注水：首轮可能扫不到任何导航项，有界重试等注水完成
        const attempt = Number(buildNavDock.attempt || 0);
        if (attempt < 6) {
          buildNavDock.attempt = attempt + 1;
          setTimeout(() => {
            if (
              isRepoHomePath() &&
              !document.getElementById(NAV_DOCK_TOGGLE_ID)
            ) {
              buildNavDock();
            }
          }, 500);
        } else {
          buildNavDock.attempt = 0;
          console.warn(
            "[MGGA] nav dock: no nav items indexed on repo home",
            location.pathname
          );
          removeNavDock();
        }
        return;
      }
      buildNavDock.attempt = 0;

      const existing = document.getElementById(NAV_DOCK_ID);
      const signature = navDockSignature(items);
      // 廉价结构签名：供下一轮早短路比对（面板 DOM 未变即无需重扫）
      const cheapSig = navDockCheapSignature(navBars);
      // 旧版结构（无标题栏/过渡类）与新结构不兼容，通过结构版本号强制重建一次
      const STRUCT_VER = NAV_DOCK_STRUCT_VER;
      if (
        existing &&
        existing.dataset.mggaNavDockSig === signature &&
        existing.dataset.mggaNavDockVer === STRUCT_VER
      ) {
        // 面板内容未变：不重建（不产生任何 DOM 变更），只补写廉价签名，
        // 让下一轮走早短路；徽标同步刷新。
        existing.dataset.mggaNavDockCheapSig = cheapSig;
        updateNavDockFabBadge(
          document.getElementById(NAV_DOCK_TOGGLE_ID),
          items.length
        );
        return;
      }

      injectNavDockStyle();
      const freshPanel = buildNavDockPanel(items);
      freshPanel.dataset.mggaNavDockSig = signature;
      freshPanel.dataset.mggaNavDockVer = STRUCT_VER;
      freshPanel.dataset.mggaNavDockCheapSig = cheapSig;
      freshPanel.dataset.mggaNavDockCount = String(items.length);
      const freshFab = buildNavDockFab();
      bindNavDockFab(freshFab, freshPanel);
      updateNavDockFabBadge(freshFab, items.length);
      if (existing) existing.remove();
      const existingFab = document.getElementById(NAV_DOCK_TOGGLE_ID);
      if (existingFab) existingFab.remove();
      document.body.appendChild(freshPanel);
      document.body.appendChild(freshFab);
      roundProgress = true;
    } finally {
      navDockBuilding = false;
      // === 自限续排（2026-09-21 无限重扫修复）===
      // 旧实现无条件 `scheduleNavDockViewportCheck()`：配合"空收割不定稿"，
      // 让"桌面全宽、所有导航项外显、无需下拉"这一常态陷入 200ms 自激励
      // 重扫 —— 真机实测 [MGGA] scan 13.9 条/秒且永不停止，主线程被持续
      // 唤醒、页面永不进入空闲态（用户观感即"无限加载"），DevTools 控制台
      // 被刷屏看不到页面自身代码。
      // 现在只在三种确有必要时续排，且连续"有进展"轮次也有上限：
      //   1) navDockDirty  —— 构建期间到达的变更需要回看
      //   2) roundPending   —— 还有分批/重试收割需求
      //   3) roundProgress  —— 本轮真的重建了面板，需一轮确认晚现触发器
      // 其余情况一律停表，交由 MutationObserver / resize 唤醒。
      const needNext = navDockDirty || roundPending || roundProgress;
      navDockDirty = false;
      if (needNext) {
        navDockRebuildStreak = roundProgress ? navDockRebuildStreak + 1 : 0;
        if (navDockRebuildStreak <= NAV_DOCK_MAX_REBUILD_STREAK) {
          scheduleNavDockViewportCheck();
        } else if (navDockRebuildStreak === NAV_DOCK_MAX_REBUILD_STREAK + 1) {
          console.debug(
            "[MGGA] nav dock: 连续重建达上限，停表等待 DOM 变更唤醒"
          );
        }
      } else {
        // 本轮无事可做：停表。后续由 MutationObserver / resize / SPA 事件唤醒。
        navDockRebuildStreak = 0;
      }
      // 独立的**一次性**延迟重试：把状态机里剩余的"空结果待重试"触发器
      // 排到各自 2.5s 窗口开启时跑一轮，补回收窄 finally 后可能丢失的
      // 收割机会。与上面的续排互不影响，且落地后即无待重试项。
      if (navBars && session && zeroClick && barBuckets) {
        const retryAt = navDockEarliestRetryAt(
          navBars,
          session,
          zeroClick,
          barBuckets
        );
        if (retryAt !== null) scheduleNavDockRetry(retryAt - Date.now());
      }
    }
  }

  async function applyNavDock() {
    // 激活条件：仓库主页；悬浮球常驻显示，所有设备（含桌面）可用
    if (!isRepoHomePath()) {
      clearNavDockRetry();
      if (navDockDebounce) {
        clearTimeout(navDockDebounce);
        navDockDebounce = null;
      }
      removeNavDock();
      if (navDockObserver) {
        navDockObserver.disconnect();
        navDockObserver = null;
      }
      navDockLastBuiltPath = null;
      return;
    }
    // 进入仓库页/刷新/SPA 跨路径：递增 loadRun 序号 —— 视口变化重建
    // （MutationObserver 去抖后再次进入本函数）沿用同一 loadRun，会话不变。
    if (navDockLastBuiltPath !== location.pathname) {
      navDockLoadRunSeq++;
      navDockLastBuiltPath = location.pathname;
    }
    try {
      await buildNavDock();
      setupNavDockObserver();
    } catch (err) {
      console.error("[MGGA] nav dock: build failed:", err);
    }
  }

  function scheduleNavDockViewportCheck() {
    if (navDockDebounce) clearTimeout(navDockDebounce);
    navDockDebounce = setTimeout(() => {
      navDockDebounce = null;
      applyNavDock();
    }, 200);
  }

  /**
   * 空结果后的延迟重试：一次性定时器（不参与自激励续排）。
   * 已有排程时不重复排，避免同一窗口堆积多个定时器。
   */
  function scheduleNavDockRetry(delayMs) {
    if (navDockRetryTimer) return;
    const d = Math.min(Math.max(Number(delayMs) || 2500, 200), 5000);
    navDockRetryTimer = setTimeout(() => {
      navDockRetryTimer = null;
      if (!isRepoHomePath()) return; // 已离开仓库页：不再唤醒
      applyNavDock();
    }, d);
  }

  function clearNavDockRetry() {
    if (navDockRetryTimer) {
      clearTimeout(navDockRetryTimer);
      navDockRetryTimer = null;
    }
  }

  function setupNavDockObserver() {
    if (navDockObserver) {
      navDockObserver.disconnect();
      navDockObserver = null;
    }
    // 监视整个 body：React 注水会陆续渲染头部 nav 与文件区 nav，
    // 仅监视头部会漏掉文件区注水；重建由签名短路去抖
    navDockObserver = new MutationObserver((mutations) => {
      // 忽略本脚本自身产生的变更（样式注入 / dock DOM / 守卫标记）
      for (const mutation of mutations) {
        const t = mutation.target;
        if (t && t.nodeType === 1 && t.closest && t.closest("[data-mgga-mutation-guard]")) {
          continue;
        }
        scheduleNavDockViewportCheck();
        return;
      }
    });
    navDockObserver.observe(document.body, { childList: true, subtree: true });
  }

  // === Turbo/SPA 导航与初始化 ===
  let spaNavTimer = null;
  function handleSpaNavigation() {
    if (spaNavTimer) clearTimeout(spaNavTimer);
    spaNavTimer = setTimeout(() => {
      // 移动端布局修正：所有仓库页都重新应用（不限 Release）
      applyMobileLayoutFix();
      applyNavDock();
      if (isReleasesPage()) {
        applyColors();
        processAssets();
        setupAssetsObserver();
        if (!document.getElementById("mgga-float-btn")) {
          createFloatingButton();
        }
      } else {
        if (assetsObserver) {
          assetsObserver.disconnect();
          assetsObserver = null;
        }
        applyColors();
        removeFloatingButton();
        const dialog = document.querySelector(".color-picker-dialog");
        if (dialog) {
          detachViewportAdaptation(dialog);
          dialog.remove();
        }
      }
    }, 100);
  }

  // 初始执行
  if (document.body) {
    applyNavDock();
  } else {
    document.addEventListener("DOMContentLoaded", () => applyNavDock(), { once: true });
  }
  if (isReleasesPage()) {
    processAssets();
    setupAssetsObserver();
    createFloatingButton();
  }

  // Turbo 事件 (GitHub 新版 SPA 框架)
  document.addEventListener("turbo:load", handleSpaNavigation);
  document.addEventListener("turbo:render", handleSpaNavigation);
  // pjax 事件 (旧版 SPA 框架，向后兼容)
  document.addEventListener("pjax:end", handleSpaNavigation);
  document.addEventListener("pjax:complete", handleSpaNavigation);
  // 原生历史变化事件
  window.addEventListener("popstate", handleSpaNavigation);

  // === END SVG Replace Functionality ===
})();
