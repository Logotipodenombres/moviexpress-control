import { jsPDF } from 'jspdf';
import type { DataSet, Report } from '../types';
import { dateTime } from '../lib/utils';
import { signedPhoto } from './photos';
async function imageData(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar una fotografía para el PDF.');
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export async function buildReportPdf(
  report: Report,
  data: DataSet,
  demo = false,
  loadImage: (url: string) => Promise<string> = imageData,
) {
  const doc = new jsPDF();
  const vehicle = data.vehicles.find((v) => v.id === report.vehicle_id),
    driver = data.drivers.find((d) => d.id === vehicle?.driver_id),
    location = data.vehicle_locations
      .filter((l) => l.vehicle_id === report.vehicle_id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const logo = await loadImage(import.meta.env.BASE_URL + 'logo.jpg');
  let y = 0;
  const header = () => {
    doc.setFillColor(23, 24, 28);
    doc.rect(0, 0, 210, 36, 'F');
    doc.addImage(logo, 'JPEG', 14, 7, 30, 21.4);
    doc.setTextColor(255, 203, 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('MOVIEXPRESS', 50, 16);
    doc.setFontSize(9);
    doc.setTextColor(230, 230, 230);
    doc.text('REGISTRO Y SEGUIMIENTO DE TRANSPORTISTAS', 50, 24);
    doc.setTextColor(35, 35, 40);
    y = 48;
  };
  header();
  const space = (height: number) => {
    if (y + height > 277) {
      doc.addPage();
      header();
    }
  };
  const section = (name: string) => {
    space(18);
    doc.setFillColor(255, 203, 5);
    doc.rect(14, y, 182, 9, 'F');
    doc.setTextColor(38, 34, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(name.toUpperCase(), 18, y + 6);
    y += 16;
  };
  const row = (label: string, value: unknown) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines: string[] = doc.splitTextToSize(String(value ?? 'Sin registro'), 130);
    for (let i = 0; i < lines.length; i++) {
      space(7);
      if (i === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 85);
        doc.text(label, 14, y);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 35);
      doc.text(lines[i], 64, y);
      y += 5;
    }
    y += 3;
  };
  row('Folio', report.folio);
  row('Fecha de reporte', dateTime(report.created_at));
  row('Estatus', report.status);
  if (demo) row('Importante', 'DEMOSTRACIÓN · Datos ficticios');
  section('Conductor');
  row('Nombre', driver?.full_name);
  row('Celular', driver?.phone);
  row('Licencia', driver?.license_number);
  section('Vehículo');
  row('Número económico', vehicle?.economic_number);
  row('Tipo', vehicle?.vehicle_type);
  row('Marca / submarca', `${vehicle?.brand || ''} ${vehicle?.subbrand || ''}`);
  row('Modelo / color', `${vehicle?.model || ''} / ${vehicle?.color || ''}`);
  row('Placas', vehicle?.plates);
  row('Señas particulares', vehicle?.features);
  section('Fotografías');
  const photos = [
    { path: driver?.photo_path, label: 'Conductor' },
    { path: vehicle?.photo_path, label: 'Vehículo' },
  ];
  for (const photo of photos) {
    if (photo.path) {
      space(70);
      const img = await loadImage(await signedPhoto(photo.path));
      doc.setFontSize(9);
      doc.text(photo.label, 14, y);
      y += 4;
      const props = doc.getImageProperties(img);
      const scale = Math.min(90 / props.width, 55 / props.height);
      doc.addImage(img, 'JPEG', 14, y, props.width * scale, props.height * scale);
      y += props.height * scale + 8;
    } else row(photo.label, 'Sin fotografía registrada');
  }
  section('Incidente');
  row('Fecha del incidente', dateTime(report.incident_at));
  row('Hora del asalto', report.assault_time);
  row('Último contacto', dateTime(report.last_contact_at));
  row('Entidad', report.state);
  row('Municipio', report.municipality);
  row('Carretera / km', `${report.road || '—'} / ${report.kilometer || '—'}`);
  row('Referencia', report.reference);
  row('Descripción', report.description);
  row('Observaciones', report.notes);
  section('Carga');
  row('Tipo', report.cargo_type);
  row('Descripción', report.cargo_description);
  row('Valor (MXN)', report.cargo_value);
  row('Observaciones', report.cargo_notes);
  section('Última ubicación');
  row(
    'Coordenadas',
    location
      ? `${location.latitude}, ${location.longitude}`
      : report.latitude !== null
        ? `${report.latitude}, ${report.longitude}`
        : 'Sin registro',
  );
  row('Fecha y hora', dateTime(location?.timestamp || report.last_location_at));
  row('Fuente', location?.source || 'Captura en reporte');
  section('Denuncia y contacto');
  row('Denuncia', report.complaint_number);
  row('Predenuncia', report.precomplaint_number);
  row('Institución', report.institution);
  row('Fecha', dateTime(report.complaint_at));
  row('Observaciones', report.complaint_notes);
  row('Contacto', report.contact_name);
  row('Teléfono', report.contact_phone);
  row('Segundo teléfono', report.alternate_phone);
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setDrawColor(210, 210, 210);
    doc.line(14, 284, 196, 284);
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8);
    doc.text('Confidencial · ' + report.folio, 14, 290);
    doc.text(`${p} / ${doc.getNumberOfPages()}`, 196, 290, { align: 'right' });
  }
  return doc;
}
export async function reportPdf(report: Report, data: DataSet, demo = false) {
  const doc = await buildReportPdf(report, data, demo);
  doc.save(report.folio + '.pdf');
}
