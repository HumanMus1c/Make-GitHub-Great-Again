# Make-GitHub-Great-Again!

[中文版本](https://github.com/HumanMus1c/Make-GitHub-Great-Again/blob/main/README.md)

Make the GitHub Great again!

This is a simple and practical browser script that adds custom background colors and automatically identifies system architecture keywords in file names to replace icons with corresponding system architecture SVGs for each asset on the GitHub Release page. It makes the download list clearer and more readable, reduces visual fatigue, and _**prevents downloading the wrong files**_.

![demo](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTgwOTA1LCJwdXIiOiJibG9iX2lkIn19--9a092f076ab9e141a88a4c0ec21746599ddae538/Honeycam%202025-06-21%2017-04-44.gif)

![demo_en](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MjkyMjUyLCJwdXIiOiJibG9iX2lkIn19--34932e203f19d08e880d94fa4eaa3ccebc540fb1/demonstrate_en_1mb.gif)

## ✨ Main Features

- \[⬤] **Custom Background Colors**: Add custom background colors to the Release Assets list, improving the readability and distinguishability of resource items.
- \[⬤] **Platform & Architecture Identification**: Automatically replace default icons with corresponding platform/system SVG icons based on file names (e.g., Windows, Linux, Apple, Android, Source, etc.).
- \[⬤] **Architecture Keyword Highlighting**: Automatically recognize and highlight system architecture keywords (e.g., x86\_64, aarch64, arm64) in file names, with support for custom highlighting of any text.
- \[⬤] **Independent Theme Adaptation**: Perfectly adapts to GitHub's dark/light themes. Supports separate color settings for dark and light modes, which are independent of each other.
- \[⬤] **Powerful Control Panel**: Provides an intuitive settings panel (with auto-adjusting window size). You can customize odd/even row colors and hover colors, and instantly toggle any feature on/off with real-time updates!
- \[⬤] **Built-in Professional Color Picker**: A custom-developed color picker supporting HEX, RGB, and HSL modes, along with preset colors and real-time page effect previews while dragging.
- \[⬤] **Floating Nav Dock**: On repository home pages, the script indexes every nav source in the page (global header, repo tab bar, file area tabs, repo file tree, sidebar, etc.), merges the entries folded into `More` with the existing nav links in order, and lists them in a left-side floating dock. Clicking an entry navigates in page without a full reload. The floating button stays visible; click it or use the "Expand/Collapse nav dock" menu command to toggle the panel.
- \[⬤] **One immersive panel look**: the nav dock and the settings panel share one title-bar and control standard, every icon inside them is SVG, the scrollbar is immersive (no step arrows, transparent track, revealed on hover), and the panel font size scales adaptively between 14px and 18px with the viewport.
- \[◯] **~~Event Interception Optimization~~**~~: Deeply optimized event bubbling mechanism to perfectly resolve conflicts with GitHub's native scripts, ensuring lag-free operation and no console errors.~~

## 🚀 Installation

1. First, install a user script manager (if you haven't already):
   - Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
2. Click the link below to install the script:
   [Install Make-GitHub-Great-Again](https://update.greasyfork.org/scripts/537852/Make-GitHub-Great-Again.user.js)

## 💡 Usage

After installation, the script takes effect on GitHub Release pages and repository home pages:

1. Visit any GitHub repository's **Release page** and click the ⚙️ icon in the lower-left corner to open the settings panel, where every feature can be adjusted.
2. Visit any GitHub repository's **home page**: a floating ball is always present on the left. Click it (or use the "Expand/Collapse nav dock" menu command) to expand or collapse the left floating nav dock, which lists the page's header nav, repo tab bar, file area, file tree and sidebar entries. Clicking an entry navigates in page instead of reloading.
3. The settings panel's size and font size adapt to the window; all features take effect in real-time without needing to refresh the page.

## 🎯 Use Cases

- When a project release contains program versions for multiple platforms.
- When the release contains many files with similar names.
- When you need to quickly distinguish architecture versions (like x86\_64 vs aarch64).

## 🤝 Contributing

Feel free to submit Issues and Pull Requests to help improve this project!

## 📝 License

[MIT License](LICENSE)

***

**Note:** This script only optimizes the style and icon set of the Assets list on GitHub Release pages and offers a local floating nav dock on repository home pages; it does not modify any functional content.
