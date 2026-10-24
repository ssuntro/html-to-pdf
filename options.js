const DEFAULTS = { paper: "A4", width: 2, landscape: false, clean: true, background: true, askWhere: false };
const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(DEFAULTS, (o) => {
  $("paper").value = o.paper;
  $("width").value = String(o.width);
  $("landscape").checked = o.landscape;
  $("clean").checked = o.clean;
  $("background").checked = o.background;
  $("askWhere").checked = o.askWhere;
});

$("save").onclick = () => {
  chrome.storage.sync.set({
    paper: $("paper").value,
    width: Number($("width").value),
    landscape: $("landscape").checked,
    clean: $("clean").checked,
    background: $("background").checked,
    askWhere: $("askWhere").checked
  }, () => { $("ok").textContent = "Saved"; setTimeout(() => ($("ok").textContent = ""), 1500); });
};
