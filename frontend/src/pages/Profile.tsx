import React, { useState } from 'react';
import { User, Settings, Lock, Eye, EyeOff, Save } from 'lucide-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth.tsx';
import styles from './Profile.module.css';
import { showSuccess } from '@/utils/swal';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    username: user?.username || '',
    department: user?.department || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }

    try {
      setSaving(true);
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      await showSuccess('Éxito', 'Perfil actualizado correctamente');
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al actualizar perfil' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setSaving(true);
      // Simular cambio de contraseña
      await new Promise(resolve => setTimeout(resolve, 1000));
      await showSuccess('Éxito', 'Contraseña actualizada correctamente');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al cambiar contraseña' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: 'Administrador Residencial', className: 'admin' },
      tecnico: { label: 'Tesorero', className: 'tecnico' },
      usuario: { label: 'Residente', className: 'usuario' }
    };
    
    const badge = badges[role as keyof typeof badges] || { label: role, className: 'usuario' };
    return <span className={`${styles.roleBadge} ${styles[badge.className]}`}>{badge.label}</span>;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Mi Perfil</h1>
            <p>Administrar información personal y configuración de cuenta</p>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Información del perfil */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.profileHeader}>
                <div className={styles.avatar}>
                  <User size={40} />
                </div>
                <div className={styles.profileInfo}>
                  <h2>{user?.fullName}</h2>
                  <p>{user?.email}</p>
                  {getRoleBadge(user?.role || 'usuario')}
                </div>
              </div>
            </div>

            <div className={styles.cardContent}>
              <form onSubmit={handleSaveProfile} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="fullName">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleProfileChange}
                      className={`form-input ${errors.fullName ? 'error' : ''}`}
                      placeholder="Tu nombre completo"
                    />
                    {errors.fullName && <div className="form-error">{errors.fullName}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className={`form-input ${errors.email ? 'error' : ''}`}
                      placeholder="tu.email@bienestar.sonora.gob.mx"
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="username">
                      Usuario
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={profileData.username}
                      className="form-input"
                      disabled
                    />
                    <small className={styles.helpText}>El nombre de usuario no se puede modificar</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="department">
                      Área / Espacio Principal
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={profileData.department}
                      className="form-input"
                      disabled
                    />
                    <small className={styles.helpText}>Contacta al administrador para cambiar tu área asignada</small>
                  </div>
                </div>

                {errors.submit && (
                  <div className={styles.submitError}>
                    {errors.submit}
                  </div>
                )}

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Configuración de seguridad */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.sectionHeader}>
                <Settings size={24} />
                <h3>Configuración de Seguridad</h3>
              </div>
            </div>

            <div className={styles.cardContent}>
              <div className={styles.securitySection}>
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h4>Contraseña</h4>
                    <p>Mantén tu cuenta segura con una contraseña fuerte</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="btn btn-outline"
                  >
                    <Lock size={16} />
                    Cambiar Contraseña
                  </button>
                </div>

                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h4>Última Sesión</h4>
                    <p>Última vez que iniciaste sesión en el sistema</p>
                  </div>
                  <span className={styles.lastLogin}>
                    {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
                  </span>
                </div>

                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h4>Estado de la Cuenta</h4>
                    <p>Tu cuenta está activa y en buen estado</p>
                  </div>
                  <span className={styles.accountStatus}>
                    Activa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de cambio de contraseña */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          title="Cambiar Contraseña"
          size="sm"
          footer={
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="btn btn-outline"
              >
                Regresar
              </button>
              <button
                type="submit"
                form="password-form"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          }
        >
          <form id="password-form" onSubmit={handleChangePassword} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="currentPassword">
                Contraseña Actual *
              </label>
              <div className={styles.passwordInput}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                  placeholder="Ingresa tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className={styles.passwordToggle}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.currentPassword && <div className="form-error">{errors.currentPassword}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                Nueva Contraseña *
              </label>
              <div className={styles.passwordInput}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`form-input ${errors.newPassword ? 'error' : ''}`}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={styles.passwordToggle}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && <div className="form-error">{errors.newPassword}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirmar Nueva Contraseña *
              </label>
              <div className={styles.passwordInput}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirmar nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.passwordToggle}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>

            {errors.submit && (
              <div className={styles.submitError}>
                {errors.submit}
              </div>
            )}
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Profile;