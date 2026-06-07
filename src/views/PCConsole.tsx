import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { PC, PaymentMethod } from '../context/AppStateContext';
import { useToast } from '../components/ToastNotification';
import { 
  Monitor, Play, Pause, Square, Plus, Info, Zap, Users, Clock, ShoppingBag, CreditCard, Edit2, Trash2, Upload
} from 'lucide-react';

export const PCConsole: React.FC = () => {
  const { 
    pcs, plans, offers, assignPC, releasePC, pausePC, resumePC, addTimeToPC, 
    bcvRate, registerPayment, inventory, sellProduct,
    addPC, updatePC, deletePC, consoleTypes, currentUser
  } = useAppState();
  const { toast } = useToast();

  // Modal States
  const [selectedPC, setSelectedPC] = useState<PC | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [showAddEditPCModal, setShowAddEditPCModal] = useState(false);
  const [editingPC, setEditingPC] = useState<PC | null>(null);

  // Form States for PC
  const [pcName, setPcName] = useState('');
  const [pcIpAddress, setPcIpAddress] = useState('');
  const [pcDetails, setPcDetails] = useState('');
  const [pcConsoleTypeId, setPcConsoleTypeId] = useState('');
  const [pcHourlyRate, setPcHourlyRate] = useState(2.00);

  const handleConsoleTypeChange = (typeId: string) => {
    setPcConsoleTypeId(typeId);
    const ct = consoleTypes.find(c => c.id === typeId);
    if (ct) {
      setPcHourlyRate(ct.hourlyRate);
    }
  };

  const handleSavePC = (e: React.FormEvent) => {
    e.preventDefault();
    const pcData = {
      pcName: pcName.trim(),
      ipAddress: pcIpAddress.trim() || '192.168.1.100',
      consoleTypeId: pcConsoleTypeId,
      hourlyRate: pcHourlyRate,
      details: pcDetails.trim(),
    };

    if (editingPC) {
      updatePC(editingPC.id, pcData);
      toast.success('Equipo Actualizado', `${editingPC.id} se actualizó.`);
    } else {
      addPC(pcData);
      toast.success('Equipo Registrado', `${pcName.trim().toUpperCase()} se agregó con éxito.`);
    }
    setShowAddEditPCModal(false);
    setEditingPC(null);
    setPcName('');
    setPcIpAddress('');
    setPcDetails('');
    setPcConsoleTypeId('');
    setPcHourlyRate(2.00);
  };

  // Assign flow step: 'configure' -> 'pay'
  const [assignStep, setAssignStep] = useState<'configure' | 'pay'>('configure');

  // Form States for Assigning PC
  const [clientName, setClientName] = useState('Cliente Invitado');
  const [durationMode, setDurationMode] = useState<'custom' | 'plan'>('custom');
  const [customMinutes, setCustomMinutes] = useState(60);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('');

  // Payment form states (step 2)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReceiptImageUrl, setPaymentReceiptImageUrl] = useState('');

  // Form States for Adding Time
  const [addMinutes, setAddMinutes] = useState(30);
  const [addTimePaymentMethod, setAddTimePaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [addTimeReference, setAddTimeReference] = useState('');
  const [addTimeReceiptImageUrl, setAddTimeReceiptImageUrl] = useState('');

  // Extras states
  const [extrasCart, setExtrasCart] = useState<Record<string, number>>({});
  const [showExtrasPayment, setShowExtrasPayment] = useState(false);
  const [extrasPaymentMethod, setExtrasPaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [extrasPaymentRef, setExtrasPaymentRef] = useState('');
  const [extrasPaymentReceiptImageUrl, setExtrasPaymentReceiptImageUrl] = useState('');

  // File Upload Helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper: Format Time in seconds to hh:mm:ss
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  };

  // Helper: Get Offer details for calculation
  const getSelectedDetails = () => {
    let minutes = customMinutes;
    let basePrice = (customMinutes / 60) * (selectedPC?.hourlyRate || 2);
    let planName = 'Tiempo Personalizado';

    if (durationMode === 'plan' && selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        minutes = plan.durationMinutes;
        basePrice = plan.priceUsd;
        planName = plan.name;
      }
    }

    let discountPercent = 0;
    let offerName = '';
    if (selectedOfferId) {
      const offer = offers.find(o => o.id === selectedOfferId);
      if (offer) {
        discountPercent = offer.discountPercentage;
        offerName = offer.name;
      }
    }

    const finalPriceUsd = basePrice * (1 - discountPercent / 100);
    const finalPriceVes = finalPriceUsd * bcvRate;

    return {
      minutes,
      basePrice,
      planName,
      discountPercent,
      offerName,
      finalPriceUsd,
      finalPriceVes
    };
  };

  // Step 1 -> Step 2
  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignStep('pay');
  };

  // Step 2 -> Final Submit
  const handleFinalAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPC) return;

    const { minutes, finalPriceUsd, finalPriceVes, offerName, planName } = getSelectedDetails();

    // 1. Assign PC
    assignPC(selectedPC.id, clientName, minutes, selectedOfferId || undefined, selectedPlanId || undefined);

    // 2. Register payment with method and reference
    registerPayment({
      sessionId: `sess-${Date.now()}`,
      amountUsd: finalPriceUsd,
      amountVes: finalPriceVes,
      bcvRate,
      paymentMethod,
      reference: paymentReference || undefined,
      receiptImageUrl: paymentReceiptImageUrl || undefined,
      offerApplied: `${planName} - PC: ${selectedPC.id} ${offerName ? `(${offerName})` : ''}`,
    });

    toast.success(`🎮 ${selectedPC.id} Asignada`, `${clientName} • ${minutes} min • $${finalPriceUsd.toFixed(2)}`);

    // Reset forms & close
    setShowAssignModal(false);
    setSelectedPC(null);
    setAssignStep('configure');
    setClientName('Cliente Invitado');
    setSelectedPlanId('');
    setSelectedOfferId('');
    setCustomMinutes(60);
    setPaymentMethod('Pago Móvil');
    setPaymentReference('');
    setPaymentReceiptImageUrl('');
  };

  const handleAddTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPC) return;

    const priceUsd = (addMinutes / 60) * selectedPC.hourlyRate;
    const priceVes = priceUsd * bcvRate;

    // 1. Add time
    addTimeToPC(selectedPC.id, addMinutes);

    // 2. Register payment
    registerPayment({
      amountUsd: priceUsd,
      amountVes: priceVes,
      bcvRate,
      paymentMethod: addTimePaymentMethod,
      reference: addTimeReference || undefined,
      receiptImageUrl: addTimeReceiptImageUrl || undefined,
      offerApplied: `Tiempo adicional (+${addMinutes} min) - PC: ${selectedPC.id}`,
    });

    toast.info(`⏱️ +${addMinutes} min a ${selectedPC.id}`, `+$${priceUsd.toFixed(2)} registrado`);

    setShowAddTimeModal(false);
    setSelectedPC(null);
    setAddMinutes(30);
    setAddTimePaymentMethod('Pago Móvil');
    setAddTimeReference('');
    setAddTimeReceiptImageUrl('');
  };

  // Extras helpers
  const addToExtrasCart = (productId: string) => {
    const item = inventory.find(i => i.id === productId);
    if (!item || item.stock <= 0) return;
    const currentQty = extrasCart[productId] || 0;
    if (currentQty >= item.stock) return;
    setExtrasCart(prev => ({ ...prev, [productId]: currentQty + 1 }));
  };

  const removeFromExtrasCart = (productId: string) => {
    const currentQty = extrasCart[productId] || 0;
    if (currentQty <= 0) return;
    if (currentQty === 1) {
      const newCart = { ...extrasCart };
      delete newCart[productId];
      setExtrasCart(newCart);
    } else {
      setExtrasCart(prev => ({ ...prev, [productId]: currentQty - 1 }));
    }
  };

  const getExtrasTotal = () => {
    let totalUsd = 0;
    Object.entries(extrasCart).forEach(([id, qty]) => {
      const item = inventory.find(i => i.id === id);
      if (item) totalUsd += item.priceUsd * qty;
    });
    return totalUsd;
  };

  const handleExtrasGoToPay = () => {
    if (Object.keys(extrasCart).length === 0) return;
    setShowExtrasPayment(true);
  };

  const handleExtrasPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPC) return;

    const totalUsd = getExtrasTotal();
    const totalVes = totalUsd * bcvRate;
    const itemNames = Object.entries(extrasCart).map(([id, qty]) => {
      const item = inventory.find(i => i.id === id);
      return item ? `${item.name} x${qty}` : '';
    }).filter(Boolean).join(', ');

    // Sell products from inventory (passing skipPayment=true to avoid double payments)
    Object.entries(extrasCart).forEach(([id, qty]) => {
      sellProduct(id, qty, undefined, undefined, undefined, true);
    });

    // Register separate payment for extras
    registerPayment({
      amountUsd: totalUsd,
      amountVes: totalVes,
      bcvRate,
      paymentMethod: extrasPaymentMethod,
      reference: extrasPaymentRef || undefined,
      receiptImageUrl: extrasPaymentReceiptImageUrl || undefined,
      offerApplied: `Extras (${selectedPC.id} - ${selectedPC.clientName}): ${itemNames}`,
    });

    toast.success('🛒 Extras Registrados', `$${totalUsd.toFixed(2)} • ${itemNames}`);

    // Reset
    setExtrasCart({});
    setShowExtrasPayment(false);
    setShowExtrasModal(false);
    setSelectedPC(null);
    setExtrasPaymentMethod('Pago Móvil');
    setExtrasPaymentRef('');
    setExtrasPaymentReceiptImageUrl('');
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Consola de Equipos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoreo y administración de sesiones de juego en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setEditingPC(null);
                setPcName('');
                setPcIpAddress('192.168.1.');
                setPcDetails('');
                const firstActiveCt = consoleTypes.find(c => c.isActive);
                if (firstActiveCt) {
                  setPcConsoleTypeId(firstActiveCt.id);
                  setPcHourlyRate(firstActiveCt.hourlyRate);
                } else {
                  setPcConsoleTypeId('');
                  setPcHourlyRate(2.00);
                }
                setShowAddEditPCModal(true);
              }}
            >
              <Plus size={16} /> Agregar Equipo
            </button>
          )}
          <div className="bcv-rate-badge" style={{ padding: '8px 16px' }}>
            <span>Tasa BCV: {bcvRate.toFixed(2)} VES/$</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {(() => {
        const visiblePcs = pcs.filter(pc => {
          const ct = consoleTypes.find(c => c.id === pc.consoleTypeId);
          return ct && ct.isActive;
        });
        const active = visiblePcs.filter(p => p.status === 'En Uso').length;
        const available = visiblePcs.filter(p => p.status === 'Disponible').length;
        const locked = visiblePcs.filter(p => p.status === 'Bloqueada').length;
        const paused = visiblePcs.filter(p => p.status === 'Suspendida').length;
        const total = visiblePcs.length || 1;
        const occupancyPct = Math.round((active / total) * 100);
        return (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div className="glass-card" style={{ flex: 1, minWidth: '120px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(57,255,20,0.2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(57,255,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-green)', flexShrink: 0 }}>
                <Zap size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Disponibles</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-green)' }}>{available}</div>
              </div>
            </div>
            <div className="glass-card" style={{ flex: 1, minWidth: '120px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(0,240,255,0.2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', flexShrink: 0 }}>
                <Users size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>En Uso</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>{active}</div>
              </div>
            </div>
            {locked > 0 && (
              <div className="glass-card" style={{ flex: 1, minWidth: '120px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,51,102,0.3)', animation: 'card-alert-pulse 2s infinite' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,51,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-red)', flexShrink: 0 }}>
                  <Monitor size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neon-red)', textTransform: 'uppercase' }}>Bloqueadas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-red)' }}>{locked}</div>
                </div>
              </div>
            )}
            {paused > 0 && (
              <div className="glass-card" style={{ flex: 1, minWidth: '120px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,204,0,0.2)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,204,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-yellow)', flexShrink: 0 }}>
                  <Pause size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pausadas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-yellow)' }}>{paused}</div>
                </div>
              </div>
            )}
            <div className="glass-card" style={{ flex: 2, minWidth: '180px', padding: '14px 18px', border: '1px solid rgba(138,43,226,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Ocupación</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neon-purple)' }}>{occupancyPct}%</span>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${occupancyPct}%`, background: 'linear-gradient(90deg, var(--neon-purple), var(--neon-cyan))', borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{active} de {visiblePcs.length} activos</div>
            </div>
          </div>
        );
      })()}

      {/* PC Cards Grid */}
      {(() => {
        const visiblePcs = pcs.filter(pc => {
          const ct = consoleTypes.find(c => c.id === pc.consoleTypeId);
          return ct && ct.isActive;
        });

        if (visiblePcs.length === 0) {
          return (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--border-glass)' }}>
              <Monitor size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ color: 'white', marginBottom: '8px' }}>No hay equipos registrados</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Agrega equipos o asegúrate de que los tipos de consola estén activos.</p>
              {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && (
                <button className="btn btn-primary" onClick={() => {
                  setEditingPC(null);
                  setPcName('');
                  setPcIpAddress('192.168.1.');
                  setPcDetails('');
                  const firstActiveCt = consoleTypes.find(c => c.isActive);
                  if (firstActiveCt) {
                    setPcConsoleTypeId(firstActiveCt.id);
                    setPcHourlyRate(firstActiveCt.hourlyRate);
                  }
                  setShowAddEditPCModal(true);
                }}>
                  Agregar Primer Equipo
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="pc-grid">
            {visiblePcs.map((pc) => {
              const isTimerActive = pc.status === 'En Uso';
              const isTimeLow = pc.status === 'En Uso' && pc.remainingTime < 300; // < 5 mins

              return (
                <div key={pc.id} className={`pc-card status-${pc.status.toLowerCase().replace(' ', '-')}`}>
                  <div className="pc-card-header">
                    <span className="pc-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Monitor size={18} style={{ color: pc.status === 'Disponible' ? 'var(--neon-green)' : pc.status === 'En Uso' ? 'var(--neon-cyan)' : 'var(--neon-red)' }} />
                      {pc.id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${
                        pc.status === 'Disponible' ? 'badge-green' : 
                        pc.status === 'En Uso' ? 'badge-cyan' : 
                        pc.status === 'Bloqueada' ? 'badge-red' : 'badge-yellow'
                      }`}>
                        {pc.status}
                      </span>
                      
                      {/* PC Admin actions (Edit/Delete) on Available status */}
                      {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && pc.status === 'Disponible' && (
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            title="Editar Equipo"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPC(pc);
                              setPcName(pc.pcName);
                              setPcIpAddress(pc.ipAddress);
                              setPcDetails(pc.details);
                              setPcConsoleTypeId(pc.consoleTypeId || '');
                              setPcHourlyRate(pc.hourlyRate);
                              setShowAddEditPCModal(true);
                            }}
                          >
                            <Edit2 size={13} style={{ color: 'var(--text-secondary)' }} />
                          </button>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            title="Eliminar Equipo"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Estás seguro de eliminar el equipo ${pc.id}?`)) {
                                deletePC(pc.id);
                                toast.error('Equipo Eliminado', `${pc.id} fue eliminado.`);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Usuario Actual</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: pc.clientName ? 'white' : 'var(--text-muted)' }}>
                  {pc.clientName || 'Sin asignar'}
                </div>
              </div>

              {/* Timer Output */}
              <div className={`pc-card-timer ${
                isTimeLow ? 'time-low' : isTimerActive ? 'time-active' : 'time-empty'
              }`}>
                {formatTime(pc.remainingTime)}
              </div>

              {/* Time progress bar */}
              {pc.totalAssignedTime > 0 && (
                <div style={{ marginTop: '-4px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(pc.remainingTime / pc.totalAssignedTime) * 100}%`,
                      background: isTimeLow
                        ? 'var(--neon-red)'
                        : pc.status === 'Suspendida'
                        ? 'var(--neon-yellow)'
                        : 'linear-gradient(90deg, var(--neon-purple), var(--neon-cyan))',
                      borderRadius: '2px',
                      transition: 'width 1s linear',
                      boxShadow: isTimeLow ? '0 0 8px rgba(255,51,102,0.6)' : 'none',
                    }} />
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                IP: {pc.ipAddress} | Tarifa: ${(Number(pc.hourlyRate) || 0).toFixed(2)}/h
              </div>

              {/* Actions Box */}
              <div className="pc-card-footer">
                {pc.status === 'Disponible' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      setSelectedPC(pc);
                      setAssignStep('configure');
                      setShowAssignModal(true);
                    }}
                  >
                    <Play size={16} /> Asignar PC
                  </button>
                )}

                {pc.status === 'En Uso' && (
                  <>
                    <button className="btn btn-secondary" style={{ padding: '10px' }} title="Pausar Sesión" onClick={() => { pausePC(pc.id); toast.warning('Sesión Pausada', `${pc.id} en pausa temporal.`); }}>
                      <Pause size={16} />
                    </button>
                    <button 
                      className="btn btn-cyan" 
                      style={{ padding: '10px' }} 
                      title="Agregar Tiempo" 
                      onClick={() => {
                        setSelectedPC(pc);
                        setShowAddTimeModal(true);
                      }}
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '10px', border: '1px solid rgba(255,204,0,0.3)', color: 'var(--neon-yellow)' }} 
                      title="Extras / Consumo" 
                      onClick={() => {
                        setSelectedPC(pc);
                        setExtrasCart({});
                        setShowExtrasPayment(false);
                        setShowExtrasModal(true);
                      }}
                    >
                      <ShoppingBag size={16} />
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { releasePC(pc.id); toast.info('PC Liberada', `${pc.id} quedó disponible.`); }}>
                      <Square size={16} /> Liberar
                    </button>
                  </>
                )}

                {pc.status === 'Suspendida' && (
                  <>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { resumePC(pc.id); toast.success('Sesión Reanudada', `${pc.id} reanudó el tiempo.`); }}>
                      <Play size={16} /> Reanudar
                    </button>
                    <button className="btn btn-danger" style={{ padding: '10px' }} title="Liberar" onClick={() => { releasePC(pc.id); toast.info('PC Liberada', `${pc.id} quedó disponible.`); }}>
                      <Square size={16} />
                    </button>
                  </>
                )}

                {pc.status === 'Bloqueada' && (
                  <>
                    <button 
                      className="btn btn-cyan" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        setSelectedPC(pc);
                        setShowAddTimeModal(true);
                      }}
                    >
                      <Plus size={16} /> Desbloquear / Añadir
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={() => releasePC(pc.id)}>
                      Liberar PC
                    </button>
                  </>
                )}
              </div>
            </div>
          );
            })}
          </div>
        );
      })()}

      {/* ASSIGN PC MODAL — 2 STEPS */}
      {showAssignModal && selectedPC && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {assignStep === 'configure' ? (
                  <><Monitor size={20} style={{ color: 'var(--neon-purple)' }} /> Asignar {selectedPC.id}</>
                ) : (
                  <><CreditCard size={20} style={{ color: 'var(--neon-cyan)' }} /> Pago — {selectedPC.id}</>
                )}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setShowAssignModal(false); setAssignStep('configure'); }}>✕</button>
            </div>
            
            {/* STEP 1: Configure */}
            {assignStep === 'configure' && (
              <form onSubmit={handleGoToPayment}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nombre del Cliente</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Modo de Tiempo</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="durationMode" 
                          checked={durationMode === 'custom'} 
                          onChange={() => setDurationMode('custom')} 
                        />
                        Minutos Personalizados
                      </label>
                      <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="durationMode" 
                          checked={durationMode === 'plan'} 
                          onChange={() => setDurationMode('plan')} 
                        />
                        Planes de Juego
                      </label>
                    </div>
                  </div>

                  {durationMode === 'custom' ? (
                    <div className="form-group">
                      <label className="form-label">Minutos de Juego</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="5" 
                        step="5"
                        value={customMinutes || ''} 
                        onChange={e => setCustomMinutes(parseInt(e.target.value) || 0)} 
                        placeholder="Ingrese la cantidad"
                        required 
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mínimo 5 minutos.</span>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Seleccionar Plan</label>
                      <select 
                        className="form-select" 
                        value={selectedPlanId} 
                        onChange={e => setSelectedPlanId(e.target.value)} 
                        required
                      >
                        <option value="">-- Elige un Plan --</option>
                        {plans.filter(p => p.isActive).map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.durationMinutes} min) - ${plan.priceUsd.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Aplicar Oferta / Promoción</label>
                    <select 
                      className="form-select" 
                      value={selectedOfferId} 
                      onChange={e => setSelectedOfferId(e.target.value)}
                    >
                      <option value="">Sin Oferta (Tarifa Normal)</option>
                      {offers.filter(o => o.isActive).map(offer => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name} ({offer.discountPercentage}% Descuento)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Real-time Calculation Panel */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginTop: '20px' }}>
                    <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={14} style={{ color: 'var(--neon-cyan)' }} /> Detalle Contable (Tasa BCV: {bcvRate} Bs/$)
                    </h4>
                    {(() => {
                      const calc = getSelectedDetails();
                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Tiempo asignado:</span>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>{calc.minutes} min ({formatTime(calc.minutes * 60)})</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Precio base USD:</span>
                            <span style={{ color: 'white' }}>${calc.basePrice.toFixed(2)}</span>
                          </div>
                          {calc.discountPercent > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--neon-green)' }}>
                              <span>Descuento ({calc.discountPercent}%):</span>
                              <span>-${(calc.basePrice * (calc.discountPercent / 100)).toFixed(2)}</span>
                            </div>
                          )}
                          <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '8px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>Total a pagar ($):</span>
                            <span style={{ color: 'var(--neon-cyan)', fontSize: '1.2rem', fontWeight: 'bold' }}>${calc.finalPriceUsd.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total en bolívares:</span>
                            <span style={{ color: 'var(--neon-green)', fontSize: '1rem', fontWeight: 'bold' }}>{calc.finalPriceVes.toFixed(2)} Bs.</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <CreditCard size={16} /> Pagar
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Payment */}
            {assignStep === 'pay' && (
              <form onSubmit={handleFinalAssign}>
                <div className="modal-body">
                  {/* Summary */}
                  <div style={{ background: 'rgba(0,240,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.2)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monto a Pagar:</span>
                      <span style={{ color: 'var(--neon-cyan)', fontSize: '1.5rem', fontWeight: 'bold' }}>${getSelectedDetails().finalPriceUsd.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Equivalente VES:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{getSelectedDetails().finalPriceVes.toFixed(2)} Bs.</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Cliente: <strong style={{ color: 'white' }}>{clientName}</strong> • {getSelectedDetails().minutes} min
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Método de Pago</label>
                    <select 
                      className="form-select" 
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    >
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Efectivo $">Efectivo $</option>
                      <option value="Efectivo Bs.">Efectivo Bs.</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Punto de Venta">Punto de Venta</option>
                    </select>
                  </div>

                  {paymentMethod !== 'Efectivo $' && paymentMethod !== 'Efectivo Bs.' && (
                    <div className="form-group">
                      <label className="form-label">Referencia del Pago</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ej. #12345678"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Comprobante de Pago <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Opcional)</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      id="assign-receipt-upload"
                      style={{ display: 'none' }}
                      onChange={e => handleFileChange(e, setPaymentReceiptImageUrl)}
                    />
                    <label htmlFor="assign-receipt-upload" className="file-upload-trigger">
                      <Upload size={16} />
                      {paymentReceiptImageUrl ? '✅ Comprobante cargado — Click para cambiar' : '📎 Subir comprobante (imagen)'}
                    </label>
                    {paymentReceiptImageUrl && (
                      <div style={{ marginTop: '10px', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                        <img src={paymentReceiptImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={() => setPaymentReceiptImageUrl('')} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setAssignStep('configure')}>
                    Volver
                  </button>
                  <button type="submit" className="btn btn-green">
                    <Play size={16} /> Iniciar Juego
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD TIME MODAL */}
      {showAddTimeModal && selectedPC && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Agregar Tiempo a {selectedPC.id}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddTimeModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddTimeSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    PC seleccionada está {selectedPC.status === 'Bloqueada' ? 'bloqueada por falta de saldo' : 'activa actualmente'}.
                  </p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Minutos Adicionales</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="5" 
                    step="5"
                    value={addMinutes || ''} 
                    onChange={e => setAddMinutes(parseInt(e.target.value) || 0)} 
                    placeholder="Ingrese la cantidad"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select 
                    className="form-select"
                    value={addTimePaymentMethod}
                    onChange={e => setAddTimePaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo $">Efectivo $</option>
                    <option value="Efectivo Bs.">Efectivo Bs.</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Referencia del Pago</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. #12345678"
                    value={addTimeReference}
                    onChange={e => setAddTimeReference(e.target.value)}
                    required={addTimePaymentMethod !== 'Efectivo $'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Comprobante de Pago <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Opcional)</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    id="addtime-receipt-upload"
                    style={{ display: 'none' }}
                    onChange={e => handleFileChange(e, setAddTimeReceiptImageUrl)}
                  />
                  <label htmlFor="addtime-receipt-upload" className="file-upload-trigger">
                    <Upload size={16} />
                    {addTimeReceiptImageUrl ? '✅ Comprobante cargado — Click para cambiar' : '📎 Subir comprobante (imagen)'}
                  </label>
                  {addTimeReceiptImageUrl && (
                    <div style={{ marginTop: '10px', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                      <img src={addTimeReceiptImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => setAddTimeReceiptImageUrl('')} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                </div>

                {/* Real-time Calculation Panel */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginTop: '20px' }}>
                  <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '0.9rem' }}>Detalle del Cobro</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monto adicional USD:</span>
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>${((addMinutes / 60) * selectedPC.hourlyRate).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Equivalente en VES (Tasa {bcvRate}):</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{(((addMinutes / 60) * selectedPC.hourlyRate) * bcvRate).toFixed(2)} Bs.</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTimeModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-cyan">Agregar y Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTRAS MODAL */}
      {showExtrasModal && selectedPC && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} style={{ color: 'var(--neon-yellow)' }} />
                {showExtrasPayment ? 'Pago de Extras' : `Extras — ${selectedPC.id} (${selectedPC.clientName})`}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setShowExtrasModal(false); setShowExtrasPayment(false); setExtrasCart({}); }}>✕</button>
            </div>

            {!showExtrasPayment ? (
              <>
                <div className="modal-body">
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                    Selecciona los artículos que el cliente desea consumir. Se agregarán a su cuenta.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {inventory.filter(i => i.stock > 0).map(item => {
                      const qty = extrasCart[item.id] || 0;
                      return (
                        <div key={item.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: qty > 0 ? 'rgba(255,204,0,0.05)' : 'rgba(0,0,0,0.2)',
                          border: `1px solid ${qty > 0 ? 'rgba(255,204,0,0.2)' : 'var(--border-glass)'}`,
                          borderRadius: '8px', padding: '12px',
                          transition: 'var(--transition-fast)',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>{item.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              ${item.priceUsd.toFixed(2)} • Stock: {item.stock}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.9rem', width: '32px', height: '32px' }}
                              onClick={() => removeFromExtrasCart(item.id)}
                              disabled={qty <= 0}
                            >
                              −
                            </button>
                            <span style={{ color: qty > 0 ? 'var(--neon-yellow)' : 'var(--text-muted)', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.9rem', width: '32px', height: '32px' }}
                              onClick={() => addToExtrasCart(item.id)}
                              disabled={qty >= item.stock}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {inventory.filter(i => i.stock > 0).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No hay productos disponibles en inventario.</p>
                  )}

                  {/* Cart Total */}
                  {Object.keys(extrasCart).length > 0 && (
                    <div style={{ background: 'rgba(255,204,0,0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,204,0,0.2)', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>Total Extras:</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--neon-yellow)', fontSize: '1.3rem', fontWeight: 'bold' }}>${getExtrasTotal().toFixed(2)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(getExtrasTotal() * bcvRate).toFixed(2)} Bs.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowExtrasModal(false); setExtrasCart({}); }}>Cancelar</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={Object.keys(extrasCart).length === 0}
                    onClick={handleExtrasGoToPay}
                  >
                    <CreditCard size={16} /> Pagar Extras
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleExtrasPaySubmit}>
                <div className="modal-body">
                  {/* Extras Payment Summary */}
                  <div style={{ background: 'rgba(255,204,0,0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,204,0,0.2)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Extras:</span>
                      <span style={{ color: 'var(--neon-yellow)', fontSize: '1.5rem', fontWeight: 'bold' }}>${getExtrasTotal().toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Equivalente VES:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{(getExtrasTotal() * bcvRate).toFixed(2)} Bs.</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {Object.entries(extrasCart).map(([id, qty]) => {
                        const item = inventory.find(i => i.id === id);
                        return item ? <div key={id}>{item.name} x{qty} = ${(item.priceUsd * qty).toFixed(2)}</div> : null;
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Método de Pago</label>
                    <select
                      className="form-select"
                      value={extrasPaymentMethod}
                      onChange={e => setExtrasPaymentMethod(e.target.value as PaymentMethod)}
                    >
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Efectivo $">Efectivo $</option>
                      <option value="Efectivo Bs.">Efectivo Bs.</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Punto de Venta">Punto de Venta</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Referencia del Pago</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. #12345678"
                      value={extrasPaymentRef}
                      onChange={e => setExtrasPaymentRef(e.target.value)}
                      required={extrasPaymentMethod !== 'Efectivo $'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Comprobante de Pago <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Opcional)</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      id="extras-receipt-upload"
                      style={{ display: 'none' }}
                      onChange={e => handleFileChange(e, setExtrasPaymentReceiptImageUrl)}
                    />
                    <label htmlFor="extras-receipt-upload" className="file-upload-trigger">
                      <Upload size={16} />
                      {extrasPaymentReceiptImageUrl ? '✅ Comprobante cargado — Click para cambiar' : '📎 Subir comprobante (imagen)'}
                    </label>
                    {extrasPaymentReceiptImageUrl && (
                      <div style={{ marginTop: '10px', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                        <img src={extrasPaymentReceiptImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={() => setExtrasPaymentReceiptImageUrl('')} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowExtrasPayment(false)}>Volver</button>
                  <button type="submit" className="btn btn-green">
                    <ShoppingBag size={16} /> Confirmar Pago
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT PC MODAL */}
      {showAddEditPCModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={20} style={{ color: 'var(--neon-purple)' }} />
                {editingPC ? `Editar Equipo: ${editingPC.id}` : 'Registrar Nuevo Equipo'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddEditPCModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSavePC}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre / ID del Equipo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. PC-11 o PS5-03" 
                    value={pcName} 
                    onChange={e => setPcName(e.target.value)} 
                    required 
                    disabled={!!editingPC}
                  />
                  {!editingPC && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Este será el identificador principal del equipo.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección IP</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. 192.168.1.111" 
                    value={pcIpAddress} 
                    onChange={e => setPcIpAddress(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Consola</label>
                  <select 
                    className="form-select" 
                    value={pcConsoleTypeId} 
                    onChange={e => handleConsoleTypeChange(e.target.value)} 
                    required
                  >
                    <option value="">-- Elige Tipo de Consola --</option>
                    {consoleTypes.filter(c => c.isActive).map(ct => (
                      <option key={ct.id} value={ct.id}>
                        {ct.emoji} {ct.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tarifa por Hora ($ USD)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="0.1" 
                    step="0.01"
                    value={pcHourlyRate || ''} 
                    onChange={e => setPcHourlyRate(parseFloat(e.target.value) || 0)} 
                    placeholder="Ingrese la cantidad"
                    required 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Se pre-carga según el tipo de consola seleccionado.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Especificaciones / Detalles</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3} 
                    placeholder="Ej. RTX 4060, Intel i5, 16GB RAM"
                    value={pcDetails} 
                    onChange={e => setPcDetails(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditPCModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingPC ? 'Guardar Cambios' : 'Registrar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
