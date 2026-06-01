import React, { useState, useEffect } from 'react';

export interface AddInsumoModalProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  initialData?: any;
  onCancel?: () => void;
}

const AddInsumoModal: React.FC<AddInsumoModalProps> = ({ onSubmit, loading = false, initialData = {}, onCancel }) => {
  const [nombre, setNombre] = useState(initialData.nombre || '');
  const [descripcion, setDescripcion] = useState(initialData.descripcion || '');
  const [cantidad, setCantidad] = useState(initialData.cantidad || 0);
  const [unidad, setUnidad] = useState(initialData.unidad || 'Visita');
  const [ubicacion, setUbicacion] = useState(initialData.ubicacion || '');

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre || '');
      setDescripcion(initialData.descripcion || '');
      setCantidad(initialData.cantidad || 0);
      setUnidad(initialData.unidad || 'Visita');
      setUbicacion(initialData.ubicacion || '');
    }
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ nombre, descripcion, cantidad, unidad, ubicacion });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label form-label-required">Nombre del Visitante / Conductor</label>
          <input required className="form-input" placeholder="Ej. Carlos Pérez" value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Motivo de Visita / Placas</label>
          <input className="form-input" placeholder="Ej. Entrega de paquetería - Placas ABC-1234" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label form-label-required">Acompañantes</label>
          <input required type="number" className="form-input" placeholder="Ej. 0" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tipo de Acceso</label>
          <select className="form-input" value={unidad} onChange={e => setUnidad(e.target.value)}>
            <option value="Visita">Visita</option>
            <option value="Servicio">Servicio</option>
            <option value="Proveedor">Proveedor</option>
            <option value="Residente">Residente</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Destino / Lote</label>
          <input className="form-input" placeholder="Ej. Lote 45 - Calle Roble" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Regresar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Entrada'}</button>
      </div>
    </form>
  );
};

export default AddInsumoModal;
