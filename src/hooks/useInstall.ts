import { useEffect, useState } from 'react';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
let pending: InstallEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pending = e as InstallEvent;
  window.dispatchEvent(new Event('install-ready'));
});
export function useInstall() {
  const [ready, setReady] = useState(!!pending);
  useEffect(() => {
    const update = () => setReady(!!pending);
    window.addEventListener('install-ready', update);
    return () => window.removeEventListener('install-ready', update);
  }, []);
  return {
    ready,
    install: async () => {
      if (!pending) return;
      await pending.prompt();
      await pending.userChoice;
      pending = null;
      setReady(false);
    },
  };
}
