/*
 * Stale-bundle recovery shim.
 *
 * Netlify serves real files ahead of non-forced redirects, so this is only ever
 * reached when a browser asks for /assets/<something>.js that no longer exists
 * on the current deploy — i.e. it is running an index.html held in its own disk
 * cache from an older release, pointing at a bundle hash that has since changed.
 *
 * Without this the SPA catch-all returned index.html for those requests, so the
 * browser received HTML where it expected JavaScript, failed to parse it, and
 * rendered nothing. Worse, a browser whose cached HTML still had its old bundle
 * cached alongside it kept running months-old application code — which is how
 * sign-in broke in one browser but not another: the stale bundle hashed
 * passwords with a scheme the accounts are no longer stored under.
 *
 * Reload once against a URL the HTTP cache has never seen, which forces a fresh
 * index.html and therefore the current bundle. The _fresh guard stops this from
 * looping if the reload still cannot resolve an asset.
 */
(function () {
  var FLAG = "_fresh";

  try {
    var url = new URL(window.location.href);
    if (url.searchParams.has(FLAG)) {
      // Already retried once — reloading again would spin. Leave the page alone
      // so the failure is visible rather than an endless refresh.
      return;
    }

    // Best-effort: drop any Cache Storage entries before reloading. Wrapped
    // because this throws in private mode and on browsers that block site data.
    var cleared = Promise.resolve();
    if (window.caches && typeof window.caches.keys === "function") {
      cleared = window.caches
        .keys()
        .then(function (keys) {
          return Promise.all(keys.map(function (k) { return window.caches.delete(k); }));
        })
        .catch(function () {});
    }

    cleared.then(function () {
      url.searchParams.set(FLAG, Date.now().toString());
      window.location.replace(url.toString());
    });
  } catch (e) {
    // If anything above is unavailable, fall back to a plain reload.
    try { window.location.reload(); } catch (e2) {}
  }
})();
