if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/mykit/sw.js', { scope: '/mykit/', updateViaCache: 'none' })
      .then(function (reg) {
        console.log('[SW] registered scope:', reg.scope);
        reg.update();
      })
      .catch(function (err) { console.warn('[SW] registration failed:', err); });
  });
}
