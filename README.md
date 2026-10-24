# Page to PDF
![page-to-pdf-logo](https://github.com/ssuntro/html-to-pdf/blob/main/icons/icon128.png)


A Chrome extension that saves the current page (a Medium article, a Confluence page, a Jira ticket…) as a clean, text-selectable PDF in one click.

## How to install

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `page-to-pdf` folder (the one that contains `manifest.json`).
4. Optional: pin the extension to your toolbar via the puzzle-piece icon so the button is always visible.

To use it, open any `http(s)://` or `file://` page and click the toolbar icon, or press **Alt+Shift+P**. The PDF is saved to your Downloads folder, named after the page title.

To change settings (paper size, layout width, landscape, cleanup, backgrounds, "ask where to save"), right-click the icon and choose **Options**. To change the shortcut, go to `chrome://extensions/shortcuts`.

> Chrome shows a "Page to PDF started debugging this browser" bar while the PDF is being generated. This is expected: the extension uses Chrome's own print engine through the DevTools protocol, and detaches as soon as the file is saved.

## How it makes your life easier

- **One click instead of a print dialog.** No more Ctrl+P, picking "Save as PDF", fiddling with margins and typing a file name. Click (or Alt+Shift+P) and the file is in Downloads.
- **Clean output.** Sticky headers, cookie banners, paywall nags, pop-up dialogs and ad iframes are hidden before printing, and on Medium the side rails and footer are dropped so you keep just the article.
- **Nothing missing.** The page is scrolled through first so lazy-loaded images actually appear in the PDF, instead of blank boxes.
- **Whole page, even in web apps.** Jira, Confluence, Gmail and similar apps scroll inside an inner box, so normal printing stops after one screen. The extension unrolls those scroll areas so you get the full content.
- **Readable, searchable text.** The PDF is real text, not a screenshot: you can select, copy and search it.
- **Desktop-like layout.** By default the page is laid out twice as wide as the paper and shrunk to fit, so you get the desktop layout instead of a cramped mobile-style one (configurable from 1x to 4x).
- **Useful footer.** Every page carries the source URL and page number, so you always know where a printout came from.
- **Your page is left as it was.** Everything the extension hides or changes is restored right after the PDF is saved.
