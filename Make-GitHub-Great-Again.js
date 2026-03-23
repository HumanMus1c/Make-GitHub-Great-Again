// ==UserScript==
// @name                    Make-GitHub-Great-Again
// @name:en                 Make-GitHub-Great-Again
// @namespace               https://github.com
// @version                 3.5
// @description             为 Release Assets 每条条目添加交替的背景色，并根据文件名关键词替换SVG图标
// @description:en          Add alternating background colors to each item in the Release Assets list, and replace SVG icons based on filename keywords
// @author                  https://github.com/HumanMus1c
// @match                   https://github.com/*/releases*
// @grant                    GM_addStyle
// @grant                    GM_registerMenuCommand
// @grant                    GM_getValue
// @grant                    GM_setValue
// @grant                    unsafeWindow
// @license                  MIT
// ==/UserScript==

(function () {
    // 更可靠的主题检测函数
    function getCurrentTheme() {
        // 检测GitHub的显式主题设置
        const explicitTheme = document.documentElement.getAttribute('data-color-mode');
        if (explicitTheme === 'light' || explicitTheme === 'dark') {
            return explicitTheme;
        }

        // 检测GitHub的类名主题设置
        if (document.documentElement.classList.contains('dark')) {
            return 'dark';
        }

        // 检测系统级主题设置
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // 默认颜色配置（亮色主题）
    const defaultColorsLight = {
        oddRowColor: "#f8f9fa",
        evenRowColor: "#ffffff",
        hoverColor: "#e9ecef"
    };

    // 默认颜色配置（暗色主题）
    const defaultColorsDark = {
        oddRowColor: "#161b22",
        evenRowColor: "#0d1117",
        hoverColor: "#30363d"
    };

    // 获取当前主题的默认颜色
    function getDefaultColors() {
        return getCurrentTheme() === 'dark' ? defaultColorsDark : defaultColorsLight;
    }

    // 创建样式元素并添加到文档头部
    const styleElement = document.createElement('style');
    styleElement.id = 'Make-GitHub-Great-Again-style';
    document.head.appendChild(styleElement);

    // 应用颜色的函数 - 根据当前主题动态更新样式
    function applyColors() {
        const theme = getCurrentTheme();
        const themeKey = `customColors${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
        const customColors = GM_getValue(themeKey, null);
        const colors = customColors || getDefaultColors();

        // 动态更新样式
        styleElement.textContent = `
            .Box.Box--condensed li.Box-row:nth-child(odd) {
                background-color: ${colors.oddRowColor} !important;
            }
            .Box.Box--condensed li.Box-row:nth-child(even) {
                background-color: ${colors.evenRowColor} !important;
            }
            .Box.Box--condensed li.Box-row:hover {
                background-color: ${colors.hoverColor} !important;
            }
        `;

        // 如果对话框是打开的，更新对话框中的颜色
        const dialog = document.querySelector('.color-picker-dialog.visible');
        if (dialog) {
            updateDialogColors();
        }
    }

    // 更新对话框中的颜色显示
    function updateDialogColors() {
        const dialog = document.querySelector('.color-picker-dialog');
        if (!dialog) return;

        const currentTheme = getCurrentTheme();
        const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
        const customColors = GM_getValue(themeKey, null);
        const colors = customColors || (currentTheme === 'dark' ? defaultColorsDark : defaultColorsLight);

        // 更新标题
        const title = dialog.querySelector('.color-picker-title');
        if (title) {
            title.textContent = `颜色选择器 (${currentTheme === 'dark' ? '暗色主题' : '亮色主题'})`;
        }

        // 更新颜色按钮
        const oddRowColorBtn = dialog.querySelector('#oddRowColorBtn');
        const evenRowColorBtn = dialog.querySelector('#evenRowColorBtn');
        const hoverColorBtn = dialog.querySelector('#hoverColorBtn');

        if (oddRowColorBtn) oddRowColorBtn.style.backgroundColor = colors.oddRowColor;
        if (evenRowColorBtn) evenRowColorBtn.style.backgroundColor = colors.evenRowColor;
        if (hoverColorBtn) hoverColorBtn.style.backgroundColor = colors.hoverColor;

        // 更新颜色选择器值
        const oddRowColorPicker = dialog.querySelector('#oddRowColorPicker');
        const evenRowColorPicker = dialog.querySelector('#evenRowColorPicker');
        const hoverColorPicker = dialog.querySelector('#hoverColorPicker');

        if (oddRowColorPicker) oddRowColorPicker.value = colors.oddRowColor;
        if (evenRowColorPicker) evenRowColorPicker.value = colors.evenRowColor;
        if (hoverColorPicker) hoverColorPicker.value = colors.hoverColor;
    }

    // 初始应用颜色
    applyColors();

    // 监听主题变化并动态更新样式
    function setupThemeObserver() {
        // 监听HTML元素的属性变化
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'data-color-mode' ||
                    mutation.attributeName === 'class') {
                    applyColors();
                    break;
                }
            }
        });

        // 监听系统主题变化
        const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeMedia.addEventListener('change', applyColors);

        // 开始观察文档元素
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-color-mode', 'class']
        });
    }

    // 设置主题观察器
    setupThemeObserver();

    // 添加CSS样式 - 对话框样式（固定不变）
    GM_addStyle(`
        /* 对话框样式 - 修复主题跟随问题 */
        .color-picker-dialog {
            position: fixed;
            top: 50%; /* 垂直居中 */
            left: 15px; /* 距离左侧15px */
            transform: translateY(-50%) translateX(-100%);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: max-content !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;

            /* 初始状态 - 不可见 */
            opacity: 0;
            visibility: hidden;
            pointer-events: none;

            /* 过渡动画设置 */
            transition: opacity 0.5s ease, visibility 0.5s ease, transform 0.5s ease;
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
            margin-bottom: 20px;
            padding-bottom: 10px;
        }

        .color-picker-title {
            font-weight: bold;
            margin: 0;
            font-size: 18px;
        }

        .color-picker-close {
            cursor: pointer;
            padding: 5px 10px;
            font-size: 24px;
            transition: all 0.3s ease;
        }

        .color-picker-close:hover {
            transform: scale(1.1);
        }

        .color-picker-content {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .color-picker-row {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
        }

        .menu-command {
            font-size: 16px;
            font-weight: 500;
            min-width: 120px;
        }

        .button-row {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 10px;
        }

        .dialog-button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
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
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .color-button:hover {
            transform: scale(1.1);
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }

        .color-picker-container {
            position: relative;
            display: inline-block;
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
    `);

    // 创建颜色选择器对话框
    function createColorPickerDialog() {
        // 如果对话框已存在，则显示它并更新颜色
        let dialog = document.querySelector('.color-picker-dialog');
        if (dialog) {
            updateDialogColors();
            openDialog(dialog);
            return;
        }

        // 获取当前主题
        const currentTheme = getCurrentTheme();

        // 获取当前主题的自定义颜色（如果存在）
        let customColors = GM_getValue(`customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`, null);

        // 如果没有自定义颜色，使用当前主题的默认颜色
        if (!customColors) {
            customColors = currentTheme === 'dark' ? defaultColorsDark : defaultColorsLight;
        }

        // 创建新的对话框
        dialog = document.createElement('div');
        dialog.className = 'color-picker-dialog';
        dialog.innerHTML = `
            <div class="color-picker-header">
                <h3 class="color-picker-title">⚙️ 设置</h3>
                <span class="color-picker-close" title="关闭">&times;</span>
            </div>
            <div class="color-picker-content">
                <div class="color-picker-row">
                    <span class="menu-command">⚙️ 设置奇数行颜色</span>
                    <div class="color-picker-container">
                        <button class="color-button" id="oddRowColorBtn" style="background-color: ${customColors.oddRowColor}"></button>
                        <input type="color" id="oddRowColorPicker" value="${customColors.oddRowColor}">
                    </div>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command">⚙️ 设置偶数行颜色</span>
                    <div class="color-picker-container">
                        <button class="color-button" id="evenRowColorBtn" style="background-color: ${customColors.evenRowColor}"></button>
                        <input type="color" id="evenRowColorPicker" value="${customColors.evenRowColor}">
                    </div>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command">⚙️ 设置悬停颜色</span>
                    <div class="color-picker-container">
                        <button class="color-button" id="hoverColorBtn" style="background-color: ${customColors.hoverColor}"></button>
                        <input type="color" id="hoverColorPicker" value="${customColors.hoverColor}">
                    </div>
                </div>
                <div class="color-picker-row">
                    <span class="menu-command">📦 替换 SVG 图标</span>
                    <div class="color-picker-container">
                        <button class="color-button" id="svgToggleBtn" style="display: flex; align-items: center; justify-content: center; font-size: 22px; padding: 0; background-color: transparent;"></button>
                    </div>
                </div>
                <div class="button-row">
        <button class="dialog-button reset-button" title="重置为当前主题默认颜色">重置</button>
          <div style="margin-left: auto; display: flex; gap: 10px;">
            <button class="dialog-button cancel-button">取消</button>
            <button class="dialog-button confirm-button">确认</button>
          </div>
        </div>
        `;

        document.body.appendChild(dialog);

        // 打开对话框并应用滑入动画
        openDialog(dialog);

        // 初始化 SVG 切换状态
        const svgToggleBtn = dialog.querySelector('#svgToggleBtn');
        if (svgToggleBtn) {
            let isSvgEnabled = GM_getValue('svgEnabled', true);

            // 更新按钮UI的函数
            const updateSvgBtnUI = (enabled) => {
                svgToggleBtn.innerHTML = enabled ? '✅' : '';
            };

            updateSvgBtnUI(isSvgEnabled);

            svgToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isSvgEnabled = !isSvgEnabled;
                GM_setValue('svgEnabled', isSvgEnabled);
                updateSvgBtnUI(isSvgEnabled);

                if (isSvgEnabled) {
                    replaceIcons();
                } else {
                    restoreIcons();
                }
            });
        }

        // 获取元素引用
        const closeBtn = dialog.querySelector('.color-picker-close');
        const cancelBtn = dialog.querySelector('.cancel-button');
        const confirmBtn = dialog.querySelector('.confirm-button');
        const resetBtn = dialog.querySelector('.reset-button');

        const oddRowColorBtn = dialog.querySelector('#oddRowColorBtn');
        const evenRowColorBtn = dialog.querySelector('#evenRowColorBtn');
        const hoverColorBtn = dialog.querySelector('#hoverColorBtn');

        const oddRowColorPicker = dialog.querySelector('#oddRowColorPicker');
        const evenRowColorPicker = dialog.querySelector('#evenRowColorPicker');
        const hoverColorPicker = dialog.querySelector('#hoverColorPicker');

        // 设置颜色按钮点击事件 - 打开颜色选择器
        [oddRowColorBtn, evenRowColorBtn, hoverColorBtn].forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡

                // 找到对应的颜色选择器
                const picker = btn.nextElementSibling;
                if (picker && picker.tagName === 'INPUT' && picker.type === 'color') {
                    picker.click();
                }
            });
        });

        // 颜色选择器变化事件 - 只更新按钮颜色
        oddRowColorPicker.addEventListener('input', (e) => {
            oddRowColorBtn.style.backgroundColor = e.target.value;
        });

        evenRowColorPicker.addEventListener('input', (e) => {
            evenRowColorBtn.style.backgroundColor = e.target.value;
        });

        hoverColorPicker.addEventListener('input', (e) => {
            hoverColorBtn.style.backgroundColor = e.target.value;
        });

        // 关闭按钮功能 - 应用滑出动画
        closeBtn.addEventListener('click', () => {
            closeDialog(dialog);
        });

        // 取消按钮功能 - 应用滑出动画
        cancelBtn.addEventListener('click', () => {
            closeDialog(dialog);
        });

        // 新增的重置按钮功能
        resetBtn.addEventListener('click', () => {
            const resetTheme = getCurrentTheme(); // 动态获取当前主题

            if (confirm(`确定要重置${resetTheme === 'dark' ? '暗色' : '亮色'}主题的自定义颜色吗？`)) {
                // 删除当前主题的自定义颜色设置
                GM_setValue(`customColors${resetTheme.charAt(0).toUpperCase() + resetTheme.slice(1)}`, null);

                // 关闭对话框并更新颜色
                closeDialog(dialog);
                applyColors();
            }
        });

        // 确认按钮功能 - 修复：只保存到当前主题
        confirmBtn.addEventListener('click', () => {
            // 动态获取当前主题
            const saveTheme = getCurrentTheme();

            // 从颜色选择器获取值
            const newOddColor = oddRowColorPicker.value;
            const newEvenColor = evenRowColorPicker.value;
            const newHoverColor = hoverColorPicker.value;

            // 保存为当前主题的自定义颜色
            const newCustomColors = {
                oddRowColor: newOddColor,
                evenRowColor: newEvenColor,
                hoverColor: newHoverColor
            };

            // 保存到对应主题的存储键
            GM_setValue(`customColors${saveTheme.charAt(0).toUpperCase() + saveTheme.slice(1)}`, newCustomColors);

            closeDialog(dialog);
            applyColors(); // 动态更新颜色
        });

        // 添加ESC键关闭支持
        document.addEventListener('keydown', function handleEsc(e) {
            if (e.key === 'Escape') {
                closeDialog(dialog);
            }
        });

        // 点击外部关闭
        document.addEventListener('click', function handleOutsideClick(e) {
            if (dialog && !dialog.contains(e.target)) {
                closeDialog(dialog);
            }
        });
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
        dialog.classList.add('visible');
    }

    // 关闭对话框并应用滑出动画
    function closeDialog(dialog) {
        // 移除可见类触发滑出动画
        dialog.classList.remove('visible');

        // 动画完成后移除对话框
        setTimeout(() => {
            if (dialog && dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 500); // 500ms是动画持续时间
    }

    // 注册油猴菜单选项
    GM_registerMenuCommand("⚙️ 设置", createColorPickerDialog);

    // 独立的菜单命令
    GM_registerMenuCommand("⚙️ 设置奇数行颜色", () => {
        const currentTheme = getCurrentTheme();
        const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
        const customColors = GM_getValue(themeKey, null);
        const defaultColors = currentTheme === 'dark' ? defaultColorsDark : defaultColorsLight;

        const currentColor = customColors ? customColors.oddRowColor : defaultColors.oddRowColor;

        const newColor = prompt("请输入奇数行背景色（HEX格式，如#f8f9fa）:", currentColor);
        if (newColor) {
            // 获取或创建当前主题的自定义颜色
            const updatedColors = customColors ? { ...customColors } : { ...defaultColors };
            updatedColors.oddRowColor = newColor;

            // 保存更新
            GM_setValue(themeKey, updatedColors);
            applyColors(); // 动态更新颜色
        }
    });

    GM_registerMenuCommand("⚙️ 设置偶数行颜色", () => {
        const currentTheme = getCurrentTheme();
        const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
        const customColors = GM_getValue(themeKey, null);
        const defaultColors = currentTheme === 'dark' ? defaultColorsDark : defaultColorsLight;

        const currentColor = customColors ? customColors.evenRowColor : defaultColors.evenRowColor;

        const newColor = prompt("请输入偶数行背景色（HEX格式，如#ffffff）:", currentColor);
        if (newColor) {
            // 获取或创建当前主题的自定义颜色
            const updatedColors = customColors ? { ...customColors } : { ...defaultColors };
            updatedColors.evenRowColor = newColor;

            // 保存更新
            GM_setValue(themeKey, updatedColors);
            applyColors(); // 动态更新颜色
        }
    });

    GM_registerMenuCommand("⚙️ 设置悬停颜色", () => {
        const currentTheme = getCurrentTheme();
        const themeKey = `customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
        const customColors = GM_getValue(themeKey, null);
        const defaultColors = currentTheme === 'dark' ? defaultColorsDark : defaultColorsLight;

        const currentColor = customColors ? customColors.hoverColor : defaultColors.hoverColor;

        const newColor = prompt("请输入鼠标悬停颜色（HEX格式，如#e9ecef）:", currentColor);
        if (newColor) {
            // 获取或创建当前主题的自定义颜色
            const updatedColors = customColors ? { ...customColors } : { ...defaultColors };
            updatedColors.hoverColor = newColor;

            // 保存更新
            GM_setValue(themeKey, updatedColors);
            applyColors(); // 动态更新颜色
        }
    });

    // 重置为当前主题的默认颜色
    GM_registerMenuCommand("🔄 重置为默认颜色", () => {
        const currentTheme = getCurrentTheme();

        if (confirm(`确定要重置${currentTheme === 'dark' ? '暗色' : '亮色'}主题的自定义颜色吗？`)) {
            // 删除当前主题的自定义颜色设置
            GM_setValue(`customColors${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`, null);
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
            </svg>`
        },
        {
            name: "Linux",
            keywords: [".deb", ".rpm", ".appimage", "linux", "ubuntu", "fedora", "arch", "debian", "centos", "redhat", "opensuse", "bsd", "freebsd", "openbsd", "netbsd"],
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-custom-icon="true">
                <path fill="#202020" d="M13.338 12.033c-.1-.112-.146-.319-.197-.54-.05-.22-.107-.457-.288-.61v-.001a.756.756 0 00-.223-.134c.252-.745.153-1.487-.1-2.157-.312-.823-.855-1.54-1.27-2.03-.464-.586-.918-1.142-.91-1.963.014-1.254.138-3.579-2.068-3.582-.09 0-.183.004-.28.012-2.466.198-1.812 2.803-1.849 3.675-.045.638-.174 1.14-.613 1.764-.515.613-1.24 1.604-1.584 2.637-.162.487-.24.984-.168 1.454-.023.02-.044.041-.064.063-.151.161-.263.357-.388.489-.116.116-.282.16-.464.225-.183.066-.383.162-.504.395v.001a.702.702 0 00-.077.339c0 .108.016.217.032.322.034.22.068.427.023.567-.144.395-.163.667-.061.865.102.199.31.286.547.335.473.1 1.114.075 1.619.342l.043-.082-.043.082c.54.283 1.089.383 1.526.284a.99.99 0 00.706-.552c.342-.002.717-.146 1.318-.18.408-.032.918.145 1.503.113a.806.806 0 00.068.183l.001.001c.227.455.65.662 1.1.627.45-.036.928-.301 1.315-.762l-.07-.06.07.06c.37-.448.982-.633 1.388-.878.203-.123.368-.276.38-.499.013-.222-.118-.471-.418-.805z"/>
                <path fill="#F8BF11" d="M13.571 12.828c-.007.137-.107.24-.29.35-.368.222-1.019.414-1.434.918-.362.43-.802.665-1.19.696-.387.03-.721-.13-.919-.526v-.002c-.123-.233-.072-.6.031-.987s.251-.785.271-1.108v-.001c.02-.415.044-.776.114-1.055.07-.28.179-.468.373-.575a.876.876 0 01.027-.014c.022.359.2.725.514.804.343.09.838-.204 1.047-.445l.122-.004c.184-.005.337.006.495.143v.001c.121.102.179.296.229.512.05.217.09.453.239.621.287.32.38.534.371.672zM6.592 13.843v.003c-.034.435-.28.672-.656.758-.377.086-.888 0-1.398-.266-.565-.3-1.237-.27-1.667-.360-.216-.045-.357-.113-.421-.238-.064-.126-.066-.345.071-.720v-.001l.001-.002c.068-.209.018-.438-.015-.653-.033-.214-.049-.41.024-.546l.001-.001c.094-.181.232-.246.403-.307.17-.062.373-.11.533-.270l.001-.001h.001c.148-.157.26-.353.39-.492.11-.117.22-.195.385-.196h.005a.61.61 0 01.093.008c.22.033.411.187.596.437l.533.971v.001c.142.296.441.622.695.954.254.333.45.666.425.921z"/>
                <path fill="#D6A312" d="M9.25 4.788c-.043-.084-.13-.164-.28-.225-.31-.133-.444-.142-.617-.254-.28-.181-.513-.244-.706-.244a.834.834 0 00-.272.047c-.236.08-.392.25-.49.342-.02.019-.044.035-.104.80-.06.043-.15.11-.28.208-.117.086-.154.2-.114.332.04.132.167.285.4.417h.001c.145.085.244.2.358.291a.801.801 0 00.189.117c.072.031.156.052.26.058.248.15.43-.06.59-.151.16-.092.296-.204.452-.255h.001c.32-.1.548-.301.62-.493a.324.324 0 00-.008-.27z"/>
                <path fill="#202020" d="M8.438 5.26c-.255.133-.552.294-.869.294-.316 0-.566-.146-.745-.289-.09-.07-.163-.142-.218-.193-.096-.075-.084-.181-.045-.178.066.008.076.095.117.134.056.052.126.12.211.187.17.135.397.266.68.266.284 0 .614-.166.816-.28.115-.064.26-.179.379-.266.09-.067.087-.147.162-.138.075.009.02.089-.085.18-.105.092-.27.214-.403.283z"/>
                <path fill="#ffffff" d="M12.337 10.694a1.724 1.724 0 00-.104 0h-.01c.088-.277-.106-.48-.621-.713-.534-.235-.96-.212-1.032.265-.005.025-.009.05-.011.076a.801.801 0 00-.12.054c-.252.137-.389.386-.465.692-.076.305-.098.674-.119 1.09-.013.208-.099.49-.186.79-.875.624-2.09.894-3.122.19-.07-.11-.15-.22-.233-.328a13.85 13.85 0 00-.16-.205.65.65 0 00.268-.05.34.34 0 00.186-.192c.063-.17 0-.408-.202-.68-.201-.273-.542-.58-1.043-.888-.368-.23-.574-.51-.67-.814-.097-.305-.084-.635-.01-.96.143-.625.51-1.233.743-1.614.063-.046.023.086-.236.567-.232.44-.667 1.455-.072 2.248.016-.564.15-1.14.377-1.677.329-.747 1.018-2.041 1.072-3.073.029.02.125.086.169.11.126.075.221.184.344.283a.85.85 0 00.575.2c.24 0 .427-.079.582-.168.17-.096.304-.204.433-.245.27-.085.486-.235.608-.41.21.83.7 2.027 1.014 2.611.167.31.5.969.643 1.762.091-.002.191.01.299.038.375-.973-.319-2.022-.636-2.314-.128-.124-.135-.18-.07-.177.343.304.795.917.96 1.608.075.315.09.646.01.973.04.017.08.034.12.054.603.293.826.548.719.897z"/>
                <path fill="#E6E6E6" d="M8.04 8.062c-.556.002-1.099.251-1.558.716-.46.464-.814 1.122-1.018 1.888l.061.038v.004c.47.298.805.598 1.012.878.219.296.316.584.223.834a.513.513 0 01-.27.283l-.041.015c.074.097.146.197.213.3.944.628 2.042.396 2.867-.172.08-.278.153-.536.163-.698.021-.415.042-.792.124-1.12.082-.33.242-.63.544-.795.017-.10.034-.015.051-.023a.756.756 0 01.022-.094c-.242-.622-.591-1.14-1.01-1.5-.42-.36-.897-.551-1.382-.554zm2.37 2.155l-.002.005v-.002l.001-.004z"/>
                <path fill="#ffffff" d="M9.278 3.833a1.05 1.05 0 01-.215.656 4.119 4.119 0 00-.218-.90l-.127-.045c.029-.035.085-.075.107-.127a.669.669 0 00.05-.243l.001-.10a.673.673 0 00-.035-.236.434.434 0 00-.108-.184.223.223 0 00-.156-.07H8.57a.228.228 0 00-.151.06.434.434 0 00-.122.175.676.676 0 00-.05.243v.10a.718.718 0 00.009.14 1.773 1.773 0 00-.354-.120 1.196 1.196 0 01-.01-.133v-.013a1.035 1.035 0 01.088-.447.793.793 0 01.25-.328.554.554 0 01.346-.123h.006c.125 0 .232.036.342.116a.78.78 0 01.257.324c.063.138.094.273.097.433l.001.012zM7.388 3.997a1.05 1.05 0 00-.277.125.623.623 0 00.002-.150v-.008a.651.651 0 00-.048-.192.37.37 0 00-.096-.141.158.158 0 00-.119-.045c-.042.004-.077.024-.110.065a.372.372 0 00-.070.156.626.626 0 00-.013.205v.008a.634.634 0 00.048.193.367.367 0 00.116.156l-.102.08-.078.056a.706.706 0 01-.160-.240c-.053-.12-.082-.24-.090-.381v-.001a1.071 1.071 0 01.045-.390.668.668 0 01.167-.292.359.359 0 01.264-.118c.084 0 .158.028.235.090a.68.68 0 01.199.271c.053.12.080.24.089.382v.001c.003.06.003.115-.002.170z"/>
                <path fill="#202020" d="M7.806 4.335c.01.034.065.029.097.045.027.014.05.045.08.046.03.001.076-.01.80-.04.005-.038-.052-.063-.088-.077-.047-.019-.107-.028-.151-.003-.10.005-.021.018-.018.30zM7.484 4.335c-.01.034-.065.029-.096.045-.028.014-.05.045-.081.046-.03.001-.076-.01-.080-.04-.005-.038.052-.063.088-.077.047-.019.108-.028.152-.003.10.005.02.018.017.30z"/>
            </svg>`
        },
        {
            name: "Android",
            keywords: [".apk", ".apkx", ".abb", "android", "mobile"],
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" data-custom-icon="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5915 3.88444C13.6002 3.32107 14.7626 3 16 3C17.2374 3 18.3998 3.32107 19.4085 3.88444L20.1464 3.14645C20.3417 2.95118 20.6583 2.95118 20.8536 3.14645C21.0488 3.34171 21.0488 3.65829 20.8536 3.85355L20.2612 4.44595C21.9266 5.72558 23 7.73743 23 10H9C9 7.73743 10.0734 5.72558 11.7388 4.44595L11.1464 3.85355C10.9512 3.65829 10.9512 3.34171 11.1464 3.14645C11.3417 2.95118 11.6583 2.95118 11.8536 3.14645L12.5915 3.88444ZM14 7C14 7.55228 13.5523 8 13 8C12.4477 8 12 7.55228 12 7C12 6.44772 12.4477 6 13 6C13.5523 6 14 6.44772 14 7ZM19 8C19.5523 8 20 7.55228 20 7C20 6.44772 19.5523 6 19 6C18.4477 6 18 6.44772 18 7C18 7.55228 18.4477 8 19 8Z" fill="#87C527"/>
                <path d="M5 12.5C5 11.6716 5.67157 11 6.5 11C7.32843 11 8 11.6716 8 12.5V18.5C8 19.3284 7.32843 20 6.5 20C5.67157 20 5 19.3284 5 18.5V12.5Z" fill="#87C527"/>
                <path d="M12 24V27.5C12 28.3284 12.6716 29 13.5 29C14.3284 29 15 28.3284 15 27.5V24H17V27.5C17 28.3284 17.6716 29 18.5 29C19.3284 29 20 28.3284 20 27.5V24H21C22.1046 24 23 23.1046 23 22V11H9V22C9 23.1046 9.89543 24 11 24H12Z" fill="#87C527"/>
                <path d="M24 12.5C24 11.6716 24.6716 11 25.5 11C26.3284 11 27 11.6716 27 12.5V18.5C27 19.3284 26.3284 20 25.5 20C24.6716 20 24 19.3284 24 18.5V12.5Z" fill="#87C527"/>
            </svg>`
        },
        {
            name: "Apple",
            keywords: [".dmg", ".pkg", "macos", ".app", "darwin", "apple", "mac", "osx"],
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-custom-icon="true">
                <path fill="#a6a6a6" d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97C14.32,22,13.89,21.18,12.37,21.18C10.84,21.18,10.37,21.95,9.1,22C7.79,22.05,6.8,20.68,5.96,19.47C4.25,17,2.94,12.45,4.7,9.39C5.57,7.87,7.13,6.91,8.82,6.88C10.1,6.86,11.32,7.75,12.11,7.75C12.89,7.75,14.37,6.68,15.92,6.84C16.57,6.87,18.39,7.1,19.56,8.82C19.47,8.88,17.39,10.1,17.41,12.63C17.44,15.65,20.06,16.66,20.09,16.67C20.06,16.74,19.67,18.11,18.71,19.5M13,3.5C13.73,2.67,14.94,2.04,15.94,2C16.07,3.17,15.6,4.35,14.9,5.19C14.21,6.04,13.07,6.7,11.95,6.61C11.8,5.46,12.36,4.26,13,3.5"></path>
            </svg>`
        },
        {
            name: "Source",
            keywords: ["source", "src", "code", "src"],
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-custom-icon="true">
                <path fill="#6e7781" d="M2.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073H2.75zM1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V1.75z"></path>
                <path fill="#6e7781" d="M4.75 5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zM4 7.75A.75.75 0 0 1 4.75 7h2a.75.75 0 0 1 0 1.5h-2A.75.75 0 0 1 4 7.75zm3 2.25a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5H7z"></path>
            </svg>`
        }
    ];

    // 压缩包文件扩展名列表
    const archiveExtensions = ['.zip', '.rar', '.7z', '.tar.gz', '.tar.bz2', '.tar.xz', '.tgz', '.gz', '.bz2', '.xz'];

    // 系统关键词列表
    const systemKeywords = ['windows', 'win', 'macos', 'osx', 'mac', 'apple', 'linux', 'ubuntu', 'debian', 'fedora',
        'arch', 'centos', 'redhat', 'bsd', 'freebsd', 'openbsd', 'netbsd', 'android', 'ios',
        'darwin', 'mobile', 'desktop', 'server'];

    // 架构关键词列表（按长度降序排序）
    const archKeywords = [
        'x86_64', 'aarch64', 'mips64le', 'mips64', 'riscv64', 'ppc64le', 's390x', 'armv7hf',
        'arm64', 'armel', 'armhf', 'amd64', 'loong64', 'armv7', 'i686', 'universal',
        'mipsle', 'mips', 'x64', 'x86', '386', 'arm'
    ].sort((a, b) => b.length - a.length); // 按长度降序排序

    // 添加全局样式
    const style = document.createElement('style');
    style.textContent = `
        /* 图标样式 */
        .custom-svg-icon {
            width: 1.5em;
            height: 1.5em;
            min-width: 1.5em;
            vertical-align: middle;
            flex-shrink: 0;
            margin-right: 8px;
        }

        /* 调整文件链接容器 */
        .Box-row .d-flex.flex-justify-start.col-12.col-lg-6 {
            display: flex;
            align-items: center;
        }

        /* 架构关键词高亮样式 */
        .arch-highlight {
            background-color: #FFEB3B; /* 亮黄色 */
            color: #000;
            padding: 1px 4px;
            border-radius: 4px;
            font-weight: 500;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            margin: 0 2px;
            display: inline-block;
        }

        /* 深色模式适配 */
        @media (prefers-color-scheme: dark) {
            .arch-highlight {
                background-color: #FFD600; /* 深色模式下更亮的黄色 */
                color: #000;
            }
        }

        /* 文件名样式调整 */
        .file-name-container {
            display: inline-block;
            margin-left: 4px;
        }
    `;
    document.head.appendChild(style);

    // 高亮架构关键词（优化版）
    function highlightArchKeywords(text) {
        if (!text) return text;

        // 创建一个处理后的文本副本
        let result = text;

        // 使用正则表达式匹配所有架构关键词（不区分大小写）
        const regex = new RegExp(
            `(${archKeywords.map(arch =>
                arch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
            ).join('|')})`,
            'gi'
        );

        // 替换匹配到的关键词
        result = result.replace(regex, match => {
            // 检查匹配是否完整（前后是非字母数字或边界）
            return `<span class="arch-highlight">${match}</span>`;
        });

        return result;
    }

    // 替换SVG图标的函数
    function replaceIcons() {
        const assetItems = document.querySelectorAll('.Box.Box--condensed li.Box-row');

        assetItems.forEach(item => {
            // 检查是否已处理过
            if (item.dataset.svgReplaced) return;

            const link = item.querySelector('div.d-flex.flex-justify-start.col-12.col-lg-6 > a');
            if (!link) return;

            const fileName = link.textContent;
            const svgContainer = item.querySelector('div.d-flex.flex-justify-start.col-12.col-lg-6');
            const originalSvg = svgContainer?.querySelector('svg:first-child');

            if (!originalSvg || !fileName) return;

            const fileNameLower = fileName.toLowerCase();
            let matchedRule = null;
            let fileExtension = "";

            // 提取文件扩展名
            const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);
            if (extensionMatch) {
                fileExtension = extensionMatch[0].toLowerCase();
            }

            // 优先检查文件扩展名
            for (const rule of iconRules) {
                if (fileExtension && rule.keywords.some(keyword =>
                    keyword.startsWith('.') && fileExtension.includes(keyword.toLowerCase()))) {
                    matchedRule = rule;
                    break;
                }
            }

            // 对于压缩包文件，额外检查系统关键词
            if (!matchedRule && archiveExtensions.includes(fileExtension)) {
                // 检查文件名中是否包含系统关键词
                const systemMatch = systemKeywords.find(keyword =>
                    fileNameLower.includes(keyword.toLowerCase()));

                if (systemMatch) {
                    // 根据系统关键词匹配规则
                    matchedRule = iconRules.find(rule =>
                        rule.keywords.some(keyword =>
                            keyword.toLowerCase() === systemMatch.toLowerCase()));
                }
            }

            // 如果还没有匹配，则检查所有关键词
            if (!matchedRule) {
                for (const rule of iconRules) {
                    if (rule.keywords.some(keyword =>
                        fileNameLower.includes(keyword.toLowerCase()))) {
                        matchedRule = rule;
                        break;
                    }
                }
            }

            if (matchedRule) {
                // 创建临时容器来解析SVG
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = matchedRule.svg;
                const newSvg = tempDiv.firstChild;

                // 添加自定义类名
                newSvg.classList.add('custom-svg-icon');

                // 替换SVG
                if (!item._originalSvg) item._originalSvg = originalSvg;
                svgContainer.replaceChild(newSvg, originalSvg);
            }

            // 处理文件名高亮
            if (!link.dataset.highlighted) {
                if (!item._originalFileName) item._originalFileName = fileName;
                // 创建容器包裹文件名
                const fileNameContainer = document.createElement('span');
                fileNameContainer.className = 'file-name-container';

                // 高亮架构关键词
                fileNameContainer.innerHTML = highlightArchKeywords(fileName);

                // 替换链接内容
                link.innerHTML = '';
                link.appendChild(fileNameContainer);

                // 标记为已处理
                link.dataset.highlighted = 'true';
            }

            // 标记为已处理
            item.dataset.svgReplaced = 'true';
        });
    }

    // 恢复原始SVG图标和文件名的函数
    function restoreIcons() {
        const assetItems = document.querySelectorAll('.Box.Box--condensed li.Box-row');
        assetItems.forEach(item => {
            if (!item.dataset.svgReplaced) return;

            const link = item.querySelector('div.d-flex.flex-justify-start.col-12.col-lg-6 > a');
            const svgContainer = item.querySelector('div.d-flex.flex-justify-start.col-12.col-lg-6');
            const customSvg = svgContainer?.querySelector('svg.custom-svg-icon');

            if (customSvg && item._originalSvg) {
                // 恢复原始SVG
                svgContainer.replaceChild(item._originalSvg, customSvg);
            }

            if (link && item._originalFileName) {
                // 恢复原始文件名
                link.innerHTML = item._originalFileName;
                delete link.dataset.highlighted;
            }

            // 清除已处理标记
            delete item.dataset.svgReplaced;
        });
    }

    // 设置观察器监听assets列表变化
    function setupAssetsObserver() {
        const targetNode = document.getElementById('repo-content-pjax-container') || document.body;

        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                    break;
                }
            }

            if (needsUpdate && GM_getValue('svgEnabled', true)) {
                replaceIcons();
            }
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }

    // 初始化替换
    if (GM_getValue('svgEnabled', true)) {
        replaceIcons();
    }
    setupAssetsObserver();
    // === END SVG Replace Functionality ===
})();