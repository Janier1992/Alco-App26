import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MetrologyRecord, MetrologyReplacementRecord } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BRAND_COLOR: [number, number, number] = [2, 132, 199];   // sky-600
const DARK: [number, number, number] = [15, 23, 42];            // slate-900
const MUTED: [number, number, number] = [100, 116, 139];        // slate-500
const LIGHT_BG: [number, number, number] = [241, 245, 249];     // slate-100
const SUCCESS: [number, number, number] = [5, 150, 105];        // emerald-600

function addHeader(doc: jsPDF, title: string, subtitle: string, docId: string, logoImg?: HTMLImageElement | null, consecutiveNumber?: number) {
    const pageW = doc.internal.pageSize.getWidth();

    // Top bar
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageW, 22, 'F');

    // Company logo or name
    if (logoImg) {
        try {
            const aspect = logoImg.width / logoImg.height;
            const logoH = 14;
            const logoW = logoH * aspect;
            doc.addImage(logoImg, 'PNG', 14, 4, logoW, logoH);
        } catch (e) {
            console.error("Error drawing logo:", e);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('ALCO S.A.S', 14, 14);
        }
    } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ALCO S.A.S', 14, 14);
    }

    // Subtitle right-aligned
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('Sistema de Gestión de Calidad · SGC', pageW - 14, 10, { align: 'right' });

    // Doc ID right (with consecutive number if provided)
    doc.setFontSize(7);
    const displayId = consecutiveNumber !== undefined 
        ? `ID: No. ${consecutiveNumber} - ${docId}` 
        : `ID: ${docId}`;
    doc.text(displayId, pageW - 14, 16, { align: 'right' });

    // Title block
    doc.setTextColor(...DARK);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 34);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(subtitle, 14, 40);

    // Divider
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.5);
    doc.line(14, 44, pageW - 14, 44);
}

function addSectionLabel(doc: jsPDF, label: string, y: number) {
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(14, y, pageW - 28, 7, 1, 1, 'F');
    doc.setTextColor(...BRAND_COLOR);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), 17, y + 5);
    return y + 12;
}

function addInfoGrid(doc: jsPDF, fields: { label: string; value: string }[], startY: number, cols = 3): number {
    const pageW = doc.internal.pageSize.getWidth();
    const colW = (pageW - 28) / cols;
    let row = 0;
    let col = 0;
    let maxY = startY;

    fields.forEach(({ label, value }) => {
        const x = 14 + col * colW;
        const y = startY + row * 18;

        doc.setTextColor(...MUTED);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), x, y);

        doc.setTextColor(...DARK);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value || '—', colW - 4);
        doc.text(lines, x, y + 4.5);

        maxY = Math.max(maxY, y + 4.5 + lines.length * 4);

        col++;
        if (col >= cols) { col = 0; row++; }
    });

    return maxY + 6;
}

function addSignature(doc: jsPDF, label: string, sigData: string, x: number, y: number, w: number) {
    const h = 28;
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2);

    doc.setTextColor(...MUTED);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), x + 3, y + 5);

    if (sigData && sigData.startsWith('data:')) {
        try {
            doc.addImage(sigData, 'PNG', x + 2, y + 7, w - 4, h - 10);
        } catch (_) {
            doc.setTextColor(...SUCCESS);
            doc.setFontSize(7);
            doc.text('✓ Firmado digitalmente', x + 4, y + h / 2 + 2);
        }
    } else if (sigData && sigData !== '') {
        doc.setTextColor(...SUCCESS);
        doc.setFontSize(7);
        doc.text('✓ Firmado digitalmente', x + 4, y + h / 2 + 2);
    } else {
        doc.setTextColor(...MUTED);
        doc.setFontSize(7);
        doc.text('Sin firma', x + 4, y + h / 2 + 2);
    }

    // Signature line
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.2);
    doc.line(x + 4, y + h - 4, x + w - 4, y + h - 4);
}

function addFooter(doc: jsPDF) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFillColor(...LIGHT_BG);
    doc.rect(0, pageH - 14, pageW, 14, 'F');

    doc.setTextColor(...MUTED);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${today} · ALCO S.A.S · Sistema de Gestión de Calidad`, 14, pageH - 5);
    doc.text('Documento controlado — No válido sin firmas', pageW - 14, pageH - 5, { align: 'right' });
}

// ─── Exportar Acta de Entrega ────────────────────────────────────────────────

export async function exportMetrologyToPDF(record: MetrologyRecord, consecutiveNumber?: number) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Load logo image
    let logoImg: HTMLImageElement | null = null;
    try {
        const BASE = import.meta.env.BASE_URL || '/Alco-App26/';
        const logoUrl = `${BASE.replace(/\/$/, '')}/logo_alco.png`;
        logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load logo'));
            img.src = logoUrl;
        });
    } catch (e) {
        console.warn("Could not load Alco logo for PDF header, using text fallback:", e);
    }

    addHeader(doc, 'ACTA DE ENTREGA DE EQUIPOS', 'Gestión de Herramientas y Activos · Transversal SGC', record.id, logoImg, consecutiveNumber);

    let y = 52;

    // ── Datos Generales
    y = addSectionLabel(doc, '1. Datos Generales', y);
    y = addInfoGrid(doc, [
        { label: 'Fecha', value: record.fecha },
        { label: 'Área', value: record.area },
        { label: 'Sede', value: record.sede },
    ], y, 3);

    y += 4;

    // ── Receptor
    y = addSectionLabel(doc, '2. Datos del Receptor', y);
    y = addInfoGrid(doc, [
        { label: 'Nombre y Apellidos', value: record.receptorNombre },
        { label: 'Cédula', value: record.receptorCedula },
        { label: 'Cargo', value: record.receptorCargo },
    ], y, 3);

    y += 4;

    // ── Equipos entregados
    y = addSectionLabel(doc, '3. Equipos / Herramientas Entregadas', y);

    autoTable(doc, {
        startY: y,
        head: [['#', 'Equipo / Herramienta', 'Marca', 'Cant.', 'Observaciones']],
        body: record.items.map((item, i) => [
            String(i + 1),
            item.equipoNombre,
            item.marca,
            String(item.cantidad),
            item.observaciones,
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 3, font: 'helvetica', textColor: DARK },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: LIGHT_BG },
        columnStyles: { 0: { cellWidth: 8 }, 3: { cellWidth: 12, halign: 'center' } },
        margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Firmas
    if (y > 230) { doc.addPage(); y = 20; }

    y = addSectionLabel(doc, '4. Firmas del Acta', y);

    const sigW = (pageW - 36) / 2;
    addSignature(doc, 'Firma Quien Entrega (Gestor SGC)', record.firmaEntrega, 14, y, sigW);
    addSignature(doc, 'Firma Quien Recibe (Colaborador)', record.firmaRecibe, 14 + sigW + 8, y, sigW);

    y += 36;

    // ── Declaración
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, y, pageW - 28, 14, 2, 2, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.text(
        'Declaro que recibo los equipos/herramientas en perfecto estado y me comprometo a su cuidado, uso correcto y devolución en las mismas condiciones.',
        17, y + 5, { maxWidth: pageW - 34 }
    );

    addFooter(doc);
    doc.save(`Acta_Entrega_${record.id}_${record.receptorNombre.replace(/\s+/g, '_')}.pdf`);
}


// ─── Exportar Baja / Reposición ──────────────────────────────────────────────

export async function exportReplacementToPDF(record: MetrologyReplacementRecord) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Load logo image
    let logoImg: HTMLImageElement | null = null;
    try {
        const BASE = import.meta.env.BASE_URL || '/Alco-App26/';
        const logoUrl = `${BASE.replace(/\/$/, '')}/logo_alco.png`;
        logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load logo'));
            img.src = logoUrl;
        });
    } catch (e) {
        console.warn("Could not load Alco logo for PDF header, using text fallback:", e);
    }

    addHeader(doc, 'ACTA DE BAJA Y REPOSICIÓN DE EQUIPO', 'Gestión del Ciclo de Vida de Activos · SGC', record.id, logoImg);

    let y = 52;

    // ── Datos Generales
    y = addSectionLabel(doc, '1. Datos del Registro', y);
    y = addInfoGrid(doc, [
        { label: 'ID Registro', value: record.id },
        { label: 'Fecha', value: record.fechaRegistro },
        { label: 'Área de Uso', value: record.areaUso },
        { label: 'Se Cobra Equipo', value: record.seCobraEquipo },
        { label: 'Devuelve Equipo Anterior', value: record.devuelveEquipoAnterior },
    ], y, 3);

    y += 4;

    // ── Datos del Equipo
    y = addSectionLabel(doc, '2. Equipo Dado de Baja', y);
    y = addInfoGrid(doc, [
        { label: 'Nombre del Equipo', value: record.nombreEquipo },
        { label: 'Marca', value: record.marca },
        { label: 'Código', value: record.codigo },
    ], y, 3);

    y += 4;

    // ── Motivo y Baja
    y = addSectionLabel(doc, '3. Motivo y Descripción', y);
    y = addInfoGrid(doc, [
        { label: 'Motivo de Reposición', value: record.motivoReposicion },
        { label: 'Descripción de la Baja', value: record.descripcionBaja },
    ], y, 2);

    y += 4;

    // ── Responsables
    y = addSectionLabel(doc, '4. Responsables', y);
    y = addInfoGrid(doc, [
        { label: 'Responsable Proceso / Área', value: record.nombreResponsable },
        { label: 'Responsable Calidad', value: record.nombreResponsableCalidad || '—' },
    ], y, 2);

    y += 4;

    // ── Firmas
    if (y > 220) { doc.addPage(); y = 20; }
    y = addSectionLabel(doc, '5. Firmas del Acta', y);

    const sigW = (pageW - 36) / 2;
    addSignature(doc, 'Firma Responsable Proceso/Área', record.firmaResponsableArea, 14, y, sigW);
    addSignature(doc, 'Firma Responsable Calidad', record.firmaResponsableCalidad, 14 + sigW + 8, y, sigW);

    y += 36;

    // ── Nota
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(14, y, pageW - 28, 14, 2, 2, 'F');
    doc.setTextColor(120, 53, 15);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.text(
        'Este documento certifica la baja definitiva del equipo y la entrega del equipo de reposición. Conservar para archivo del SGC.',
        17, y + 5, { maxWidth: pageW - 34 }
    );

    addFooter(doc);
    doc.save(`Baja_Reposicion_${record.id}_${record.nombreEquipo.replace(/\s+/g, '_')}.pdf`);
}
