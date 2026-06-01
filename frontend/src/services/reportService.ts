import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType } from 'docx';
import { Ticket } from '@/types';

interface ReportData {
  tickets: Ticket[];
  filters: any;
  stats: any;
  generatedBy: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
}

export const reportService = {
  // Generar reporte en formato Word
  async generateWordReport(data: ReportData): Promise<void> {
    try {
      const doc = new Document({
        sections: [
          {
            children: [
              // Encabezado
              new Paragraph({
                text: 'ADMINISTRACIÓN RESIDENCIAL - STANZA MALAGA',
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: 'CONTROL DE CUOTAS Y RESERVACIONES DE ÁREAS COMUNES',
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),
              new Paragraph({
                text: 'REPORTE CONSOLIDADO DE FINANZAS Y EVENTOS',
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              }),

              // Información del reporte
              new Paragraph({
                text: 'INFORMACIÓN DEL REPORTE',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Periodo: ', bold: true }),
                  new TextRun(`${new Date(data.period.from).toLocaleDateString('es-ES')} - ${new Date(data.period.to).toLocaleDateString('es-ES')}`),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Generado por: ', bold: true }),
                  new TextRun(data.generatedBy),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Fecha de generación: ', bold: true }),
                  new TextRun(new Date(data.generatedAt).toLocaleDateString('es-ES')),
                ],
                spacing: { after: 200 },
              }),

              // Resumen estadístico
              new Paragraph({
                text: 'RESUMEN ESTADÍSTICO',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Total de solicitudes/reservaciones: ', bold: true }),
                  new TextRun(data.stats.totalTickets.toString()),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Eventos realizados: ', bold: true }),
                  new TextRun(data.stats.closedTickets.toString()),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Duración promedio de eventos: ', bold: true }),
                  new TextRun(`${data.stats.avgResolutionTime} horas`),
                ],
                spacing: { after: 200 },
              }),

              // Tabla de tickets
              new Paragraph({
                text: 'DETALLE DE TICKETS',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),

              // Crear tabla de tickets
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  // Header
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: 'Número', alignment: AlignmentType.CENTER })] }),
                      new TableCell({ children: [new Paragraph({ text: 'Título', alignment: AlignmentType.CENTER })] }),
                      new TableCell({ children: [new Paragraph({ text: 'Estado', alignment: AlignmentType.CENTER })] }),
                      new TableCell({ children: [new Paragraph({ text: 'Prioridad', alignment: AlignmentType.CENTER })] }),
                      new TableCell({ children: [new Paragraph({ text: 'Fecha', alignment: AlignmentType.CENTER })] }),
                    ],
                  }),
                  // Data rows
                  ...data.tickets.slice(0, 50).map(ticket => new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(ticket.ticketNumber)] }),
                      new TableCell({ children: [new Paragraph(ticket.title)] }),
                      new TableCell({ children: [new Paragraph(this.getStatusLabel(ticket.status))] }),
                      new TableCell({ children: [new Paragraph(this.getPriorityLabel(ticket.priority))] }),
                      new TableCell({ children: [new Paragraph(ticket.createdAt.toLocaleDateString('es-ES'))] }),
                    ],
                  }))
                ],
              }),

              // Pie de página
              new Paragraph({
                text: `Reporte generado el ${new Date().toLocaleDateString('es-ES')} por el Sistema de Administración Stanza Malaga`,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      this.downloadBlob(blob, `reporte-tickets-${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error('Error generando reporte Word:', error);
      throw new Error('Error al generar el reporte de Word');
    }
  },

  // Generar reporte en formato Excel (simulado como CSV)
  async generateExcelReport(data: ReportData): Promise<void> {
    try {
      let csvContent = 'Folio,Evento,Descripción,Estatus,Cuota,Residente,Mesa Directiva,Área Común,Fecha Registro,Fecha Evento,Duración (h)\n';
      
      data.tickets.forEach(ticket => {
        const resolutionTime = ticket.eventDuration || '';
        
        csvContent += [
          ticket.ticketNumber,
          `"${ticket.title}"`,
          `"${ticket.description.replace(/"/g, '""')}"`,
          this.getStatusLabel(ticket.status),
          this.getPriorityLabel(ticket.priority),
          ticket.reportedBy.fullName,
          ticket.assignedToId ? 'Asignado' : 'Sin asignar',
          ticket.equipmentId ? 'Con área' : 'Sin área',
          ticket.createdAt.toLocaleDateString('es-ES'),
          ticket.eventDate || '',
          resolutionTime
        ].join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `reporte-reservaciones-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error generando reporte Excel:', error);
      throw new Error('Error al generar el reporte de Excel');
    }
  },

  // Generar reporte en formato PDF (simulado como HTML)
  async generatePDFReport(data: ReportData): Promise<void> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Reservaciones - Stanza Malaga</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .stats { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .priority-alta { color: #dc2626; font-weight: bold; }
            .priority-critica { color: #dc2626; font-weight: bold; background: #fee2e2; }
            .status-cerrado { color: #166534; font-weight: bold; }
            .status-nuevo { color: #1e40af; font-weight: bold; }
            .status-en_proceso { color: #92400e; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ADMINISTRACIÓN RESIDENCIAL - STANZA MALAGA</h1>
            <h2>CONTROL DE CUOTAS Y RESERVACIONES DE ÁREAS COMUNES</h2>
            <h3>REPORTE CONSOLIDADO DE EVENTOS Y RESERVACIONES</h3>
          </div>
          
          <div class="info">
            <p><strong>Periodo:</strong> ${new Date(data.period.from).toLocaleDateString('es-ES')} - ${new Date(data.period.to).toLocaleDateString('es-ES')}</p>
            <p><strong>Generado por:</strong> ${data.generatedBy}</p>
            <p><strong>Fecha de generación:</strong> ${new Date(data.generatedAt).toLocaleDateString('es-ES')}</p>
          </div>
          
          <div class="stats">
            <h3>Resumen Estadístico</h3>
            <p><strong>Total de solicitudes/reservaciones:</strong> ${data.stats.totalTickets}</p>
            <p><strong>Eventos realizados:</strong> ${data.stats.closedTickets}</p>
            <p><strong>Duración promedio de eventos:</strong> ${data.stats.avgResolutionTime} horas</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Nombre del Evento</th>
                <th>Estatus</th>
                <th>Cuota</th>
                <th>Residente</th>
                <th>Fecha de Solicitud</th>
              </tr>
            </thead>
            <tbody>
              ${data.tickets.slice(0, 100).map(ticket => `
                <tr>
                  <td>${ticket.ticketNumber}</td>
                  <td>${ticket.title}</td>
                  <td class="status-${ticket.status}">${this.getStatusLabel(ticket.status)}</td>
                  <td class="priority-${ticket.priority}">${this.getPriorityLabel(ticket.priority)}</td>
                  <td>${ticket.reportedBy?.fullName || 'N/A'}</td>
                  <td>${new Date(ticket.createdAt).toLocaleDateString('es-MX')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p style="text-align: center; margin-top: 40px; color: #666;">
            Reporte generado el ${new Date().toLocaleDateString('es-ES')} por el Sistema de Administración Stanza Malaga
          </p>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      this.downloadBlob(blob, `reporte-reservaciones-${new Date().toISOString().split('T')[0]}.html`);
    } catch (error) {
      console.error('Error generando reporte PDF:', error);
      throw new Error('Error al generar el reporte PDF');
    }
  },

  // Utilidades
  getStatusLabel(status: string): string {
    const labels = {
      solicitado: 'Solicitado',
      confirmado: 'Confirmado',
      realizado: 'Realizado',
      cancelado: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  },

  getPriorityLabel(priority: string): string {
    const labels = {
      sin_clasificar: 'Sin Cuota',
      normal: 'Cuota de $1,500',
      importante: 'Cuota Especial'
    };
    return labels[priority as keyof typeof labels] || priority;
  },

  downloadFile(buffer: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([buffer], { type: mimeType });
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};