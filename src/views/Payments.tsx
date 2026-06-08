import React, { useState, useMemo } from 'react';
import { apiUrl } from '../lib/api';
import { useAppState } from '../context/AppStateContext';
import type { Payment, PaymentMethod, ShiftClosing } from '../context/AppStateContext';
import { useToast } from '../components/ToastNotification';
import { 
  DollarSign, Check, X, Printer, Clipboard, Eye, Receipt, History, Archive, Filter, FileText, Download, User
} from 'lucide-react';

type PaymentsTab = 'active' | 'revision' | 'historial' | 'cierres';

export const Payments: React.FC = () => {
  const { 
    payments, registerPayment, validatePayment, rejectPayment, closeShift, 
    bcvRate, currentUser, pcs, consoleTypes, users, shiftClosings
  } = useAppState();
  const { toast } = useToast();

  // ─────────────────────────────────────────
  // TAB STATE
  // ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PaymentsTab>('active');

  // ─────────────────────────────────────────
  // FILTER STATES
  // ─────────────────────────────────────────
  const [filterMethod, setFilterMethod] = useState<string>('All');
  const [filterPeriod, setFilterPeriod] = useState<string>('All');
  const [filterOperator, setFilterOperator] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ─────────────────────────────────────────
  // MODAL STATES
  // ─────────────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showClosingConfirmModal, setShowClosingConfirmModal] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string>('');
  const [viewingShiftClosing, setViewingShiftClosing] = useState<ShiftClosing | null>(null);

  // ─────────────────────────────────────────
  // MANUAL PAYMENT FORM STATES
  // ─────────────────────────────────────────
  const [amountUsd, setAmountUsd] = useState<number>(0);
  const [amountVes, setAmountVes] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [manualPaymentRef, setManualPaymentRef] = useState('');
  const [manualPaymentReceiptImageUrl, setManualPaymentReceiptImageUrl] = useState('');
  const [customDetail, setCustomDetail] = useState('');

  // ─────────────────────────────────────────
  // CLOSE SHIFT STATES
  // ─────────────────────────────────────────
  const [shiftNotes, setShiftNotes] = useState('');
  const [generatedClosingReport, setGeneratedClosingReport] = useState<any>(null);

  const closeReceiptModal = () => {
    setActiveReceiptPayment(null);
    setActiveReceiptUrl('');
  };

  // ─────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────
  const base64ToBlobUrl = (base64Data: string | undefined) => {
    if (!base64Data) return '';
    if (!base64Data.startsWith('data:')) return base64Data;
    try {
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Error converting base64 to blob url:", e);
      return base64Data;
    }
  };

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

  const applyPeriodFilter = (pDateObj: Date) => {
    const now = new Date();
    if (filterPeriod === 'Today') {
      return pDateObj.toDateString() === now.toDateString();
    }
    if (filterPeriod === 'Week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return pDateObj >= oneWeekAgo;
    }
    if (filterPeriod === 'Month') {
      return pDateObj.getMonth() === now.getMonth() && pDateObj.getFullYear() === now.getFullYear();
    }
    if (filterPeriod === 'Year') {
      return pDateObj.getFullYear() === now.getFullYear();
    }
    return true; // 'All'
  };

  // ─────────────────────────────────────────
  // FILTERED DATA (memoized)
  // ─────────────────────────────────────────
  const baseFilteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const today = new Date().toDateString();
      const pDate = new Date(p.createdAt).toDateString();
      const pDateObj = new Date(p.createdAt);
      // If it's Pendiente or Revision, we ALWAYS want to see it regardless of date (unless filtered by search/operator)
      // This prevents "Caja Activa" and "En Revisión" items from disappearing across midnight.
      const isActiveOrRevision = p.status === 'Pendiente' || p.status === 'Revision';

      if (!isActiveOrRevision) {
        // Encargado only sees today's history payments
        if (currentUser?.role === 'Encargado' && pDate !== today) return false;
        if (!applyPeriodFilter(pDateObj)) return false;
      }

      // Operador and Encargado only see their own active/revision payments
      if (currentUser?.role !== 'Admin' && isActiveOrRevision && p.operatorId !== currentUser?.id) {
        return false;
      }

      // Operador only sees their own historical payments too
      if (currentUser?.role === 'Operador' && !isActiveOrRevision && p.operatorId !== currentUser.id) {
        return false;
      }

      if (filterMethod !== 'All' && p.paymentMethod !== filterMethod) return false;
      if (filterOperator !== 'All' && p.operatorId !== filterOperator) return false;

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
  }, [payments, filterPeriod, filterMethod, filterOperator, searchQuery, currentUser]);

  // Tab-specific payment lists
  const activePayments = useMemo(() => {
    return baseFilteredPayments.filter(p => 
      p.status === 'Pendiente' || 
      (currentUser?.role === 'Admin' && p.status === 'Revision')
    );
  }, [baseFilteredPayments, currentUser]);

  const revisionPayments = useMemo(() => {
    return baseFilteredPayments.filter(p => p.status === 'Revision');
  }, [baseFilteredPayments]);

  const historialPayments = useMemo(() => {
    return baseFilteredPayments.filter(p => p.status !== 'Pendiente' && p.status !== 'Revision');
  }, [baseFilteredPayments]);

  // Block shift closing logic
  const lastShiftClosing = useMemo(() => {
    if (!currentUser) return null;
    const userClosings = shiftClosings.filter(sc => sc.operatorId === currentUser.id);
    if (userClosings.length === 0) return null;
    return userClosings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [shiftClosings, currentUser]);

  const isShiftClosingBlocked = useMemo(() => {
    if (!lastShiftClosing) return false;
    const lastClosingTime = new Date(lastShiftClosing.createdAt).getTime();
    const now = new Date().getTime();
    const hoursSinceLastClosing = (now - lastClosingTime) / (1000 * 60 * 60);
    return hoursSinceLastClosing < 5;
  }, [lastShiftClosing]);

  // Filtered shift closings
  const filteredShiftClosings = useMemo(() => {
    return shiftClosings.filter(sc => {
      const scDateObj = new Date(sc.createdAt);
      if (!applyPeriodFilter(scDateObj)) return false;
      if (filterOperator !== 'All' && sc.operatorId !== filterOperator) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [shiftClosings, filterPeriod, filterOperator]);

  // ─────────────────────────────────────────
  // GET OPERATOR LIST (for filter)
  // ─────────────────────────────────────────
  const operatorList = useMemo(() => {
    return users.filter(u => u.role === 'Operador' || u.role === 'Encargado');
  }, [users]);

  // ─────────────────────────────────────────
  // REVENUE SUMMARY BY CONSOLE
  // ─────────────────────────────────────────
  const getConsoleSummary = () => {
    const summary: Record<string, { name: string; emoji: string; amount: number; count: number }> = {};
    consoleTypes.forEach(ct => {
      summary[ct.id] = { name: ct.name, emoji: ct.emoji, amount: 0, count: 0 };
    });
    summary['other'] = { name: 'Ventas e Inventario', emoji: '🛍️', amount: 0, count: 0 };
    baseFilteredPayments.forEach(pay => {
      if (pay.status === 'Rechazado') return;
      let assignedCtId = 'other';

      // Check if it's an Extra or Inventory Sale
      const isExtraOrInventory = pay.offerApplied && (pay.offerApplied.startsWith('Extras') || pay.offerApplied.startsWith('Venta Inventario'));
      
      if (!isExtraOrInventory) {
        const matchedPc = pcs.find(pc => pay.offerApplied && pay.offerApplied.toUpperCase().includes(pc.id.toUpperCase()));
        if (matchedPc && matchedPc.consoleTypeId) assignedCtId = matchedPc.consoleTypeId;
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

  // ─────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────
  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    registerPayment({
      amountUsd,
      amountVes,
      bcvRate,
      paymentMethod,
      offerApplied: customDetail ? `Manual: ${customDetail}` : 'Cobro Manual',
      reference: manualPaymentRef || undefined,
      receiptImageUrl: manualPaymentReceiptImageUrl || undefined
    });
    toast.success('Cobro Registrado', `$${amountUsd.toFixed(2)} (${amountVes.toFixed(2)} Bs.) via ${paymentMethod}`);
    setShowRegisterModal(false);
    setAmountUsd(0);
    setAmountVes(0);
    setCustomDetail('');
    setManualPaymentRef('');
    setManualPaymentReceiptImageUrl('');
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const report = await closeShift({ notes: shiftNotes });
      if (report) {
        setGeneratedClosingReport(report);
        setShiftNotes('');
        setShowClosingModal(false);
        toast.success('✅ Caja Cerrada', `Turno finalizado. Total: $${report.totalUsdGenerated.toFixed(2)}`);
      } else {
        toast.error('Error al cerrar caja', 'No se pudo generar el reporte del servidor.');
      }
    } catch (err) {
      toast.error('Error al cerrar caja', String(err));
    }
  };

  // ─────────────────────────────────────────
  // EXPORT FUNCTIONS
  // ─────────────────────────────────────────
  const handleExportCSV = (list: Payment[]) => {
    const headers = ['Fecha y Hora', 'Concepto', 'ID Transaccion', 'Operador', 'Metodo', 'Monto USD', 'Monto VES', 'Tasa BCV', 'Estado', 'Referencia'];
    const rows = list.map(p => [
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
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GZ_Reporte_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exportado', 'El archivo ha sido descargado.');
  };

  const handleExportPDF = (list: Payment[], title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const todayStr = new Date().toLocaleString('es-VE');
    const totalUsd = list.filter(p => p.status === 'Validado').reduce((sum, p) => sum + p.amountUsd, 0);
    const totalVes = list.filter(p => p.status === 'Validado').reduce((sum, p) => sum + p.amountVes, 0);

    let rowsHtml = list.map(p => `
      <tr>
        <td>${new Date(p.createdAt).toLocaleDateString('es-VE')} ${new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td><strong>${p.offerApplied || 'Cobro de Juego'}</strong><br><small>ID: ${p.id}</small>${p.reference ? `<br><small><strong>Ref:</strong> ${p.reference}</small>` : ''}</td>
        <td>${p.operatorName}</td>
        <td>${p.paymentMethod}</td>
        <td><strong>$${p.amountUsd.toFixed(2)}</strong></td>
        <td>${p.amountVes.toFixed(2)} Bs.</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:0.75em;background:${p.status === 'Validado' ? '#e2fbe8' : p.status === 'Pendiente' ? '#fff3cd' : '#f8d7da'};color:${p.status === 'Validado' ? '#155724' : p.status === 'Pendiente' ? '#856404' : '#721c24'}">${p.status}</span></td>
      </tr>
    `).join('');

    const filterSummary = `Período: ${filterPeriod} | Método: ${filterMethod} | Operador: ${filterOperator !== 'All' ? (operatorList.find(u => u.id === filterOperator)?.fullName || filterOperator) : 'Todos'} ${searchQuery ? `| Búsqueda: "${searchQuery}"` : ''}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - Game Zone</title>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; color: #333; padding: 30px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #8a2be2; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-box { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #8a2be2, #00f0ff); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
            h1 { font-size: 1.8rem; font-weight: 800; color: #12082a; margin: 0; }
            .meta { font-size: 0.85rem; color: #666; text-align: right; }
            .filters { background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 0.9rem; }
            th, td { border: 1px solid #dee2e6; padding: 10px 12px; text-align: left; }
            th { background: #f8f9fa; font-weight: bold; }
            .totals { background: #f1f3f5; border-radius: 8px; padding: 15px; display: flex; justify-content: flex-end; gap: 30px; font-size: 1.1rem; font-weight: bold; }
            .total-val { color: #8a2be2; font-size: 1.4rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="logo-box">🎮</div>
              <div>
                <h1>GAME ZONE</h1>
                <span style="font-size:0.85rem;color:#8a2be2;font-weight:bold">${title.toUpperCase()}</span>
              </div>
            </div>
            <div class="meta">
              <p style="margin:0"><strong>Fecha Emisión:</strong> ${todayStr}</p>
              <p style="margin:3px 0 0"><strong>Generado por:</strong> ${currentUser?.fullName} (${currentUser?.role})</p>
            </div>
          </div>
          <div class="filters"><strong>Filtros activos:</strong> ${filterSummary}</div>
          <table>
            <thead>
              <tr><th>Fecha y Hora</th><th>Concepto / ID</th><th>Operador</th><th>Método</th><th>Monto USD</th><th>Monto VES</th><th>Estado</th></tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="7" style="text-align:center;color:#666">No se encontraron registros</td></tr>'}</tbody>
          </table>
          <div class="totals">
            <div><div style="font-size:0.8rem;color:#666;font-weight:normal">TOTAL VES VALIDADOS</div><div style="color:#2b8a3e">${totalVes.toFixed(2)} VES</div></div>
            <div><div style="font-size:0.8rem;color:#666;font-weight:normal">TOTAL USD VALIDADOS</div><div class="total-val">$${totalUsd.toFixed(2)}</div></div>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Reporte PDF listo', 'La ventana de impresión se ha abierto.');
  };

  const printReceiptSlip = (closing: ShiftClosing) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Corte de Caja - Game Zone</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Arial', sans-serif;
              width: 70mm;
              margin: 0 auto;
              padding: 6mm 2mm;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .header-title { font-size: 16px; font-weight: 800; letter-spacing: 1px; margin: 0; }
            .header-subtitle { font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 2px 0 0; color: #555; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; align-items: baseline; }
            .flex-bold { display: flex; justify-content: space-between; align-items: baseline; font-weight: bold; font-size: 12px; }
            .info-label { color: #333; }
            .info-value { font-weight: bold; text-align: right; }
            .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 10px 0 4px; text-align: left; text-decoration: underline; }
            .footer { margin-top: 15px; font-size: 9px; font-weight: bold; color: #444; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 class="header-title">GAME ZONE</h1>
            <p class="header-subtitle">Comprobante de Cierre de Caja</p>
          </div>
          <div class="divider"></div>
          <div class="flex"><span class="info-label">Cierre ID:</span><span class="info-value">${closing.id.substring(0, 8).toUpperCase()}-${closing.id.substring(9, 13).toUpperCase()}</span></div>
          <div class="flex"><span class="info-label">Operador:</span><span class="info-value">${closing.operatorName}</span></div>
          <div class="flex"><span class="info-label">Fecha:</span><span class="info-value">${new Date(closing.createdAt).toLocaleString('es-VE')}</span></div>
          <div class="divider"></div>
          
          <div class="section-title">Resumen de Actividad</div>
          <div class="flex"><span class="info-label">Transacciones:</span><span class="info-value">${closing.details?.paymentsCount || 0}</span></div>
          <div class="flex"><span class="info-label">Minutos de Juego:</span><span class="info-value">${closing.totalTimeMinutes} min</span></div>
          
          <div class="divider"></div>
          
          <div class="section-title">Ingresos Totales</div>
          <div class="flex-bold"><span class="info-label">Total USD:</span><span class="info-value">$${closing.totalUsdGenerated.toFixed(2)}</span></div>
          <div class="flex-bold"><span class="info-label">Total VES:</span><span class="info-value">${closing.totalVesGenerated.toFixed(2)} Bs</span></div>
          
          <div class="divider"></div>
          
          <div class="section-title">Desglose por Método</div>
          <div class="flex"><span class="info-label">Efectivo USD ($):</span><span class="info-value">$${(closing.details?.cashUsd || 0).toFixed(2)}</span></div>
          <div class="flex"><span class="info-label">Efectivo VES (Bs):</span><span class="info-value">${(closing.details?.cashVes || 0).toFixed(2)} Bs</span></div>
          <div class="flex"><span class="info-label">Pago Móvil (Bs):</span><span class="info-value">${(closing.details?.pagoMovilVes || 0).toFixed(2)} Bs</span></div>
          <div class="flex"><span class="info-label">Punto de Venta (Bs):</span><span class="info-value">${(closing.details?.posVes || 0).toFixed(2)} Bs</span></div>
          <div class="flex"><span class="info-label">Transferencia (Bs):</span><span class="info-value">${(closing.details?.transferVes || 0).toFixed(2)} Bs</span></div>
          
          ${closing.details?.notes ? `
            <div class="divider"></div>
            <div style="font-size: 9px; margin-top: 4px; word-wrap: break-word;">
              <strong>Notas:</strong> ${closing.details.notes}
            </div>
          ` : ''}
          
          <div class="divider"></div>
          <div class="center footer">
            *** GRACIAS POR SU JORNADA ***
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
  };

  // Payments for a specific shift closing (operator's payments on that day)
  const getShiftPayments = (closing: ShiftClosing) => {
    const closingDate = new Date(closing.createdAt).toDateString();
    return payments.filter(p =>
      p.operatorId === closing.operatorId &&
      new Date(p.createdAt).toDateString() === closingDate
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  const renderPaymentRow = (pay: Payment) => (
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
        {pay.reference && (
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold', marginTop: '2px' }}>
            Ref: {pay.reference}
          </div>
        )}
      </td>
      <td>{pay.operatorName}</td>
      <td><span className="badge badge-secondary">{pay.paymentMethod}</span></td>
      <td><span style={{ fontWeight: 'bold', color: 'white' }}>${pay.amountUsd.toFixed(2)}</span></td>
      <td><span style={{ color: 'var(--text-secondary)' }}>{pay.amountVes.toFixed(2)} Bs.</span></td>
      <td>{pay.bcvRate.toFixed(2)} Bs/$</td>
      <td>
        <span className={`badge ${
          pay.status === 'Validado' ? 'badge-green' : 
          pay.status === 'Pendiente' ? 'badge-yellow' : 
          pay.status === 'Revision' ? 'badge-purple' : 'badge-red'
        }`}>
          {pay.status}
        </span>
        {pay.hasReceipt && (
          <button
            className="btn-receipt-view"
            onClick={async () => {
              setActiveReceiptPayment(pay);
              setActiveReceiptUrl('');
              try {
                const res = await fetch(apiUrl(`/api/payments/${pay.id}/receipt`));
                if (res.ok) {
                  const data = await res.json();
                  setActiveReceiptUrl(base64ToBlobUrl(data.receiptImageUrl));
                }
              } catch (err) {
                console.error("Error loading receipt image:", err);
              }
            }}
            title="Ver Comprobante"
          >
            <Receipt size={12} /> Comp.
          </button>
        )}
      </td>
      {currentUser?.role === 'Admin' && (
        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {pay.status === 'Pendiente' || pay.status === 'Revision' ? (
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
              {pay.status === 'Validado' ? `Validado por ${pay.validatorName?.split(' ')[0]}` : pay.status === 'Rechazado' ? 'Rechazado' : pay.status}
            </span>
          )}
        </td>
      )}
    </tr>
  );

  const renderPaymentsTable = (list: Payment[], emptyMsg: string) => (
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
          {list.length === 0 ? (
            <tr>
              <td colSpan={currentUser?.role === 'Admin' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                {emptyMsg}
              </td>
            </tr>
          ) : (
            list.map(renderPaymentRow)
          )}
        </tbody>
      </table>
    </div>
  );

  const currentTabList = activeTab === 'active' ? activePayments : activeTab === 'revision' ? revisionPayments : historialPayments;

  return (
    <div className="view-container">
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Caja y Pagos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {currentUser?.role === 'Admin' ? 'Control total de transacciones, historial y cierres de operadores' :
             currentUser?.role === 'Encargado' ? 'Reporte diario de transacciones' : 'Tus cobros registrados'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(currentUser?.role === 'Operador' || currentUser?.role === 'Encargado') && (
            <>
              <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
                <DollarSign size={16} /> Cobro Manual
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => setShowClosingConfirmModal(true)}
                disabled={isShiftClosingBlocked}
                title={isShiftClosingBlocked ? "Debes esperar 5 horas desde tu último cierre de caja" : "Cerrar Caja"}
              >
                <Clipboard size={16} /> Cerrar Caja
              </button>
            </>
          )}
          {currentUser?.role === 'Encargado' && (
            <button className="btn btn-primary" onClick={() => handleExportPDF(baseFilteredPayments, 'Reporte de Movimientos de Caja')}>
              <Printer size={16} /> Imprimir Reporte
            </button>
          )}
        </div>
      </div>

      {/* ─── CONSOLE SUMMARY (Admin/Encargado) ─── */}
      {currentUser?.role !== 'Operador' && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '1.1rem' }}>Resumen por Consola / Categoría</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {getConsoleSummary().map(item => (
              <div key={item.name} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.name}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>${item.amount.toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.count} transacciones</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MAIN CARD ─── */}
      <div className="glass-card">
        {/* TABS */}
        <div className="payments-tabs" style={{ borderBottom: '1px solid var(--border-glass)', marginBottom: '20px' }}>
          <button
            className={`payments-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <DollarSign size={16} />
            Caja Activa
            {activePayments.length > 0 && (
              <span style={{ background: 'var(--neon-yellow)', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {activePayments.length}
              </span>
            )}
          </button>
          <button
            className={`payments-tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
            onClick={() => setActiveTab('revision')}
          >
            <Eye size={16} />
            En Revisión
            {revisionPayments.length > 0 && (
              <span style={{ background: 'var(--neon-purple)', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {revisionPayments.length}
              </span>
            )}
          </button>
          <button
            className={`payments-tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveTab('historial')}
          >
            <History size={16} />
            Historial
          </button>
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && (
            <button
              className={`payments-tab-btn ${activeTab === 'cierres' ? 'active' : ''}`}
              onClick={() => setActiveTab('cierres')}
            >
              <Archive size={16} />
              Cierres de Caja
              {filteredShiftClosings.length > 0 && (
                <span style={{ background: 'var(--neon-purple)', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {filteredShiftClosings.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ─── FILTERS ─── */}
        {activeTab !== 'cierres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Filter size={16} style={{ color: 'var(--neon-purple)' }} />
                {activeTab === 'active' ? 'Cobros Pendientes de Validación' : 
                 activeTab === 'revision' ? 'Pagos en Revisión (Turno Cerrado)' : 'Historial de Pagos Procesados'}
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => handleExportCSV(currentTabList)} disabled={currentTabList.length === 0} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  <Download size={14} /> CSV
                </button>
                <button className="btn btn-primary" onClick={() => handleExportPDF(currentTabList, activeTab === 'active' ? 'Caja Activa - Pendientes' : 'Historial de Pagos')} disabled={currentTabList.length === 0} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar concepto, ref, operador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px' }}
              />

              {currentUser?.role !== 'Encargado' && (
                <select className="form-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={{ padding: '8px 12px' }}>
                  <option value="All">Todos los períodos</option>
                  <option value="Today">Hoy</option>
                  <option value="Week">Últimos 7 días</option>
                  <option value="Month">Este Mes</option>
                  <option value="Year">Este Año</option>
                </select>
              )}

              <select className="form-select" value={filterMethod} onChange={e => setFilterMethod(e.target.value)} style={{ padding: '8px 12px' }}>
                <option value="All">Todos los métodos</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Efectivo $">Efectivo $</option>
                <option value="Efectivo Bs.">Efectivo Bs.</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Punto de Venta">Punto de Venta</option>
              </select>

              {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && operatorList.length > 0 && (
                <select className="form-select" value={filterOperator} onChange={e => setFilterOperator(e.target.value)} style={{ padding: '8px 12px' }}>
                  <option value="All">Todos los operadores</option>
                  {operatorList.map(op => (
                    <option key={op.id} value={op.id}>{op.fullName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ─── FILTER BAR FOR CIERRES TAB ─── */}
        {activeTab === 'cierres' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Archive size={16} style={{ color: 'var(--neon-purple)' }} />
              Cierres de Turno Registrados
            </h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {currentUser?.role !== 'Encargado' && (
                <select className="form-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={{ padding: '8px 12px', minWidth: '160px' }}>
                  <option value="All">Todos los períodos</option>
                  <option value="Today">Hoy</option>
                  <option value="Week">Últimos 7 días</option>
                  <option value="Month">Este Mes</option>
                  <option value="Year">Este Año</option>
                </select>
              )}
              {(currentUser?.role === 'Admin' || currentUser?.role === 'Encargado') && operatorList.length > 0 && (
                <select className="form-select" value={filterOperator} onChange={e => setFilterOperator(e.target.value)} style={{ padding: '8px 12px', minWidth: '160px' }}>
                  <option value="All">Todos los operadores</option>
                  {operatorList.map(op => (
                    <option key={op.id} value={op.id}>{op.fullName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: CAJA ACTIVA ─── */}
        {activeTab === 'active' && (
          <>
            {activePayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <DollarSign size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'white', marginBottom: '8px' }}>Sin pagos pendientes</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Todos los cobros han sido procesados o no hay transacciones activas.</p>
              </div>
            ) : renderPaymentsTable(activePayments, 'No hay pagos pendientes.')}
          </>
        )}

        {/* ─── TAB: REVISION ─── */}
        {activeTab === 'revision' && (
          <>
            {revisionPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Eye size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'white', marginBottom: '8px' }}>Sin pagos en revisión</h3>
                <p style={{ color: 'var(--text-secondary)' }}>No hay pagos esperando validación por parte del administrador.</p>
              </div>
            ) : renderPaymentsTable(revisionPayments, 'No hay pagos en revisión.')}
          </>
        )}

        {/* ─── TAB: HISTORIAL ─── */}
        {activeTab === 'historial' && renderPaymentsTable(historialPayments, 'No se encontraron transacciones en el historial.')}

        {/* ─── TAB: CIERRES DE CAJA ─── */}
        {activeTab === 'cierres' && (
          <>
            {filteredShiftClosings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Archive size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'white', marginBottom: '8px' }}>Sin cierres registrados</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Aún no hay cierres de caja en el período seleccionado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredShiftClosings.map(closing => {
                  const closingPayments = getShiftPayments(closing);
                  const validated = closingPayments.filter(p => p.status === 'Validado').length;
                  const pending = closingPayments.filter(p => p.status === 'Pendiente').length;
                  const rejected = closingPayments.filter(p => p.status === 'Rechazado').length;
                  return (
                    <div key={closing.id} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '20px', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(138,43,226,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(138,43,226,0.2), rgba(0,240,255,0.1))', border: '1px solid rgba(138,43,226,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={22} style={{ color: 'var(--neon-purple)' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{closing.operatorName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {new Date(closing.createdAt).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ID Cierre: {closing.id.substring(0,16)}...
                            </div>
                          </div>
                        </div>

                        {/* Totals */}
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total USD</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>${closing.totalUsdGenerated.toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total VES</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--neon-green)' }}>{closing.totalVesGenerated.toFixed(2)} Bs.</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Transacciones</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{closing.details.paymentsCount}</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                            onClick={() => setViewingShiftClosing(closing)}
                          >
                            <Eye size={14} /> Ver Actividad
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                            onClick={() => printReceiptSlip(closing)}
                          >
                            <Printer size={14} /> Imprimir
                          </button>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Efectivo: <strong style={{ color: 'white' }}>${closing.details.cashUsd.toFixed(2)} + {closing.details.cashVes.toFixed(2)} Bs.</strong>
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Pago Móvil: <strong style={{ color: 'var(--neon-cyan)' }}>{closing.details.pagoMovilVes.toFixed(2)} Bs.</strong>
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Punto Venta: <strong style={{ color: 'var(--neon-green)' }}>{closing.details.posVes.toFixed(2)} Bs.</strong>
                        </span>
                        {closing.details.notes && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', marginLeft: 'auto' }}>
                            📝 {closing.details.notes}
                          </span>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                          {validated > 0 && <span className="badge badge-green">{validated} Validados</span>}
                          {pending > 0 && <span className="badge badge-yellow">{pending} Pendientes</span>}
                          {rejected > 0 && <span className="badge badge-red">{rejected} Rechazados</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── SHIFT ACTIVITY MODAL ─── */}
      {viewingShiftClosing && (
        <div className="modal-overlay" onClick={() => setViewingShiftClosing(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Archive size={20} style={{ color: 'var(--neon-purple)' }} />
                  Actividad del Turno — {viewingShiftClosing.operatorName}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {new Date(viewingShiftClosing.createdAt).toLocaleString('es-VE')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => printReceiptSlip(viewingShiftClosing)}>
                  <Printer size={14} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setViewingShiftClosing(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              {/* Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Total USD', value: `$${viewingShiftClosing.totalUsdGenerated.toFixed(2)}`, color: 'var(--neon-cyan)' },
                  { label: 'Total VES', value: `${viewingShiftClosing.totalVesGenerated.toFixed(2)} Bs.`, color: 'var(--neon-green)' },
                  { label: 'Transacciones', value: String(viewingShiftClosing.details.paymentsCount), color: 'white' },
                  { label: 'Efectivo USD', value: `$${viewingShiftClosing.details.cashUsd.toFixed(2)}`, color: 'white' },
                  { label: 'Efectivo Bs.', value: `${viewingShiftClosing.details.cashVes.toFixed(2)} Bs.`, color: 'white' },
                  { label: 'Pago Móvil', value: `${viewingShiftClosing.details.pagoMovilVes.toFixed(2)} Bs.`, color: 'var(--neon-purple)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {viewingShiftClosing.details.notes && (
                <div style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--neon-yellow)' }}>
                  📝 <strong>Notas del turno:</strong> {viewingShiftClosing.details.notes}
                </div>
              )}

              {/* Transaction List */}
              <h4 style={{ color: 'white', marginBottom: '12px', fontSize: '0.95rem' }}>Transacciones del Turno ({getShiftPayments(viewingShiftClosing).length})</h4>
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Concepto</th>
                      <th>Método</th>
                      <th>Monto USD</th>
                      <th>Monto VES</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getShiftPayments(viewingShiftClosing).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                          No hay transacciones registradas para este turno.
                        </td>
                      </tr>
                    ) : getShiftPayments(viewingShiftClosing).map(pay => (
                      <tr key={pay.id}>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(pay.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{pay.offerApplied || 'Cobro de Juego'}</div>
                          {pay.reference && <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)' }}>Ref: {pay.reference}</div>}
                        </td>
                        <td><span className="badge badge-secondary">{pay.paymentMethod}</span></td>
                        <td style={{ fontWeight: 700, color: 'white' }}>${pay.amountUsd.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{pay.amountVes.toFixed(2)} Bs.</td>
                        <td>
                          <span className={`badge ${
                            pay.status === 'Validado' ? 'badge-green' : 
                            pay.status === 'Pendiente' ? 'badge-yellow' : 
                            pay.status === 'Revision' ? 'badge-purple' : 'badge-red'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPT VIEWER MODAL ─── */}
      {activeReceiptPayment && (
        <div className="modal-overlay" onClick={closeReceiptModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} style={{ color: 'var(--neon-cyan)' }} /> Ver Comprobante Digital
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={closeReceiptModal}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div className="comprobante-visor-container">
                <div className="comprobante-frame">
                  <img
                    src={activeReceiptUrl || 'https://placehold.co/400x600/1a1a2e/8a2be2?text=Cargando...'}
                    className="comprobante-img"
                    alt="Comprobante Bancario"
                  />
                </div>
                <div style={{ width: '100%', fontSize: '0.85rem' }}>
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>ID Transacción:</strong> {activeReceiptPayment.id}</p>
                  {activeReceiptPayment.reference && (
                    <p style={{ color: 'var(--neon-cyan)', marginBottom: '4px', fontWeight: 'bold' }}><strong>Referencia:</strong> {activeReceiptPayment.reference}</p>
                  )}
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>Monto:</strong> ${activeReceiptPayment.amountUsd.toFixed(2)} ({activeReceiptPayment.amountVes.toFixed(2)} Bs.)</p>
                  <p style={{ color: 'white', marginBottom: '4px' }}><strong>Operador:</strong> {activeReceiptPayment.operatorName}</p>
                  <p style={{ color: 'white', marginBottom: '12px' }}><strong>Fecha:</strong> {new Date(activeReceiptPayment.createdAt).toLocaleString()}</p>
                  {activeReceiptUrl && (
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }} onClick={() => window.open(activeReceiptUrl, '_blank')}>
                        Nueva Pestaña
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }} onClick={() => {
                        const link = document.createElement('a');
                        link.href = activeReceiptUrl;
                        link.download = `comprobante_${activeReceiptPayment.id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>
                        Descargar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {currentUser?.role === 'Admin' && activeReceiptPayment.status === 'Pendiente' && (
              <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button className="btn btn-green" onClick={() => { validatePayment(activeReceiptPayment.id); closeReceiptModal(); }}>
                  <Check size={14} /> Validar Pago
                </button>
                <button className="btn btn-danger" onClick={() => { rejectPayment(activeReceiptPayment.id); closeReceiptModal(); }}>
                  <X size={14} /> Rechazar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── COBRO MANUAL MODAL ─── */}
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
                  <input type="number" className="form-input" min="0" step="0.01" value={amountUsd || ''} onChange={e => { const usd = parseFloat(e.target.value) || 0; setAmountUsd(usd); setAmountVes(parseFloat((usd * bcvRate).toFixed(2))); }} placeholder="Ingrese la cantidad" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto en Bolívares (VES)</label>
                  <input type="number" className="form-input" min="0" step="0.01" value={amountVes || ''} onChange={e => { const ves = parseFloat(e.target.value) || 0; setAmountVes(ves); setAmountUsd(parseFloat((ves / bcvRate).toFixed(2))); }} placeholder="Ingrese la cantidad" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo $">Efectivo $</option>
                    <option value="Efectivo Bs.">Efectivo Bs.</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Concepto / Detalle de Cobro</label>
                  <input type="text" className="form-input" placeholder="Ej. Venta de Doritos + Agua" value={customDetail} onChange={e => setCustomDetail(e.target.value)} required />
                </div>
                {paymentMethod !== 'Efectivo $' && paymentMethod !== 'Efectivo Bs.' && (
                  <div className="form-group">
                    <label className="form-label">Referencia del Pago</label>
                    <input type="text" className="form-input" placeholder="Ej. #12345678" value={manualPaymentRef} onChange={e => setManualPaymentRef(e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Comprobante de Pago <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Opcional)</span></label>
                  <input type="file" accept="image/*" id="manual-pay-receipt" style={{ display: 'none' }} onChange={e => handleFileChange(e, setManualPaymentReceiptImageUrl)} />
                  <label htmlFor="manual-pay-receipt" className="file-upload-trigger">
                    <span>📎</span>
                    {manualPaymentReceiptImageUrl ? '✅ Comprobante cargado — Click para cambiar' : 'Subir comprobante (imagen)'}
                  </label>
                  {manualPaymentReceiptImageUrl && (
                    <div style={{ marginTop: '10px', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                      <img src={manualPaymentReceiptImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => setManualPaymentReceiptImageUrl('')} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Equivalente VES (Tasa {bcvRate.toFixed(2)} Bs/$):</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{amountVes.toFixed(2)} Bs.</span>
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

      {/* ─── CONFIRMACION CIERRE DE CAJA MODAL ─── */}
      {showClosingConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>⚠️ Advertencia</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowClosingConfirmModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.5' }}>
                ¿Estás seguro que quieres hacer el cierre final? ¿Ya tu turno acabó?
              </p>
              <p style={{ color: 'var(--neon-purple)', fontSize: '0.85rem', marginTop: '16px', fontWeight: 'bold' }}>
                El botón de cerrar caja se bloqueará por 5 horas después de realizar esta acción.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowClosingConfirmModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={() => { setShowClosingConfirmModal(false); setShowClosingModal(true); }}>
                Sí, estoy seguro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CIERRE DE CAJA MODAL (Operador) ─── */}
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
                    Al cerrar la caja se consolidarán todos los pagos pendientes registrados por ti hoy y pasarán a revisión por un Administrador.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Notas / Observaciones de Cierre (Opcional)</label>
                    <textarea className="form-textarea" rows={3} placeholder="Indica si hubo alguna discrepancia o reporte de PC" value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} />
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
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>El reporte financiero ha sido registrado exitosamente para revisión del Administrador.</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => printReceiptSlip(generatedClosingReport)}>
                    <Printer size={16} /> Imprimir Comprobante
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
