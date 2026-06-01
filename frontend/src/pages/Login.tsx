import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.tsx';
import { Eye, EyeOff, User, Mail, Phone, Check, X as CloseIcon } from 'lucide-react';
import styles from './Login.module.css';
import Modal from '@/components/Modal';
import { apiClient } from '@/services/apiClient';
import { showError, showSuccess } from '@/utils/swal';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Password Recovery States
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3 | 4>(1);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryUserId, setRecoveryUserId] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [whatsappNotification, setWhatsappNotification] = useState<{ show: boolean, code: string, user: string, phone?: string } | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes (600s)

  // Web Audio WhatsApp sound synthesizer
  const playWhatsappChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.35);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.value = 988;
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.08);
      gain2.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc2.start(audioCtx.currentTime + 0.08);
      osc2.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.warn("Could not play synthesized audio notification:", e);
    }
  };

  const formatPhoneForWhatsapp = (phoneNum: string) => {
    const clean = phoneNum.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      return `52${clean}`;
    }
    return clean;
  };

  // Timer Effect for OTP expiration
  useEffect(() => {
    let intervalId: any = null;
    if (showForgotModal && recoveryStep === 2 && countdown > 0) {
      intervalId = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setRecoveryError('El código de verificación ha expirado. Por favor, solicita uno nuevo.');
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showForgotModal, recoveryStep, countdown]);

  // Clean states when modal closes
  const handleCloseForgotModal = () => {
    setShowForgotModal(false);
    setRecoveryStep(1);
    setRecoveryIdentifier('');
    setRecoveryUserId('');
    setRecoveryPhone('');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError('');
    setWhatsappNotification(null);
  };

  // Step 1: Request OTP Code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      const response = await apiClient.post('/auth/forgot-password', { identifier: recoveryIdentifier });
      if (response.data.success) {
        setRecoveryUserId(response.data.data.userId);
        const registeredPhone = response.data.data.phone || '';
        setRecoveryPhone(registeredPhone);

        // Simular envío de WhatsApp reproduciendo sonido y abriendo el widget flotante
        playWhatsappChime();
        setWhatsappNotification({
          show: true,
          code: response.data.data.code,
          user: response.data.data.username,
          phone: registeredPhone
        });

        // Intentar abrir WhatsApp de forma automatizada (real) con mensaje pre-rellenado
        if (registeredPhone) {
          const formattedPhone = formatPhoneForWhatsapp(registeredPhone);
          const messageText = `*Stanza Malaga (Sección Almería)*\n\nHola *${response.data.data.username}*, tu código de seguridad para restablecer tu contraseña es: *${response.data.data.code}*\n\nExpira en 10 minutos. Por favor ingresa este código en la aplicación.`;
          window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`, '_blank');
        }

        setRecoveryStep(2);
        setCountdown(600); // Reset timer
      }
    } catch (err: any) {
      console.error('Error recovery step 1:', err);
      const msg = err.response?.data?.message || err.message || 'No se pudo procesar la solicitud.';

      if (msg.toLowerCase().includes('conexión') || msg.toLowerCase().includes('network error') || msg.toLowerCase().includes('refused')) {
        await showError('Error de Red', 'El servidor de autenticación no responde. Intente más tarde.');
      } else {
        await showError('Usuario no encontrado', msg);
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      const response = await apiClient.post('/auth/verify-otp', {
        userId: recoveryUserId,
        code: recoveryCode
      });
      if (response.data.success) {
        setRecoveryStep(3);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error de validación.';
      setRecoveryError(msg);
      if (msg.toLowerCase().includes('conexión') || msg.toLowerCase().includes('network error')) {
        await showError('Error de Conexión', 'No se pudo verificar el código por falta de internet o servidor caído.');
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (newPassword.length < 6) {
      setRecoveryError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Las contraseñas no coinciden.');
      return;
    }

    setRecoveryLoading(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        userId: recoveryUserId,
        code: recoveryCode,
        newPassword
      });
      if (response.data.success) {
        setRecoveryStep(4);
        setWhatsappNotification(null); // Quitar notificación flotante al finalizar
        await showSuccess('¡Contraseña Actualizada!', 'Tu clave ha sido cambiada correctamente.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al actualizar.';
      setRecoveryError(msg);
      await showError('Error', msg);
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Helper to draw password strength bar
  const getPasswordStrength = () => {
    if (!newPassword) return { percent: 0, color: '#e2e8f0', text: '' };
    if (newPassword.length < 6) return { percent: 25, color: '#ef4444', text: 'Muy corta' };

    let strength = 0;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength === 0) return { percent: 50, color: '#f59e0b', text: 'Débil' };
    if (strength === 1 || strength === 2) return { percent: 75, color: '#3b82f6', text: 'Segura' };
    return { percent: 100, color: '#10b981', text: 'Muy Fuerte' };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Intentando login con:', username, password);
      const user = await login({ username, password });
      console.log('Login exitoso, redirigiendo según rol:', user.role);

      if (user.role === 'usuario' || user.role === 'user') {
        navigate('/tickets');
      } else if (user.role === 'inventario') {
        navigate('/equipos');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Error de login:', err);

      // Mensaje por defecto solicitado
      let title = 'Usuario no encontrado';
      let text = 'No se encontró ningún usuario con ese nombre o correo.';

      // Intentar extraer el mensaje real si existe
      const rawMsg = err.message || '';

      // Si detectamos fallo de red en el emulador
      if (rawMsg.toLowerCase().includes('conexión') ||
        rawMsg.toLowerCase().includes('network') ||
        rawMsg.toLowerCase().includes('refused') ||
        rawMsg.toLowerCase().includes('timeout') ||
        err.code === 'ERR_NETWORK') {
        title = 'Error de Conexión';
        text = 'No se pudo establecer conexión con el servidor.';
      }

      // 1. IMPORTANTE: Pintar el error en el formulario (Funciona en todos los dispositivos)
      setError(text);

      // 2. Intentar lanzar la alerta visual con delay pequeño para asegurar renderizado
      setTimeout(() => {
        showError(title, text);
      }, 100);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* Fondo estático del desierto */}
      <div className={styles.desertBackground}></div>

      {/* Overlay púrpura/magenta */}
      <div className={styles.purpleOverlay}></div>

      {/* Línea vertical divisoria */}
      <div className={styles.verticalDivider}></div>

      {/* Contenedor Izquierdo (Textos) */}
      <div className={styles.leftContent}>
        <div className={styles.textContent}>
          <h1 className={styles.mainTitle}>STANZA MALAGA RESIDENCIAL</h1>
          <p className={styles.description}>
            SECCION ALMERIA
          </p>
          <p className={styles.slogan}>

          </p>
        </div>

        <div className={styles.footerContent}>
          <div className={styles.address}>
            Av. Enguerrando Tapia Quijada, 83117 Hermosillo, Sonora, México
          </div>
          <div className={styles.privacyLink}>Aviso de privacidad.</div>
        </div>
      </div>

      {/* Contenedor Derecho (Formulario) */}
      <div className={styles.rightContent}>
        <div className={styles.authForm}>
          <div className={styles.loginHeading}>
            <div className={styles.userIconContainer}>
              <User size={80} color="white" strokeWidth={1.8} />
            </div>

            <h2 className={styles.loginTitle}>INICIAR SESIÓN</h2>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className={styles.alertMessage}>
                  <div className={styles.textAlertMessage}>
                    {error}
                  </div>
                </div>
              )}

              {/* Campo Correo electrónico */}
              <div className={styles.inputGroup}>
                <label htmlFor="nickname" className={styles.inputLabel}>
                  Usuario o Correo
                </label>
                <input
                  id="nickname"
                  required
                  className={styles.formControl}
                  name="nickname"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* Campo Contraseña */}
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.inputLabel}>
                  Contraseña
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    required
                    className={styles.formControl}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} color="white" /> : <Eye size={20} color="white" />}
                  </button>
                </div>
              </div>

              <div className={styles.forgotPasswordSection}>
                <a
                  href="#"
                  className={styles.forgotPasswordLink}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotModal(true);
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Botón */}
              <div className={styles.submitSection}>
                <button
                  className={styles.btnWhite}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Notificación de WhatsApp Simulada Flotante */}
      {whatsappNotification && whatsappNotification.show && (
        <div className={styles.whatsappToast}>
          <div className={styles.whatsappHeader}>
            <span className={styles.whatsappLogo}>
              <Phone size={18} fill="#25d366" color="white" />
            </span>
            <span className={styles.whatsappTitle}>Stanza Malaga - Cerrada</span>
            <span className={styles.whatsappTime}>Ahora</span>
            <button
              className={styles.whatsappClose}
              onClick={() => setWhatsappNotification(null)}
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div className={styles.whatsappBody}>
            <strong>Mesa Directiva:</strong> Hola <strong>{whatsappNotification.user}</strong>{whatsappNotification.phone ? ` (${whatsappNotification.phone})` : ''}, tu código de verificación es: <span style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '1px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', color: '#166534' }}>{whatsappNotification.code}</span>. Expira en 10 minutos.
          </div>
        </div>
      )}

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        isOpen={showForgotModal}
        onClose={handleCloseForgotModal}
        title="Recuperar Contraseña"
        size="md"
      >
        <div style={{ padding: '8px 4px', fontFamily: 'system-ui, sans-serif' }}>
          {recoveryError && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid #fecaca',
              textAlign: 'left'
            }}>
              {recoveryError}
            </div>
          )}

          {recoveryStep === 1 && (
            <form onSubmit={handleRequestOtp}>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5, textAlign: 'left' }}>
                Ingresa tu nombre de usuario o correo electrónico. Te enviaremos un código de seguridad OTP vía **WhatsApp** a tu número registrado en el sistema.
              </p>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Usuario o Correo Registrado</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="Ej. juan.perez o juan@correo.com"
                  value={recoveryIdentifier}
                  onChange={e => setRecoveryIdentifier(e.target.value)}
                  style={{ width: '100%', height: '42px', color: '#1e293b' }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '44px', background: '#800020', borderColor: '#800020', fontWeight: 600 }}
                disabled={recoveryLoading}
              >
                {recoveryLoading ? 'Buscando usuario...' : 'Enviar Código'}
              </button>
            </form>
          )}

          {recoveryStep === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '15px', lineHeight: 1.5, textAlign: 'left' }}>
                Hemos enviado un código OTP de 6 dígitos al WhatsApp registrado del usuario{recoveryPhone ? ` (ej. +52 1 ***** *${recoveryPhone.slice(-4)})` : ''}. Por favor escríbelo a continuación para verificar tu identidad.
              </p>

              <div style={{ backgroundColor: '#f0fdf4', border: '1px dashed #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#166534', fontSize: '0.85rem', fontWeight: 500, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <span style={{ textAlign: 'left' }}>Simulando recepción en pantalla. Revisa la notificación verde de WhatsApp en la esquina superior derecha.</span>
              </div>

              {recoveryPhone && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${formatPhoneForWhatsapp(recoveryPhone)}&text=${encodeURIComponent(`*Stanza Malaga (Sección Almería)*\n\nHola *${whatsappNotification?.user || ''}*, tu código de seguridad para restablecer tu contraseña es: *${whatsappNotification?.code || ''}*\n\nExpira en 10 minutos. Por favor ingresa este código en la aplicación.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#25d366',
                    borderColor: '#25d366',
                    color: 'white',
                    fontWeight: 600,
                    textDecoration: 'none',
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 6px -1px rgba(37, 211, 102, 0.2)'
                  }}
                >
                  <Phone size={18} fill="white" color="#25d366" />
                  Abrir WhatsApp Real
                </a>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Código de 6 dígitos</label>
                <div className={styles.otpContainer}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      className={styles.otpInput}
                      value={recoveryCode[i] || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        let newCode = recoveryCode.split('');
                        newCode[i] = val;
                        const finalCode = newCode.join('').slice(0, 6);
                        setRecoveryCode(finalCode);

                        // Mover el foco a la siguiente caja automáticamente
                        if (val && e.target.nextSibling) {
                          (e.target.nextSibling as HTMLInputElement).focus();
                        }
                      }}
                      onKeyDown={e => {
                        // Mover foco hacia atrás al presionar Backspace
                        if (e.key === 'Backspace' && !recoveryCode[i] && e.currentTarget.previousSibling) {
                          (e.currentTarget.previousSibling as HTMLInputElement).focus();
                        }
                      }}
                    />
                  ))}
                </div>
                <span className={styles.otpTimer}>
                  El código expira en: <strong>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRecoveryStep(1)}
                  style={{ width: '40%', height: '44px' }}
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '60%', height: '44px', background: '#800020', borderColor: '#800020', fontWeight: 600 }}
                  disabled={recoveryLoading || recoveryCode.length < 6 || countdown === 0}
                >
                  {recoveryLoading ? 'Verificando...' : 'Verificar Código'}
                </button>
              </div>
            </form>
          )}

          {recoveryStep === 3 && (
            <form onSubmit={handleResetPassword}>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5, textAlign: 'left' }}>
                Código verificado con éxito. Por favor escribe tu nueva contraseña.
              </p>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Nueva Contraseña</label>
                <input
                  required
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', height: '42px', color: '#1e293b' }}
                />

                {/* Strength Indicator */}
                {newPassword && (
                  <div style={{ marginTop: '8px' }}>
                    <div className={styles.strengthMeter}>
                      <div
                        className={styles.strengthBar}
                        style={{
                          width: `${getPasswordStrength().percent}%`,
                          backgroundColor: getPasswordStrength().color
                        }}
                      />
                    </div>
                    <span className={styles.strengthText} style={{ color: getPasswordStrength().color }}>
                      Contraseña: {getPasswordStrength().text}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Confirmar Contraseña</label>
                <input
                  required
                  type="password"
                  className="form-input"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', height: '42px', color: '#1e293b' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '44px', background: '#800020', borderColor: '#800020', fontWeight: 600 }}
                disabled={recoveryLoading || !newPassword || newPassword !== confirmPassword}
              >
                {recoveryLoading ? 'Guardando clave...' : 'Establecer Nueva Contraseña'}
              </button>
            </form>
          )}

          {recoveryStep === 4 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                fontSize: '2rem'
              }}>
                <Check size={32} strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                ¡Restablecimiento Exitoso!
              </h3>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                Tu contraseña ha sido actualizada con éxito en la base de datos. Ya puedes iniciar sesión con tus nuevas credenciales.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseForgotModal}
                style={{ width: '100%', height: '44px', background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
              >
                Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Login;
