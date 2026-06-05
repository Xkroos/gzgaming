import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { 
  Lock, Monitor, Wifi, Clock, AlertCircle 
} from 'lucide-react';

export const ClientScreen: React.FC = () => {
  const { pcs, plans, offers, bcvRate, consoleTypes } = useAppState();

  const visiblePcs = pcs.filter(pc => {
    const ct = consoleTypes.find(c => c.id === pc.consoleTypeId);
    return ct && ct.isActive;
  });

  const [selectedPcId, setSelectedPcId] = useState<string>(visiblePcs[0]?.id || '');

  const activePC = visiblePcs.find(pc => pc.id === selectedPcId) || visiblePcs[0];

  if (visiblePcs.length === 0) {
    return (
      <div className="view-container">
        <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem', marginBottom: '20px' }}>Simulador de Pantalla Cliente</h1>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <Monitor size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No hay consolas o PCs activas registradas en el sistema.</p>
        </div>
      </div>
    );
  }

  // Helper: Format Time
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Simulador de Pantalla Cliente</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Muestra lo que observa el usuario final en las pantallas de las PCs gamer</p>
        </div>
        
        {/* Selector de PC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'white', fontWeight: '500' }}>Simular Terminal:</span>
          <select 
            className="form-select" 
            style={{ width: '120px', padding: '8px' }}
            value={selectedPcId}
            onChange={e => setSelectedPcId(e.target.value)}
          >
            {visiblePcs.map(pc => (
              <option key={pc.id} value={pc.id}>{pc.id} ({pc.status})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="client-simulator-container">
        
        {/* Monitor Simulator Frame */}
        <div className="client-pc-screen">
          
          {/* Lock Screen Overlay (Hits 0 time or manual block) */}
          {activePC.status === 'Bloqueada' && (
            <div className="lock-screen-overlay">
              <div className="lock-panel">
                <div className="lock-icon-container">
                  <Lock size={32} />
                </div>
                <h2 className="lock-title">Terminal Bloqueado</h2>
                <div style={{
                  color: 'var(--neon-red)',
                  fontWeight: '800',
                  fontSize: '1.2rem',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                  animation: 'flicker 1.5s infinite'
                }}>
                  TIEMPO CONSUMIDO
                </div>
                <p className="lock-message">
                  Favor dirigirse a la Taquilla Central de <strong>Game Zone</strong> para recargar tiempo de juego.
                </p>

                <div className="lock-info-box">
                  <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '8px', textAlign: 'left', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>
                    TARIFAS Y OFERTAS DE HOY
                  </div>
                  {plans.slice(0, 3).map(p => (
                    <div key={p.id} className="lock-info-row">
                      <span className="lock-info-label">{p.name}:</span>
                      <span className="lock-info-val">${p.priceUsd.toFixed(2)} / {(p.priceUsd * bcvRate).toFixed(2)} Bs.</span>
                    </div>
                  ))}
                  {offers.filter(o => o.isActive).map(o => (
                    <div key={o.id} className="lock-info-row" style={{ color: 'var(--neon-green)' }}>
                      <span>{o.name}:</span>
                      <span>-{o.discountPercentage}% desc</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  IP Terminal: {activePC.ipAddress} | Tasa Oficial BCV: {bcvRate.toFixed(2)} VES/$
                </div>
              </div>
            </div>
          )}

          {/* Idle screen (Disponible) */}
          {activePC.status === 'Disponible' && (
            <div className="lock-screen-overlay" style={{ background: 'radial-gradient(circle, rgba(14, 17, 26, 0.95) 0%, rgba(7, 9, 14, 0.98) 100%)' }}>
              <div className="lock-panel" style={{ border: '1px solid rgba(0, 240, 255, 0.15)', boxShadow: '0 0 30px rgba(0, 240, 255, 0.05)' }}>
                <div className="lock-icon-container" style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)', background: 'rgba(0, 240, 255, 0.05)', boxShadow: 'var(--glow-cyan)' }}>
                  <Monitor size={32} />
                </div>
                <h2 className="lock-title" style={{ textShadow: 'var(--glow-cyan)' }}>Terminal Disponible</h2>
                <p className="lock-message" style={{ marginBottom: '16px' }}>
                  Este equipo está libre. Puedes activarlo solicitando tu ticket en taquilla indicando tu nombre.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                  <span className="badge badge-purple">Tarifa: ${activePC.hourlyRate.toFixed(2)}/h</span>
                  <span className="badge badge-cyan">{(activePC.hourlyRate * bcvRate).toFixed(2)} Bs./h</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Simulator (Active or Suspended) */}
          {(activePC.status === 'En Uso' || activePC.status === 'Suspendida') && (
            <div className="client-desktop">
              {/* Top HUD bar */}
              <div className="client-hud">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="user-profile-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                    {activePC.clientName ? activePC.clientName[0].toUpperCase() : 'G'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{activePC.clientName}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Wifi size={10} style={{ color: 'var(--neon-green)' }} /> Conectado en {activePC.id}
                    </div>
                  </div>
                </div>

                {activePC.status === 'Suspendida' && (
                  <span className="badge badge-yellow" style={{ fontSize: '0.7rem', animation: 'pulse-glow 1.5s infinite' }}>
                    Juego Suspendido
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TIEMPO DISPONIBLE</div>
                    <div className="client-hud-timer">{formatTime(activePC.remainingTime)}</div>
                  </div>
                </div>
              </div>

              {/* Game background details details */}
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                background: 'rgba(14, 17, 26, 0.7)',
                backdropFilter: 'blur(10px)',
                padding: '24px 40px',
                borderRadius: '20px',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <h3 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Game Session</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>La consola del juego está activa. Disfruta de tu sesión de alta fidelidad.</p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MÉTRICA FPS</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>144 FPS</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LATENCIA</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>12 ms</div>
                  </div>
                </div>
              </div>

              {/* Taskbar client simulation */}
              <div style={{
                background: 'rgba(7, 9, 14, 0.95)',
                border: '1px solid var(--border-glass)',
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Game Zone OS v3.2</span>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} /> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Panel explicativo al costado */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} style={{ color: 'var(--neon-cyan)' }} /> Guía del Simulador
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Esta pantalla interactúa directamente con las operaciones que realices en la pestaña <strong>Consola PCs</strong> y <strong>Caja</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ borderLeft: '3px solid var(--neon-cyan)', paddingLeft: '8px' }}>
              <strong style={{ color: 'white' }}>Estado "En Uso":</strong> Al iniciar juego en la consola, verás un HUD de juego con el conteo en segundos y el nombre del cliente.
            </div>
            <div style={{ borderLeft: '3px solid var(--neon-red)', paddingLeft: '8px' }}>
              <strong style={{ color: 'white' }}>Estado "Bloqueada":</strong> Al agotarse el tiempo o tras bloqueos, el cliente se inhabilita a pantalla completa, bloqueando el mouse y teclado virtuales.
            </div>
            <div style={{ borderLeft: '3px solid var(--neon-green)', paddingLeft: '8px' }}>
              <strong style={{ color: 'white' }}>Estado "Disponible":</strong> Cuando liberas la PC, retorna al modo de espera listo para un nuevo cliente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
