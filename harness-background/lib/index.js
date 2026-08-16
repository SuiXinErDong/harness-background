/**
 * harness-background — host half.
 *
 * Deliberately empty: the plugin's whole surface is browser-side, and its
 * persistence is browser-local (localStorage).
 *
 * Why no settings namespace here? The harness api-proxy serves only a
 * hardcoded allowlist of namespaces (`WEB_SETTINGS_NAMESPACES` in
 * dsh-host-apiproxy) to the web client — every other namespace is registered
 * host-side but refused on the wire with `settings-not-exposed`. A third-
 * party plugin therefore cannot read or write its own namespace through the
 * settings RPC without patching core harness packages, which would be lost on
 * every update. localStorage keeps the plugin fully self-contained.
 *
 * The empty apply exists so the package appears as a live entry in the host
 * cordis composition (the loader requires the entry for the browser half to
 * be discovered into the client boot manifest).
 * @param ctx - host cordis context (unused).
 */
export function apply(ctx) {}
