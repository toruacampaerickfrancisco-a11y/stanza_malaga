import React, { useState, useEffect } from 'react';
import { UserRole, Department } from '@/types';
import { Eye, EyeOff } from 'lucide-react';

export interface AddUserModalProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  initialData?: any;
  departments?: Department[];
  onCancel?: () => void;
}

const STREETS = ['Alcazaba', 'Alpandeire', 'Archez', 'Gaucin', 'Salares', 'Sedella', 'Serrato'];

const AddUserModal: React.FC<AddUserModalProps> = ({ onSubmit, loading = false, initialData = {}, departments = [], onCancel }) => {
  const [fullName, setFullName] = useState(initialData.name || '');
  const [username, setUsername] = useState(initialData.username || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [department, setDepartment] = useState(initialData.department || initialData.departmentId || '');
  const [employeeNumber, setEmployeeNumber] = useState(initialData.employeeNumber || '');
  const [role, setRole] = useState<UserRole>(initialData.role || 'usuario');
  const [isActive, setIsActive] = useState<boolean>(initialData.isActive !== undefined ? initialData.isActive : true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState('');

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.name || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      const dept = initialData.department || initialData.departmentId || '';
      setDepartment(dept);
      setEmployeeNumber(initialData.employeeNumber || '');
      setRole(initialData.role || 'usuario');
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);

      // Buscar si alguna de las calles conocidas está en la dirección para pre-seleccionarla
      const foundStreet = STREETS.find(s => dept.toLowerCase().includes(s.toLowerCase()));
      if (foundStreet) {
        setSelectedStreet(foundStreet);
      } else {
        setSelectedStreet('');
      }
    }
  }, [initialData]);

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (!initialData.id) {
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '.');
      setUsername(slug);
    }
  };

  const handleStreetChange = (street: string) => {
    setSelectedStreet(street);
    if (street) {
      const numPart = employeeNumber ? ` #${employeeNumber}` : '';
      setDepartment(`Calle ${street}${numPart}`);
    } else {
      setDepartment('');
    }
  };

  const handleHouseNumberChange = (num: string) => {
    setEmployeeNumber(num);
    if (selectedStreet) {
      const numPart = num ? ` #${num}` : '';
      setDepartment(`Calle ${selectedStreet}${numPart}`);
    }
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ 
      name: fullName, 
      username, 
      email, 
      password, 
      phone,
      department, 
      employeeNumber,
      role,
      isActive
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Row 1: Informaciones principales */}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label className="form-label form-label-required">Nombre Completo</label>
          <input 
            required
            className="form-input"
            placeholder="Ej. Juan Pérez" 
            value={fullName} 
            onChange={e => handleFullNameChange(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Usuario</label>
          <input 
            required
            className="form-input"
            placeholder="Ej. jperez" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Correo</label>
          <input 
            required
            type="email"
            className="form-input"
            placeholder="juan@empresa.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Teléfono (WhatsApp)</label>
          <input 
            required
            type="tel"
            className="form-input"
            placeholder="Ej. 6621234567" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>
      </div>

      {/* Row 2: Autenticación e Identificación */}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Contraseña {initialData.id && '(Opcional)'}</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder={initialData.id ? "Dejar en blanco para mantener" : "Contraseña"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center'
              }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Calle de la Cerrada</label>
          <select 
            required
            className="form-input"
            value={selectedStreet}
            onChange={e => handleStreetChange(e.target.value)}
          >
            <option value="">-- Seleccionar Calle --</option>
            {STREETS.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Número de Casa</label>
          <input 
            required
            className="form-input"
            placeholder="Ej. 45" 
            value={employeeNumber} 
            onChange={e => handleHouseNumberChange(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Dirección Completa</label>
          <input 
            required
            className="form-input"
            placeholder="Ej. Calle Málaga Lote 12" 
            value={department} 
            onChange={e => setDepartment(e.target.value)} 
          />
        </div>
      </div>

      {/* Row 3: Colonia y Estado */}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Colonia</label>
          <input 
            className="form-input" 
            value="Stanza Malaga Seccion Almeria" 
            disabled 
            readOnly 
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Estado</label>
          <select 
            required
            className="form-input"
            value={isActive ? "true" : "false"}
            onChange={e => setIsActive(e.target.value === "true")}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Rol en el Residencial</label>
          <select 
            className="form-input"
            value={role} 
            onChange={e => setRole(e.target.value as UserRole)}
            required
          >
            <option value="residente">Residente</option>
            <option value="tesorero">Tesorero</option>
            <option value="guardia">Guardia de Seguridad</option>
            <option value="eventos">Eventos / Reservaciones</option>
            <option value="presidente">Presidente</option>
            <option value="vicepresidente">Vicepresidente</option>
            <option value="admin">Administrador Residencial</option>
          </select>
        </div>
      </div>

      {/* Row 4: Registro Metadata (Sólo al Editar) */}
      {initialData.id && initialData.createdAt && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ maxWidth: '33.33%' }}>
            <label className="form-label">Fecha de Registro</label>
            <input 
              className="form-input" 
              value={new Date(initialData.createdAt).toLocaleDateString() + ' ' + new Date(initialData.createdAt).toLocaleTimeString()} 
              disabled 
              readOnly 
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </div>
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
        {onCancel && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            Regresar
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Usuario'}
        </button>
      </div>
    </form>
  );
};

export default AddUserModal;
