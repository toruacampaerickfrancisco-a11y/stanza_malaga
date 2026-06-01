import jwt from 'jsonwebtoken';
import { User, Department } from '../models/index.js';
import config from '../config/config.js';

class AuthController {
  // Login de usuario
  async login(ctx) {
    try {
      // Log para depuración: mostrar el body recibido
      console.log('BODY RECIBIDO EN LOGIN:', ctx.request.body);

      // Eliminar espacios al inicio y final de username/email y password
      // Aceptar distintos nombres de campo que el frontend pueda enviar
      let identifier = ctx.request.body.username || ctx.request.body.email || ctx.request.body.usuario || ctx.request.body.correo;
      let { password } = ctx.request.body;
      if (typeof identifier === 'string') identifier = identifier.trim();
      if (typeof password === 'string') password = password.trim();

      // Validaciones básicas
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Username/email y password son requeridos',
          debug: ctx.request.body // Agregar el body para depuración
        };
        return;
      }

      // Buscar usuario por 'usuario' o 'correo'
      const Op = User.sequelize.Sequelize.Op;
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { usuario: identifier },
            { correo: identifier }
          ]
        },
        include: [
          {
            model: Department,
            as: 'department'
          }
        ]
      });

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Credenciales inválidas'
        };
        return;
      }

      // Verificar si el usuario está activo
      if (!user.activo) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Usuario desactivado. Contacte al administrador'
        };
        return;
      }

      // Verificar contraseña
      const isValidPassword = await user.validarContrasena(password);
      if (!isValidPassword) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Credenciales inválidas'
        };
        return;
      }

      // Actualizar último acceso
      await user.update({ ultimo_acceso: new Date() });

      // Generar JWT token con los campos correctos
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.usuario, // campo correcto
          role: user.rol
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience
        }
      );

      // Respuesta exitosa
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Login exitoso',
        data: {
          user: user.toPublicJSON(),
          token
        }
      };

    } catch (error) {
      console.error('Error en login:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Verificar token JWT
  async verifyToken(ctx) {
    try {
      const user = ctx.state.user; // Viene del middleware de autenticación
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Token válido',
        data: user.toPublicJSON()
      };

    } catch (error) {
      console.error('Error en verificación de token:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Cambiar contraseña
  async changePassword(ctx) {
    try {
      const { oldPassword, newPassword } = ctx.request.body;
      const userId = ctx.state.user.id;

      // Validaciones
      if (!oldPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Contraseña antigua y nueva son requeridas'
        };
        return;
      }

      if (newPassword.length < 6) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres'
        };
        return;
      }

      // Buscar usuario
      const user = await User.findByPk(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Usuario no encontrado'
        };
        return;
      }

      // Verificar contraseña actual
      const isValidPassword = await user.validarContrasena(oldPassword);
      if (!isValidPassword) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Contraseña actual incorrecta'
        };
        return;
      }

      // Actualizar contraseña (se aplicará hook beforeUpdate para hashear)
      await user.update({ contrasena: newPassword });

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Contraseña cambiada exitosamente'
      };

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Refresh token
  async refreshToken(ctx) {
    try {
      const user = ctx.state.user;

      // Generar nuevo token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.usuario,
          role: user.rol
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience
        }
      );

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          token
        }
      };

    } catch (error) {
      console.error('Error al renovar token:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Logout (opcional - en el frontend solo eliminar el token)
  async logout(ctx) {
    try {
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Logout exitoso'
      };
    } catch (error) {
      console.error('Error en logout:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Solicitar código de recuperación de contraseña (OTP)
  async forgotPassword(ctx) {
    try {
      const { identifier } = ctx.request.body;
      if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
        ctx.status = 400;
        ctx.body = { success: false, message: 'El usuario o correo electrónico es requerido.' };
        return;
      }

      const trimmedIdentifier = identifier.trim();

      // Buscar usuario por usuario o correo
      const Op = User.sequelize.Sequelize.Op;
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { usuario: trimmedIdentifier },
            { correo: trimmedIdentifier }
          ]
        }
      });

      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'No se encontró ningún usuario con ese nombre o correo.' };
        return;
      }

      if (!user.activo) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'El usuario está inactivo. Contacte al administrador.' };
        return;
      }

      // Generar código OTP de 6 dígitos
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Guardar en caché global con vigencia de 10 minutos
      global.otpCache = global.otpCache || new Map();
      global.otpCache.set(user.id, {
        code: otp,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
      });

      console.log(`[WhatsApp OTP Gateway] Código generado para ${user.usuario}: ${otp}`);

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Código de recuperación generado exitosamente',
        data: {
          userId: user.id,
          username: user.usuario,
          phone: user.cargo || '',
          code: otp // Lo retornamos para que el frontend simule la recepción del mensaje
        }
      };

    } catch (error) {
      console.error('Error en forgotPassword:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor.' };
    }
  }

  // Verificar código OTP
  async verifyOtpCode(ctx) {
    try {
      const { userId, code } = ctx.request.body;
      if (!userId || !code) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'El ID del usuario y el código de verificación son requeridos.' };
        return;
      }

      global.otpCache = global.otpCache || new Map();
      const cached = global.otpCache.get(userId);

      if (!cached) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'No hay ninguna solicitud de recuperación activa para este usuario.' };
        return;
      }

      if (Date.now() > cached.expiresAt) {
        global.otpCache.delete(userId);
        ctx.status = 400;
        ctx.body = { success: false, message: 'El código de verificación ha expirado. Por favor, solicita uno nuevo.' };
        return;
      }

      if (cached.code !== String(code).trim()) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'El código de verificación es incorrecto.' };
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Código de verificación válido.'
      };

    } catch (error) {
      console.error('Error en verifyOtpCode:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor.' };
    }
  }

  // Restablecer contraseña con código verificado
  async resetPassword(ctx) {
    try {
      const { userId, code, newPassword } = ctx.request.body;
      if (!userId || !code || !newPassword) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Todos los campos son obligatorios.' };
        return;
      }

      if (newPassword.length < 6) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
        return;
      }

      global.otpCache = global.otpCache || new Map();
      const cached = global.otpCache.get(userId);

      if (!cached || cached.code !== String(code).trim() || Date.now() > cached.expiresAt) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'El código de seguridad es inválido o ha expirado.' };
        return;
      }

      // Buscar usuario
      const user = await User.findByPk(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuario no encontrado.' };
        return;
      }

      // Actualizar la contraseña (el hook beforeUpdate la encriptará)
      await user.update({ contrasena: newPassword });

      // Limpiar caché
      global.otpCache.delete(userId);

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Contraseña restablecida exitosamente.'
      };

    } catch (error) {
      console.error('Error en resetPassword:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor.' };
    }
  }
}

export default new AuthController();
