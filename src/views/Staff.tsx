import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { User, UserRole } from '../context/AppStateContext';
import { 
  Users, UserPlus, Trash2, Edit2, AlertTriangle
} from 'lucide-react';

export const Staff: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAppState();

  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Forms
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Operador');
  const [password, setPassword] = useState('');

  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Operador');
  const [editStatus, setEditStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [editPassword, setEditPassword] = useState('');

  // Guard: Admin only
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} className="text-neon" style={{ color: 'var(--neon-red)', marginBottom: '16px' }} />
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>La gestión de personal y configuración de roles es de acceso exclusivo para la gerencia (Administrador).</p>
      </div>
    );
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser(username, fullName, role, password);
    setUsername('');
    setFullName('');
    setRole('Operador');
    setPassword('');
    setShowAddUser(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser.id, editFullName, editRole, editStatus, editPassword || undefined);
    setEditPassword('');
    setEditingUser(null);
  };

  const getRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'Admin': return <span className="badge badge-purple">Administrador</span>;
      case 'Encargado': return <span className="badge badge-cyan">Encargado</span>;
      default: return <span className="badge badge-secondary">Operador</span>;
    }
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Gestión de Personal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administración de credenciales de empleados y asignación de roles de seguridad</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddUser(true)}>
          <UserPlus size={16} /> Agregar Empleado
        </button>
      </div>

      <div className="glass-card">
        <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} style={{ color: 'var(--neon-purple)' }} /> Empleados Registrados
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Rol / Permiso</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 'bold', color: 'var(--neon-cyan)' }}>@{user.username}</td>
                  <td>{user.fullName}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>
                    <span className={`badge ${user.status === 'Activo' ? 'badge-green' : 'badge-red'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(user.createdAt).toLocaleDateString('es-VE')}
                  </td>
                  <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                      onClick={() => {
                        setEditingUser(user);
                        setEditFullName(user.fullName);
                        setEditRole(user.role);
                        setEditStatus(user.status);
                        setEditPassword('');
                      }}
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    {user.id !== currentUser.id && (
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar a ${user.fullName}?`)) {
                            deleteUser(user.id);
                          }
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Registrar Nuevo Personal</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddUser(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario (Login)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ej. jtorres"
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ej. Juan Torres"
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Empleado</label>
                  <select 
                    className="form-select"
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                  >
                    <option value="Operador">Operador (Taquilla / Caja)</option>
                    <option value="Encargado">Encargado (Supervisor)</option>
                    <option value="Admin">Administrador (Total)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Contraseña de acceso"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Empleado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Editar Empleado: @{editingUser.username}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editFullName} 
                    onChange={e => setEditFullName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Empleado</label>
                  <select 
                    className="form-select"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                  >
                    <option value="Operador">Operador (Taquilla / Caja)</option>
                    <option value="Encargado">Encargado (Supervisor)</option>
                    <option value="Admin">Administrador (Total)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado de la Cuenta</label>
                  <select 
                    className="form-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'Activo' | 'Inactivo')}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo (Suspender Acceso)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña (Dejar en blanco para no cambiar)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Cambiar contraseña de acceso"
                    value={editPassword} 
                    onChange={e => setEditPassword(e.target.value)} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="btn btn-cyan">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
