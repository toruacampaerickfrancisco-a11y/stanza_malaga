import PDFDocument from 'pdfkit';
import { Ticket, User, Equipment, Department } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfController = {
  async generateTicketPdf(ctx) {
    try {
      const { id } = ctx.params;
      const ticket = await Ticket.findByPk(id, {
        include: [
          { 
            model: User, 
            as: 'reportedBy', 
            attributes: ['nombre_completo', 'cargo', 'numero_empleado', 'departamento'],
            include: [{ model: Department, as: 'department', attributes: ['display_name'] }]
          },
          { model: User, as: 'assignedTo', attributes: ['nombre_completo'] },
          { model: Equipment, as: 'equipment', attributes: ['name', 'type', 'brand', 'model', 'serial_number', 'inventory_number', 'processor', 'ram', 'hard_drive', 'description'] }
        ]
      });

      if (!ticket) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Ticket no encontrado' };
        return;
      }

      // Check permissions (Admin and Technician only)
      const user = ctx.state.user;
      const role = (user.rol || user.role || '').toLowerCase().trim();
      
      if (!['admin', 'presidente', 'vicepresidente', 'tesorero', 'eventos', 'residente', 'usuario', 'tecnico', 'technician'].includes(role)) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acceso denegado. No tiene permisos para generar este documento.' };
        return;
      }

      const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
      
      // Set response headers
      ctx.set('Content-Type', 'application/pdf');
      ctx.set('Content-Disposition', `attachment; filename=ticket-${ticket.ticket_number}.pdf`);
      ctx.status = 200;
      ctx.body = doc;

      // --- Helper Functions ---
      const drawBox = (x, y, w, h, fillColor = null) => {
        if (fillColor) {
          doc.rect(x, y, w, h).fillAndStroke(fillColor, '#000000');
        } else {
          doc.rect(x, y, w, h).stroke();
        }
      };

      const drawHeaderBox = (x, y, w, text) => {
        doc.rect(x, y, w, 15).fillAndStroke('#800040', '#000000'); // Magenta oscuro
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(text, x, y + 3, { width: w, align: 'center' });
        doc.fillColor('black').font('Helvetica'); // Reset
      };

      // --- Layout Constants ---
      const startX = 30;
      const startY = 60; // Ajustado para bajar el contenido y centrarlo mejor verticalmente
      const pageWidth = 550; // Letter width approx 612 - margins
      const colWidth = (pageWidth - 20) / 2; // Two columns with gap
      const col2X = startX + colWidth + 20;

      // --- Header ---
      // Logos placeholder (Left)
      // Robust path resolution for logo
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'images', 'logo.png'),
        path.join(process.cwd(), 'backend', 'public', 'images', 'logo.png'),
        path.join(__dirname, '../../public/images/logo.png'),
        path.join(__dirname, '../../../public/images/logo.png')
      ];

      let logoPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }

      if (logoPath) {
        doc.image(logoPath, startX, startY - 5, { width: 160 });
      } else {
        console.warn('Logo no encontrado en rutas:', possiblePaths);
      }
      
      // Title (Right)
      doc.fontSize(14).font('Helvetica-Bold').text('RECIBO DE RESERVACIÓN', 0, startY + 10, { align: 'right', width: pageWidth + 30 });

      // Report No & Date
      const headerInfoY = startY + 40;
      // No DE REPORTE
      drawHeaderBox(col2X, headerInfoY, 100, 'FOLIO RESERVA');
      doc.rect(col2X + 100, headerInfoY, colWidth - 100, 15).stroke();
      doc.fontSize(10).fillColor('black').text(ticket.ticket_number, col2X + 105, headerInfoY + 3);

      // FECHA
      const dateY = headerInfoY + 20;
      drawHeaderBox(col2X, dateY, 100, 'FECHA REGISTRO');
      doc.rect(col2X + 100, dateY, colWidth - 100, 15).stroke();
      
      let dateText = '';
      try {
        if (ticket.createdAt) {
          const dateObj = new Date(ticket.createdAt);
          if (!isNaN(dateObj.getTime())) {
             dateText = dateObj.toLocaleDateString('es-MX');
          }
        }
      } catch (e) {
        console.error('Error formatting date:', e);
      }
      doc.fontSize(10).text(dateText, col2X + 105, dateY + 3);

      let currentY = startY + 90;

      // --- Section 1: DATOS DEL RESIDENTE (Left) ---
      drawHeaderBox(startX, currentY, colWidth, 'DATOS DEL RESIDENTE');
      
      let lineY = currentY + 25;
      const lineHeight = 15;
      
      // Nombre
      doc.fontSize(8).font('Helvetica-Bold').text('NOMBRE(S):', startX + 5, lineY);
      doc.font('Helvetica').text(ticket.reportedBy?.nombre_completo || '', startX + 60, lineY);
      doc.moveTo(startX + 55, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();
      
      // Apellidos / Calle y Lote
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('CALLE / LOTE:', startX + 5, lineY);
      const loteName = ticket.reportedBy?.department?.display_name || ticket.reportedBy?.departamento || 'Sin Lote';
      doc.font('Helvetica').text(loteName, startX + 80, lineY);
      doc.moveTo(startX + 75, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();

      // Condominio
      lineY += lineHeight;
      doc.font('Helvetica-Bold').fontSize(8).text('CONDOMINIO:', startX + 5, lineY);
      const deptName = 'Stanza Malaga';
      
      // Ajustar tamaño de fuente si el texto es muy largo
      let deptFontSize = 8;
      doc.font('Helvetica').fontSize(deptFontSize);
      const maxDeptWidth = colWidth - 90; // Espacio disponible
      
      while (doc.widthOfString(deptName) > maxDeptWidth && deptFontSize > 4) {
        deptFontSize -= 0.5;
        doc.fontSize(deptFontSize);
      }
      
      // Centrar verticalmente si la fuente es más pequeña
      const yOffset = deptFontSize < 8 ? (8 - deptFontSize) / 2 : 0;
      
      doc.text(deptName, startX + 80, lineY + yOffset);
      doc.moveTo(startX + 75, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();


      // --- Section 2: DESCRIPCIÓN DEL EVENTO (Right) - Description ---
      drawHeaderBox(col2X, currentY, colWidth, 'DESCRIPCIÓN DEL EVENTO');
      doc.rect(col2X, currentY + 15, colWidth, 70).stroke();
      doc.font('Helvetica').fontSize(9).text(ticket.description || '', col2X + 5, currentY + 20, { width: colWidth - 10 });

      currentY += 95;

      // --- Section 3: ÁREA COMÚN RESERVADA (Left) ---
      drawHeaderBox(startX, currentY, colWidth, 'ÁREA COMÚN RESERVADA');
      
      lineY = currentY + 25;
      
      // Nombre de Área
      doc.font('Helvetica-Bold').text('ÁREA:', startX + 5, lineY);
      doc.font('Helvetica').text(ticket.equipment?.name || 'Área General / Tejaban', startX + 45, lineY);
      doc.moveTo(startX + 40, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();

      // Ubicación
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('UBICACIÓN:', startX + 5, lineY);
      doc.font('Helvetica').text(ticket.equipment?.location || 'Área Común', startX + 65, lineY);
      doc.moveTo(startX + 60, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();

      // Encargado de Área
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('ENCARGADO:', startX + 5, lineY);
      doc.font('Helvetica').text('Mesa Directiva / Eventos', startX + 70, lineY);
      doc.moveTo(startX + 65, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();

      // Cuota de Recuperación
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('CUOTA ASOCIADA:', startX + 5, lineY);
      const priorityMapping = {
        'sin_clasificar': 'SIN CUOTA',
        'normal': 'CUOTA DE $1,500',
        'importante': 'CUOTA ESPECIAL'
      };
      const displayCuota = priorityMapping[ticket.priority] || 'SIN CUOTA';
      doc.font('Helvetica').text(displayCuota, startX + 100, lineY);
      doc.moveTo(startX + 95, lineY + 10).lineTo(startX + colWidth - 5, lineY + 10).stroke();


      // --- Section 4: HORARIOS DEL EVENTO (Right) ---
      drawHeaderBox(col2X, currentY, colWidth, 'HORARIOS DEL EVENTO');
      
      lineY = currentY + 25;
      
      // Fecha
      doc.font('Helvetica-Bold').text('FECHA EVENTO:', col2X + 5, lineY);
      let eventDateText = ticket.event_date || 'No especificada';
      if (ticket.event_date) {
        try {
          eventDateText = new Date(ticket.event_date + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch(e){}
      }
      doc.font('Helvetica').text(eventDateText, col2X + 85, lineY);
      doc.moveTo(col2X + 80, lineY + 10).lineTo(col2X + colWidth - 5, lineY + 10).stroke();

      // Hora de Inicio
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('HORA INICIO:', col2X + 5, lineY);
      doc.font('Helvetica').text(ticket.event_time || 'No especificada', col2X + 70, lineY);
      doc.moveTo(col2X + 65, lineY + 10).lineTo(col2X + colWidth - 5, lineY + 10).stroke();

      // Duración
      lineY += lineHeight;
      doc.font('Helvetica-Bold').text('DURACIÓN:', col2X + 5, lineY);
      doc.font('Helvetica').text(`${ticket.event_duration || 5} horas`, col2X + 60, lineY);
      doc.moveTo(col2X + 55, lineY + 10).lineTo(col2X + colWidth - 5, lineY + 10).stroke();

      currentY += 85;

      // --- Section 5: CATEGORÍA DE RESERVACIÓN (Full Width) ---
      drawHeaderBox(startX, currentY, pageWidth, 'CATEGORÍA DE RESERVACIÓN');
      
      lineY = currentY + 25;
      
      // Checkboxes
      const drawCheckbox = (x, y, label, checked) => {
        doc.rect(x, y, 10, 10).stroke();
        if (checked) {
          doc.font('Helvetica-Bold').text('X', x + 1, y + 1);
        }
        doc.font('Helvetica-Bold').text(label, x + 15, y + 1);
      };

      drawCheckbox(startX + 20, lineY, 'EVENTO SOCIAL', ticket.service_type === 'social');
      drawCheckbox(startX + 200, lineY, 'EVENTO CORPORATIVO / REUNIÓN', ticket.service_type === 'corporativo');
      drawCheckbox(startX + 400, lineY, 'ASAMBLEA DE RESIDENTES', ticket.service_type === 'educativo');

      currentY += 45;

      // --- Section 6: ESTADO DE ENTREGA (INSPECCIÓN INICIAL) (Left) ---
      drawHeaderBox(startX, currentY, colWidth, 'ESTADO DE ENTREGA (INSPECCIÓN INICIAL)');
      doc.rect(startX, currentY + 15, colWidth, 80).stroke();
      doc.font('Helvetica').fontSize(9).text(ticket.diagnosis || 'Área limpia y sin novedades.', startX + 5, currentY + 20, { width: colWidth - 10 });

      // --- Section 7: ESTADO DE RECEPCIÓN (INSPECCIÓN FINAL) (Right) ---
      drawHeaderBox(col2X, currentY, colWidth, 'ESTADO DE RECEPCIÓN (INSPECCIÓN FINAL)');
      doc.rect(col2X, currentY + 15, colWidth, 80).stroke();
      doc.font('Helvetica').fontSize(9).text(ticket.solution || 'Área devuelta en perfectas condiciones y limpia.', col2X + 5, currentY + 20, { width: colWidth - 10 });

      currentY += 105;

      // --- Section 8: INSUMOS PRESTADOS PARA EL EVENTO (Left) ---
      drawHeaderBox(startX, currentY, colWidth, 'INSUMOS PRESTADOS PARA EL EVENTO');
      
      // Table Header
      const tableY = currentY + 15;
      doc.rect(startX, tableY, 40, 15).stroke(); // CANT
      doc.font('Helvetica-Bold').fontSize(8).text('CANT', startX, tableY + 4, { width: 40, align: 'center' });
      
      doc.rect(startX + 40, tableY, colWidth - 40, 15).stroke(); // DESCRIPCION
      doc.text('DESCRIPCIÓN', startX + 40, tableY + 4, { width: colWidth - 40, align: 'center' });

      // Table Rows
      let parts = ticket.parts || [];

      for (let i = 0; i < 4; i++) {
        const rowY = tableY + 15 + (i * 16);
        doc.rect(startX, rowY, 40, 16).stroke();
        doc.rect(startX + 40, rowY, colWidth - 40, 16).stroke();
        
        if (parts[i]) {
          doc.font('Helvetica').text(String(parts[i].quantity || parts[i].cantidad || '1'), startX + 2, rowY + 4, { width: 36, align: 'center' });
          doc.text(parts[i].description || parts[i].name || parts[i].nombre || '', startX + 42, rowY + 4, { width: colWidth - 44 });
        }
      }

      // --- Section 9: OBSERVACIONES (Right) - Notes ---
      drawHeaderBox(col2X, currentY, colWidth, 'OBSERVACIONES');
      doc.rect(col2X, currentY + 15, colWidth, 80).stroke();
      
      doc.font('Helvetica').fontSize(9).text(ticket.notes || '', col2X + 5, currentY + 20, { width: colWidth - 10 });

      currentY += 120;

      // --- Signatures ---
      const signatureY = currentY + 40;
      
      // Technician Signature
      doc.moveTo(startX + 20, signatureY).lineTo(startX + 220, signatureY).stroke();
      doc.font('Helvetica-Bold').fontSize(9).text('Firma de Mesa Directiva', startX + 20, signatureY + 5, { width: 200, align: 'center' });
      doc.font('Helvetica').fontSize(8).text(ticket.assignedTo?.nombre_completo || 'Mesa Directiva / Eventos', startX + 20, signatureY + 20, { width: 200, align: 'center' });

      // User Signature
      doc.moveTo(col2X + 20, signatureY).lineTo(col2X + 220, signatureY).stroke();
      doc.font('Helvetica-Bold').fontSize(9).text('Firma de Residente', col2X + 20, signatureY + 5, { width: 200, align: 'center' });
      doc.font('Helvetica').fontSize(8).text(ticket.reportedBy?.nombre_completo || '', col2X + 20, signatureY + 20, { width: 200, align: 'center' });

      doc.end();

    } catch (error) {
      console.error('Error generating PDF:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al generar el PDF' };
    }
  }
};

export default pdfController;
