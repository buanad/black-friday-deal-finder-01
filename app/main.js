// DealHound: hash routes, filter state and rendering. The deals are in
// data.js, so the site needs no network to show them; each deal links out
// to its store. Routes:
//   #/              the board, with search and filters
//   #/new-lows      the board, new lows only
//   #/cat/<name>    the board, one category
//   #/deal/<id>     one deal, with its evidence and similar deals
//
// window.__shotReady is false while a page renders and true once it is on
// screen, so a screenshot script knows when to capture.

import { deals } from "./data.js";
import {
  listPage,
  detailPage,
  missingPage,
  applyFilters,
  gridHtml,
  resultLine,
} from "./views.js";

const app = document.getElementById("app");

const state = {
  query: "",
  category: "All",
  store: "All",
  minPct: 0,
  signal: "All",
  sort: "discount",
};

function route() {
  const hash = location.hash || "#/";
  const dealMatch = hash.match(/^#\/deal\/([^/?]+)/);
  if (dealMatch) {
    const found = deals.find((d) => d.id === decodeURIComponent(dealMatch[1]));
    return { page: "deal", deal: found || null };
  }
  if (hash === "#/new-lows") return { page: "list", preset: { signal: "NEW LOW" } };
  const catMatch = hash.match(/^#\/cat\/(.+)/);
  if (catMatch) {
    return { page: "list", preset: { category: decodeURIComponent(catMatch[1]) } };
  }
  return { page: "list", preset: {} };
}

function render() {
  window.__shotReady = false;
  const r = route();
  if (r.page === "deal") {
    document.title = `${r.deal ? r.deal.title : "Not found"} | DealHound`;
    app.innerHTML = r.deal ? detailPage(r.deal) : missingPage();
  } else {
    state.category = r.preset.category || "All";
    state.signal = r.preset.signal || "All";
    document.title = "DealHound — Black Friday 2026 Deal Finder";
    app.innerHTML = listPage(state);
    wireFilters();
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function refreshGrid() {
  const list = applyFilters(state);
  const grid = app.querySelector(".deals, .empty");
  const line = app.querySelector(".result-line");
  if (grid) grid.outerHTML = gridHtml(list);
  if (line) line.outerHTML = resultLine(list);
}

function wireFilters() {
  const search = app.querySelector(".search");
  if (search) {
    search.addEventListener("input", () => {
      state.query = search.value;
      refreshGrid();
    });
  }
  const storeSelect = app.querySelector("#store-select");
  if (storeSelect) {
    storeSelect.addEventListener("change", () => {
      state.store = storeSelect.value;
      refreshGrid();
    });
  }
  const sortSelect = app.querySelector("#sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      refreshGrid();
    });
  }
  app.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.dataset.group;
      const value = chip.dataset.value;
      if (group === "category") state.category = value;
      if (group === "minPct") state.minPct = Number(value);
      if (group === "signal") state.signal = value;
      render();
    });
  });
}

window.addEventListener("hashchange", render);
render();
