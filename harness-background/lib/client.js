/**
 * harness-background — browser half.
 *
 * Two slot contributions:
 *
 * 1. `shell.overlay` — a click-through, frame-wide background image layer
 *    (the documented additive seat for a frame-wide surface; the layer is
 *    above every column, so the image is painted over the whole session view
 *    and the adjustable opacity keeps the UI readable underneath).
 *
 * 2. `settings.section` — the "Session Background" settings page: pick a
 *    local file (downscaled and stored as a data URL) or a network URL,
 *    adjust opacity and the fit mode (cover / contain).
 *
 * Persistence is browser-local (localStorage), NOT the settings namespace:
 * the harness api-proxy serves only a hardcoded allowlist of namespaces
 * (`WEB_SETTINGS_NAMESPACES`) to the web client — any other namespace is
 * registered host-side but refused on the wire (`settings-not-exposed`), so
 * a third-party plugin cannot read or write its namespace through the
 * settings RPC. localStorage keeps this plugin fully self-contained, with
 * instant synchronous writes and no host dependency. The chosen image and
 * options survive page reloads and host restarts.
 *
 * This file is hand-written in the shipped client-bundle format (a single
 * `window.__ModuleLoader__.load` registration); the only external module it
 * requires is `react`, which the shell provides. It needs no build step.
 */
window.__ModuleLoader__.load({
  id: "harness-background",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let react = require("react");

    // ---------------------------------------------------------------------
    // Styles — injected once, keyed like the shipped CSS modules.
    // ---------------------------------------------------------------------
    const css = `
.hb-section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}
.hb-title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}
.hb-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}
.hb-card{background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;gap:14px;padding:14px 16px;display:flex}
.hb-field{flex-direction:column;gap:6px;display:flex}
.hb-fieldLabel{color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;font-size:12px;font-weight:500;line-height:18px;display:inline-flex}
.hb-row{flex-wrap:wrap;align-items:center;gap:8px;display:flex}
.hb-grow{min-width:0;flex:1 1 180px}
.hb-input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);width:100%;height:32px;font:inherit;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font-size:14px;line-height:22px}
.hb-input:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.hb-input::placeholder{color:var(--dsw-alias-label-dimmed)}
.hb-button{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);height:32px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:16px;justify-content:center;align-items:center;gap:4px;padding:0 14px;font-size:13px;line-height:20px;display:inline-flex;white-space:nowrap}
.hb-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.hb-buttonPrimary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}
.hb-buttonPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.hb-buttonDanger{color:var(--dsw-alias-state-error-primary)}
.hb-button:disabled{opacity:.4;cursor:default}
.hb-button:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3);outline:none}
.hb-segment{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:2px;display:inline-flex}
.hb-segmentButton{border:0;height:26px;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;background:0 0;border-radius:6px;padding:0 12px}
.hb-segmentButton:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.hb-segmentButton[data-active=true]{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.hb-segmentButton:disabled{opacity:.4;cursor:default}
.hb-slider{accent-color:var(--dsw-alias-brand-primary);flex:1 1 160px;min-width:120px}
.hb-sliderValue{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
.hb-preview{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-base);background-position:center;background-repeat:no-repeat;border-radius:12px;width:100%;height:140px;overflow:hidden;display:block}
.hb-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
.hb-error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}
.hb-fileName{min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hb-alignGrid{display:grid;grid-template-columns:repeat(3,28px);gap:4px;width:fit-content}
.hb-alignCell{box-sizing:border-box;position:relative;border:1px solid var(--dsw-alias-border-l2);width:28px;height:28px;padding:0;cursor:pointer;background:0 0;border-radius:6px}
.hb-alignCell:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.hb-alignCell[data-active=true]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}
.hb-alignCell:disabled{opacity:.4;cursor:default}
.hb-alignDot{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.hb-alignCell[data-active=true] .hb-alignDot{background:var(--dsw-alias-brand-primary)}
`;
    const tagId = "harness-background/Section.module.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "harness-background";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ---------------------------------------------------------------------
    // Constants.
    // ---------------------------------------------------------------------
    const NS = "harness-background";
    const DEFAULT_OPACITY = 0.35;
    const DEFAULT_FIT = "stretch";
    const DEFAULT_SCALE = 1;
    const DEFAULT_ALIGN = "center";
    const STORAGE_KEY = "harness-background.v1";

    /** All 3x3 alignment positions, in grid row-major order. */
    const ALIGN_POSITIONS = ["topleft", "top", "topright", "left", "center", "right", "bottomleft", "bottom", "bottomright"];

    /** transform-origin per alignment position (anchor point of the scale). */
    const ALIGN_ORIGINS = {
      center: "50% 50%",
      left: "0% 50%",
      right: "100% 50%",
      top: "50% 0%",
      bottom: "50% 100%",
      topleft: "0% 0%",
      topright: "100% 0%",
      bottomleft: "0% 100%",
      bottomright: "100% 100%",
    };

    /** Grid cell (column, row) of each alignment position, for the picker dots. */
    const ALIGN_CELL = {
      topleft: [0, 0],
      top: [1, 0],
      topright: [2, 0],
      left: [0, 1],
      center: [1, 1],
      right: [2, 1],
      bottomleft: [0, 2],
      bottom: [1, 2],
      bottomright: [2, 2],
    };

    // ---------------------------------------------------------------------
    // Browser-local persistence (see the module doc for why not settings).
    // ---------------------------------------------------------------------

    /** Normalize one parsed storage value onto the state shape with defaults. */
    function normalize(parsed) {
      const out = { image: undefined, opacity: DEFAULT_OPACITY, fit: DEFAULT_FIT, scale: DEFAULT_SCALE, align: DEFAULT_ALIGN };
      if (typeof parsed?.image === "string" && parsed.image.length > 0) out.image = parsed.image;
      if (typeof parsed?.opacity === "number" && Number.isFinite(parsed.opacity)) out.opacity = Math.min(1, Math.max(0, parsed.opacity));
      // fit: 'stretch' = whole image stretched to fill the container (no crop);
      // 'contain' = whole image visible keeping aspect ratio. Legacy 'cover'
      // (crop-to-fill) is migrated to 'stretch'.
      if (parsed?.fit === "contain") out.fit = "contain";
      else if (parsed?.fit === "stretch" || parsed?.fit === "cover") out.fit = "stretch";
      if (typeof parsed?.scale === "number" && Number.isFinite(parsed.scale)) out.scale = Math.min(4, Math.max(0.25, parsed.scale));
      if (ALIGN_POSITIONS.includes(parsed?.align)) out.align = parsed.align;
      return out;
    }

    /** Read the persisted section; absent or unreadable storage falls back to defaults. */
    function readStorage() {
      try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed : null;
      } catch {
        return null;
      }
    }

    let state = normalize(readStorage());
    const listeners = new Set();

    /** uSES getSnapshot: the current state object (stable until the next mutate). */
    function getSnapshot() {
      return state;
    }

    /** uSES subscribe: notify on every mutate. */
    function subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    }

    /** Persist the current state; quota/privacy-mode failures keep in-memory state. */
    function persist() {
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* localStorage full or unavailable — the session keeps working */
      }
    }

    /** Apply a patch to the state, persist, and notify subscribers. */
    function mutate(patch) {
      state = { ...state, ...patch };
      persist();
      for (const fn of [...listeners]) fn();
    }

    // ---------------------------------------------------------------------
    // Copy — the settings section texts.
    // ---------------------------------------------------------------------
    const zh = {
      "settings.title": "会话背景",
      "settings.intro": "在会话窗口上方叠加一张背景图片，可调节透明度和适配方式。图片与设置会自动保存在浏览器中。",
      "settings.sourceLocal": "本地图片",
      "settings.sourceLocalHint": "从本机选择图片（JPG / PNG / WebP / GIF 等），会自动压缩到适合背景的尺寸后保存。",
      "settings.chooseFile": "选择图片…",
      "settings.processing": "处理中…",
      "settings.fileReady": "已选择：{name}（{size}）",
      "settings.fileError": "图片读取或压缩失败，请换一张试试。",
      "settings.sourceUrl": "网络图片",
      "settings.urlPlaceholder": "输入图片 URL（https://…）",
      "settings.urlApply": "应用",
      "settings.urlError": "无法加载这张图片，请检查 URL 是否正确。",
      "settings.opacity": "透明度",
      "settings.fit": "适配方式",
      "settings.fitStretch": "填充",
      "settings.fitContain": "完整显示",
      "settings.fitStretchHint": "整张图片拉伸填满背景，不裁剪（宽高比不同时会变形）。",
      "settings.fitContainHint": "完整显示整张图片，保持原始比例。",
      "settings.scale": "缩放",
      "settings.scaleHint": "按比例整体缩放图片（25%–400%）。",
      "settings.align": "对齐",
      "settings.align.topleft": "左上",
      "settings.align.top": "靠上",
      "settings.align.topright": "右上",
      "settings.align.left": "靠左",
      "settings.align.center": "居中",
      "settings.align.right": "靠右",
      "settings.align.bottomleft": "左下",
      "settings.align.bottom": "靠下",
      "settings.align.bottomright": "右下",
      "settings.remove": "移除背景",
      "settings.reset": "恢复默认",
    };
    const en = {
      "settings.title": "Session Background",
      "settings.intro": "Overlay a background image on the session view. You can adjust its opacity and how it fits; the image and options are saved in your browser.",
      "settings.sourceLocal": "Local image",
      "settings.sourceLocalHint": "Pick an image from this computer (JPG / PNG / WebP / GIF…). It is downscaled automatically so it can be saved with your settings.",
      "settings.chooseFile": "Choose image…",
      "settings.processing": "Working…",
      "settings.fileReady": "Selected: {name} ({size})",
      "settings.fileError": "Could not read or compress this image — try another one.",
      "settings.sourceUrl": "Network image",
      "settings.urlPlaceholder": "Enter an image URL (https://…)",
      "settings.urlApply": "Apply",
      "settings.urlError": "Could not load this image — check the URL.",
      "settings.opacity": "Opacity",
      "settings.fit": "Fit",
      "settings.fitStretch": "Fill",
      "settings.fitContain": "Fit whole",
      "settings.fitStretchHint": "Stretches the whole image to fill the background — nothing is cropped (the aspect ratio may change).",
      "settings.fitContainHint": "Shows the whole image, keeping its original aspect ratio.",
      "settings.scale": "Scale",
      "settings.scaleHint": "Scales the whole image proportionally (25%–400%).",
      "settings.align": "Alignment",
      "settings.align.topleft": "Top-left",
      "settings.align.top": "Top",
      "settings.align.topright": "Top-right",
      "settings.align.left": "Left",
      "settings.align.center": "Center",
      "settings.align.right": "Right",
      "settings.align.bottomleft": "Bottom-left",
      "settings.align.bottom": "Bottom",
      "settings.align.bottomright": "Bottom-right",
      "settings.remove": "Remove background",
      "settings.reset": "Reset to defaults",
    };

    /** Translate function; bound in apply() once the locale service is available. */
    let t = (key, params) => (params ? String(params.name ?? "") : key);

    // ---------------------------------------------------------------------
    // Image helpers.
    // ---------------------------------------------------------------------

    /** Read a picked File into a data: URL. */
    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
      });
    }

    /**
     * Downscale a data: URL so the longer edge is at most `maxEdge` pixels.
     * Small images are returned untouched; failures fall back to the input.
     */
    function downscaleImage(dataUrl, maxEdge = 1920, quality = 0.85) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
            if (scale >= 1 || img.naturalWidth === 0) {
              resolve(dataUrl);
              return;
            }
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const ctx = canvas.getContext("2d");
            if (ctx === null) {
              resolve(dataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const mime = dataUrl.startsWith("data:image/png")
              ? "image/png"
              : dataUrl.startsWith("data:image/webp")
                ? "image/webp"
                : "image/jpeg";
            resolve(canvas.toDataURL(mime, mime === "image/jpeg" ? quality : void 0));
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    /** Whether an http(s) URL loads as an image (plain <img> probe, no CORS needed). */
    function probeImageUrl(url) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    }

    /** Human-readable byte size. */
    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // ---------------------------------------------------------------------
    // The frame-wide background layer (shell.overlay entry).
    // ---------------------------------------------------------------------

    /**
     * @returns the background <img>, or null while no image is configured.
     */
    function BackgroundLayer() {
      const value = react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      const image = value?.image;
      const [broken, setBroken] = react.useState(false);
      react.useEffect(() => {
        setBroken(false);
      }, [image]);
      if (!image || broken) return null;
      const fit = value?.fit === "contain" ? "contain" : "stretch";
      const opacity = typeof value?.opacity === "number" ? value.opacity : DEFAULT_OPACITY;
      const scale = typeof value?.scale === "number" ? value.scale : DEFAULT_SCALE;
      const align = ALIGN_ORIGINS[value?.align] ? value.align : DEFAULT_ALIGN;
      const anchor = ALIGN_ORIGINS[align];
      return react.createElement("img", {
        src: image,
        alt: "",
        draggable: false,
        onError: () => setBroken(true),
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          // stretch (stored) = whole image stretched to fill the container,
          // rendered with object-fit: fill (may distort); contain = whole
          // image visible keeping aspect ratio.
          objectFit: fit === "contain" ? "contain" : "fill",
          // object-position pins the image CONTENT inside the box to the
          // alignment point (transform-origin alone only anchors the box,
          // which leaves letterboxed content centered in contain mode).
          objectPosition: anchor,
          opacity,
          transform: `scale(${scale})`,
          transformOrigin: anchor,
          pointerEvents: "none",
          userSelect: "none",
        },
      });
    }

    // ---------------------------------------------------------------------
    // The settings page (settings.section entry).
    // ---------------------------------------------------------------------

    /**
     * @returns the "Session Background" settings section.
     */
    function BackgroundSettingsSection() {
      const value = react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      const image = value?.image;
      const fit = value?.fit === "contain" ? "contain" : "stretch";
      const opacity = typeof value?.opacity === "number" ? value.opacity : DEFAULT_OPACITY;
      const scale = typeof value?.scale === "number" ? value.scale : DEFAULT_SCALE;
      const align = ALIGN_ORIGINS[value?.align] ? value.align : DEFAULT_ALIGN;

      const fileInput = react.useRef(null);
      const [error, setError] = react.useState(null);
      const [busy, setBusy] = react.useState(false);
      const [busyUrl, setBusyUrl] = react.useState(false);
      const [urlValue, setUrlValue] = react.useState("");
      const [picked, setPicked] = react.useState(null);

      const chooseFile = () => {
        fileInput.current?.click();
      };

      const onFileChange = (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";
        if (!file) return;
        setBusy(true);
        setError(null);
        readFileAsDataUrl(file)
          .then((dataUrl) => downscaleImage(dataUrl, 1920, 0.85))
          .then((finalUrl) => {
            setBusy(false);
            setPicked({ name: file.name, size: file.size });
            mutate({ image: finalUrl });
          })
          .catch(() => {
            setBusy(false);
            setError(t("settings.fileError"));
          });
      };

      const applyUrl = () => {
        const url = urlValue.trim();
        if (!/^https?:\/\//i.test(url)) {
          setError(t("settings.urlError"));
          return;
        }
        setBusyUrl(true);
        setError(null);
        probeImageUrl(url).then((ok) => {
          setBusyUrl(false);
          if (!ok) {
            setError(t("settings.urlError"));
            return;
          }
          setPicked(null);
          setUrlValue("");
          mutate({ image: url });
        });
      };

      const onOpacity = (event) => {
        mutate({ opacity: Number(event.target.value) / 100 });
      };

      const onScale = (event) => {
        mutate({ scale: Number(event.target.value) / 100 });
      };

      const setFit = (nextFit) => {
        mutate({ fit: nextFit });
      };

      const removeImage = () => {
        mutate({ image: undefined });
        setPicked(null);
      };

      const resetDefaults = () => {
        mutate({ opacity: DEFAULT_OPACITY, fit: DEFAULT_FIT, scale: DEFAULT_SCALE, align: DEFAULT_ALIGN });
      };

      const previewStyle = image
        ? {
            objectFit: fit === "contain" ? "contain" : "fill",
            objectPosition: ALIGN_ORIGINS[align],
            opacity,
            transform: `scale(${scale})`,
            transformOrigin: ALIGN_ORIGINS[align],
          }
        : void 0;

      return react.createElement("section", { className: "hb-section", "aria-label": t("settings.title") }, [
        react.createElement("h2", { key: "title", className: "hb-title" }, t("settings.title")),
        react.createElement("p", { key: "intro", className: "hb-intro" }, t("settings.intro")),
        image
          ? react.createElement("img", {
              key: "preview",
              className: "hb-preview",
              src: image,
              alt: "",
              draggable: false,
              style: previewStyle,
              onError: (event) => {
                event.currentTarget.style.display = "none";
              },
            })
          : null,
        react.createElement("div", { key: "source", className: "hb-card" }, [
          react.createElement("div", { key: "local", className: "hb-field" }, [
            react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.sourceLocal")),
            react.createElement("div", { key: "row", className: "hb-row" }, [
              react.createElement("input", {
                key: "file",
                ref: fileInput,
                type: "file",
                accept: "image/*",
                style: { display: "none" },
                tabIndex: -1,
                "aria-hidden": true,
                onChange: onFileChange,
              }),
              react.createElement(
                "button",
                { key: "pick", type: "button", className: "hb-button hb-buttonPrimary", disabled: busy, onClick: chooseFile },
                busy ? t("settings.processing") : t("settings.chooseFile"),
              ),
              picked
                ? react.createElement(
                    "span",
                    { key: "picked", className: "hb-fileName", title: picked.name },
                    t("settings.fileReady", { name: picked.name, size: formatBytes(picked.size) }),
                  )
                : null,
            ]),
            react.createElement("p", { key: "hint", className: "hb-hint" }, t("settings.sourceLocalHint")),
          ]),
          react.createElement("div", { key: "url", className: "hb-field" }, [
            react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.sourceUrl")),
            react.createElement("div", { key: "row", className: "hb-row" }, [
              react.createElement(
                "div",
                { key: "grow", className: "hb-grow" },
                react.createElement("input", {
                  className: "hb-input",
                  type: "text",
                  value: urlValue,
                  placeholder: t("settings.urlPlaceholder"),
                  onChange: (event) => setUrlValue(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") applyUrl();
                  },
                }),
              ),
              react.createElement(
                "button",
                { key: "apply", type: "button", className: "hb-button", disabled: busyUrl, onClick: applyUrl },
                busyUrl ? t("settings.processing") : t("settings.urlApply"),
              ),
            ]),
          ]),
        ]),
        error ? react.createElement("p", { key: "error", className: "hb-error", role: "alert" }, error) : null,
        react.createElement("div", { key: "opacity", className: "hb-field" }, [
          react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.opacity")),
          react.createElement("div", { key: "row", className: "hb-row" }, [
            react.createElement("input", {
              key: "slider",
              className: "hb-slider",
              type: "range",
              min: 0,
              max: 100,
              step: 1,
              value: Math.round(opacity * 100),
              "aria-label": t("settings.opacity"),
              onChange: onOpacity,
            }),
            react.createElement("span", { key: "value", className: "hb-sliderValue" }, `${Math.round(opacity * 100)}%`),
          ]),
        ]),
        react.createElement("div", { key: "fit", className: "hb-field" }, [
          react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.fit")),
          react.createElement("div", { key: "segment", className: "hb-segment", role: "group", "aria-label": t("settings.fit") }, [
            react.createElement(
              "button",
              { key: "stretch", type: "button", className: "hb-segmentButton", "data-active": fit === "stretch", onClick: () => setFit("stretch") },
              t("settings.fitStretch"),
            ),
            react.createElement(
              "button",
              { key: "contain", type: "button", className: "hb-segmentButton", "data-active": fit === "contain", onClick: () => setFit("contain") },
              t("settings.fitContain"),
            ),
          ]),
          react.createElement(
            "p",
            { key: "hint", className: "hb-hint" },
            fit === "contain" ? t("settings.fitContainHint") : t("settings.fitStretchHint"),
          ),
        ]),
        react.createElement("div", { key: "scale", className: "hb-field" }, [
          react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.scale")),
          react.createElement("div", { key: "row", className: "hb-row" }, [
            react.createElement("input", {
              key: "slider",
              className: "hb-slider",
              type: "range",
              min: 25,
              max: 400,
              step: 1,
              value: Math.round(scale * 100),
              "aria-label": t("settings.scale"),
              onChange: onScale,
            }),
            react.createElement("span", { key: "value", className: "hb-sliderValue" }, `${Math.round(scale * 100)}%`),
          ]),
          react.createElement("p", { key: "hint", className: "hb-hint" }, t("settings.scaleHint")),
        ]),
        react.createElement("div", { key: "align", className: "hb-field" }, [
          react.createElement("span", { key: "label", className: "hb-fieldLabel" }, t("settings.align")),
          react.createElement(
            "div",
            { key: "grid", className: "hb-alignGrid", role: "group", "aria-label": t("settings.align") },
            ALIGN_POSITIONS.map((pos) => {
              const [col, row] = ALIGN_CELL[pos];
              return react.createElement(
                "button",
                {
                  key: pos,
                  type: "button",
                  className: "hb-alignCell",
                  "data-active": align === pos,
                  title: t(`settings.align.${pos}`),
                  "aria-label": t(`settings.align.${pos}`),
                  onClick: () => mutate({ align: pos }),
                },
                react.createElement("span", { className: "hb-alignDot", style: { left: 11 * col, top: 11 * row } }),
              );
            }),
          ),
        ]),
        react.createElement("div", { key: "actions", className: "hb-row" }, [
          image
            ? react.createElement("button", { key: "remove", type: "button", className: "hb-button hb-buttonDanger", onClick: removeImage }, t("settings.remove"))
            : null,
          react.createElement("button", { key: "reset", type: "button", className: "hb-button", onClick: resetDefaults }, t("settings.reset")),
        ]),
      ]);
    }

    // ---------------------------------------------------------------------
    // Plugin body.
    // ---------------------------------------------------------------------

    /** Required services: slot registration and the locale dictionary registry. */
    const inject = ["slots", "locale"];

    /**
     * Client plugin body: register the dictionaries and contribute the two
     * slot entries. All state lives in the module-local store above, so the
     * components take no props and depend on no framework-synthesized seats.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "harness-background: dictionaries");
      t = ctx.locale.bind(NS);
      ctx.slots.inject("shell.overlay", () =>
        ctx.slots.register(
          {
            name: "shell.overlay",
            id: "harness-background",
            order: 100,
          },
          BackgroundLayer,
        ),
      );
      ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          {
            name: "settings.section",
            id: "harness-background",
            order: 40,
            label: () => t("settings.title"),
          },
          BackgroundSettingsSection,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    // Test seam (ignored by the loader, which only consumes apply/inject).
    exports._test = { mutate, getSnapshot, subscribe, STORAGE_KEY };
    return module.exports;
  },
});
