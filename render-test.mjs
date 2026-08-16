/**
 * Real-render test: renders the plugin's two slot components with the real
 * React 18 (react-dom/server) against a localStorage stub, proving:
 *   - the component bodies do not throw
 *   - the overlay renders null without an image and <img> with one
 *   - the section renders all controls and reflects stored values
 *   - mutate() persists to localStorage and a reload rehydrates from it
 *
 * Run:  node render-test.mjs   (from the repo root)
 */
import { createElement, useEffect, useRef, useState, useSyncExternalStore } from "file:///C:/Users/10643/.dsh/profiles/node_modules/react/index.js";
import { renderToString } from "file:///C:/Users/10643/.dsh/profiles/node_modules/react-dom/server.node.js";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// --- localStorage stub -------------------------------------------------------
function makeStorage(initial) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

// --- load the bundle exactly like the loader does ---------------------------
function loadBundle(storage) {
  let registration = null;
  const context = vm.createContext({
    window: { __ModuleLoader__: { load: (def) => { registration = def; } } },
    console,
    setTimeout,
    clearTimeout,
    Image: class {},
    FileReader: class {},
    localStorage: storage,
  });
  vm.runInContext(readFileSync(new URL("./harness-background/lib/client.js", import.meta.url), "utf8"), context, { filename: "client.js" });
  const reactModule = { default: { createElement, useEffect, useRef, useState, useSyncExternalStore }, createElement, useEffect, useRef, useState, useSyncExternalStore };
  const moduleExports = registration.factory((id) => {
    if (id === "react") return reactModule;
    throw new Error(`unexpected require("${id}")`);
  });

  // Fake apply() to capture the two entries.
  const calls = { regs: [] };
  const ctx = {
    locale: {
      register: () => () => {},
      bind: () => (key, params) => `t:${key}${params ? JSON.stringify(params) : ""}`,
    },
    slots: {
      inject: (key, cb) => { cb(); },
      register: (opts, comp) => { calls.regs.push({ opts, comp }); return () => {}; },
    },
    effect: (fn) => fn(),
  };
  moduleExports.apply(ctx);
  const overlay = calls.regs.find((r) => r.opts.name === "shell.overlay");
  const section = calls.regs.find((r) => r.opts.name === "settings.section");
  if (!overlay || !section) throw new Error("registrations missing");
  return { overlay: overlay.comp, section: section.comp, store: moduleExports._test };
}

// --- fresh storage: defaults -------------------------------------------------
{
  const storage = makeStorage();
  const { overlay, section, store } = loadBundle(storage);

  const overlayHtml = renderToString(createElement(overlay, {}));
  assert.equal(overlayHtml, "", `overlay should render nothing without an image, got: ${overlayHtml}`);

  const sectionHtml = renderToString(createElement(section, {}));
  for (const needle of ["hb-section", "hb-title", "t:settings.chooseFile", "t:settings.opacity", "t:settings.fit", "t:settings.fitStretch", "t:settings.fitContain", "t:settings.scale", "t:settings.align", "hb-alignCell", "35%", "100%"]) {
    if (!sectionHtml.includes(needle)) throw new Error(`section HTML missing "${needle}"`);
  }
  const alignCells = (sectionHtml.match(/hb-alignCell/g) ?? []).length;
  assert.equal(alignCells, 9, "alignment grid should have 9 cells");
  console.log("fresh storage: overlay null, section defaults ✔");

  // mutate -> re-render -> img + persisted storage
  const state = store.getSnapshot();
  assert.equal(state.opacity, 0.35, "default opacity");
  assert.equal(state.fit, "stretch", "default fit");
  assert.equal(state.scale, 1, "default scale");
  assert.equal(state.align, "center", "default align");

  let notified = 0;
  const off = store.subscribe(() => { notified += 1; });
  store.mutate({ image: "data:image/png;base64,AA==", opacity: 0.5, fit: "contain", scale: 1.5, align: "left" });
  off();
  assert.equal(notified, 1, "subscriber should be notified once");

  const overlayHtml2 = renderToString(createElement(overlay, {}));
  assert.ok(overlayHtml2.includes("<img"), `overlay should render an <img>, got: ${overlayHtml2}`);
  assert.ok(overlayHtml2.includes("scale(1.5)"), "overlay should apply scale 1.5");
  assert.ok(overlayHtml2.includes("transform-origin:0% 50%"), "overlay should anchor at the left origin");
  assert.ok(overlayHtml2.includes("object-position:0% 50%"), "overlay should pin content to the left");
  const sectionHtml2 = renderToString(createElement(section, {}));
  assert.ok(sectionHtml2.includes("50%"), "section should reflect opacity 50%");
  assert.ok(sectionHtml2.includes("150%"), "section should reflect scale 150%");
  const persisted = JSON.parse(storage.dump()[store.STORAGE_KEY]);
  assert.equal(persisted.image, "data:image/png;base64,AA==", "image should persist");
  assert.equal(persisted.opacity, 0.5, "opacity should persist");
  assert.equal(persisted.fit, "contain", "fit should persist");
  assert.equal(persisted.scale, 1.5, "scale should persist");
  assert.equal(persisted.align, "left", "align should persist");
  console.log("mutate: overlay <img> scaled+anchored, section 50%/150%, storage persisted ✔");

  // stretch (fill) mode: whole image stretched, zoom-out freely allowed
  store.mutate({ image: "data:image/png;base64,AA==", fit: "stretch", scale: 0.5, align: "center" });
  const overlayHtml3 = renderToString(createElement(overlay, {}));
  assert.ok(overlayHtml3.includes("scale(0.5)"), "stretch mode must allow zoom-out below 100%");
  assert.ok(overlayHtml3.includes("object-fit:fill"), "stretch mode must render object-fit:fill");
  console.log("stretch: scale 50% rendered, object-fit fill ✔");
}

// --- reload with persisted storage -------------------------------------------
{
  const storage = makeStorage({ "harness-background.v1": JSON.stringify({ image: "https://example.com/wall.jpg", opacity: 0.2, fit: "contain", scale: 2, align: "topright" }) });
  const { overlay, section } = loadBundle(storage);
  const overlayHtml = renderToString(createElement(overlay, {}));
  assert.ok(overlayHtml.includes("https://example.com/wall.jpg"), "reload should rehydrate the image");
  assert.ok(overlayHtml.includes("scale(2)"), "reload should rehydrate scale 2");
  assert.ok(overlayHtml.includes("transform-origin:100% 0%"), "reload should rehydrate the top-right anchor");
  assert.ok(overlayHtml.includes("object-position:100% 0%"), "reload should pin content to the top-right");
  const sectionHtml = renderToString(createElement(section, {}));
  assert.ok(sectionHtml.includes("20%"), "reload should rehydrate opacity 20%");
  assert.ok(sectionHtml.includes("200%"), "reload should rehydrate scale 200%");
  console.log("reload: rehydrated from localStorage ✔");
}

// --- legacy 'cover' value migrates to 'stretch' -------------------------------
{
  const storage = makeStorage({ "harness-background.v1": JSON.stringify({ image: "https://example.com/old.jpg", fit: "cover", scale: 0.6 }) });
  const { overlay, store } = loadBundle(storage);
  const overlayHtml = renderToString(createElement(overlay, {}));
  assert.ok(overlayHtml.includes("object-fit:fill"), "legacy cover must migrate to stretch (fill)");
  assert.ok(overlayHtml.includes("scale(0.6)"), "legacy cover scale must keep its zoom value");
  assert.equal(store.getSnapshot().fit, "stretch", "normalized fit should be stretch");
  console.log("legacy cover migrated to stretch ✔");
}

console.log("render test passed ✔");
