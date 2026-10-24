// Page to PDF — click the toolbar icon (or Alt+Shift+P) to save the current tab as PDF.

// width: how many times wider than the paper the page is laid out (2 = desktop-like layout, text shrunk to fit).
const DEFAULTS = { paper: "A4", width: 2, landscape: false, clean: true, background: true, askWhere: false };

chrome.action.onClicked.addListener((tab) => savePdf(tab));

async function savePdf(tab) {
  if (!tab.id || !/^https?:|^file:/.test(tab.url || "")) {
    return flash(tab.id, "✕", "#b3261e", "This page can't be saved (chrome:// or store pages)");
  }
  const opts = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  const target = { tabId: tab.id };
  let attached = false;

  try {
    setBadge(tab.id, "…", "#123f66");

    // 1) Prepare the page: load lazy images, hide sticky bars / popups.
    await chrome.scripting.executeScript({
      target, func: preparePage, args: [opts.clean]
    });

    // 2) Print with Chrome's own engine through the DevTools protocol.
    await chrome.debugger.attach(target, "1.3");
    attached = true;
    await chrome.debugger.sendCommand(target, "Emulation.setEmulatedMedia", { media: "screen" });
    const size = opts.paper === "Letter" ? { w: 8.5, h: 11 } : { w: 8.27, h: 11.69 };
    const width = Math.min(4, Math.max(1, Number(opts.width) || 1));
    const { data } = await chrome.debugger.sendCommand(target, "Page.printToPDF", {
      printBackground: opts.background,
      landscape: !!opts.landscape,
      scale: 1 / width, // scale 0.5 => page is laid out 2x wider, then shrunk onto the paper
      paperWidth: size.w,
      paperHeight: size.h,
      marginTop: 0.4, marginBottom: 0.4, marginLeft: 0.4, marginRight: 0.4,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:8px;width:100%;padding:0 0.4in;color:#888;display:flex;justify-content:space-between">' +
        '<span class="url"></span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
      preferCSSPageSize: false
    });

    // 3) Download it.
    await chrome.downloads.download({
      url: "data:application/pdf;base64," + data,
      filename: safeName(tab.title || "page") + ".pdf",
      saveAs: opts.askWhere,
      conflictAction: "uniquify"
    });
    flash(tab.id, "✓", "#1e6b34", "Saved as PDF");
  } catch (err) {
    console.error(err);
    flash(tab.id, "✕", "#b3261e", "PDF failed: " + (err && err.message ? err.message : err));
  } finally {
    if (attached) { try { await chrome.debugger.detach(target); } catch (_) {} }
    try { await chrome.scripting.executeScript({ target, func: restorePage }); } catch (_) {}
  }
}

// ---- runs inside the page ----
async function preparePage(clean) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Force lazy images to load.
  document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
  document.querySelectorAll("img[data-src]").forEach((i) => { if (!i.src) i.src = i.dataset.src; });
  const startY = window.scrollY;
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await sleep(120);
  }
  window.scrollTo(0, startY);
  await Promise.race([
    Promise.all([...document.images].filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
    sleep(4000)
  ]);

  if (!clean) return;
  const hidden = [];
  const hide = (el) => { if (el && el.style.display !== "none") { hidden.push([el, el.style.cssText]); el.style.setProperty("display", "none", "important"); } };

  const setImp = (el, prop, val) => { hidden.push([el, el.style.cssText]); el.style.setProperty(prop, val, "important"); };

  // App-shell pages (Jira, Confluence, Gmail…) scroll inside an inner box, so the
  // printout would stop at one screen. Unroll every tall inner scroller and its parents.
  const scrollers = [...document.body.querySelectorAll("*")].filter((el) => {
    const s = getComputedStyle(el);
    return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 100;
  });
  for (const sc of scrollers) {
    for (let el = sc; el && el !== document.documentElement; el = el.parentElement) {
      ["overflow", "overflow-y"].forEach((p) => setImp(el, p, "visible"));
      ["height", "max-height"].forEach((p) => setImp(el, p, "auto"));
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") setImp(el, "position", "static");
    }
  }

  // Small sticky / fixed bars, cookie banners, paywall nags, dialogs.
  // (Big fixed boxes are usually the page itself, so keep those.)
  for (const el of document.body.querySelectorAll("*")) {
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    if (scrollers.some((sc) => el.contains(sc))) continue;
    const r = el.getBoundingClientRect();
    if (r.height < window.innerHeight * 0.5 || r.width < window.innerWidth * 0.5) hide(el);
  }
  document.querySelectorAll('[role="dialog"], [aria-modal="true"], iframe[src*="ads"]').forEach(hide);

  // Medium: keep the article, drop the side rails / footer chrome.
  if (/medium\.com|\/@/.test(location.href) || document.querySelector('meta[property="al:android:package"][content="com.medium.reader"]')) {
    document.querySelectorAll('[data-testid="headerNav"], footer, aside').forEach(hide);
  }
  document.documentElement.style.setProperty("overflow", "visible", "important");
  document.body.style.setProperty("overflow", "visible", "important");
  window.__pageToPdfHidden = hidden;
}

function restorePage() {
  (window.__pageToPdfHidden || []).reverse().forEach(([el, css]) => (el.style.cssText = css));
  window.__pageToPdfHidden = [];
}

// ---- helpers ----
function safeName(s) {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "page";
}
function setBadge(tabId, text, color) {
  if (!tabId) return;
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}
function flash(tabId, text, color, title) {
  setBadge(tabId, text, color);
  if (tabId) chrome.action.setTitle({ tabId, title });
  setTimeout(() => {
    if (!tabId) return;
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "Save page as PDF (Alt+Shift+P)" });
  }, 4000);
}
