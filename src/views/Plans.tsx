import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { 
  Award, Clock, Plus, ToggleLeft, ToggleRight 
} from 'lucide-react';

export const Plans: React.FC = () => {
  const { 
    plans, offers, addPlan, updatePlan, addOffer, updateOffer, bcvRate, currentUser 
  } = useAppState();

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);

  // Forms states
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planMin, setPlanMin] = useState(60);
  const [planUsd, setPlanUsd] = useState(2.00);

  const [offerName, setOfferName] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerPercent, setOfferPercent] = useState(10);
  const [offerDay, setOfferDay] = useState<number>(1); // default Lunes

  const isOperator = currentUser?.role === 'Operador';

  const handleAddPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) return;
    addPlan({
      name: planName,
      description: planDesc,
      durationMinutes: planMin,
      priceUsd: planUsd
    });
    setPlanName('');
    setPlanDesc('');
    setPlanMin(60);
    setPlanUsd(2.00);
    setShowAddPlan(false);
  };

  const handleAddOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) return;
    addOffer({
      name: offerName,
      description: offerDesc,
      discountPercentage: offerPercent,
      dayOfWeek: offerDay !== -1 ? offerDay : undefined
    });
    setOfferName('');
    setOfferDesc('');
    setOfferPercent(10);
    setOfferDay(1);
    setShowAddOffer(false);
  };

  const getDayName = (dayNum?: number) => {
    if (dayNum === undefined) return 'Todos los días';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNum];
  };

  if (isOperator) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Los operadores no pueden configurar los planes o precios de la sede. Por favor contacte al Administrador o Encargado.</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Planes y Ofertas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Definición de tarifas de juego y promociones activas en la sede</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowAddPlan(true)}>
            <Plus size={16} /> Crear Plan
          </button>
          <button className="btn btn-cyan" onClick={() => setShowAddOffer(true)}>
            <Plus size={16} /> Crear Oferta
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Plans Management */}
        <div className="glass-card">
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--neon-purple)' }} /> Planes de Juego
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plans.map((plan) => (
              <div key={plan.id} style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-glass)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: plan.isActive ? 1 : 0.6
              }}>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '4px' }}>{plan.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>{plan.description}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Duración: {plan.durationMinutes} min</span>
                    <span>|</span>
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>Precio: ${plan.priceUsd.toFixed(2)}</span>
                    <span>|</span>
                    <span style={{ color: 'var(--neon-green)' }}>{(plan.priceUsd * bcvRate).toFixed(2)} Bs.</span>
                  </div>
                </div>

                <button 
                  onClick={() => updatePlan(plan.id, { isActive: !plan.isActive })}
                  style={{ background: 'none', border: 'none', color: plan.isActive ? 'var(--neon-purple)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {plan.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Offers Management */}
        <div className="glass-card">
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--neon-cyan)' }} /> Promociones y Descuentos
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {offers.map((offer) => (
              <div key={offer.id} style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-glass)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: offer.isActive ? 1 : 0.6
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ color: 'white' }}>{offer.name}</h4>
                    <span className="badge badge-cyan">{offer.discountPercentage}% OFF</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>{offer.description}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Día de aplicación: <span style={{ color: 'white', fontWeight: 'bold' }}>{getDayName(offer.dayOfWeek)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => updateOffer(offer.id, { isActive: !offer.isActive })}
                  style={{ background: 'none', border: 'none', color: offer.isActive ? 'var(--neon-cyan)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {offer.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE PLAN MODAL */}
      {showAddPlan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Crear Nuevo Plan de Juego</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddPlan(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPlanSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Plan</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Plan 5 Horas Combo" 
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Detalles del plan..." 
                    value={planDesc}
                    onChange={e => setPlanDesc(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Duración (Minutos)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="10" 
                      value={planMin || ''}
                      onChange={e => setPlanMin(parseInt(e.target.value) || 0)}
                      placeholder="Ingrese la cantidad"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio ($ USD)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0.1" 
                      step="0.01" 
                      value={planUsd || ''}
                      onChange={e => setPlanUsd(parseFloat(e.target.value) || 0)}
                      placeholder="Ingrese la cantidad"
                      required 
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Equivalente en bolívares (Tasa {bcvRate}):</span>
                  <span style={{ color: 'var(--neon-green)', fontWeight: 'bold', marginLeft: '8px' }}>{(planUsd * bcvRate).toFixed(2)} Bs.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddPlan(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {showAddOffer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Crear Nueva Regla de Descuento</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddOffer(false)}>✕</button>
            </div>
            <form onSubmit={handleAddOfferSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Promoción</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Súper Jueves Gamer" 
                    value={offerName}
                    onChange={e => setOfferName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. 20% de descuento en la tarde..." 
                    value={offerDesc}
                    onChange={e => setOfferDesc(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Porcentaje de Descuento (%)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" 
                    max="100" 
                    value={offerPercent || ''}
                    onChange={e => setOfferPercent(parseInt(e.target.value) || 0)}
                    placeholder="Ingrese la cantidad"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Día de Aplicación Semanal</label>
                  <select 
                    className="form-select"
                    value={offerDay}
                    onChange={e => setOfferDay(parseInt(e.target.value))}
                  >
                    <option value={-1}>Todos los días</option>
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sábado</option>
                    <option value={0}>Domingo</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddOffer(false)}>Cancelar</button>
                <button type="submit" className="btn btn-cyan">Guardar Regla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
