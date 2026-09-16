import { useEffect, useRef, type ReactNode } from 'react';
import { X, Truck, ArrowUpRight, LoaderCircle } from 'lucide-react';
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={'brand ' + (large ? 'large' : '')}>
      <img src={import.meta.env.BASE_URL + 'logo.jpg'} alt="Logo Moviexpress" />
      <div>
        <strong>
          MOVI<span>EXPRESS</span>
        </strong>
        <small>CENTRO DE CONTROL</small>
      </div>
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={
        'badge ' +
        (['Activo', 'Suspendido'].includes(value)
          ? 'red'
          : ['En seguimiento', 'Mantenimiento'].includes(value)
            ? 'yellow'
            : ['Cerrado', 'Recuperado', 'Localizado'].includes(value)
              ? 'green'
              : 'neutral')
      }
    >
      {value}
    </span>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" /> Cargando información…
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Truck size={34} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function ArrowLink() {
  return <ArrowUpRight size={18} />;
}
