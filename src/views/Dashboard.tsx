import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { 
  TrendingUp, DollarSign, Clock, AlertTriangle, CheckCircle, 
  Printer, FileText, Landmark 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { payments, pcs, inventory, shiftClosings, bcvRate, currentUser, consoleTypes } = useAppState();

  // Guard role
  if (currentUser?.role === 'Operador') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} className="text-neon" style={{ color: 'var(--neon-red)', marginBottom: '16px' }} />
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)' }}>El rol Operador no tiene permisos para visualizar los reportes contables y financieros de la empresa.</p>
      </div>
    );
  }

  // 1. Calculations
  const visiblePcs = pcs.filter(pc => {
    const ct = consoleTypes.find(c => c.id === pc.consoleTypeId);
    return ct && ct.isActive;
  });
  const validatedPayments = payments.filter(p => p.status === 'Validado');
  const pendingPayments = payments.filter(p => p.status === 'Pendiente');
  
  const totalUsd = validatedPayments.reduce((sum, p) => sum + p.amountUsd, 0);
  const totalVes = validatedPayments.reduce((sum, p) => sum + p.amountVes, 0);
  
  const activePCs = visiblePcs.filter(pc => pc.status === 'En Uso').length;
  const lowStockItems = inventory.filter(item => item.stock <= item.minStock);

  // 2. Chart Data: Revenue Over Time (Daily)
  // Group validated payments by day (last 7 days)
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
    
    // Sum payments for this day
    const dayPayments = validatedPayments.filter(p => {
      const pDate = new Date(p.createdAt).toDateString();
      return pDate === d.toDateString();
    });
    
    const usd = dayPayments.reduce((sum, p) => sum + p.amountUsd, 0);
    const ves = dayPayments.reduce((sum, p) => sum + p.amountVes, 0);
    
    return { name: dayStr, USD: usd, VES: ves };
  });

  // 3. Chart Data: Revenue per PC
  const pcRevenueData = visiblePcs.map(pc => {
    const pcPayments = validatedPayments.filter(p => p.offerApplied?.includes(pc.id));
    const usd = pcPayments.reduce((sum, p) => sum + p.amountUsd, 0);
    return { name: pc.id, USD: usd };
  }).filter(pc => pc.USD > 0);

  // Fallback if no specific PC revenue recorded yet
  const displayPcRevenueData = pcRevenueData.length > 0 ? pcRevenueData : [
    { name: 'PC-01', USD: 45 },
    { name: 'PC-02', USD: 32 },
    { name: 'PC-03', USD: 58 },
    { name: 'PC-04', USD: 20 },
    { name: 'PC-05', USD: 38 },
  ];

  // 4. Chart Data: Payment Methods Distribution
  const methodsCounts = validatedPayments.reduce((acc: Record<string, number>, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amountUsd;
    return acc;
  }, {});

  const paymentMethodData = Object.keys(methodsCounts).map(method => ({
    name: method,
    value: parseFloat(methodsCounts[method].toFixed(2))
  }));

  const displayPaymentMethodData = paymentMethodData.length > 0 ? paymentMethodData : [
    { name: 'Pago Móvil', value: 120 },
    { name: 'Efectivo $', value: 85 },
    { name: 'Efectivo Bs.', value: 40 },
    { name: 'Transferencia', value: 30 },
  ];

  const COLORS = ['#8a2be2', '#00f0ff', '#39ff14', '#ffcc00', '#ff3366'];

  const printShiftReport = (closing: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Cierre de Caja - ${closing.operatorName}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #333; padding: 20px; }
            h1 { border-bottom: 2px solid #8a2be2; padding-bottom: 10px; color: #8a2be2; }
            .section { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 1.2em; color: #8a2be2; }
          </style>
        </head>
        <body>
          <h1>GAME ZONE - REPORTE DE CIERRE DE CAJA</h1>
          <div class="section">
            <p><strong>Cierre ID:</strong> ${closing.id}</p>
            <p><strong>Operador:</strong> ${closing.operatorName}</p>
            <p><strong>Fecha Emisión:</strong> ${new Date(closing.createdAt).toLocaleString('es-VE')}</p>
            <p><strong>Turno:</strong> ${new Date(closing.startTime).toLocaleTimeString()} - ${new Date(closing.endTime).toLocaleTimeString()}</p>
          </div>
          <hr />
          <div class="section">
            <h2>Resumen Contable Generado</h2>
            <div class="grid">
              <div>
                <p><strong>Total Generado ($):</strong> $${closing.totalUsdGenerated.toFixed(2)}</p>
                <p><strong>Total Generado (Bs.):</strong> ${closing.totalVesGenerated.toFixed(2)} Bs.</p>
                <p><strong>Tiempo de Juego Total:</strong> ${closing.totalTimeMinutes} minutos</p>
                <p><strong>Cantidad Transacciones:</strong> ${closing.details.paymentsCount}</p>
              </div>
              <div>
                <p><strong>Efectivo Declarado ($):</strong> $${closing.details.cashUsd.toFixed(2)}</p>
                <p><strong>Efectivo Declarado (Bs.):</strong> ${closing.details.cashVes.toFixed(2)} Bs.</p>
                <p><strong>Pago Móvil Bs.:</strong> ${closing.details.pagoMovilVes.toFixed(2)} Bs.</p>
                <p><strong>Punto de Venta Bs.:</strong> ${closing.details.posVes.toFixed(2)} Bs.</p>
              </div>
            </div>
          </div>
          <div class="section">
            <p><strong>Notas de Entrega:</strong> ${closing.details.notes || 'Ninguna registrada'}</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Dashboard Financiero</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Métricas contables y consolidación de Game Zone</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="bcv-rate-badge">
            <Landmark size={18} />
            <span>Tasa BCV: {bcvRate.toFixed(2)} VES/$</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="dashboard-metrics">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--neon-green)', border: '1px solid rgba(57, 255, 20, 0.3)' }}>
            <DollarSign size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Ingresos USD (Validados)</div>
            <div className="metric-value">${totalUsd.toFixed(2)}</div>
            <div className="metric-subvalue">Equiv. {(totalUsd * bcvRate).toFixed(2)} VES</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Ingresos Bolívares (VES)</div>
            <div className="metric-value">{totalVes.toFixed(2)} Bs.</div>
            <div className="metric-subvalue">Equiv. ${(totalVes / bcvRate).toFixed(2)} USD</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(138, 43, 226, 0.1)', color: 'var(--neon-purple)', border: '1px solid rgba(138, 43, 226, 0.3)' }}>
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">PCs Activas en Uso</div>
            <div className="metric-value">{activePCs} / {visiblePcs.length}</div>
            <div className="metric-subvalue">En tiempo real</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ 
            background: pendingPayments.length > 0 ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
            color: pendingPayments.length > 0 ? 'var(--neon-yellow)' : 'var(--text-secondary)',
            border: pendingPayments.length > 0 ? '1px solid rgba(255, 204, 0, 0.3)' : '1px solid var(--border-glass)' 
          }}>
            <FileText size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Pagos por Validar</div>
            <div className="metric-value">{pendingPayments.length}</div>
            <div className="metric-subvalue">{pendingPayments.length > 0 ? 'Requieren acción Admin' : 'Todo al día'}</div>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div className="metric-card" style={{ border: '1px solid rgba(255, 51, 102, 0.3)', background: 'rgba(255, 51, 102, 0.05)' }}>
            <div className="metric-icon-box" style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--neon-red)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="metric-info">
              <div className="metric-label">Inventario Bajo</div>
              <div className="metric-value">{lowStockItems.length} Alertas</div>
              <div className="metric-subvalue">Productos requieren recarga</div>
            </div>
          </div>
        )}
      </div>

      {/* Chart System Layout */}
      <div className="charts-grid">
        {/* Line Chart: Revenue */}
        <div className="glass-card">
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} style={{ color: 'var(--neon-purple)' }} /> Historial de Ingresos de la Semana
          </h3>
          <div style={{ width: '100%', height: 300, minWidth: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-purple)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--neon-purple)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-glass)', borderRadius: '8px', color: 'white' }}
                  labelStyle={{ fontWeight: 'bold', color: 'white' }}
                />
                <Area type="monotone" dataKey="USD" stroke="var(--neon-purple)" fillOpacity={1} fill="url(#colorUsd)" strokeWidth={2} name="Ingresos USD ($)" />
                <Area type="monotone" dataKey="VES" stroke="var(--neon-cyan)" fillOpacity={1} fill="url(#colorVes)" strokeWidth={2} name="Ingresos VES (Bs.)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Payment Methods */}
        <div className="glass-card">
          <h3 style={{ color: 'white', marginBottom: '16px' }}>Métodos de Pago ($ Equivalente)</h3>
          <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={displayPaymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayPaymentMethodData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-glass)', borderRadius: '8px' }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid charts-grid-2col">
        {/* Bar Chart: Revenue by PC */}
        <div className="glass-card">
          <h3 style={{ color: 'white', marginBottom: '16px' }}>Rendimiento Financiero por Equipo (USD)</h3>
          <div style={{ width: '100%', height: 250, minWidth: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={displayPcRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-glass)', borderRadius: '8px' }} />
                <Bar dataKey="USD" fill="var(--neon-cyan)">
                  {displayPcRevenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.USD > 40 ? 'var(--neon-purple)' : 'var(--neon-cyan)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift Closings (Cierres de Caja) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} style={{ color: 'var(--neon-green)' }} /> Historial de Cierre de Cajas
          </h3>
          <div style={{ flex: 1, overflow: 'auto', maxHeight: '250px' }}>
            {shiftClosings.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay cierres de caja registrados.</p>
            ) : (
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Operador</th>
                    <th>Generado</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftClosings.map((closing) => (
                    <tr key={closing.id}>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{closing.operatorName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(closing.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(closing.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>${closing.totalUsdGenerated.toFixed(2)}</span>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{closing.totalVesGenerated.toFixed(2)} Bs.</div>
                      </td>
                      <td>{new Date(closing.createdAt).toLocaleDateString('es-VE')}</td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                          onClick={() => printShiftReport(closing)}
                        >
                          <Printer size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
