export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}
export interface GpsProviderAdapter {
  readonly source: string;
  start(onPosition: (fix: GpsFix) => void, onError: (error: Error) => void): void;
  stop(): void;
}
export class BrowserGeolocationProvider implements GpsProviderAdapter {
  readonly source = 'browser';
  private watcher: number | null = null;
  start(onPosition: (fix: GpsFix) => void, onError: (error: Error) => void) {
    this.stop();
    if (!navigator.geolocation) {
      onError(new Error('Este navegador no ofrece geolocalización.'));
      return;
    }
    this.watcher = navigator.geolocation.watchPosition(
      (p) =>
        onPosition({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          speed: p.coords.speed,
          heading: p.coords.heading,
          timestamp: new Date(p.timestamp).toISOString(),
        }),
      (e) =>
        onError(
          new Error(
            e.code === 1
              ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
              : e.code === 2
                ? 'No se pudo determinar la ubicación.'
                : 'La ubicación tardó demasiado. Inténtalo otra vez.',
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }
  stop() {
    if (this.watcher !== null) {
      navigator.geolocation.clearWatch(this.watcher);
      this.watcher = null;
    }
  }
}
