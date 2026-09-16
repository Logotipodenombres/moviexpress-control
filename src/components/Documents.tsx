import { useEffect, useState } from 'react';
import { FileText, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { dateTime, message } from '../lib/utils';
import { Empty } from './ui';
import type { Entity } from '../types';
interface DocumentRecord {
  id: string;
  name: string;
  path: string;
  created_at: string;
}
export function Documents({ entity, id }: { entity: Entity; id: string }) {
  const { demo, profile } = useAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const foreignKey =
    entity === 'drivers' ? 'driver_id' : entity === 'vehicles' ? 'vehicle_id' : 'report_id';
  useEffect(() => {
    let live = true;
    if (demo) return;
    void db()
      .from('record_documents')
      .select('id,name,path,created_at')
      .eq(foreignKey, id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (live) {
          if (error) toast.error(message(error));
          else setDocs(data);
        }
      });
    return () => {
      live = false;
    };
  }, [demo, id, foreignKey, version]);
  return (
    <>
      <p>Documentos PDF relacionados con este expediente. Máximo 10 MB por archivo.</p>
      {profile?.role !== 'viewer' && (
        <label className="button ghost">
          <Upload size={16} />
          {busy ? 'Subiendo…' : 'Adjuntar documento PDF'}
          <input
            type="file"
            hidden
            accept="application/pdf"
            disabled={busy || demo}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || !profile) return;
              setBusy(true);
              try {
                if (file.type !== 'application/pdf' || file.size > 10485760)
                  throw new Error('Selecciona un PDF de hasta 10 MB.');
                const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
                if (signature !== '%PDF-') throw new Error('El archivo no es un PDF válido.');
                const path = `${profile.organization_id}/${entity}/${id}/${crypto.randomUUID()}.pdf`;
                const { error } = await db()
                  .storage.from('fleet-documents')
                  .upload(path, file, { contentType: 'application/pdf', cacheControl: '0' });
                if (error) throw error;
                const result = await db()
                  .from('record_documents')
                  .insert({
                    organization_id: profile.organization_id,
                    [foreignKey]: id,
                    name: file.name.slice(0, 200),
                    path,
                  });
                if (result.error) throw result.error;
                setVersion((v) => v + 1);
                toast.success('Documento adjuntado.');
              } catch (e) {
                toast.error(message(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
      {docs.length ? (
        docs.map((d) => (
          <div className="related-record" key={d.id}>
            <FileText size={18} />
            <span>{d.name}</span>
            <small>{dateTime(d.created_at)}</small>
            <button
              className="icon-button"
              aria-label={'Descargar ' + d.name}
              onClick={async () => {
                try {
                  const { data, error } = await db()
                    .storage.from('fleet-documents')
                    .createSignedUrl(d.path, 60, { download: d.name });
                  if (error) throw error;
                  const a = document.createElement('a');
                  a.href = data.signedUrl;
                  a.rel = 'noopener noreferrer';
                  a.click();
                } catch (e) {
                  toast.error(message(e));
                }
              }}
            >
              <Download size={16} />
            </button>
          </div>
        ))
      ) : (
        <Empty title="Sin documentos adjuntos" />
      )}
    </>
  );
}
