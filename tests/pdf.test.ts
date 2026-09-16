import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { describe, it, expect } from 'vitest';
import { buildReportPdf } from '../src/services/pdf';
import { demoData } from '../src/lib/demo';
describe('Exportación de reporte', () => {
  it('genera PDF paginado con logo y datos de demostración', async () => {
    const data = demoData();
    const logo =
      'data:image/jpeg;base64,' + readFileSync(resolve('public/logo.jpg')).toString('base64');
    const doc = await buildReportPdf(data.reports[0], data, true, async () => logo);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    const output = doc.output();
    expect(output.startsWith('%PDF-')).toBe(true);
    expect(output).toContain('MOVIEXPRESS');
    expect(output).toContain('REP-2026-000003');
    expect(output).toContain('Carlos');
    if (process.env.QA_PDF_PATH)
      writeFileSync(process.env.QA_PDF_PATH, new Uint8Array(doc.output('arraybuffer')));
  });
});
