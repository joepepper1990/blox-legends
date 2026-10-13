// Updates arrive as a complete new version (see tools/sw-template.js). The new
// version waits until Freddie is in the hub and taps "Update ready", so a run
// is never interrupted and old and new files are never mixed.

export function watchForUpdates(game) {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  if (new URLSearchParams(location.search).has('nosw')) return;

  let accepted = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (accepted) location.reload();
  });

  navigator.serviceWorker
    .register('sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      const offer = (worker) => {
        game.pendingUpdate = async () => {
          accepted = true;
          if (game.save.pending?.length) await game.save.endRun(game.worldName, { partial: true });
          await game.save.write();
          worker.postMessage({ type: 'SKIP_WAITING' });
        };
        game.onUpdateReady?.();
      };
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
        });
      });
      // Home-screen apps rarely check for updates on their own.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
      game.swReady = navigator.serviceWorker.ready;
    })
    .catch(() => {});
}
