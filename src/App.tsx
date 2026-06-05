import React, { useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { ToastProvider, useToast } from './components/ToastNotification';
import { Dashboard } from './views/Dashboard';
import { PCConsole } from './views/PCConsole';
import { Payments } from './views/Payments';
import { Inventory } from './views/Inventory';
import { Plans } from './views/Plans';
import { Staff } from './views/Staff';
import { Credentials } from './views/Credentials';
import { AuditLogs } from './views/AuditLogs';
import { ClientScreen } from './views/ClientScreen';
import { ConsoleTypes } from './views/ConsoleTypes';
import { 
  Monitor, LayoutDashboard, DollarSign, Package, Award, Users, Key, Shield, RefreshCw, LogOut, Landmark, Clock, Menu, X, Gamepad2
} from 'lucide-react';
import './styles/global.css';
import './styles/app.css';

// Active View type
type ViewType = 'dashboard' | 'pc-console' | 'payments' | 'inventory' | 'plans' | 'staff' | 'credentials' | 'audit-logs' | 'client-screen' | 'console-types';

const MainAppContent: React.FC = () => {
  const { currentUser, loginUser, logoutUser, bcvRate, fetchBcvRate, updateBcvRateManually, isBcvLoading, pcs, payments, users, consoleTypes } = useAppState();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ViewType>('pc-console');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Clock
  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Watch for PC alerts (locked PCs)
  useEffect(() => {
    const lockedPcs = pcs.filter(pc => pc.status === 'Bloqueada');
    if (lockedPcs.length > 0) {
      lockedPcs.forEach(pc => {
        // Only show notification once per locking event by checking remainingTime === 0
        if (pc.remainingTime === 0 && pc.clientName) {
          // Use sessionStorage to avoid repeated toasts
          const key = `notified-lock-${pc.id}-${pc.currentSessionId}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            toast.warning(`⏰ ${pc.id} Bloqueada`, `El tiempo de "${pc.clientName}" expiró.`);
          }
        }
      });
    }
  }, [pcs]);

  // Close sidebar when navigating on mobile
  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    setSidebarOpen(false);
  };
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginUser(loginUsername, loginPassword);
    if (!success) {
      setLoginError('Usuario o contraseña incorrectos, o cuenta inactiva.');
    } else {
      setLoginError('');
      const loggedUser = users.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
      if (loggedUser) {
        toast.success('Sesión iniciada', `Bienvenido, ${loggedUser.fullName}.`);
        if (loggedUser.role === 'Operador' || loggedUser.role === 'Encargado') {
          setActiveView('pc-console');
        } else {
          setActiveView('dashboard');
        }
      } else {
        toast.success('Sesión iniciada', `Bienvenido.`);
        setActiveView('pc-console');
      }
      setLoginUsername('');
      setLoginPassword('');
    }
  };

  // Render active view
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'pc-console':
        return <PCConsole />;
      case 'payments':
        return <Payments />;
      case 'inventory':
        return <Inventory />;
      case 'plans':
        return <Plans />;
      case 'staff':
        return <Staff />;
      case 'credentials':
        return <Credentials />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'client-screen':
        return <ClientScreen />;
      case 'console-types':
        return <ConsoleTypes />;
      default:
        return <PCConsole />;
    }
  };

  // Simulated Login Screen
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center top, #12082a 0%, #0a0d1a 50%, #07090e 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(138,43,226,0.06) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'float-orb 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'float-orb 10s ease-in-out infinite reverse' }} />

        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '36px', boxShadow: '0 0 60px rgba(138,43,226,0.2), 0 0 120px rgba(0,240,255,0.05)', position: 'relative', zIndex: 1 }}>
          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: '16px', background: 'linear-gradient(135deg, rgba(138,43,226,0.3), rgba(0,240,255,0.2))', border: '1px solid rgba(138,43,226,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(138,43,226,0.3)' }}>
              <Monitor size={30} style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '900', background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.08em', marginBottom: '6px' }}>GAME ZONE</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sistema de Control Administrativo</p>
            <div style={{ display: 'inline-block', padding: '2px 10px', background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', borderRadius: '20px', marginTop: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontWeight: 600, letterSpacing: '0.05em' }}>● SISTEMA EN LÍNEA</span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ingresa tu usuario" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="Ingresa tu contraseña" 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  style={{ paddingRight: '70px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--neon-cyan)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: 0
                  }}
                >
                  {showLoginPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {loginError && (
              <p style={{ color: 'var(--neon-red)', fontSize: '0.85rem', textAlign: 'center' }}>{loginError}</p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Navigation */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Monitor size={24} style={{ color: 'var(--neon-cyan)' }} />
          <span className="sidebar-logo-text">Game Zone</span>
          {/* Mobile close button */}
          <button
            className="mobile-menu-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick sidebar status */}
        {(() => {
          const visiblePcs = pcs.filter(pc => {
            const ct = consoleTypes.find(c => c.id === pc.consoleTypeId);
            return ct && ct.isActive;
          });
          const activePCCount = visiblePcs.filter(p => p.status === 'En Uso').length;
          const lockedPCCount = visiblePcs.filter(p => p.status === 'Bloqueada').length;
          return (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <div style={{ flex: 1, background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>{activePCCount}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>En Uso</div>
                </div>
                {lockedPCCount > 0 ? (
                  <div style={{ flex: 1, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.25)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center', animation: 'card-alert-pulse 2s infinite' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neon-red)' }}>{lockedPCCount}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--neon-red)', textTransform: 'uppercase' }}>Bloq.</div>
                  </div>
                ) : (
                  <div style={{ flex: 1, background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.15)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neon-green)' }}>{visiblePcs.filter(p => p.status === 'Disponible').length}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Libres</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="sidebar-nav">
          {currentUser.role === 'Admin' && (
            <div 
              className={`nav-link ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          )}

          <div 
            className={`nav-link ${activeView === 'pc-console' ? 'active' : ''}`}
            onClick={() => handleNavClick('pc-console')}
          >
            <Monitor size={18} />
            <span>Consola PCs</span>
          </div>

          <div 
            className={`nav-link ${activeView === 'payments' ? 'active' : ''}`}
            onClick={() => handleNavClick('payments')}
          >
            <DollarSign size={18} />
            <span style={{ flex: 1 }}>Caja y Pagos</span>
            {(() => {
              const pendingCount = payments.filter(p => p.status === 'Pendiente').length;
              return pendingCount > 0 ? (
                <span style={{ background: 'var(--neon-yellow)', color: '#000', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                  {pendingCount}
                </span>
              ) : null;
            })()}
          </div>

          <div 
            className={`nav-link ${activeView === 'inventory' ? 'active' : ''}`}
            onClick={() => handleNavClick('inventory')}
          >
            <Package size={18} />
            <span>Inventario</span>
          </div>

          {currentUser.role !== 'Operador' && (
            <div 
              className={`nav-link ${activeView === 'console-types' ? 'active' : ''}`}
              onClick={() => handleNavClick('console-types')}
            >
              <Gamepad2 size={18} />
              <span>Consolas / Tarifas</span>
            </div>
          )}

          {currentUser.role !== 'Operador' && (
            <div 
              className={`nav-link ${activeView === 'plans' ? 'active' : ''}`}
              onClick={() => handleNavClick('plans')}
            >
              <Award size={18} />
              <span>Tarifas y Planes</span>
            </div>
          )}

          {currentUser.role === 'Admin' && (
            <div 
              className={`nav-link ${activeView === 'staff' ? 'active' : ''}`}
              onClick={() => handleNavClick('staff')}
            >
              <Users size={18} />
              <span>Personal</span>
            </div>
          )}

          <div 
            className={`nav-link ${activeView === 'credentials' ? 'active' : ''}`}
            onClick={() => handleNavClick('credentials')}
          >
            <Key size={18} />
            <span>Credenciales</span>
          </div>

          {currentUser.role === 'Admin' && (
            <div 
              className={`nav-link ${activeView === 'audit-logs' ? 'active' : ''}`}
              onClick={() => handleNavClick('audit-logs')}
            >
              <Shield size={18} />
              <span>Bitácora</span>
            </div>
          )}

          <div style={{ borderBottom: '1px solid var(--border-glass)', margin: '10px 0' }}></div>

          <div 
            className={`nav-link ${activeView === 'client-screen' ? 'active' : ''}`}
            onClick={() => handleNavClick('client-screen')}
            style={{ border: '1px dashed var(--neon-cyan)', color: 'var(--neon-cyan)' }}
          >
            <Monitor size={18} />
            <span>Pantalla Cliente</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="user-profile-badge">
              <div className="user-profile-avatar">
                {currentUser.fullName[0]}
              </div>
              <div className="user-profile-info">
                <div className="user-profile-name">{currentUser.fullName}</div>
                <div className="user-profile-role">{currentUser.role}</div>
              </div>
            </div>
            <button 
              onClick={logoutUser}
              style={{ background: 'none', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', padding: '4px' }}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        <header className="app-header">
          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div style={{ flex: 1 }} />

          <div className="header-info-section">
            {/* Live Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600 }}>
              <Clock size={14} style={{ color: 'var(--neon-purple)' }} />
              <span style={{ color: 'white', letterSpacing: '0.05em' }}>
                {currentTime.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="header-date-text" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {currentTime.toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>

            {/* Live BCV Rates Panel */}
            <div className="bcv-rate-badge" style={{ gap: '10px' }}>
              <Landmark size={16} />
              <span>BCV: {bcvRate.toFixed(2)}</span>
              <button 
                onClick={() => { fetchBcvRate(); toast.info('Sincronizando...', 'Actualizando tasa BCV oficial.'); }} 
                disabled={isBcvLoading}
                style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                title="Sincronizar Tasa BCV Oficial"
              >
                <RefreshCw size={14} className={isBcvLoading ? 'spin-anim' : ''} style={{ animation: isBcvLoading ? 'spin 1s infinite linear' : 'none' }} />
              </button>
            </div>
            
            {/* Standard manual rates change for Admin */}
            {currentUser.role === 'Admin' && (
              <button 
                className="btn btn-secondary header-adjust-rate-btn" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  const rate = prompt('Ingresa la nueva tasa de cambio en VES/$:', String(bcvRate));
                  if (rate) {
                    const parsed = parseFloat(rate);
                    if (!isNaN(parsed) && parsed > 0) updateBcvRateManually(parsed);
                  }
                }}
              >
                Ajustar Tasa
              </button>
            )}
          </div>
        </header>

        {/* Dynamic view output */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppStateProvider>
        <MainAppContent />
      </AppStateProvider>
    </ToastProvider>
  );
};
export default App;
