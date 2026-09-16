import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { signedPhoto } from '../services/photos';
export function Photo({ path, alt }: { path: string | null; alt: string }) {
  const [url, setUrl] = useState(''),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setUrl('');
    setFailed(false);
    if (!path) return;
    const load = () =>
      void signedPhoto(path)
        .then((url) => {
          if (live) {
            setUrl(url);
            setFailed(false);
          }
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    load();
    const timer = setInterval(load, 240000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [path]);
  return url && !failed ? (
    <img className="record-photo" src={url} alt={alt} onError={() => setFailed(true)} />
  ) : (
    <div className="photo-placeholder">
      <Camera size={27} />
      <span>
        {failed
          ? 'No se pudo cargar la fotografía'
          : path
            ? 'Cargando fotografía…'
            : 'Sin fotografía'}
      </span>
    </div>
  );
}
