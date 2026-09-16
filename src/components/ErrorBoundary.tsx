import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="empty" role="alert">
          <h1>No se pudo mostrar esta pantalla.</h1>
          <p>Vuelve a cargar la aplicación. Si el problema continúa, contacta al administrador.</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Volver a cargar
          </button>
        </main>
      );
    return this.props.children;
  }
}
