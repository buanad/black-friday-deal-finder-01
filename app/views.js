// HTML for DealHound's pages, built from the deal data. Every value is
// escaped before it goes into the page; prices are computed from data.js,
// never typed twice, so the stats strip always matches the board.

import { deals, categories, stores, checkedOn } from "./data.js";

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (n) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
const pctOff = (d) => Math.round((1 - d.price / d.was) * 100);
const saved = (d) => d.was - d.price;
const day = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";

const sigClass = (s) =>
  s === "NEW LOW" ? "sig-new" : s === "STRONG PRICE" ? "sig-strong" : "sig-routine";

export function statsStrip() {
  const total = deals.reduce((s, d) => s + saved(d), 0);
  const lows = deals.filter((d) => d.signal === "NEW LOW").length;
  const avg = Math.round(deals.reduce((s, d) => s + pctOff(d), 0) / deals.length);
  return `<section class="stats" aria-label="Board totals">
    <div class="stat"><b>${deals.length}</b><span>verified deals</span></div>
    <div class="stat"><b>${usd(Math.round(total))}</b><span>total savings if you bought one of each</span></div>
    <div class="stat"><b>${lows}</b><span>at a new low price</span></div>
    <div class="stat"><b>${avg}%</b><span>average discount</span></div>
  </section>`;
}

function chip(label, value, current, group) {
  const on = String(value) === String(current) ? " on" : "";
  return `<button class="chip${on}" data-group="${group}" data-value="${escape(value)}">${escape(label)}</button>`;
}

export function filterBar(state) {
  const cats = ["All", ...categories];
  const minChips = [0, 20, 30, 40, 50].map((n) =>
    chip(n === 0 ? "Any discount" : `${n}% off or more`, n, state.minPct, "minPct"),
  );
  const sigChips = ["All", "NEW LOW"].map((s) =>
    chip(s === "All" ? "Any signal" : "New lows only", s, state.signal, "signal"),
  );
  const sortOptions = [
    ["discount", "Biggest % off first"],
    ["savings", "Biggest $ saving first"],
    ["price", "Lowest price first"],
    ["newlow", "New lows first"],
  ]
    .map(([v, l]) => `<option value="${v}"${v === state.sort ? " selected" : ""}>${l}</option>`)
    .join("");
  const storeOptions = ["All", ...stores]
    .map((s) => `<option value="${escape(s)}"${s === state.store ? " selected" : ""}>${escape(s)}</option>`)
    .join("");
  return `<section class="filters" aria-label="Search and filters">
    <div class="filters-row">
      <input class="search" type="search" placeholder="Search deals — try &quot;AirPods&quot;, &quot;OLED&quot;, &quot;LEGO&quot;…" value="${escape(state.query)}" aria-label="Search deals">
      <select id="store-select" aria-label="Filter by store">${storeOptions}</select>
      <select id="sort-select" aria-label="Sort deals">${sortOptions}</select>
    </div>
    <div class="chips"><span class="chip-label">Category:</span>${cats
      .map((c) => chip(c, c, state.category, "category"))
      .join("")}</div>
    <div class="chips"><span class="chip-label">Discount:</span>${minChips.join("")}</div>
    <div class="chips"><span class="chip-label">Signal:</span>${sigChips.join("")}</div>
  </section>`;
}

export function applyFilters(state) {
  const q = state.query.trim().toLowerCase();
  let out = deals.filter((d) => {
    if (q && !`${d.title} ${d.store} ${d.category} ${d.signal}`.toLowerCase().includes(q)) return false;
    if (state.category !== "All" && d.category !== state.category) return false;
    if (state.store !== "All" && d.store !== state.store) return false;
    if (pctOff(d) < state.minPct) return false;
    if (state.signal === "NEW LOW" && d.signal !== "NEW LOW") return false;
    return true;
  });
  const byDiscount = (a, b) => pctOff(b) - pctOff(a) || saved(b) - saved(a);
  const bySavings = (a, b) => saved(b) - saved(a) || pctOff(b) - pctOff(a);
  const byPrice = (a, b) => a.price - b.price || pctOff(b) - pctOff(a);
  const byNewLow = (a, b) =>
    (a.signal === "NEW LOW" ? 0 : 1) - (b.signal === "NEW LOW" ? 0 : 1) || byDiscount(a, b);
  const sorts = { discount: byDiscount, savings: bySavings, price: byPrice, newlow: byNewLow };
  return out.sort(sorts[state.sort] || byDiscount);
}

export function dealCard(d) {
  return `<li class="deal-card">
    <div class="card-top">
      <span class="sig ${sigClass(d.signal)}">${escape(d.signal)}</span>
      <span class="pct">${pctOff(d)}% off</span>
    </div>
    <h3 class="deal-title"><a href="#/deal/${encodeURIComponent(d.id)}">${escape(d.title)}</a></h3>
    <p class="meta">${escape(d.store)} &middot; ${escape(d.category)}</p>
    <p class="price-row"><span class="price">${usd(d.price)}</span><span class="was">${usd(d.was)}</span><span class="save">save ${usd(saved(d))}</span></p>
    <p class="checked">Checked ${day(d.checked)}</p>
    <div class="card-foot">
      <a class="store-link" href="${escape(d.url)}" target="_blank" rel="noopener">View at ${escape(d.store)} &#8599;</a>
    </div>
  </li>`;
}

export function gridHtml(list) {
  if (list.length === 0) {
    return `<div class="empty"><p><strong>No deal matches.</strong></p><p>Try clearing the search or loosening a filter — every deal on this board is real, so an empty result means the filter is too narrow, not that the board is empty.</p></div>`;
  }
  return `<ul class="deals">${list.map(dealCard).join("")}</ul>`;
}

export function resultLine(list) {
  return `<p class="result-line">Showing <b>${list.length}</b> of <b>${deals.length}</b> verified deals &middot; prices checked ${escape(checkedOn)} &middot; verify at checkout, prices move fast.</p>`;
}

export function listPage(state) {
  const list = applyFilters(state);
  return `${statsStrip()}${filterBar(state)}${resultLine(list)}${gridHtml(list)}`;
}

export function detailPage(d) {
  const similar = deals
    .filter((x) => x.category === d.category && x.id !== d.id)
    .sort((a, b) => pctOff(b) - pctOff(a))
    .slice(0, 3);
  return `<p><a class="back" href="#/">&larr; All deals</a></p>
  <article class="detail">
    <div class="badges">
      <span class="sig ${sigClass(d.signal)}">${escape(d.signal)}</span>
      <span class="pct">${pctOff(d)}% off</span>
    </div>
    <h1>${escape(d.title)}</h1>
    <p class="meta">${escape(d.store)} &middot; ${escape(d.category)}</p>
    <p class="price-row"><span class="price">${usd(d.price)}</span><span class="was">usually ${usd(d.was)}</span><span class="save">you save ${usd(saved(d))}</span></p>
    <dl>
      <dt>Store</dt><dd>${escape(d.store)}</dd>
      <dt>Category</dt><dd>${escape(d.category)}</dd>
      <dt>Sale price</dt><dd>${usd(d.price)}</dd>
      <dt>Usual price</dt><dd>${usd(d.was)}</dd>
      <dt>Discount</dt><dd>${pctOff(d)}% off — ${usd(saved(d))} saved</dd>
      <dt>Price checked</dt><dd>${day(d.checked)}</dd>
      <dt>Read in</dt><dd>${escape(d.source)}</dd>
    </dl>
    <p class="evidence"><b>Why this signal:</b> ${escape(d.note)}</p>
    <p><a class="store-link" href="${escape(d.url)}" target="_blank" rel="noopener">Check it at ${escape(d.store)} &#8599;</a></p>
    ${similar.length ? `<section class="similar"><h2>More ${escape(d.category)} deals</h2><ul>${similar
      .map(
        (x) => `<li><a href="#/deal/${encodeURIComponent(x.id)}">${escape(x.title)}</a><br>${usd(x.price)} <s>${usd(x.was)}</s> &middot; ${pctOff(x)}% off &middot; ${escape(x.store)}</li>`,
      )
      .join("")}</ul></section>` : ""}
  </article>`;
}

export function missingPage() {
  return `<p><a class="back" href="#/">&larr; All deals</a></p>
  <div class="empty"><p><strong>That deal is not on the board.</strong></p><p>It may have sold out or the link may be mistyped — back to the full list.</p></div>`;
}
