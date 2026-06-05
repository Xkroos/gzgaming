import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { 
  Search, Filter, AlertTriangle 
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { auditLogs, currentUser } = useAppState();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Guard: Admin only
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} className="text-neon" style={{ color: 'var(--neon-red)', marginBottom: '16px' }} />
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>La bitácora de seguridad y logs de auditoría contable son confidenciales y exclusivos para el Administrador general.</p>
      </div>
    );
  }

  // Filter logic
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase()) ||
                          log.details.toLowerCase().includes(search.toLowerCase());
                          
    const matchesAction = filterAction === 'All' || log.action.startsWith(filterAction);
    const matchesStatus = filterStatus === 'All' || log.status === filterStatus;

    return matchesSearch && matchesAction && matchesStatus;
  });

  const getStatusBadge = (status: 'Éxito' | 'Fallo' | 'Advertencia') => {
    switch (status) {
      case 'Éxito': return <span className="badge badge-green">Éxito</span>;
      case 'Fallo': return <span className="badge badge-red">Fallo</span>;
      default: return <span className="badge badge-yellow">Advertencia</span>;
    }
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Bitácora de Seguridad</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registro inalterable de auditoría técnica, conexiones y control operativo</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por usuario, acción o detalles de evento..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <select 
              className="form-select" 
              style={{ width: '150px', padding: '6px 12px' }}
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="All">Todas las acciones</option>
              <option value="LOGIN">Conexión (Login)</option>
              <option value="LOGOUT">Desconexión (Logout)</option>
              <option value="PAYMENT">Pagos</option>
              <option value="PC_">Control de PCs</option>
              <option value="INV_">Inventario</option>
              <option value="USER_">Gestión Empleados</option>
              <option value="PLAN_">Planes</option>
              <option value="OFFER_">Ofertas</option>
            </select>
          </div>

          <select 
            className="form-select" 
            style={{ width: '150px', padding: '6px 12px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">Todos los estados</option>
            <option value="Éxito">Éxito</option>
            <option value="Fallo">Fallo</option>
            <option value="Advertencia">Advertencia</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción Realizada</th>
                <th>Detalles de Auditoría</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    No se encontraron registros de seguridad coincidentes.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(log.createdAt).toLocaleString('es-VE')}
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'white' }}>{log.username}</td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{log.role}</span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '0.85rem' }}>
                      {log.action}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{log.details}</td>
                    <td>{getStatusBadge(log.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
