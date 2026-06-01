import React, { useState, useEffect } from 'react';
import { User, Department } from '@/types';
import SearchableSelect from './SearchableSelect';

export interface AddEquipmentModalProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  initialData?: any;
  users?: User[];
  departments?: Department[];
  onCancel?: () => void;
}

const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addOneMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  
  const targetDate = new Date(year, month + 1, day);
  
  if (targetDate.getMonth() !== (month + 1) % 12) {
    const lastDay = new Date(year, month + 2, 0);
    return getLocalDateString(lastDay);
  }
  
  return getLocalDateString(targetDate);
};

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ 
  onSubmit, 
  loading = false, 
  initialData = {}, 
  users = [],
  departments = [],
  onCancel 
}) => {
  const [recordType, setRecordType] = useState<'income' | 'expense'>(
    initialData.location === 'GASTO' ? 'expense' : 'income'
  );
  const [name, setName] = useState(initialData.name || '');
  const [type, setType] = useState(initialData.type || 'Transferencia');
  const [brand, setBrand] = useState(initialData.brand || '');
  const [model, setModel] = useState(initialData.model || '');
  const [serialNumber, setSerialNumber] = useState(() => {
    if (initialData.serialNumber) return initialData.serialNumber;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FOL-${dateStr}-${randomSuffix}`;
  });
  const [status, setStatus] = useState(initialData.status || 'operativo');
  const [location, setLocation] = useState(initialData.location || '');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (initialData.purchaseDate) return initialData.purchaseDate.split('T')[0];
    return getLocalDateString(new Date());
  });
  const [warrantyExpiration, setWarrantyExpiration] = useState(() => {
    if (initialData.warrantyExpiration) return initialData.warrantyExpiration.split('T')[0];
    const pDate = initialData.purchaseDate ? initialData.purchaseDate.split('T')[0] : getLocalDateString(new Date());
    return addOneMonth(pDate);
  });
  const [assignedUserId, setAssignedUserId] = useState(initialData.assignedUserId || '');
  const [notes, setNotes] = useState(initialData.notes || '');
  const [requirement, setRequirement] = useState(initialData.requirement || '');
  
  // Mapeado a Monto Pagado ($)
  const [inventoryNumber, setInventoryNumber] = useState(initialData.inventoryNumber || '');
  
  // Hidden Specs for DB Compatibility
  const [processor, setProcessor] = useState(initialData.processor || '');
  const [ram, setRam] = useState(initialData.ram || '');
  const [hardDrive, setHardDrive] = useState(initialData.hardDrive || '');
  const [operatingSystem, setOperatingSystem] = useState(initialData.operatingSystem || 'N/A');

  const handlePurchaseDateChange = (val: string) => {
    setPurchaseDate(val);
    if (!val) return;
    const nextPaymentDate = addOneMonth(val);
    if (nextPaymentDate) {
      setWarrantyExpiration(nextPaymentDate);
    }
  };

  const MONTH_OPTIONS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    "Anual", "Extraordinaria"
  ];

  const YEAR_OPTIONS = ["2024", "2025", "2026", "2027", "2028"];

  useEffect(() => {
    if (initialData) {
      setRecordType(initialData.location === 'GASTO' ? 'expense' : 'income');
      setName(initialData.name || '');
      setType(initialData.type || 'Transferencia');
      setBrand(initialData.brand || '');
      setModel(initialData.model || '');
      
      if (initialData.serialNumber) {
        setSerialNumber(initialData.serialNumber);
      } else {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        setSerialNumber(`FOL-${dateStr}-${randomSuffix}`);
      }

      setStatus(initialData.status || 'operativo');
      setLocation(initialData.location || '');
      
      if (initialData.purchaseDate) {
        const pDate = initialData.purchaseDate.split('T')[0];
        setPurchaseDate(pDate);
        if (initialData.warrantyExpiration) {
          setWarrantyExpiration(initialData.warrantyExpiration.split('T')[0]);
        } else {
          setWarrantyExpiration(addOneMonth(pDate));
        }
      } else {
        const todayStr = getLocalDateString(new Date());
        setPurchaseDate(todayStr);
        if (initialData.warrantyExpiration) {
          setWarrantyExpiration(initialData.warrantyExpiration.split('T')[0]);
        } else {
          setWarrantyExpiration(addOneMonth(todayStr));
        }
      }

      setAssignedUserId(initialData.assignedUserId || '');
      setNotes(initialData.notes || '');
      setRequirement(initialData.requirement || '');
      setInventoryNumber(initialData.inventoryNumber || '');
    }
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ 
      name, 
      type, 
      brand, 
      model, 
      serialNumber, 
      status, 
      location, 
      purchaseDate: purchaseDate || null, 
      warrantyExpiration: warrantyExpiration || null, 
      assignedUserId: assignedUserId || null, 
      notes,
      requirement,
      inventoryNumber,
      processor,
      ram,
      hardDrive,
      operatingSystem
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Selector de Tipo de Registro Financiero */}
      <div className="form-group" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Tipo de Registro Financiero</label>
        <div style={{ display: 'flex', gap: '24px', marginTop: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
            <input 
              type="radio" 
              name="recordType" 
              checked={recordType === 'income'} 
              onChange={() => {
                setRecordType('income');
                if (location === 'GASTO') setLocation('');
              }} 
            />
            <span>Ingreso (Cuota de Residente)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
            <input 
              type="radio" 
              name="recordType" 
              checked={recordType === 'expense'} 
              onChange={() => {
                setRecordType('expense');
                setLocation('GASTO');
                setAssignedUserId('');
              }} 
            />
            <span style={{ color: '#ef4444' }}>Egreso (Gasto Histórico / Proveedor)</span>
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label form-label-required">Concepto de {recordType === 'income' ? 'Pago' : 'Gasto'}</label>
          <input 
            required
            className="form-input"
            placeholder={recordType === 'income' ? "Ej: Cuota de Mantenimiento - Enero 2026" : "Ej: Pago de Alberca - Compra de Químicos y Limpieza"} 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Forma de {recordType === 'income' ? 'Pago' : 'Egreso'}</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Depósito">Depósito</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="form-group">
          <label className="form-label">Mes / Período</label>
          <input 
            className="form-input"
            placeholder="Mes" 
            value={brand} 
            list="month-options"
            onChange={e => setBrand(e.target.value)} 
          />
          <datalist id="month-options">
            {MONTH_OPTIONS.map(opt => <option key={opt} value={opt} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Año</label>
          <input 
            className="form-input"
            placeholder="Año" 
            value={model} 
            list="year-options"
            onChange={e => setModel(e.target.value)} 
          />
          <datalist id="year-options">
            {YEAR_OPTIONS.map(opt => <option key={opt} value={opt} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Folio / Referencia</label>
          <input 
            required
            className="form-input"
            placeholder="Folio de pago o referencia" 
            value={serialNumber} 
            onChange={e => setSerialNumber(e.target.value)} 
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Estatus de {recordType === 'income' ? 'Pago' : 'Gasto'}</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="operativo">{recordType === 'income' ? 'Pagado' : 'Pagado / Liquidado'}</option>
            <option value="en_reparacion">{recordType === 'income' ? 'Pendiente' : 'Pendiente por Pagar'}</option>
            <option value="en_almacen">{recordType === 'income' ? 'En Conciliación' : 'En Conciliación / Aclaración'}</option>
            {recordType === 'income' && <option value="baja">Rechazado</option>}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Espacio / Clasificación</label>
          {recordType === 'income' ? (
            <select 
              className="form-input"
              value={location} 
              onChange={e => setLocation(e.target.value)} 
            >
              <option value="">Ninguno / General</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.display_name}>
                  {dept.display_name}
                </option>
              ))}
            </select>
          ) : (
            <input 
              disabled
              className="form-input"
              value="EGRESO DE CAJA / GASTO"
              style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}
            />
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha de {recordType === 'income' ? 'Pago' : 'Egreso'}</label>
          <input 
            type="date"
            className="form-input"
            value={purchaseDate} 
            onChange={e => handlePurchaseDateChange(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">{recordType === 'income' ? 'Fecha Límite / Próximo Pago' : 'Fecha Vencimiento de Factura'}</label>
          <input 
            type="date"
            className="form-input"
            value={warrantyExpiration} 
            onChange={e => setWarrantyExpiration(e.target.value)} 
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', margin: '1rem 0', paddingTop: '1rem' }}>
        <div className="form-group">
          <label className="form-label form-label-required">Monto {recordType === 'income' ? 'Pagado' : 'Gastado'} ($)</label>
          <input 
            required
            className="form-input"
            placeholder="Ej: 1500" 
            value={inventoryNumber} 
            onChange={e => setInventoryNumber(e.target.value)} 
          />
        </div>
      </div>

      {recordType === 'income' && (
        <div className="form-group">
          <label className="form-label">Propietario / Residente</label>
          <SearchableSelect
            value={assignedUserId}
            onChange={(val) => setAssignedUserId(val)}
            placeholder="-- Seleccionar Residente --"
            options={[...users]
              .sort((a, b) => a.fullName.localeCompare(b.fullName))
              .map(u => ({
                value: u.id,
                label: u.fullName,
                subLabel: u.department && u.department !== 'Sin Departamento' ? u.department : undefined
              }))
            }
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">{recordType === 'income' ? 'Detalles de Transacción' : 'Proveedor / Destinatario del Gasto'}</label>
        <input 
          className="form-input"
          placeholder={recordType === 'income' ? "Ej: Banco BBVA, Cuenta origen *1234, Titular Juan Pérez" : "Ej: Proveedor Hidráulicos del Noroeste, Factura F-902"} 
          value={requirement} 
          onChange={e => setRequirement(e.target.value)} 
        />
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea 
          rows={3}
          className="form-input"
          placeholder="Detalles adicionales..." 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          style={{ resize: 'vertical' }} 
        />
      </div>

      <div className="form-actions">
        {onCancel && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Regresar
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary"
          style={recordType === 'expense' ? { background: '#ef4444', borderColor: '#ef4444' } : undefined}
          disabled={loading} 
        >
          {loading ? 'Guardando...' : (recordType === 'income' ? 'Guardar Recaudación' : 'Registrar Gasto')}
        </button>
      </div>
    </form>
  );
};

export default AddEquipmentModal;
