import Router from 'koa-router';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import * as activityController from '../controllers/activityController.js';

const router = new Router({ prefix: '/activities' });

// Middleware para asegurar que solo admin/tecnico/directiva accedan
const ensureTechOrAdmin = async (ctx, next) => {
    const role = ctx.state.user.rol;
    const allowedRoles = ['admin', 'tecnico', 'presidente', 'vicepresidente', 'tesorero', 'eventos'];
    if (allowedRoles.includes(role)) {
        await next();
    } else {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acceso denegado. Se requiere un rol directivo o administrador.' };
    }
};

router.use(authenticateToken);
router.use(ensureTechOrAdmin);

router.get('/', activityController.listActivities);
router.post('/', activityController.createActivity);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);
router.post('/:id/comments', activityController.addComment);

// Nueva ruta de carga de archivos en Base64 para respaldo de proyectos
router.post('/upload', async (ctx) => {
    try {
        const { fileName, fileData } = ctx.request.body;
        if (!fileName || !fileData) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Faltan datos del archivo' };
            return;
        }

        // Limpiar cabecera base64 si existe
        const base64Data = fileData.replace(/^data:.*;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Directorio físico de uploads
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
        const finalFileName = `${baseName}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, finalFileName);

        fs.writeFileSync(filePath, buffer);

        ctx.body = {
            success: true,
            url: `/uploads/${finalFileName}`,
            name: fileName
        };
    } catch (error) {
        console.error('Error al subir archivo:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Error interno al subir el archivo de respaldo.' };
    }
});

export default router;
