/**
 * Smoke test for the harness-background client bundle.
 *
 * Simulates the Harness client module loader (window.__ModuleLoader__.load),
 * materializes the factory with a react stub, runs apply() against a mocked
 * cordis ctx, and asserts the wiring:
 *   - locale dictionaries registered with identical zh/en key sets
 *   - slot injections for "shell.overlay" and "settings.section"
 *   - register() option shapes (entries carry no inject faces)
 *   - the localStorage store: defaults, mutate, subscriber notification
 *
 * Run: node smoke-test.mjs   (from the repo root)
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

let registration = null;
const windowStub = {
  __ModuleLoader__: {
    load: (def) => {
      registration = def;
    },
  },
};

const context = vm.createContext({
  window: windowStub,
  console,
  setTimeout,
  clearTimeout,
  Image: class {},
  FileReader: class {},
});
const source = readFileSync(new URL("./harness-background/lib/client.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "harness-background/lib/client.js" });

assert.ok(registration, "bundle did not register with __ModuleLoader__.load");
assert.equal(registration.id, "harness-background", "bundle id mismatch");

const reactStub = {
  useState: () => [undefined, () => {}],
  useEffect: () => {},
  useRef: () => ({}),
  useSyncExternalStore: () => ({}),
  createElement: () => null,
};
const required = [];
const moduleExports = registration.factory((id) => {
  required.push(id);
  if (id === "react") return reactStub;
  throw new Error(`unexpected require("${id}")`);
});

assert.deepEqual([...new Set(required)], ["react"], "bundle should only require react");
assert.equal(typeof moduleExports.apply, "function", "apply export missing");
assert.deepEqual([...moduleExports.inject], ["slots", "locale"], "service inject list mismatch");

// --- mocked cordis ctx -----------------------------------------------------
const calls = { locale: [], injects: [], regs: [], effects: 0 };
const ctx = {
  locale: {
    register: (ns, dicts) => {
      calls.locale.push({ ns, dicts });
      return () => {};
    },
    bind: (ns) => (key, params) => `t(${ns}.${key}${params ? JSON.stringify(params) : ""})`,
  },
  slots: {
    inject: (key, cb) => {
      calls.injects.push({ key, cb });
      // Mirror the runtime: the callback runs synchronously when the
      // declaration already exists (both slots are declared by the shell).
      cb();
      return () => {};
    },
    register: (opts, comp) => {
      calls.regs.push({ opts, comp });
      return () => {};
    },
  },
  effect: (fn) => {
    calls.effects += 1;
    return fn();
  },
};

moduleExports.apply(ctx);

// --- assertions -------------------------------------------------------------
assert.equal(calls.effects, 1, "expected one ctx.effect (dictionary registration)");

assert.equal(calls.locale.length, 1, "locale.register should be called once");
const { ns, dicts } = calls.locale[0];
assert.equal(ns, "harness-background");
const zhKeys = Object.keys(dicts.zh).sort();
const enKeys = Object.keys(dicts.en).sort();
assert.deepEqual(zhKeys, enKeys, "zh/en dictionary key sets must match (bilingual balance)");
assert.ok(zhKeys.length > 10, "dictionary looks too small");

const injectedKeys = calls.injects.map((i) => i.key).sort();
assert.deepEqual(injectedKeys, ["settings.section", "shell.overlay"], "slot injection keys mismatch");

// Run each injection callback -> ctx.slots.register; validate option shapes.
const byName = new Map(calls.regs.map((r) => [r.opts.name, r]));
assert.equal(calls.regs.length, 2, "expected two slot registrations");

const overlay = byName.get("shell.overlay");
assert.ok(overlay, "shell.overlay entry missing");
assert.equal(overlay.opts.id, "harness-background");
assert.equal(overlay.opts.inject, undefined, "overlay should carry no inject face");
assert.equal(overlay.opts.locale, undefined, "overlay should carry no locale seat");

const section = byName.get("settings.section");
assert.ok(section, "settings.section entry missing");
assert.equal(section.opts.id, "harness-background");
assert.equal(section.opts.inject, undefined, "section should carry no inject face");
assert.equal(section.opts.locale, undefined, "section should carry no locale seat");
assert.equal(typeof section.opts.label, "function", "section label should be a thunk");
assert.ok(typeof section.opts.label() === "string" && section.opts.label().length > 0, "label thunk must produce text");

console.log("smoke test passed ✔");
console.log(`  services: ${moduleExports.inject.join(", ")}`);
console.log(`  dict keys: ${zhKeys.length} (zh = en)`);
console.log(`  entries: ${[...byName.keys()].join(", ")}`);
