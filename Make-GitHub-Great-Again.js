// ==UserScript==
// @name                    Make-GitHub-Great-Again
// @name:en                 Make-GitHub-Great-Again
// @namespace               https://github.com
// @version                 5.2
// @description             为 Release 的项目添加背景色，并识别文件系统平台类型，以及高亮自定义关键词
// @description:en          Add background colors to each item in the Release Assets list, and identify the file system platform type and custom keywords for SVG icon replacement
// @author                  https://github.com/HumanMus1c
// @match                   https://github.com/*/releases*
// @grant                   GM_addStyle
// @grant                   GM_registerMenuCommand
// @grant                   GM_getValue
// @grant                   GM_setValue
// @grant                   unsafeWindow
// @license                 MIT
// ==/UserScript==

(function () {
  // 国际化配置
  const i18n = {
    isCN: navigator.language.startsWith("zh"),
    t: function (key) {
      const texts = {
        settingsTitle: { zh: "⚙️ 设置", en: "⚙️ Settings" },
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
        menuSettings: { zh: "⚙️ 设置", en: "⚙️ Settings" },
        menuOdd: { zh: "⚙️ 设置奇数行颜色", en: "⚙️ Set Odd Row Color" },
        menuEven: { zh: "⚙️ 设置偶数行颜色", en: "⚙️ Set Even Row Color" },
        menuHover: { zh: "⚙️ 设置悬停行颜色", en: "⚙️ Set Hover Row Color" },
        menuReset: { zh: "🔄 重置为默认颜色", en: "🔄 Reset to Default Colors" },
        keywordColor: { zh: "关键词颜色", en: "Keyword Color" },
        builtinPicker: { zh: "初始化内置颜色选择器...", en: "Initializing built-in color picker..." },
        formatToggle: { zh: "点击切换颜色格式（HEX ↔ RGB ↔ HSL）", en: "Click to toggle format (HEX ↔ RGB ↔ HSL)" },
        clear: { zh: "清除", en: "Clear" },
        noKeywords: { zh: "暂无自定义关键词", en: "No custom keywords" }
      };
      return texts[key] ? (this.isCN ? texts[key].zh : texts[key].en) : key;
    }
  };

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

  // 创建样式元素并添加到文档头部
  const styleElement = document.createElement("style");
  styleElement.id = "Make-GitHub-Great-Again-style";
  document.head.appendChild(styleElement);

  // 应用颜色的函数 - 根据当前主题动态更新样式
  function applyColors(overrides = null) {
    const theme = getCurrentTheme();
    const themeKey = `customColors${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
    const customColors = GM_getValue(themeKey, null);
    const colors = (overrides && overrides.colors) || customColors || getDefaultColors();

    // 获取切换状态
    const isOddEnabled = overrides && overrides.toggles ? overrides.toggles.odd : GM_getValue("colorToggleOdd", true);
    const isEvenEnabled = overrides && overrides.toggles ? overrides.toggles.even : GM_getValue("colorToggleEven", true);
    const isHoverEnabled = overrides && overrides.toggles ? overrides.toggles.hover : GM_getValue("colorToggleHover", true);

    // 动态更新样式
    styleElement.textContent = `
            .Box.Box--condensed li.Box-row:nth-child(odd) {
                background-color: ${isOddEnabled ? colors.oddRowColor : "transparent"} !important;
            }
            .Box.Box--condensed li.Box-row:nth-child(even) {
                background-color: ${isEvenEnabled ? colors.evenRowColor : "transparent"} !important;
            }
            .Box.Box--condensed li.Box-row:hover {
                background-color: ${isHoverEnabled ? colors.hoverColor : "transparent"} !important;
            }
        `;

    // 如果对话框是打开的，更新对话框中的颜色 (仅在非预览模式下更新，防止实时调整被重置)
    const dialog = document.querySelector(".color-picker-dialog.visible");
    if (dialog && !overrides) {
      updateDialogColors();
    }
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
    const versionStr =
      typeof GM_info !== "undefined" ? GM_info.script.version : "4.1";
    if (title) {
      const themeLabel = currentTheme === "dark" ? i18n.t("darkTheme") : i18n.t("lightTheme");
      title.innerHTML = `${i18n.t("settingsTitle")} <span style="font-size: 0.8em; font-weight: normal; opacity: 0.7;">v${versionStr}</span> <span style="font-size: 0.6em; font-weight: normal; opacity: 0.5;">(${themeLabel})</span>`;
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
          applyColors();
          break;
        }
      }
    });

    // 监听系统主题变化
    const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeMedia.addEventListener("change", applyColors);

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
            top: 50%; /* 垂直居中 */
            left: 1em; /* 距离左侧缩进跟随缩放 */
            transform: translateY(-50%) translateX(-100%);
            border-radius: 0.5em;
            padding: 1.25em;
            box-shadow: 0 0.15em 1.5em rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: max-content !important;
            font-family: inherit; /* 继承页面字体 */
            font-size: var(--mgga-text-scale); /* 文本字体总体缩放 */

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
        }

        .color-picker-title {
            font-weight: bold;
            margin: 0;
            font-size: 1.25em;
        }

        .color-picker-close {
            cursor: pointer;
            padding: 0.3em 0.6em;
            font-size: 1.5em;
            transition: all 0.3s ease;
        }

        .color-picker-close:hover {
            transform: scale(1.1);
        }

        .color-picker-content {
            display: flex;
            flex-direction: column;
            gap: 0.75em;
        }

        .color-picker-row {
            display: flex;
            align-items: center;
            gap: 0.75em;
            justify-content: space-between;
        }

        .menu-command {
            font-size: 1em;
            font-weight: 500;
            min-width: 8em;
            display: inline-flex;
            align-items: center;
            gap: 0.3em;
            flex-wrap: nowrap;
        }

        .button-row {
            display: flex;
            justify-content: flex-end;
            gap: 0.75em;
            margin-top: 0.75em;
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
        .custom-keyword-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.4em 0.6em;
            background: rgba(125, 125, 125, 0.1);
            border-radius: 0.3em;
            margin-bottom: 0.4em;
            font-size: 0.9em;
        }

        .custom-keyword-item .keyword-text {
            font-weight: bold;
            flex-grow: 1;
        }

        .custom-keyword-item .keyword-color {
            width: 1.25em;
            height: 1.25em;
            border-radius: 0.3em;
            margin: 0 0.5em;
            border: 1px solid rgba(125, 125, 125, 0.3);
            flex-shrink: 0;
        }

        .custom-keyword-item .keyword-remove {
            color: #d73a49;
            cursor: pointer;
            font-weight: bold;
            font-size: 1.1em;
        }

        .custom-keyword-item .keyword-remove:hover {
            color: #cb2431;
        }

        .color-toggle-btn {
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
            min-width: fit-content;
            display: flex;
            flex-direction: column;
            gap: 0.6em;
            max-width: 90vw;
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
        }

        .color-picker-library-item {
            flex: 0 1 auto;
            min-width: fit-content;
            padding: 0.6em;
            border: 1px solid rgba(125, 125, 125, 0.2);
            border-radius: 0.3em;
            background: rgba(125, 125, 125, 0.05);
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
            width: 250px; /* 固定宽度，防止切换模式时抖动 */
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

  // 创建颜色选择器对话框
  function createColorPickerDialog() {
    // 关键修复：如果对话框已存在，先移除旧的，确保每次打开都是全新的状态和作用域
    const existingDialog = document.querySelector(".color-picker-dialog");
    if (existingDialog) {
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

    // 创建新的对话框
    dialog = document.createElement("div");
    dialog.className = "color-picker-dialog";
    dialog.innerHTML = `
            <div class="color-picker-header">
                <h3 class="color-picker-title">${i18n.t("settingsTitle")} <span style="font-size: 0.8em; font-weight: normal; opacity: 0.7;">v${typeof GM_info !== "undefined" ? GM_info.script.version : "4.1"}</span></h3>
                <span class="color-picker-close" title="${i18n.t("close")}">&times;</span>
            </div>
            <div class="color-picker-content">
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleOddRowBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("oddRow")}</span>
                    <button class="color-button" id="oddRowColorBtn" style="background-color: ${customColors.oddRowColor}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleEvenRowBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("evenRow")}</span>
                    <button class="color-button" id="evenRowColorBtn" style="background-color: ${customColors.evenRowColor}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="toggleHoverBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("hoverRow")}</span>
                    <button class="color-button" id="hoverColorBtn" style="background-color: ${customColors.hoverColor}"></button>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command"><button class="color-toggle-btn" id="svgToggleBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("svgIdentify")}</span>
                </div>
                <div style="margin-top: 0.75em; border-top: 1px solid rgba(125, 125, 125, 0.2); padding-top: 0.75em;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                        <span class="menu-command"><button class="color-toggle-btn" id="highlightToggleBtn" title="${i18n.t("enabledTitle")}">✓</button>${i18n.t("highlightTitle")}</span>
                    </div>
                    <div id="customKeywordsContainer" style="max-height: 8.5em; overflow-y: auto; margin-bottom: 0.5em;">
                        <!-- 动态渲染关键词列表 -->
                    </div>
                    <div style="display: flex; gap: 0.5em; align-items: center;">
                        <input type="text" id="newKeywordInput" placeholder="${i18n.t("newKeywordPlaceholder")}" style="flex: 1; padding: 0.4em; border-radius: 0.3em; border: 1px solid var(--arch-border, #d0d7de); background: transparent; color: inherit; font-size: 1em;">
                        <button class="color-button" id="newKeywordColorBtn" style="background-color: #ffeb3b; width: 2.2em; height: 2.2em; padding: 0; border: 1px solid rgba(125,125,125,0.3); cursor: pointer; border-radius: 0.3em;"></button>
                        <button id="addKeywordBtn" title="${i18n.t("add")}" style="background: #2da44e; color: white; border: none; border-radius: 0.3em; padding: 0.4em 0.8em; cursor: pointer; font-weight: bold; font-size: var(--mgga-btn-scale);">${i18n.t("add")}</button>
                    </div>
                </div>

                <div class="button-row" style="margin-top: 1em;">
        <button class="dialog-button reset-button" title="${i18n.t("resetTitle")}">${i18n.t("reset")}</button>
          <div style="margin-left: auto; display: flex; gap: 0.75em;">
            <button class="dialog-button cancel-button" id="cancelDialogBtn">${i18n.t("cancel")}</button>
            <button class="dialog-button confirm-button" id="confirmDialogBtn">${i18n.t("confirm")}</button>
          </div>
        </div>
        `;

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
      const rgbToHex = (rgb) => {
        if (!rgb || rgb === "transparent") return "#000000";
        if (rgb.startsWith("#")) return rgb;
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
          return (
            "#" +
            [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase()
          );
        }
        return rgb;
      };

      // 每次刷新都从 DOM 中实时获取最新的按钮引用，确保闭包不会失效
      const btnOdd = dialog.querySelector("#oddRowColorBtn");
      const btnEven = dialog.querySelector("#evenRowColorBtn");
      const btnHover = dialog.querySelector("#hoverColorBtn");

      applyColors({
        colors: {
          oddRowColor: rgbToHex(btnOdd ? btnOdd.style.backgroundColor : ""),
          evenRowColor: rgbToHex(btnEven ? btnEven.style.backgroundColor : ""),
          hoverColor: rgbToHex(btnHover ? btnHover.style.backgroundColor : ""),
        },
        toggles: colorToggleState,
      });
    };

    // 初始化 SVG 切换状态
    const svgToggleBtn = dialog.querySelector("#svgToggleBtn");
    if (svgToggleBtn) {
      let isSvgEnabled = GM_getValue("svgEnabled", true);

      // 更新按钮UI的函数
      const updateSvgBtnUI = (enabled) => {
        svgToggleBtn.classList.toggle("disabled", !enabled);
        svgToggleBtn.innerHTML = enabled ? "✓" : "✕";
        svgToggleBtn.title = enabled ? i18n.t("enabledTitle") : i18n.t("disabledTitle");
      };

      updateSvgBtnUI(isSvgEnabled);

      svgToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSvgEnabled = !isSvgEnabled;
        GM_setValue("svgEnabled", isSvgEnabled);
        updateSvgBtnUI(isSvgEnabled);
        processAssets();
      });
    }

    // 初始化关键词高亮切换状态
    const highlightToggleBtn = dialog.querySelector("#highlightToggleBtn");
    if (highlightToggleBtn) {
      let isHighlightEnabled = GM_getValue("highlightEnabled", true);

      // 更新按钮UI的函数
      const updateHighlightBtnUI = (enabled) => {
        highlightToggleBtn.classList.toggle("disabled", !enabled);
        highlightToggleBtn.innerHTML = enabled ? "✓" : "✕";
        highlightToggleBtn.title = enabled
          ? i18n.t("enabledTitle")
          : i18n.t("disabledTitle");
      };

      updateHighlightBtnUI(isHighlightEnabled);

      highlightToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isHighlightEnabled = !isHighlightEnabled;
        GM_setValue("highlightEnabled", isHighlightEnabled);
        updateHighlightBtnUI(isHighlightEnabled);
        processAssets();
      });
    }

    // 获取元素引用
    const closeBtn = dialog.querySelector(".color-picker-close");
    const cancelBtn = dialog.querySelector(".cancel-button");
    const confirmBtn = dialog.querySelector(".confirm-button");
    const resetBtn = dialog.querySelector(".reset-button");

    // 验证和规范化HEX颜色值
    const validateHexColor = (hex) => {
      const hexRegex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
      if (hexRegex.test(hex)) {
        return hex.startsWith("#") ? hex : "#" + hex;
      }
      return null;
    };

    const defaultColors =
      getCurrentTheme() === "dark" ? defaultColorsDark : defaultColorsLight;

    // 创建自定义color picker子面板
    const createColorPickerPanel = (colorBtn, colorName, defaultColor) => {
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

      // HEX/RGB/HSL转换函数
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      };

      const rgbToHex = (r, g, b) => {
        return (
          "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
        );
      };

      const updateAllPickers = (newColor) => {
        currentColor = newColor;
        if (hexInput) hexInput.value = newColor;
        if (preview) preview.style.backgroundColor = newColor;
        
        // 关键修复：直接修改 colorBtn 的 style 属性
        if (colorBtn) {
          colorBtn.style.backgroundColor = newColor;
          colorBtn.title = `${colorName}: ${newColor}`; // 实时更新按钮提示文字
        }

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

      // 定义转换函数（用于内置颜色选择器）
      const hslToHex = (h, s, l) => {
        h = parseInt(h);
        s = parseInt(s) / 100;
        l = parseInt(l) / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const hh = h / 60;
        const x = c * (1 - Math.abs((hh % 2) - 1));
        let r = 0,
          g = 0,
          b = 0;

        if (hh <= 1) {
          r = c;
          g = x;
          b = 0;
        } else if (hh <= 2) {
          r = x;
          g = c;
          b = 0;
        } else if (hh <= 3) {
          r = 0;
          g = c;
          b = x;
        } else if (hh <= 4) {
          r = 0;
          g = x;
          b = c;
        } else if (hh <= 5) {
          r = x;
          g = 0;
          b = c;
        } else {
          r = c;
          g = 0;
          b = x;
        }

        const m = l - c / 2;
        const toHex = (n) => {
          const hex = Math.round((n + m) * 255).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        };

        return "#" + toHex(r) + toHex(g) + toHex(b);
      };

      const hexToHSL = (color) => {
        let r, g, b;

        if (color.startsWith("#")) {
          if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16) / 255;
            g = parseInt(color[2] + color[2], 16) / 255;
            b = parseInt(color[3] + color[3], 16) / 255;
          } else {
            r = parseInt(color.slice(1, 3), 16) / 255;
            g = parseInt(color.slice(3, 5), 16) / 255;
            b = parseInt(color.slice(5, 7), 16) / 255;
          }
        } else if (color.startsWith("rgb")) {
          const match = color.match(/\d+/g);
          if (match) {
            r = parseInt(match[0]) / 255;
            g = parseInt(match[1]) / 255;
            b = parseInt(match[2]) / 255;
          }
        }

        // 兜底方案
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return { h: 0, s: 0, l: 50 };
        }

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

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

        // RGB到HSL转换函数
        const rgbToHSL = (r, g, b) => {
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

          let h = 0;
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          else if (max === g) h = ((b - r) / d + 2) / 6;
          else h = ((r - g) / d + 4) / 6;

          return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
          };
        };

        // HSL到RGB转换函数
        const hslToRGB = (h, s, l) => {
          h = h / 360;
          s = s / 100;
          l = l / 100;

          let r, g, b;

          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };

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
        };

        // RGB到HEX转换函数
        const rgbToHex = (r, g, b) => {
          return (
            "#" +
            [r, g, b]
              .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
              })
              .join("")
              .toUpperCase()
          );
        };

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
    };

    // 打开/关闭color picker子面板
    const toggleColorPickerPanel = (colorBtn, colorName, defaultColor) => {
      // 关闭其他开放的面板
      document.querySelectorAll(".custom-color-picker-panel").forEach((p) => {
        if (p._closeHandler) {
          document.removeEventListener("click", p._closeHandler);
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
          panel = createColorPickerPanel(colorBtn, colorName, defaultColor);
        } catch (err) {
          console.error("[MGGA] createColorPickerPanel error:", err);
          return;
        }
        panel._associatedBtn = colorBtn; // 建立双向引用以便清理
        const rect = colorBtn.getBoundingClientRect();

        // 智能定位，避免超出屏幕
        let left = rect.right + 10;
        let top = rect.top;

        // 监听面板加载完成后调整位置
        setTimeout(() => {
          const panelRect = panel.getBoundingClientRect();

          // 如果超出右边界，改为左侧显示
          if (left + panelRect.width > window.innerWidth - 10) {
            left = rect.left - panelRect.width - 10;
          }

          // 如果超出下边界，向上调整
          if (top + panelRect.height > window.innerHeight - 10) {
            top = window.innerHeight - panelRect.height - 10;
          }

          // 确保不超出上边界
          if (top < 10) {
            top = 10;
          }

          panel.style.left = left + "px";
          panel.style.top = top + "px";
        }, 50);

        panel.style.left = left + "px";
        panel.style.top = top + "px";
        document.body.appendChild(panel);
        colorBtn._panel = panel;

        // 点击其他地方关闭面板
        const closeHandler = (e) => {
          // 检查是否点击了颜色按钮本身，如果是则不关闭（因为会再次打开）
          if (e.target === colorBtn || colorBtn.contains(e.target)) return;

          // 检查是否在面板内部点击
          if (panel.contains(e.target)) return;

          // 执行关闭
          panel.remove();
          colorBtn._panel = null;
          document.removeEventListener("click", closeHandler);
        };
        panel._closeHandler = closeHandler; // 保存引用以便外部清理
        setTimeout(() => document.addEventListener("click", closeHandler), 0);
      }
    };

    // 颜色按钮点击事件
    const handleColorBtnClick = (e, btn, name) => {
      e.stopPropagation();
      const currentColor = btn.style.backgroundColor || 
                          (name === "奇数行" ? customColors.oddRowColor : 
                           name === "偶数行" ? customColors.evenRowColor : 
                           customColors.hoverColor);
      toggleColorPickerPanel(btn, name, currentColor);
    };

    oddRowColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, oddRowColorBtn, "奇数行");
    });

    evenRowColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, evenRowColorBtn, "偶数行");
    });

    hoverColorBtn.addEventListener("click", (e) => {
      handleColorBtnClick(e, hoverColorBtn, "悬停");
    });

    // === 禁用/启用上色功能切换按钮 ===
    const updateToggleBtnUI = (btn, isEnabled) => {
      if (isEnabled) {
        btn.classList.remove("disabled");
        btn.innerHTML = "✓";
        btn.title = "已启用，点击禁用";
      } else {
        btn.classList.add("disabled");
        btn.innerHTML = "✕";
        btn.title = "已禁用，点击启用";
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
          `确定要重置${resetTheme === "dark" ? "暗色" : "亮色"}主题的自定义颜色吗？`,
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

    // 处理自定义关键词列表的渲染
    let activeKeywords = GM_getValue("userCustomKeywords", []);

    const renderKeywords = () => {
      const container = dialog.querySelector("#customKeywordsContainer");
      if (!container) return;
      container.innerHTML = "";

      if (activeKeywords.length === 0) {
        container.innerHTML =
          `<div style="color: gray; font-size: 0.9em; text-align: center; padding: 0.5em 0;">${i18n.t("noKeywords")}</div>`;
        return;
      }

      activeKeywords.forEach((kw, index) => {
        const item = document.createElement("div");
        item.className = "custom-keyword-item";
        item.innerHTML = `
                    <span class="keyword-text">${kw.text}</span>
                    <span class="keyword-color" style="background-color: ${kw.color}"></span>
                    <span class="keyword-remove" data-index="${index}" title="删除">&times;</span>
                `;
        container.appendChild(item);
      });

      // 绑定删除事件
      container.querySelectorAll(".keyword-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(e.target.dataset.index);
          activeKeywords.splice(idx, 1);
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
        );
      });
    }

    if (addKeywordBtn && newKeywordInput && newKeywordColorBtn) {
      addKeywordBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const text = newKeywordInput.value.trim();
        const color =
          newKeywordColorBtn.style.backgroundColor || "#ffeb3b";

        // 将可能存在的 RGB 格式转换为 HEX 以保持一致性
        const rgbToHex = (rgb) => {
          if (rgb.startsWith("#")) return rgb;
          const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
          if (match) {
            return (
              "#" +
              [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("")
                .toUpperCase()
            );
          }
          return rgb;
        };

        const hexColor = rgbToHex(color);

        if (text) {
          const existingIndex = activeKeywords.findIndex(
            (kw) => kw.text.toLowerCase() === text.toLowerCase(),
          );
          if (existingIndex !== -1) {
            activeKeywords[existingIndex].color = hexColor;
          } else {
            activeKeywords.push({ text, color: hexColor });
          }

          newKeywordInput.value = "";
          renderKeywords();
        }
      });
    }

    // 确认按钮功能 - 修复：只保存到当前主题
    confirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // 动态获取当前主题
      const saveTheme = getCurrentTheme();

      // 定义转换函数
      const rgbToHex = (rgb) => {
        if (!rgb || rgb === "transparent") return "";
        if (rgb.startsWith("#")) return rgb;
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
          return (
            "#" +
            [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase()
          );
        }
        return rgb;
      };

      // 直接从按钮元素的 style 属性获取最新值
      const btnOdd = dialog.querySelector("#oddRowColorBtn");
      const btnEven = dialog.querySelector("#evenRowColorBtn");
      const btnHover = dialog.querySelector("#hoverColorBtn");

      const newOddColor = rgbToHex(btnOdd ? btnOdd.style.backgroundColor : "");
      const newEvenColor = rgbToHex(btnEven ? btnEven.style.backgroundColor : "");
      const newHoverColor = rgbToHex(btnHover ? btnHover.style.backgroundColor : "");

      // 如果 style 为空，则作为降级方案获取计算样式
      const finalOddColor = newOddColor || rgbToHex(btnOdd ? window.getComputedStyle(btnOdd).backgroundColor : "");
      const finalEvenColor = newEvenColor || rgbToHex(btnEven ? window.getComputedStyle(btnEven).backgroundColor : "");
      const finalHoverColor = newHoverColor || rgbToHex(btnHover ? window.getComputedStyle(btnHover).backgroundColor : "");

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

      // 保存自定义关键词状态
      GM_setValue("userCustomKeywords", activeKeywords);

      closeDialog(dialog);
      applyColors(); // 动态更新颜色

      // 重新应用高亮及图标（恢复后再替换以刷新高亮）
      if (typeof processAssets === "function") {
        // 强制还原原版文本以便刷新高亮
        const assetItems = document.querySelectorAll(
          ".Box.Box--condensed li.Box-row",
        );
        assetItems.forEach((item) => {
          if (item.dataset.highlightProcessed === "true") {
            const link = item.querySelector(
              "div.d-flex.flex-justify-start.col-12.col-lg-6 > a",
            );
            if (link && item._originalFileName) {
              link.innerHTML = item._originalFileName;
            }
            item.dataset.highlightProcessed = "false";
          }
        });

        // 强制重新生成样式并重新高亮
        const existingStyle = document.getElementById("MGGA-custom-arch-style");
        if (existingStyle) existingStyle.remove();
        if (typeof window.initializeArchStyles === "function") {
          window.initializeArchStyles();
        }
        setTimeout(() => processAssets(), 10);
      }
    });

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

    // 触发重绘
    void dialog.offsetHeight;

    // 添加可见类触发动画
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

    // 同时关闭所有打开的颜色选择器子面板
    document.querySelectorAll(".custom-color-picker-panel").forEach((p) => {
      if (p._closeHandler) {
        document.removeEventListener("click", p._closeHandler);
      }
      p.remove();
    });

    // 恢复悬浮按钮
    const floatBtn = document.getElementById("mgga-float-btn");
    if (floatBtn) {
      floatBtn.classList.remove("hidden-to-right");
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

  // 注册油猴菜单选项
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
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.oddRowColor = newColor;

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
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.evenRowColor = newColor;

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
      // 获取或创建当前主题的自定义颜色
      const updatedColors = customColors
        ? { ...customColors }
        : { ...defaultColors };
      updatedColors.hoverColor = newColor;

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
      keywords: [".exe", ".msi", "win", "windows", "setup", "installer"],
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

  // HEX转RGB辅助函数
  function hexToRgb(hex) {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return { r, g, b };
  }

  // 判断颜色是否偏暗
  function isDarkColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    // 使用YIQ公式判断亮度
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128; // 小于128认为是暗色
  }

  // 初始化样式和动态关键词的函数
  let allCombinedKeywords = [...archKeywords];

  window.initializeArchStyles = function () {
    let dynamicStyles = "";

    // 基础图标及静态样式
    let baseStyles = `
            /* 图标样式 */
            .custom-svg-icon {
                width: 1.5em; height: 1.5em; min-width: 1.5em;
                vertical-align: middle; flex-shrink: 0; margin-right: 8px;
            }
            .Box-row .d-flex.flex-justify-start.col-12.col-lg-6 {
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
        // aarch64 使用与 x86_64 相同的颜色
        if (x86_64Hue !== null) {
          hue = x86_64Hue;
        } else {
          currentHue += goldenRatioConjugate;
          currentHue %= 1;
          hue = Math.floor(currentHue * 360);
        }
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

    // 处理自定义关键词
    const userKeywords = GM_getValue("userCustomKeywords", []);

    userKeywords.forEach((kw) => {
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

    // 更新词典
    allCombinedKeywords = [
      ...userKeywords.map((k) => k.text),
      ...archKeywords,
    ].sort((a, b) => b.length - a.length); // 确保长词优先匹配
  };

  // 初始化样式
  window.initializeArchStyles();

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
      const userKeywords = GM_getValue("userCustomKeywords", []);
      const isUserKwd = userKeywords.some(
        (kw) => kw.text.toLowerCase() === lowerMatch,
      );

      let className = "";
      if (isUserKwd) {
        className = `user-kw-${lowerMatch.replace(/[^a-zA-Z0-9]/g, "-")}`;
      } else {
        className = `arch-${lowerMatch.replace(/[^a-zA-Z0-9]/g, "-")}`;
      }
      return `<span class="arch-highlight ${className}">${match}</span>`;
    });

    return result;
  }

  // 统筹处理文件资源的SVG图标和高亮
  function processAssets() {
    const isSvgEnabled = GM_getValue("svgEnabled", true);
    const isHighlightEnabled = GM_getValue("highlightEnabled", true);
    const assetItems = document.querySelectorAll(
      ".Box.Box--condensed li.Box-row",
    );

    assetItems.forEach((item) => {
      const link = item.querySelector(
        "div.d-flex.flex-justify-start.col-12.col-lg-6 > a",
      );
      if (!link) return;

      const fileName = link.textContent;
      const svgContainer = item.querySelector(
        "div.d-flex.flex-justify-start.col-12.col-lg-6",
      );
      if (!svgContainer) return;

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
            const regex = new RegExp(
              `(^|[^a-z])${escapedKeyword}([^a-z]|$)`,
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

          if (matchedRule) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = matchedRule.svg;
            const newSvg = tempDiv.firstChild;
            newSvg.classList.add("custom-svg-icon");

            const activeSvg = svgContainer.querySelector("svg");
            if (activeSvg) {
              svgContainer.replaceChild(newSvg, activeSvg);
            }
          }
          item.dataset.svgProcessed = "true";
        }
      } else {
        if (item.dataset.svgProcessed === "true") {
          const customSvg = svgContainer.querySelector("svg.custom-svg-icon");
          if (customSvg && item._originalSvg) {
            svgContainer.replaceChild(item._originalSvg, customSvg);
          }
          item.dataset.svgProcessed = "false";
        }
      }

      // === 关键词高亮处理 ===
      if (isHighlightEnabled) {
        if (item.dataset.highlightProcessed !== "true") {
          const fileNameContainer = document.createElement("span");
          fileNameContainer.className = "file-name-container";
          fileNameContainer.innerHTML = highlightArchKeywords(originalFileName);
          link.innerHTML = "";
          link.appendChild(fileNameContainer);
          item.dataset.highlightProcessed = "true";
        }
      } else {
        if (item.dataset.highlightProcessed === "true") {
          link.innerHTML = originalFileName;
          item.dataset.highlightProcessed = "false";
        }
      }
    });
  }

  // 设置观察器监听assets列表变化
  function setupAssetsObserver() {
    const targetNode =
      document.getElementById("repo-content-pjax-container") || document.body;

    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          needsUpdate = true;
          break;
        }
      }

      if (needsUpdate) {
        processAssets();
      }
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  }

  // 初始化替换
  processAssets();
  setupAssetsObserver();

  // 初始化悬浮齿轮按钮
  function createFloatingButton() {
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
        btn.style.top = `${startTop + dy}px`;
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
  }
  createFloatingButton();

  // === END SVG Replace Functionality ===
})();
