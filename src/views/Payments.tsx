import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { Payment, PaymentMethod } from '../context/AppStateContext';
import { useToast } from '../components/ToastNotification';
import { 
  DollarSign, Check, X, Printer, Clipboard, Calendar, Eye 
} from 'lucide-react';
// Import the generated receipt image
import receiptMockImg from '../assets/comprobante_banco.png';

export const Payments: React.FC = () => {
  const { 
    payments, registerPayment, validatePayment, rejectPayment, closeShift, 
    bcvRate, currentUser, pcs, consoleTypes
  } = useAppState();
  const { toast } = useToast();

  // Search/Filter states
  const [filterMethod, setFilterMethod] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPeriod, setFilterPeriod] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);

  // Manual payment form states
  const [amountUsd, setAmountUsd] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [receiptProvided, setReceiptProvided] = useState(false);
  const [customDetail, setCustomDetail] = useState('');

  // Close shift form states
  const [cashUsdInHand, setCashUsdInHand] = useState(0);
  const [cashVesInHand, setCashVesInHand] = useState(0);
  const [shiftNotes, setShiftNotes] = useState('');
  const [generatedClosingReport, setGeneratedClosingReport] = useState<any>(null);

  // Filter payments list
  const filteredPayments = payments.filter((p) => {
    const today = new Date().toDateString();
    const pDate = new Date(p.createdAt).toDateString();
    const pDateObj = new Date(p.createdAt);
    const now = new Date();
    
    // Encargado only sees today's payments
    if (currentUser?.role === 'Encargado' && pDate !== today) return false;
    
    // Operador only sees their own payments
    if (currentUser?.role === 'Operador' && p.operatorId !== currentUser.id) return false;

    // Period filter
    if (filterPeriod === 'Today' && pDate !== today) return false;
    if (filterPeriod === 'Week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      if (pDateObj < oneWeekAgo) return false;
    }
    if (filterPeriod === 'Month' && (pDateObj.getMonth() !== now.getMonth() || pDateObj.getFullYear() !== now.getFullYear())) return false;
    if (filterPeriod === 'Year' && pDateObj.getFullYear() !== now.getFullYear()) return false;

    // Method filter
    const matchesMethod = filterMethod === 'All' || p.paymentMethod === filterMethod;
    if (!matchesMethod) return false;

    // Status filter
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    if (!matchesStatus) return false;

    // Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesSearch = 
        p.operatorName.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q) || 
        (p.reference && p.reference.toLowerCase().includes(q)) || 
        (p.offerApplied && p.offerApplied.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Fecha y Hora', 'Concepto', 'ID Transaccion', 'Operador', 'Metodo', 'Monto USD', 'Monto VES', 'Tasa BCV', 'Estado', 'Referencia'];
    const rows = filteredPayments.map(p => [
      new Date(p.createdAt).toLocaleString('es-VE'),
      p.offerApplied || 'Cobro de Juego',
      p.id,
      p.operatorName,
      p.paymentMethod,
      p.amountUsd.toFixed(2),
      p.amountVes.toFixed(2),
      p.bcvRate.toFixed(2),
      p.status,
      p.reference || ''
    ]);
    
    // Create CSV content with correct header
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GZ_Movimientos_Caja_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exportado', 'El archivo ha sido descargado.');
  };

  // Export PDF (clean print view)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const todayStr = new Date().toLocaleString('es-VE');
    const totalUsd = filteredPayments.filter(p => p.status === 'Validado').reduce((sum, p) => sum + p.amountUsd, 0);
    const totalVes = filteredPayments.filter(p => p.status === 'Validado').reduce((sum, p) => sum + p.amountVes, 0);

    let rowsHtml = filteredPayments.map(p => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(p.createdAt).toLocaleDateString('es-VE')} ${new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>${p.offerApplied || 'Cobro de Juego'}</strong><br><small style="color: #666">ID: ${p.id}</small></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.operatorName}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.paymentMethod}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">$${p.amountUsd.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #666;">${p.amountVes.toFixed(2)} Bs.</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          <span style="
            display: inline-block;
            padding: 3px 8px;
            font-size: 0.75em;
            font-weight: bold;
            border-radius: 4px;
            background: ${p.status === 'Validado' ? '#e2fbe8' : p.status === 'Pendiente' ? '#fff3cd' : '#f8d7da'};
            color: ${p.status === 'Validado' ? '#155724' : p.status === 'Pendiente' ? '#856404' : '#721c24'};
          ">${p.status}</span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Caja - Game Zone</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 30px; line-height: 1.5; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #8a2be2; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-title { display: flex; align-items: center; gap: 10px; }
            .logo-box { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #8a2be2, #00f0ff); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; }
            .title { font-size: 1.8rem; font-weight: 800; color: #12082a; margin: 0; }
            .meta-info { font-size: 0.85rem; color: #666; text-align: right; }
            .filters-badge { background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; }
            .filters-badge strong { color: #8a2be2; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 0.9rem; }
            th, td { border: 1px solid #dee2e6; padding: 10px 12px; text-align: left; }
            th { background-color: #f8f9fa; color: #495057; font-weight: bold; }
            .totals-card { background: #f1f3f5; border-radius: 8px; padding: 15px; display: flex; justify-content: flex-end; gap: 30px; font-size: 1.1rem; font-weight: bold; }
            .totals-card div { text-align: right; }
            .totals-val { color: #8a2be2; font-size: 1.4rem; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-title">
              <div class="logo-box">🎮</div>
              <div>
                <h1 class="title">GAME ZONE</h1>
                <span style="font-size: 0.85rem; color: #8a2be2; font-weight: bold; letter-spacing: 0.05em;">REPORTE DE MOVIMIENTOS DE CAJA</span>
              </div>
            </div>
            <div class="meta-info">
              <p style="margin: 0;"><strong>Fecha Emisión:</strong> ${todayStr}</p>
              <p style="margin: 3px 0 0;"><strong>Generado por:</strong> ${currentUser?.fullName} (${currentUser?.role})</p>
            </div>
          </div>

          <div class="filters-badge">
            <strong>Filtros activos:</strong> Método: ${filterMethod} | Estado: ${filterStatus} | Período: ${filterPeriod} ${searchQuery ? `| Búsqueda: "${searchQuery}"` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Concepto / ID</th>
                <th>Operador</th>
                <th>Método</th>
                <th>Monto USD</th>
                <th>Monto VES</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center; color: #666;">No se encontraron registros coincidentes.</td></tr>'}
            </tbody>
          </table>

          <div class="totals-card">
            <div>
              <div style="font-size: 0.8rem; color: #666; font-weight: normal; margin-bottom: 2px;">TOTAL VES VALIDADOS</div>
              <div style="color: #2b8a3e; font-size: 1.2rem;">${totalVes.toFixed(2)} VES</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #666; font-weight: normal; margin-bottom: 2px;">TOTAL USD VALIDADOS</div>
              <div class="totals-val">$${totalUsd.toFixed(2)}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Reporte PDF listo', 'La ventana de impresión se ha abierto.');
  };

  // Get revenue summary per console type
  const getConsoleSummary = () => {
    const summary: Record<string, { name: string; emoji: string; amount: number; count: number }> = {};
    
    // Initialize with existing console types
    consoleTypes.forEach(ct => {
      summary[ct.id] = {
        name: ct.name,
        emoji: ct.emoji,
        amount: 0,
        count: 0
      };
    });
    
    // Add "Otros / Ventas" category
    summary['other'] = {
      name: 'Ventas e Inventario',
      emoji: '🛍️',
      amount: 0,
      count: 0
    };
    
    // Process filtered payments (excluding rejected ones)
    filteredPayments.forEach(pay => {
      if (pay.status === 'Rechazado') return;
      
      let assignedCtId = 'other';
      
      // Look for any PC ID in the offerApplied string dynamically (e.g. PC-01, PS5-02, Nintendo-03)
      const matchedPc = pcs.find(pc => pay.offerApplied && pay.offerApplied.toUpperCase().includes(pc.id.toUpperCase()));
      if (matchedPc && matchedPc.consoleTypeId) {
        assignedCtId = matchedPc.consoleTypeId;
      }
      
      if (summary[assignedCtId]) {
        summary[assignedCtId].amount += pay.amountUsd;
        summary[assignedCtId].count += 1;
      } else {
        summary['other'].amount += pay.amountUsd;
        summary['other'].count += 1;
      }
    });
    
    return Object.values(summary);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vesValue = amountUsd * bcvRate;
    registerPayment({
      amountUsd,
      amountVes: vesValue,
      bcvRate,
      paymentMethod,
      offerApplied: customDetail ? `Manual: ${customDetail}` : 'Cobro Manual',
      receiptImageUrl: receiptProvided ? receiptMockImg : undefined
    });

    toast.success('Cobro Registrado', `$${amountUsd.toFixed(2)} via ${paymentMethod}`);

    setShowRegisterModal(false);
    setAmountUsd(0);
    setCustomDetail('');
    setReceiptProvided(false);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const report = closeShift({
        cashUsd: cashUsdInHand,
        cashVes: cashVesInHand,
        notes: shiftNotes
      });
      setGeneratedClosingReport(report);
      setCashUsdInHand(0);
      setCashVesInHand(0);
      setShiftNotes('');
      toast.success('✅ Caja Cerrada', `Turno finalizado. Total: $${report.totalUsdGenerated.toFixed(2)}`);
    } catch (err) {
      toast.error('Error al cerrar caja', String(err));
    }
  };

  const triggerPrintDailyReport = () => {
    const todayStr = new Date().toLocaleDateString('es-VE');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Filter today's validated payments for print
    const todayPayments = payments.filter(p => {
      const pDate = new Date(p.createdAt).toDateString();
      return pDate === new Date().toDateString() && p.status === 'Validado';
    });

    const sumUsd = todayPayments.reduce((sum, p) => sum + p.amountUsd, 0);
    const sumVes = todayPayments.reduce((sum, p) => sum + p.amountVes, 0);

    let rowsHtml = todayPayments.map(p => `
      <tr>
        <td>${new Date(p.createdAt).toLocaleTimeString()}</td>
        <td>${p.operatorName}</td>
        <td>${p.paymentMethod}</td>
        <td>$${p.amountUsd.toFixed(2)}</td>
        <td>${p.amountVes.toFixed(2)} Bs.</td>
        <td>${p.bcvRate.toFixed(2)}</td>
        <td>${p.offerApplied || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte Diario de Caja - ${todayStr}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; }
            h1 { color: #8a2be2; border-bottom: 2px solid #8a2be2; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { margin-top: 20px; font-size: 1.1em; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>GAME ZONE - REPORTE DE PAGOS DIARIO (${todayStr})</h1>
          <p>Generado por: ${currentUser?.fullName} (${currentUser?.role})</p>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Operador</th>
                <th>Método</th>
                <th>Monto USD</th>
                <th>Monto VES</th>
                <th>Tasa BCV</th>
                <th>Concepto</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">No hay pagos validados el día de hoy</td></tr>'}
            </tbody>
          </table>
          <div class="totals">
            <p>Total USD Validados: $${sumUsd.toFixed(2)}</p>
            <p>Total VES Validados: ${sumVes.toFixed(2)} Bs.</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printReceiptSlip = (closing: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Corte de Caja</title>
          <style>
            body { font-family: 'Courier New', monospace; width: 300px; padding: 10px; font-size: 0.85em; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>*** GAME ZONE ***</h3>
            <p>COMPROBANTE DE CIERRE DE CAJA</p>
          </div>
          <div class="line"></div>
          <p><strong>Cierre ID:</strong> ${closing.id.substring(0, 12)}...</p>
          <p><strong>Operador:</strong> ${closing.operatorName}</p>
          <p><strong>Fecha Cierre:</strong> ${new Date(closing.createdAt).toLocaleString()}</p>
          <div class="line"></div>
          <div class="flex"><span>Transacciones:</span> <span>${closing.details.paymentsCount}</span></div>
          <div class="flex"><span>Minutos Juegos:</span> <span>${closing.totalTimeMinutes} min</span></div>
          <div class="line"></div>
          <div class="flex"><strong>Total USD ($):</strong> <strong>$${closing.totalUsdGenerated.toFixed(2)}</strong></div>
          <div class="flex"><strong>Total VES (Bs.):</strong> <strong>${closing.totalVesGenerated.toFixed(2)} Bs</strong></div>
          <div class="line"></div>
          <div class="flex"><span>Efectivo USD:</span> <span>$${closing.details.cashUsd.toFixed(2)}</span></div>
          <div class="flex"><span>Efectivo Bs.:</span> <span>${closing.details.cashVes.toFixed(2)} Bs.</span></div>
          <div class="flex"><span>Pago Movil Bs.:</span> <span>${closing.details.pagoMovilVes.toFixed(2)} Bs.</span></div>
          <div class="flex"><span>Punto Venta Bs.:</span> <span>${closing.details.posVes.toFixed(2)} Bs.</span></div>
          <div class="line"></div>
          <p class="center">GRACIAS POR SU JORNADA</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setGeneratedClosingReport(null);
    setShowClosingModal(false);
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Registro de Caja</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {currentUser?.role === 'Admin' ? 'Consolidación de transacciones y validación de cobros' : 
             currentUser?.role === 'Encargado' ? 'Reporte diario de transacciones gamer' : 'Tus cobros registrados'}
          </p>
        </div>
        
        {/* Actions header depending on roles */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentUser?.role === 'Encargado' && (
            <button className="btn btn-primary" onClick={triggerPrintDailyReport}>
              <Printer size={16} /> Imprimir Reporte Diario
            </button>
          )}

          {currentUser?.role === 'Operador' && (
            <>
              <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
                <DollarSign size={16} /> Cobro Manual (Venta/Otros)
              </button>
              <button className="btn btn-danger" onClick={() => setShowClosingModal(true)}>
                <Clipboard size={16} /> Cerrar Caja / Turno
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resumen por Consola */}
      {currentUser?.role !== 'Operador' && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '1.1rem' }}>Resumen por Consola / Categoría</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {getConsoleSummary().map((item) => (
              <div key={item.name} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.name}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                    ${item.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {item.count} transacciones
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and table content */}
      <div className="glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--neon-purple)' }} /> 
              {currentUser?.role === 'Encargado' ? 'Pagos del Día (Solo Lectura)' : 'Historial de Pagos'}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={handleExportCSV} disabled={filteredPayments.length === 0} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                Exportar CSV
              </button>
              <button className="btn btn-primary" onClick={handleExportPDF} disabled={filteredPayments.length === 0} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                Descargar PDF
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar por concepto, ref, operador..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px' }}
              />
            </div>

            {currentUser?.role !== 'Encargado' && (
              <div className="form-group" style={{ margin: 0 }}>
                <select 
                  className="form-select" 
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="All">Todos los períodos</option>
                  <option value="Today">Hoy</option>
                  <option value="Week">Últimos 7 días</option>
                  <option value="Month">Este Mes</option>
                  <option value="Year">Este Año</option>
                </select>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <select 
                className="form-select" 
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="All">Todos los métodos</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Efectivo $">Efectivo $</option>
                <option value="Efectivo Bs.">Efectivo Bs.</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Punto de Venta">Punto de Venta</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <select 
                className="form-select" 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="All">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Validado">Validado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Concepto / Oferta</th>
                <th>Operador</th>
                <th>Método</th>
                <th>Monto USD</th>
                <th>Monto VES</th>
                <th>Tasa BCV</th>
                <th>Estado</th>
                {currentUser?.role === 'Admin' && <th style={{ textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role === 'Admin' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    No se encontraron transacciones registradas.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => (
                  <tr key={pay.id}>
                    <td>
                      <div>{new Date(pay.createdAt).toLocaleDateString('es-VE')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(pay.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{pay.offerApplied || 'Cobro de Juego'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {pay.id}</div>
                    </td>
                    <td>{pay.operatorName}</td>
                    <td>
                      <span className="badge badge-secondary">{pay.paymentMethod}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: 'white' }}>${pay.amountUsd.toFixed(2)}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{pay.amountVes.toFixed(2)} Bs.</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{pay.bcvRate.toFixed(2)} Bs/$</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        pay.status === 'Validado' ? 'badge-green' : 
                        pay.status === 'Pendiente' ? 'badge-yellow' : 'badge-red'
                      }`}>
                        {pay.status}
                      </span>
                      {pay.receiptImageUrl && (
                        <button 
                          onClick={() => setActiveReceiptPayment(pay)}
                          style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', marginLeft: '8px', cursor: 'pointer', padding: '2px' }}
                          title="Ver Comprobante"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </td>
                    {currentUser?.role === 'Admin' && (
                      <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {pay.status === 'Pendiente' ? (
                          <>
                            <button 
                              className="btn btn-green" 
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                              onClick={() => { validatePayment(pay.id); toast.success('✅ Pago Validado', `$${pay.amountUsd.toFixed(2)} confirmado.`); }}
                            >
                              <Check size={12} /> Validar
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                              onClick={() => { rejectPayment(pay.id); toast.error('❌ Pago Rechazado', `$${pay.amountUsd.toFixed(2)} fue rechazado.`); }}
                            >
                              <X size={12} /> Rechazar
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {pay.status === 'Validado' ? `Validado por ${pay.validatorName?.split(' ')[0]}` : 'Rechazado'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COBRO MANUAL MODAL */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Registrar Cobro Manual</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegisterPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Monto en Dólares (USD)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="0.1" 
                    step="0.01" 
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select 
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo $">Efectivo $</option>
                    <option value="Efectivo Bs.">Efectivo Bs.</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Concepto / Detalle de Cobro</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Venta de Doritos + Agua, Alquiler Auriculares" 
                    value={customDetail}
                    onChange={(e) => setCustomDetail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', marginTop: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={receiptProvided} 
                      onChange={(e) => setReceiptProvided(e.target.checked)} 
                    />
                    Adjuntar captura de comprobante bancario (Simulado)
                  </label>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monto en VES (Tasa {bcvRate}):</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{(amountUsd * bcvRate).toFixed(2)} Bs.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPROBANTE VISOR MODAL (Admin zoom) */}
      {activeReceiptPayment && (
        <div className="modal-overlay" onClick={() => setActiveReceiptPayment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Ver Comprobante Digital</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setActiveReceiptPayment(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div className="comprobante-visor-container">
                <div className="comprobante-frame">
                  <img src={activeReceiptPayment.receiptImageUrl} className="comprobante-img" alt="Comprobante Bancario" />
                </div>
                <div style={{ width: '100%', fontSize: '0.85rem' }}>
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>ID Transacción:</strong> {activeReceiptPayment.id}</p>
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>Monto:</strong> ${activeReceiptPayment.amountUsd.toFixed(2)} ({activeReceiptPayment.amountVes.toFixed(2)} Bs.)</p>
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>Operador:</strong> {activeReceiptPayment.operatorName}</p>
                  <p style={{ color: 'white' }}><strong>Fecha:</strong> {new Date(activeReceiptPayment.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
            {currentUser?.role === 'Admin' && activeReceiptPayment.status === 'Pendiente' && (
              <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button 
                  className="btn btn-green" 
                  onClick={() => {
                    validatePayment(activeReceiptPayment.id);
                    setActiveReceiptPayment(null);
                  }}
                >
                  <Check size={14} /> Validar Pago
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => {
                    rejectPayment(activeReceiptPayment.id);
                    setActiveReceiptPayment(null);
                  }}
                >
                  <X size={14} /> Rechazar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CIERRE DE CAJA MODAL (Operador Cerrar Caja) */}
      {showClosingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Cierre de Caja del Turno</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowClosingModal(false)}>✕</button>
            </div>
            
            {!generatedClosingReport ? (
              <form onSubmit={handleCloseShift}>
                <div className="modal-body">
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                    Al cerrar la caja se consolidarán todos los pagos registrados por ti el día de hoy. Por favor ingresa el conteo físico del dinero en caja:
                  </p>
                  
                  <div className="form-group">
                    <label className="form-label">Efectivo en Caja ($ USD)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0" 
                      step="0.01"
                      value={cashUsdInHand} 
                      onChange={e => setCashUsdInHand(parseFloat(e.target.value) || 0)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Efectivo en Caja (Bs. VES)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0" 
                      step="0.01"
                      value={cashVesInHand} 
                      onChange={e => setCashVesInHand(parseFloat(e.target.value) || 0)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas / Observaciones de Cierre</label>
                    <textarea 
                      className="form-textarea" 
                      rows={3} 
                      placeholder="Indica si hubo alguna discrepancia o reporte de PC"
                      value={shiftNotes} 
                      onChange={e => setShiftNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowClosingModal(false)}>Volver</button>
                  <button type="submit" className="btn btn-danger">Confirmar Cierre de Caja</button>
                </div>
              </form>
            ) : (
              <div className="modal-body" style={{ textAlign: 'center', padding: '24px' }}>
                <Check size={48} style={{ color: 'var(--neon-green)', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'white', marginBottom: '8px' }}>¡Caja Cerrada con Éxito!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>El reporte financiero consolidado ha sido registrado exitosamente para revisión del Administrador.</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => printReceiptSlip(generatedClosingReport)}>
                    <Printer size={16} /> Imprimir Comprobante de Corte
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setGeneratedClosingReport(null); setShowClosingModal(false); }}>
                    Cerrar Ventana
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
