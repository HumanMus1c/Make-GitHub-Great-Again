# Make-GitHub-Great-Again!

[中文版本](https://github.com/HumanMus1c/Make-GitHub-Great-Again/blob/main/README.md)

Make the GitHub Great again!

This is a simple and practical browser script that adds custom background colors and automatically identifies system architecture keywords in file names to replace icons with corresponding system architecture SVGs for each asset on the GitHub Release page. It makes the download list clearer and more readable, reduces visual fatigue, and _**prevents downloading the wrong files**_.

![Example Image](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTgwOTA1LCJwdXIiOiJibG9iX2lkIn19--9a092f076ab9e141a88a4c0ec21746599ddae538/Honeycam%202025-06-21%2017-04-44.gif)

## ✨ Main Features

- [✅] **Custom Background Colors**: Add custom background colors to the Release Assets list, improving the readability and distinguishability of resource items.
- [✅] **Platform & Architecture Identification**: Automatically replace default icons with corresponding platform/system SVG icons based on file names (e.g., Windows, Linux, Apple, Android, Source, etc.).
- [✅] **Architecture Keyword Highlighting**: Automatically recognize and highlight system architecture keywords (e.g., x86_64, aarch64, arm64) in file names, with support for custom highlighting of any text.
- [✅] **Independent Theme Adaptation**: Perfectly adapts to GitHub's dark/light themes. Supports separate color settings for dark and light modes, which are independent of each other.
- [✅] **Powerful Control Panel**: Provides an intuitive settings panel (with auto-adjusting window size). You can customize odd/even row colors and hover colors, and instantly toggle any feature on/off with real-time updates!
- [✅] **Built-in Professional Color Picker**: A custom-developed color picker supporting HEX, RGB, and HSL modes, along with preset colors and real-time page effect previews while dragging.
- [❌] ~~**Event Interception Optimization**: Deeply optimized event bubbling mechanism to perfectly resolve conflicts with GitHub's native scripts, ensuring lag-free operation and no console errors.~~

## 🚀 Installation

1. First, install a user script manager (if you haven't already):
   - Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. Click the link below to install the script:
   [Install Make-GitHub-Great-Again](https://update.greasyfork.org/scripts/537852/Make-GitHub-Great-Again.user.js)

## 💡 Usage

After installation, the script will automatically take effect on GitHub Release pages:
1. Visit any GitHub repository's Release page.
2. On the left side of any project's Release page, click the ⚙️ icon to open the settings panel.
3. You can freely adjust various functions within the settings panel.
4. All features take effect in real-time without needing to refresh the page.

## 🎯 Use Cases

- When a project release contains program versions for multiple platforms.
- When the release contains many files with similar names.
- When you need to quickly distinguish architecture versions (like x86_64 vs aarch64).

## 🤝 Contributing

Feel free to submit Issues and Pull Requests to help improve this project!

## 📝 License

[MIT License](LICENSE)

---

**Note:** This script only optimizes the style and visual clarity of the Assets list on the GitHub Release page and does not modify any functional content.