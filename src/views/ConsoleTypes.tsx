import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { ConsoleType } from '../context/AppStateContext';
import { useToast } from '../components/ToastNotification';
import {
  Gamepad2, Plus, Edit2, Trash2, DollarSign, ToggleLeft, ToggleRight, AlertTriangle
} from 'lucide-react';

export const ConsoleTypes: React.FC = () => {
  const {
    consoleTypes, addConsoleType, updateConsoleType, deleteConsoleType,
    globalHourlyRate, updateGlobalRate, currentUser
  } = useAppState();
  const { toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCt, setEditingCt] = useState<ConsoleType | null>(null);

  // Form states - Add
  const [ctName, setCtName] = useState('');
  const [ctEmoji, setCtEmoji] = useState('🎮');
  const [ctRate, setCtRate] = useState(2.00);

  // Form states - Edit
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editRate, setEditRate] = useState(0);

  // Global rate edit
  const [editingGlobalRate, setEditingGlobalRate] = useState(false);
  const [tempGlobalRate, setTempGlobalRate] = useState(globalHourlyRate);

  // Guard: Only Admin and Encargado
  if (currentUser?.role === 'Operador') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--neon-red)', marginBottom: '16px' }} />
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Solo Administradores y Encargados pueden gestionar los tipos de consola y tarifas.</p>
      </div>
    );
  }

  const emojiOptions = ['🖥️', '🎮', '🏎️', '🕹️', '🎯', '🏈', '⚽', '🎸', '🎲', '📱'];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConsoleType({ name: ctName, emoji: ctEmoji, hourlyRate: ctRate });
    toast.success('Consola Registrada', `${ctEmoji} ${ctName} - $${ctRate.toFixed(2)}/h`);
    setCtName('');
    setCtEmoji('🎮');
    setCtRate(2.00);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCt) return;
    updateConsoleType(editingCt.id, { name: editName, emoji: editEmoji, hourlyRate: editRate });
    toast.success('Consola Actualizada', `${editEmoji} ${editName} - $${editRate.toFixed(2)}/h`);
    setEditingCt(null);
  };

  const handleSaveGlobalRate = () => {
    updateGlobalRate(tempGlobalRate);
    setEditingGlobalRate(false);
    toast.info('Tarifa Global Actualizada', `$${tempGlobalRate.toFixed(2)}/h`);
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Consolas y Tarifas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registra los tipos de equipo y define tarifas por hora</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Agregar Consola
        </button>
      </div>

      {/* Global Rate Card */}
      <div className="glass-card" style={{ marginBottom: '24px', borderTop: '4px solid var(--neon-cyan)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarifa Global por Defecto</div>
              {editingGlobalRate ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '120px', padding: '6px 10px' }}
                    min="0.1"
                    step="0.01"
                    value={tempGlobalRate || ''}
                    onChange={e => setTempGlobalRate(parseFloat(e.target.value) || 0)}
                    placeholder="Ingrese la cantidad"
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>$/hora</span>
                  <button className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleSaveGlobalRate}>Guardar</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setEditingGlobalRate(false)}>Cancelar</button>
                </div>
              ) : (
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                  ${globalHourlyRate.toFixed(2)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ hora</span>
                </div>
              )}
            </div>
          </div>
          {!editingGlobalRate && (
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => { setTempGlobalRate(globalHourlyRate); setEditingGlobalRate(true); }}
            >
              <Edit2 size={14} /> Editar Tarifa Global
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
          Esta tarifa se usa como valor por defecto al crear nuevos equipos. Cada tipo de consola puede tener su propia tarifa.
        </p>
      </div>

      {/* Console Types Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {consoleTypes.map((ct) => (
          <div key={ct.id} className="glass-card" style={{
            borderTop: `4px solid ${ct.isActive ? 'var(--neon-purple)' : 'var(--text-muted)'}`,
            opacity: ct.isActive ? 1 : 0.6,
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>{ct.emoji}</span>
                <div>
                  <h3 style={{ color: 'white', fontSize: '1.1rem' }}>{ct.name}</h3>
                  <span className={`badge ${ct.isActive ? 'badge-green' : 'badge-red'}`}>
                    {ct.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tarifa por Hora:</span>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '1.1rem' }}>${ct.hourlyRate.toFixed(2)}/h</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                onClick={() => {
                  setEditingCt(ct);
                  setEditName(ct.name);
                  setEditEmoji(ct.emoji);
                  setEditRate(ct.hourlyRate);
                }}
              >
                <Edit2 size={14} /> Editar
              </button>
              <button
                className={ct.isActive ? 'btn btn-secondary' : 'btn btn-green'}
                style={{ padding: '8px', fontSize: '0.8rem' }}
                onClick={() => {
                  updateConsoleType(ct.id, { isActive: !ct.isActive });
                  toast.info(ct.isActive ? 'Consola Desactivada' : 'Consola Activada', ct.name);
                }}
                title={ct.isActive ? 'Desactivar' : 'Activar'}
              >
                {ct.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>
              {currentUser?.role === 'Admin' && (
                <button
                  className="btn btn-danger"
                  style={{ padding: '8px', fontSize: '0.8rem' }}
                  onClick={() => {
                    if (confirm(`¿Eliminar "${ct.name}"? Esta acción no se puede deshacer.`)) {
                      deleteConsoleType(ct.id);
                      toast.error('Consola Eliminada', ct.name);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {consoleTypes.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <Gamepad2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No hay consolas registradas. Agrega la primera con el botón de arriba.</p>
        </div>
      )}

      {/* ADD CONSOLE TYPE MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gamepad2 size={20} style={{ color: 'var(--neon-purple)' }} /> Registrar Nueva Consola
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Consola</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. PlayStation 5, Nintendo Switch, Simulador F1"
                    value={ctName}
                    onChange={e => setCtName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Icono / Emoji</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCtEmoji(emoji)}
                        style={{
                          width: 44, height: 44,
                          fontSize: '1.3rem',
                          border: ctEmoji === emoji ? '2px solid var(--neon-purple)' : '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          background: ctEmoji === emoji ? 'rgba(138,43,226,0.15)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarifa por Hora ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0.1"
                    step="0.01"
                    value={ctRate || ''}
                    onChange={e => setCtRate(parseFloat(e.target.value) || 0)}
                    placeholder="Ingrese la cantidad"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tarifa global actual: ${globalHourlyRate.toFixed(2)}/h</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Consola</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONSOLE TYPE MODAL */}
      {editingCt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Editar: {editingCt.emoji} {editingCt.name}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingCt(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Consola</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Icono / Emoji</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditEmoji(emoji)}
                        style={{
                          width: 44, height: 44,
                          fontSize: '1.3rem',
                          border: editEmoji === emoji ? '2px solid var(--neon-purple)' : '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          background: editEmoji === emoji ? 'rgba(138,43,226,0.15)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarifa por Hora ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0.1"
                    step="0.01"
                    value={editRate || ''}
                    onChange={e => setEditRate(parseFloat(e.target.value) || 0)}
                    placeholder="Ingrese la cantidad"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCt(null)}>Cancelar</button>
                <button type="submit" className="btn btn-cyan">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
