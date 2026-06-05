import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { CredentialCategory } from '../context/AppStateContext';
import { 
  ShieldAlert, Plus, Trash2, Eye, EyeOff, Search, Lock
} from 'lucide-react';

export const Credentials: React.FC = () => {
  const { credentials, addCredential, deleteCredential, currentUser } = useAppState();

  const [showAddCred, setShowAddCred] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mask states for passwords
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [entityName, setEntityName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [category, setCategory] = useState<CredentialCategory>('PC Login');
  const [notes, setNotes] = useState('');

  const isOperator = currentUser?.role === 'Operador';
  const isEncargado = currentUser?.role === 'Encargado';
  const canViewCredentials = currentUser?.role === 'Admin';

  const togglePasswordVisibility = (id: string) => {
    if (!canViewCredentials) return;
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator || isEncargado) return;
    addCredential({
      entityName,
      loginUsername,
      loginPassword,
      category,
      notes
    });
    setEntityName('');
    setLoginUsername('');
    setLoginPassword('');
    setNotes('');
    setCategory('PC Login');
    setShowAddCred(false);
  };

  const filteredCreds = credentials.filter(c => 
    c.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.loginUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Credenciales de Equipos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bóveda de cuentas de videojuegos de la sede y accesos administrativos de PC</p>
        </div>
        {canViewCredentials && (
          <button className="btn btn-primary" onClick={() => setShowAddCred(true)}>
            <Plus size={16} /> Agregar Credencial
          </button>
        )}
      </div>

      {/* Encargado restriction notice */}
      {isEncargado && (
        <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid rgba(255,204,0,0.3)', background: 'rgba(255,204,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={24} style={{ color: 'var(--neon-yellow)' }} />
            <div>
              <div style={{ color: 'var(--neon-yellow)', fontWeight: 700, fontSize: '0.9rem' }}>Acceso Restringido</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Como Encargado, no tienes permisos para ver credenciales de acceso. Solo puedes ver los nombres de las cuentas y categorías.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={20} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por equipo, cuenta, categoría o usuario..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }} className="credentials-grid">
        {filteredCreds.map((cred) => {
          const showPass = visiblePasswords[cred.id] && canViewCredentials;
          return (
            <div key={cred.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid var(--neon-purple)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-purple">{cred.category}</span>
                {canViewCredentials && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px', border: 'none', background: 'none' }}
                    onClick={() => {
                      if (confirm(`¿Eliminar las credenciales de ${cred.entityName}?`)) {
                        deleteCredential(cred.id);
                      }
                    }}
                  >
                    <Trash2 size={14} style={{ color: 'var(--neon-red)' }} />
                  </button>
                )}
              </div>

              <div>
                <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '4px' }}>{cred.entityName}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{cred.notes || 'Sin observaciones'}</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
                  <span style={{ color: (isEncargado || isOperator) ? 'var(--text-muted)' : 'white', fontWeight: 'bold', fontFamily: (isEncargado || isOperator) ? 'inherit' : 'inherit' }}>
                    {(isEncargado || isOperator) ? '••••••••' : cred.loginUsername}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contraseña:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: showPass ? 'var(--neon-cyan)' : 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {(isEncargado || isOperator) ? '••••••••' : showPass ? cred.loginPassword : '••••••••'}
                    </span>
                    {canViewCredentials && (
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                        onClick={() => togglePasswordVisibility(cred.id)}
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(isOperator || isEncargado) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <ShieldAlert size={12} />
                  <span>{isEncargado ? 'Encargados no pueden ver credenciales' : 'Solo Administradores pueden ver contraseñas'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD CREDENTIAL MODAL */}
      {showAddCred && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Registrar Nueva Credencial</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddCred(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Equipo / Cuenta</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Steam Cuenta 04 o Windows PC-08"
                    value={entityName} 
                    onChange={e => setEntityName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select 
                    className="form-select"
                    value={category}
                    onChange={e => setCategory(e.target.value as CredentialCategory)}
                  >
                    <option value="PC Login">Acceso a PC (Windows)</option>
                    <option value="Steam">Steam Launcher</option>
                    <option value="Epic Games">Epic Games Launcher</option>
                    <option value="Riot Games">Riot Games Launcher</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Usuario</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={loginUsername} 
                      onChange={e => setLoginUsername(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      value={loginPassword} 
                      onChange={e => setLoginPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones / Notas</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    placeholder="Ej. PC de la taquilla, evitar compartir"
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCred(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Credenciales</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
