import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useToast } from '../components/ToastNotification';
import {
  TrendingUp, DollarSign, Clock, Calendar,
  PieChart as PieIcon, Plus, Trash2, Download,
  Gamepad2, ShieldAlert, ArrowUpRight, ArrowDownRight,
  PackageCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'prev_month' | 'year' | 'all' | 'custom';

const INVESTMENT_CATEGORIES = [
  'Hardware / Equipos',
  'Mantenimiento / Reparación',
  'Inventario / Mercancía',
  'Mobiliario / Sala',
  'Servicios / Alquiler',
  'Licencias y Juegos',
  'Otros Gastos'
];

const PIE_COLORS = ['#00f0ff', '#8a2be2', '#00ff88', '#ff9900', '#ff0077', '#a855f7', '#3b82f6'];

export const Statistics: React.FC = () => {
  const { 
    currentUser, payments, pcs, consoleTypes, 
    investments, addInvestment, deleteInvestment, 
    inventory, inventoryLogs,
    bcvRate 
  } = useAppState();
  const { toast } = useToast();

  // Estados de Filtros
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [selectedConsoleTypeId, setSelectedConsoleTypeId] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modal para agregar inversión
  const [showInvestmentModal, setShowInvestmentModal] = useState<boolean>(false);
  const [newInvTitle, setNewInvTitle] = useState('');
  const [newInvCategory, setNewInvCategory] = useState(INVESTMENT_CATEGORIES[0]);
  const [newInvAmountUsd, setNewInvAmountUsd] = useState<number | ''>('');
  const [newInvDate, setNewInvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newInvDescription, setNewInvDescription] = useState('');
  const [isSubmittingInv, setIsSubmittingInv] = useState(false);

  // Helper para verificar si una fecha ISO o YYYY-MM-DD cae dentro del período seleccionado
  const isDateInFilter = useCallback((dateInput: string | Date | undefined): boolean => {
    if (!dateInput) return false;
    const itemDate = new Date(dateInput);
    if (isNaN(itemDate.getTime())) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today': {
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDay.getTime() === today.getTime();
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDay.getTime() === yesterday.getTime();
      }
      case 'week': {
        // Últimos 7 días
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return itemDate >= weekAgo && itemDate <= now;
      }
      case 'month': {
        return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
      }
      case 'prev_month': {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return itemDate.getFullYear() === prevMonthDate.getFullYear() && itemDate.getMonth() === prevMonthDate.getMonth();
      }
      case 'year': {
        return itemDate.getFullYear() === now.getFullYear();
      }
      case 'custom': {
        if (!customStartDate) return true;
        const start = new Date(`${customStartDate}T00:00:00`);
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
        return itemDate >= start && itemDate <= end;
      }
      case 'all':
      default:
        return true;
    }
  }, [period, customStartDate, customEndDate]);

  // Texto amigable del período actual
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'week': return 'Últimos 7 días';
      case 'month': return 'Este Mes';
      case 'prev_month': return 'Mes Anterior';
      case 'year': return 'Este Año';
      case 'custom': return `Del ${customStartDate} al ${customEndDate}`;
      case 'all': return 'Histórico Total';
      default: return '';
    }
  }, [period, customStartDate, customEndDate]);

  // 1. Filtrar Pagos Validados
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.status !== 'Validado') return false;
      if (!isDateInFilter(p.createdAt)) return false;

      // Filtro de consola
      if (selectedConsoleTypeId !== 'all') {
        const targetConsole = consoleTypes.find(c => c.id === selectedConsoleTypeId);
        if (!targetConsole) return false;
        
        // Verificar si el pago pertenece a alguna PC de esta consola
        const pcsOfConsole = pcs.filter(pc => pc.consoleTypeId === targetConsole.id).map(pc => pc.id);
        const matchesPc = pcsOfConsole.some(pcId => p.offerApplied?.includes(pcId));
        const matchesName = p.offerApplied?.toLowerCase().includes(targetConsole.name.toLowerCase());
        return matchesPc || Boolean(matchesName);
      }

      return true;
    });
  }, [payments, isDateInFilter, selectedConsoleTypeId, consoleTypes, pcs]);

  // 2. Filtrar Inversiones
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => isDateInFilter(inv.date || inv.createdAt));
  }, [investments, isDateInFilter]);

  // 3. Cálculos Principales (KPIs)
  const totalIncomeUsd = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountUsd, 0);
  }, [filteredPayments]);

  const totalIncomeVes = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountVes, 0);
  }, [filteredPayments]);

  const totalInvestedUsd = useMemo(() => {
    return filteredInvestments.reduce((sum, i) => sum + Number(i.amountUsd || 0), 0);
  }, [filteredInvestments]);

  const totalInvestedVes = useMemo(() => {
    return filteredInvestments.reduce((sum, i) => sum + Number(i.amountVes || (Number(i.amountUsd) * bcvRate)), 0);
  }, [filteredInvestments, bcvRate]);

  const netProfitUsd = totalIncomeUsd - totalInvestedUsd;
  const netProfitVes = totalIncomeVes - totalInvestedVes;
  const profitMargin = totalIncomeUsd > 0 ? (netProfitUsd / totalIncomeUsd) * 100 : 0;

  // 3.1 Métricas de Ganancia de Inventario (Snacks, Bebidas, Mercancía)
  const { 
    inventoryProfitUsd, 
    inventoryProfitVes, 
    inventorySalesUsd, 
    inventoryItemsSoldCount, 
    stockPotentialProfitUsd 
  } = useMemo(() => {
    let salesUsd = 0;
    let costUsd = 0;
    let countSold = 0;

    // A) Analizar logs de salida de inventario por ventas en el período
    (inventoryLogs || []).forEach(log => {
      if (log.changeAmount < 0 && isDateInFilter(log.createdAt)) {
        const qty = Math.abs(log.changeAmount);
        countSold += qty;
        const item = (inventory || []).find(i => i.id === log.productId) || (inventory || []).find(i => i.name === log.productName);
        const salePrice = item ? item.priceUsd : 0;
        const purchasePrice = item ? (item.purchasePrice || 0) : 0;
        
        salesUsd += qty * salePrice;
        costUsd += qty * purchasePrice;
      }
    });

    // B) Si no hay logs detallados pero hay pagos marcados como Inventario/Extras
    if (salesUsd === 0) {
      filteredPayments.forEach(p => {
        if (p.offerApplied && (p.offerApplied.includes('Venta Inventario') || p.offerApplied.includes('Extras'))) {
          salesUsd += p.amountUsd;
          costUsd += p.amountUsd * 0.6; // Margen de referencia aproximado del 40%
          countSold += 1;
        }
      });
    }

    const profitUsd = Math.max(0, salesUsd - costUsd);
    const profitVes = profitUsd * bcvRate;

    // Ganancia potencial total del stock actual en almacén
    const stockPot = (inventory || []).reduce((sum, item) => {
      const margin = Math.max(0, item.priceUsd - (item.purchasePrice || 0));
      return sum + (item.stock * margin);
    }, 0);

    return {
      inventoryProfitUsd: profitUsd,
      inventoryProfitVes: profitVes,
      inventorySalesUsd: salesUsd,
      inventoryItemsSoldCount: countSold,
      stockPotentialProfitUsd: stockPot
    };
  }, [inventoryLogs, inventory, filteredPayments, bcvRate, isDateInFilter]);

  // 4. Métricas por Tipo de Consola (Dinero y Horas)
  const consoleMetrics = useMemo(() => {
    return consoleTypes.map(ct => {
      const pcsOfThisType = pcs.filter(pc => pc.consoleTypeId === ct.id);
      const pcIds = pcsOfThisType.map(pc => pc.id);

      // Pagos que corresponden a este tipo de consola
      const matchingPayments = payments.filter(p => {
        if (p.status !== 'Validado') return false;
        if (!isDateInFilter(p.createdAt)) return false;
        const matchesPcId = pcIds.some(id => p.offerApplied?.includes(id));
        const matchesName = p.offerApplied?.toLowerCase().includes(ct.name.toLowerCase());
        return matchesPcId || Boolean(matchesName);
      });

      const incomeUsd = matchingPayments.reduce((sum, p) => sum + p.amountUsd, 0);
      const incomeVes = matchingPayments.reduce((sum, p) => sum + p.amountVes, 0);

      // Calcular horas generadas:
      // Si la consola tiene tarifa/hora, horas = USD / tarifaHora
      const rate = ct.hourlyRate > 0 ? ct.hourlyRate : 2.0;
      const hours = rate > 0 ? incomeUsd / rate : 0;

      const percentageOfTotal = totalIncomeUsd > 0 ? (incomeUsd / totalIncomeUsd) * 100 : 0;

      return {
        id: ct.id,
        name: ct.name,
        emoji: ct.emoji,
        hourlyRate: ct.hourlyRate,
        pcsCount: pcsOfThisType.length,
        paymentsCount: matchingPayments.length,
        incomeUsd,
        incomeVes,
        hours,
        percentageOfTotal
      };
    }).sort((a, b) => b.incomeUsd - a.incomeUsd);
  }, [consoleTypes, pcs, payments, isDateInFilter, totalIncomeUsd]);

  // Horas totales sumadas
  const totalHoursGenerated = useMemo(() => {
    return consoleMetrics.reduce((sum, cm) => sum + cm.hours, 0);
  }, [consoleMetrics]);

  // Consola más rentable
  const topConsole = consoleMetrics.length > 0 && consoleMetrics[0].incomeUsd > 0 ? consoleMetrics[0] : null;

  // 5. Datos para Gráfico de Tendencia Temporal (Ingresos vs Inversiones)
  const timelineChartData = useMemo(() => {
    // Generar buckets según período
    const map = new Map<string, { label: string; Ingresos: number; Inversiones: number; Ganancia: number }>();

    // Inicializar días de la última semana o del mes
    const daysCount = period === 'today' || period === 'yesterday' ? 1 : period === 'week' ? 7 : 14;
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
      map.set(key, { label, Ingresos: 0, Inversiones: 0, Ganancia: 0 });
    }

    // Agregar ingresos
    filteredPayments.forEach(p => {
      const key = new Date(p.createdAt).toISOString().split('T')[0];
      if (map.has(key)) {
        const item = map.get(key)!;
        item.Ingresos += p.amountUsd;
      } else {
        const label = new Date(p.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
        map.set(key, { label, Ingresos: p.amountUsd, Inversiones: 0, Ganancia: 0 });
      }
    });

    // Agregar inversiones
    filteredInvestments.forEach(inv => {
      const key = (inv.date || inv.createdAt).split('T')[0];
      if (map.has(key)) {
        const item = map.get(key)!;
        item.Inversiones += Number(inv.amountUsd || 0);
      } else {
        const label = new Date(key).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
        map.set(key, { label, Ingresos: 0, Inversiones: Number(inv.amountUsd || 0), Ganancia: 0 });
      }
    });

    // Calcular ganancia neta en cada bucket
    const result = Array.from(map.values()).map(item => ({
      ...item,
      Ingresos: parseFloat(item.Ingresos.toFixed(2)),
      Inversiones: parseFloat(item.Inversiones.toFixed(2)),
      Ganancia: parseFloat((item.Ingresos - item.Inversiones).toFixed(2))
    }));

    return result.slice(-14); // últimos 14 puntos para gráfico limpio
  }, [filteredPayments, filteredInvestments, period]);

  // 6. Datos para Gráfico Circular de Consolas
  const pieChartData = useMemo(() => {
    const list = consoleMetrics.filter(c => c.incomeUsd > 0).map(c => ({
      name: `${c.emoji} ${c.name}`,
      value: parseFloat(c.incomeUsd.toFixed(2))
    }));
    if (list.length === 0) {
      return [{ name: 'Sin datos aún', value: 1 }];
    }
    return list;
  }, [consoleMetrics]);

  // Manejador para Guardar Inversión
  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvTitle.trim() || newInvAmountUsd === '' || Number(newInvAmountUsd) <= 0) {
      toast.warning('Datos Incompletos', 'Ingresa un concepto y un monto válido en USD.');
      return;
    }

    setIsSubmittingInv(true);
    const amountUsd = Number(newInvAmountUsd);
    const amountVes = amountUsd * bcvRate;

    const success = await addInvestment({
      title: newInvTitle.trim(),
      description: newInvDescription.trim(),
      category: newInvCategory,
      amountUsd,
      amountVes,
      date: newInvDate
    });

    setIsSubmittingInv(false);
    if (success) {
      toast.success('Inversión Registrada', `$${amountUsd.toFixed(2)} registrados exitosamente.`);
      setShowInvestmentModal(false);
      setNewInvTitle('');
      setNewInvDescription('');
      setNewInvAmountUsd('');
    } else {
      toast.error('Error al Guardar', 'No se pudo guardar la inversión en el servidor.');
    }
  };

  // Manejador para Eliminar Inversión
  const handleDeleteInvestment = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la inversión "${title}"?`)) return;
    const ok = await deleteInvestment(id);
    if (ok) {
      toast.info('Inversión Eliminada', `"${title}" ha sido removida del registro.`);
    } else {
      toast.error('Error', 'No se pudo eliminar la inversión.');
    }
  };

  // -------------------------------------------------------------
  // EXPORTACIÓN A PDF ELEGANTE Y COMPLETA
  // -------------------------------------------------------------
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Ventana Bloqueada', 'Por favor habilita las ventanas emergentes (pop-ups) en tu navegador para ver el PDF.');
      return;
    }

    const todayStr = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' });
    const consoleFilterName = selectedConsoleTypeId === 'all' 
      ? 'Todas las consolas' 
      : (consoleTypes.find(c => c.id === selectedConsoleTypeId)?.name || 'Seleccionada');

    // Filas de Consolas
    const consoleRowsHtml = consoleMetrics.map(cm => `
      <tr>
        <td><strong>${cm.emoji} ${cm.name}</strong></td>
        <td>$${cm.hourlyRate.toFixed(2)}/h</td>
        <td><strong>${cm.hours.toFixed(1)} hrs</strong></td>
        <td>${cm.paymentsCount}</td>
        <td><strong>$${cm.incomeUsd.toFixed(2)}</strong></td>
        <td>${cm.incomeVes.toFixed(2)} Bs.</td>
        <td><strong>${cm.percentageOfTotal.toFixed(1)}%</strong></td>
      </tr>
    `).join('');

    // Filas de Inversiones
    const investmentRowsHtml = filteredInvestments.map(inv => `
      <tr>
        <td>${inv.date}</td>
        <td><strong>${inv.title}</strong></td>
        <td><span class="badge badge-purple">${inv.category}</span></td>
        <td>${inv.description || '<span style="color:#888;">Sin detalles adicionales</span>'}</td>
        <td><strong>$${Number(inv.amountUsd).toFixed(2)}</strong></td>
        <td>${Number(inv.amountVes).toFixed(2)} Bs.</td>
        <td>${inv.userName}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Reporte de Estadísticas y Rendimiento - Game Zone</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              color: #1a1a24; 
              background: #fff; 
              margin: 0; 
              padding: 0; 
              font-size: 11pt; 
              line-height: 1.4; 
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 3px solid #8a2be2; 
              padding-bottom: 12px; 
              margin-bottom: 16px; 
            }
            .logo-title { display: flex; align-items: center; gap: 10px; }
            .logo-icon { 
              background: #8a2be2; 
              color: white; 
              width: 36px; 
              height: 36px; 
              border-radius: 8px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 18px; 
            }
            h1 { font-size: 1.6rem; color: #12082a; margin: 0; font-weight: 800; letter-spacing: 0.5px; }
            .sub-title { font-size: 0.85rem; color: #8a2be2; font-weight: bold; text-transform: uppercase; }
            .meta { text-align: right; font-size: 0.8rem; color: #555; }
            .meta p { margin: 2px 0; }
            
            .filter-banner {
              background: #f3f0ff;
              border: 1px solid #dcd0ff;
              border-radius: 6px;
              padding: 8px 14px;
              margin-bottom: 18px;
              font-size: 0.85rem;
              display: flex;
              justify-content: space-between;
            }
            
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
              margin-bottom: 22px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              background: #fafafa;
            }
            .kpi-title { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
            .kpi-value { font-size: 1.35rem; font-weight: 800; color: #0f172a; }
            .kpi-sub { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
            
            .section-title {
              font-size: 1.05rem;
              font-weight: 700;
              color: #1e1b4b;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin: 20px 0 10px 0;
            }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.85rem; }
            th, td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; color: #334155; }
            tr:nth-child(even) { background: #fdfdfd; }
            
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: 600;
            }
            .badge-purple { background: #f3e8ff; color: #6b21a8; }
            
            .footer-signatures {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              text-align: center;
              font-size: 0.85rem;
            }
            .signature-line {
              border-top: 1px dashed #64748b;
              margin-top: 50px;
              padding-top: 6px;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-title">
              <div class="logo-icon">🎮</div>
              <div>
                <h1>GAME ZONE</h1>
                <div class="sub-title">Reporte de Estadísticas, Inversión y Rendimiento</div>
              </div>
            </div>
            <div class="meta">
              <p><strong>Fecha de Emisión:</strong> ${todayStr}</p>
              <p><strong>Generado por:</strong> ${currentUser?.fullName} (${currentUser?.role})</p>
              <p><strong>Tasa BCV Referencial:</strong> ${bcvRate.toFixed(2)} VES/$</p>
            </div>
          </div>

          <div class="filter-banner">
            <div><strong>Filtro Temporal:</strong> ${periodLabel}</div>
            <div><strong>Consola Filtrada:</strong> ${consoleFilterName}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Ingresos Totales</div>
              <div class="kpi-value" style="color:#059669;">$${totalIncomeUsd.toFixed(2)}</div>
              <div class="kpi-sub">${totalIncomeVes.toFixed(2)} VES</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Dinero Invertido</div>
              <div class="kpi-value" style="color:#dc2626;">$${totalInvestedUsd.toFixed(2)}</div>
              <div class="kpi-sub">${totalInvestedVes.toFixed(2)} VES</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Ganancia Neta</div>
              <div class="kpi-value" style="color:${netProfitUsd >= 0 ? '#2563eb' : '#dc2626'};">$${netProfitUsd.toFixed(2)}</div>
              <div class="kpi-sub">Margen: ${profitMargin.toFixed(1)}%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Ganancia Inventario</div>
              <div class="kpi-value" style="color:#d97706;">$${inventoryProfitUsd.toFixed(2)}</div>
              <div class="kpi-sub">${inventoryProfitVes.toFixed(2)} VES (${inventoryItemsSoldCount} unid.)</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Horas Totales</div>
              <div class="kpi-value" style="color:#7c3aed;">${totalHoursGenerated.toFixed(1)} hrs</div>
              <div class="kpi-sub">${filteredPayments.length} transacciones</div>
            </div>
          </div>

          <div class="section-title">1. Rendimiento y Dinero Generado por Consola / Equipo</div>
          <table>
            <thead>
              <tr>
                <th>Consola / Equipo</th>
                <th>Tarifa Base</th>
                <th>Horas Jugadas</th>
                <th>Sesiones</th>
                <th>Ingresos USD</th>
                <th>Ingresos VES</th>
                <th>% del Total</th>
              </tr>
            </thead>
            <tbody>
              ${consoleRowsHtml || '<tr><td colspan="7" style="text-align:center;">No hay ingresos registrados en el período</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">2. Detalle de Dinero Invertido (Gastos y Adquisiciones)</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto / Título</th>
                <th>Categoría</th>
                <th>Descripción en qué se invirtió</th>
                <th>Monto USD</th>
                <th>Monto VES</th>
                <th>Registrado Por</th>
              </tr>
            </thead>
            <tbody>
              ${investmentRowsHtml || '<tr><td colspan="7" style="text-align:center;">No hay inversiones registradas en este período</td></tr>'}
            </tbody>
          </table>

          <div class="footer-signatures">
            <div>
              <div class="signature-line">Firma del Encargado de Sala</div>
            </div>
            <div>
              <div class="signature-line">Firma de Dirección / Administrador</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Reporte PDF Generado', 'La ventana de impresión se ha abierto correctamente.');
  };

  // Control de Acceso: Exclusivo para Admin y Encargado
  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Encargado') {
    return (
      <div className="view-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '600px', margin: '40px auto' }}>
          <ShieldAlert size={56} style={{ color: 'var(--neon-red)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            El módulo de <strong>Estadísticas, Inversión y Rendimiento Financiero</strong> es de carácter confidencial y está reservado exclusivamente para los roles de <strong>Encargado</strong> y <strong>Administrador</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Panel de Estadísticas</h1>
            <span className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Exclusivo Gerencia</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Control financiero integral: Inversión, utilidades netas, ingresos por consola y horas jugadas
          </p>
        </div>

        {/* Acciones Superiores */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={() => setShowInvestmentModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Registrar Inversión / Gasto
          </button>

          <button 
            className="btn btn-secondary"
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--neon-purple)', color: 'white' }}
          >
            <Download size={16} style={{ color: 'var(--neon-cyan)' }} /> Descargar Reporte PDF
          </button>

          <div className="bcv-rate-badge" style={{ padding: '8px 14px' }}>
            <span>Tasa BCV: {bcvRate.toFixed(2)} VES/$</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Interactivos */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Selector de Período Rápido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Calendar size={18} style={{ color: 'var(--neon-cyan)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>Período:</span>
            
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px', gap: '4px', flexWrap: 'wrap' }}>
              {(['today', 'yesterday', 'week', 'month', 'prev_month', 'year', 'all', 'custom'] as PeriodFilter[]).map(key => {
                const names: Record<PeriodFilter, string> = {
                  today: 'Hoy',
                  yesterday: 'Ayer',
                  week: 'Semana',
                  month: 'Este Mes',
                  prev_month: 'Mes Anterior',
                  year: 'Año',
                  all: 'Todo',
                  custom: 'Personalizado'
                };
                const isActive = period === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeriod(key)}
                    style={{
                      background: isActive ? 'linear-gradient(135deg, var(--neon-purple), #4a00e0)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 0 10px rgba(138,43,226,0.4)' : 'none'
                    }}
                  >
                    {names[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro por Consola */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gamepad2 size={18} style={{ color: 'var(--neon-purple)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Consola:</span>
            <select
              className="form-select"
              value={selectedConsoleTypeId}
              onChange={e => setSelectedConsoleTypeId(e.target.value)}
              style={{ width: '180px', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="all">Todas las Consolas</option>
              {consoleTypes.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.emoji} {ct.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector de Rango Personalizado si está activo */}
        {period === 'custom' && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>Seleccionar Rango de Fechas:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Desde:</label>
              <input 
                type="date" 
                className="form-input" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hasta:</label>
              <input 
                type="date" 
                className="form-input" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5 TARJETAS KPI DE IMPACTO CON CAJAS Y EFECTOS NEÓN */}
      <div className="stat-kpi-grid">
        {/* KPI 1: Ingresos Totales */}
        <div 
          className="stat-kpi-card" 
          style={{
            '--stat-accent': '#00ff88',
            '--stat-glow': 'rgba(0, 255, 136, 0.25)',
            '--stat-border': 'rgba(0, 255, 136, 0.4)',
            '--stat-icon-bg': 'rgba(0, 255, 136, 0.12)',
            '--stat-icon-border': 'rgba(0, 255, 136, 0.3)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Ingresos Totales
            </span>
            <div className="stat-kpi-icon-wrap">
              <ArrowUpRight size={18} style={{ color: '#00ff88' }} />
            </div>
          </div>
          <div>
            <div style={{ color: '#00ff88', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ${totalIncomeUsd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {totalIncomeVes.toFixed(2)} VES
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            🟢 {filteredPayments.length} transacciones validadas
          </div>
        </div>

        {/* KPI 2: Dinero Invertido */}
        <div 
          className="stat-kpi-card" 
          style={{
            '--stat-accent': '#ff0055',
            '--stat-glow': 'rgba(255, 0, 85, 0.25)',
            '--stat-border': 'rgba(255, 0, 85, 0.4)',
            '--stat-icon-bg': 'rgba(255, 0, 85, 0.12)',
            '--stat-icon-border': 'rgba(255, 0, 85, 0.3)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Dinero Invertido
            </span>
            <div className="stat-kpi-icon-wrap">
              <ArrowDownRight size={18} style={{ color: '#ff0055' }} />
            </div>
          </div>
          <div>
            <div style={{ color: '#ff3366', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ${totalInvestedUsd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {totalInvestedVes.toFixed(2)} VES
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            🔴 {filteredInvestments.length} compras / gastos
          </div>
        </div>

        {/* KPI 3: Ganancia Neta */}
        <div 
          className="stat-kpi-card" 
          style={{
            '--stat-accent': netProfitUsd >= 0 ? '#00f0ff' : '#ff3366',
            '--stat-glow': netProfitUsd >= 0 ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 51, 102, 0.25)',
            '--stat-border': netProfitUsd >= 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 51, 102, 0.4)',
            '--stat-icon-bg': netProfitUsd >= 0 ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 51, 102, 0.12)',
            '--stat-icon-border': netProfitUsd >= 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 51, 102, 0.3)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Ganancia Neta
            </span>
            <div className="stat-kpi-icon-wrap">
              <TrendingUp size={18} style={{ color: netProfitUsd >= 0 ? '#00f0ff' : '#ff3366' }} />
            </div>
          </div>
          <div>
            <div style={{ color: netProfitUsd >= 0 ? '#00f0ff' : '#ff3366', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ${netProfitUsd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {netProfitVes.toFixed(2)} VES
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            ⚡ Margen: <strong style={{ color: profitMargin >= 0 ? '#00ff88' : '#ff3366' }}>{profitMargin.toFixed(1)}%</strong>
          </div>
        </div>

        {/* KPI 4: Ganancia de Inventario */}
        <div 
          className="stat-kpi-card" 
          style={{
            '--stat-accent': '#ffaa00',
            '--stat-glow': 'rgba(255, 170, 0, 0.25)',
            '--stat-border': 'rgba(255, 170, 0, 0.4)',
            '--stat-icon-bg': 'rgba(255, 170, 0, 0.12)',
            '--stat-icon-border': 'rgba(255, 170, 0, 0.3)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Ganancia Inventario
            </span>
            <div className="stat-kpi-icon-wrap">
              <PackageCheck size={18} style={{ color: '#ffaa00' }} />
            </div>
          </div>
          <div>
            <div style={{ color: '#ffb703', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ${inventoryProfitUsd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {inventoryProfitVes.toFixed(2)} VES
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {inventoryItemsSoldCount > 0 ? (
              <span>🛍️ {inventoryItemsSoldCount} vendidos · Ventas: ${inventorySalesUsd.toFixed(2)}</span>
            ) : (
              <span>📦 Stock tienda: ${stockPotentialProfitUsd.toFixed(2)} pot.</span>
            )}
          </div>
        </div>

        {/* KPI 5: Horas Totales */}
        <div 
          className="stat-kpi-card" 
          style={{
            '--stat-accent': '#a855f7',
            '--stat-glow': 'rgba(168, 85, 247, 0.25)',
            '--stat-border': 'rgba(168, 85, 247, 0.4)',
            '--stat-icon-bg': 'rgba(168, 85, 247, 0.12)',
            '--stat-icon-border': 'rgba(168, 85, 247, 0.3)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Horas Totales
            </span>
            <div className="stat-kpi-icon-wrap">
              <Clock size={18} style={{ color: '#a855f7' }} />
            </div>
          </div>
          <div>
            <div style={{ color: '#c084fc', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {totalHoursGenerated.toFixed(1)} <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>hrs</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Equipos & Consolas
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            🎮 Top: {topConsole ? `${topConsole.emoji} ${topConsole.name}` : 'Ninguna'}
          </div>
        </div>
      </div>

      {/* GRÁFICOS INTERACTIVOS RECHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Gráfico 1: Evolución Temporal Ingresos vs Inversiones */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', margin: 0 }}>Evolución de Ingresos vs Inversiones</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comparativa financiera ({periodLabel})</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff0055" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff0055" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="label" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} tickFormatter={val => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(18, 8, 42, 0.95)', borderColor: 'rgba(138,43,226,0.3)', borderRadius: '8px' }} 
                  formatter={(val: unknown) => [`$${Number(val || 0).toFixed(2)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="Ingresos" stroke="#00ff88" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="Inversiones" stroke="#ff0055" strokeWidth={2} fillOpacity={1} fill="url(#investGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribución de Ingresos por Tipo de Consola */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', margin: 0 }}>Dinero Hecho por Consola</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Participación sobre el ingreso total</span>
            </div>
            <PieIcon size={18} style={{ color: 'var(--neon-cyan)' }} />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(18, 8, 42, 0.95)', borderColor: 'rgba(138,43,226,0.3)', borderRadius: '8px' }} 
                  formatter={(val: unknown) => [`$${Number(val || 0).toFixed(2)}`, 'Ingreso']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: TABLA DE RENDIMIENTO POR CONSOLA */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', margin: 0 }}>Rendimiento Detallado por Consola / Equipo</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ingresos generados, horas facturadas y volumen de sesiones</span>
          </div>
          <span className="badge badge-cyan">{consoleMetrics.length} Categorías</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Consola / Tipo</th>
                <th>Tarifa Hora</th>
                <th>Equipos</th>
                <th>Horas Generadas</th>
                <th>Dinero Generado (USD)</th>
                <th>Dinero Generado (VES)</th>
                <th>% del Total</th>
              </tr>
            </thead>
            <tbody>
              {consoleMetrics.map(cm => (
                <tr key={cm.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{cm.emoji}</span>
                      <strong>{cm.name}</strong>
                    </div>
                  </td>
                  <td>${cm.hourlyRate.toFixed(2)}/h</td>
                  <td>{cm.pcsCount} equipos</td>
                  <td>
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
                      {cm.hours.toFixed(1)} hrs
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--neon-green)', fontSize: '1rem' }}>
                      ${cm.incomeUsd.toFixed(2)}
                    </strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {cm.incomeVes.toFixed(2)} Bs.
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${cm.percentageOfTotal}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cm.percentageOfTotal.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {consoleMetrics.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    No se encontraron consolas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: TABLA DE INVERSIONES Y GASTOS */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', margin: 0 }}>Registro de Inversiones y Gastos Realizados</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Detalle de en qué se invirtió el dinero del negocio con montos, fechas y descripciones
            </span>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowInvestmentModal(true)}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Plus size={14} /> Nueva Inversión
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto / Título</th>
                <th>Categoría</th>
                <th>Descripción en qué se invirtió</th>
                <th>Monto USD</th>
                <th>Monto VES</th>
                <th>Registrado Por</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.map(inv => (
                <tr key={inv.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{inv.date}</td>
                  <td><strong>{inv.title}</strong></td>
                  <td><span className="badge badge-purple">{inv.category}</span></td>
                  <td style={{ maxWidth: '300px' }}>
                    {inv.description ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{inv.description}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Sin descripción detallada</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--neon-red)' }}>${Number(inv.amountUsd).toFixed(2)}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {Number(inv.amountVes).toFixed(2)} Bs.
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{inv.userName}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Eliminar inversión"
                      onClick={() => handleDeleteInvestment(inv.id, inv.title)}
                      style={{ color: 'var(--neon-red)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvestments.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <DollarSign size={36} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
                    <p style={{ margin: 0 }}>No hay inversiones registradas en este período.</p>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowInvestmentModal(true)} 
                      style={{ marginTop: '10px', fontSize: '0.8rem' }}
                    >
                      + Registrar la primera inversión
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVA INVERSIÓN */}
      {showInvestmentModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} style={{ color: 'var(--neon-green)' }} />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'white' }}>Registrar Inversión o Gasto</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowInvestmentModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Título o Concepto *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Compra de 2 Controles PS5, Pasta Térmica, Sillas..."
                  value={newInvTitle}
                  onChange={e => setNewInvTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={newInvCategory}
                    onChange={e => setNewInvCategory(e.target.value)}
                  >
                    {INVESTMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Inversión *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newInvDate}
                    onChange={e => setNewInvDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Invertido ($ USD) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={newInvAmountUsd}
                    onChange={e => setNewInvAmountUsd(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    required
                  />
                  {typeof newInvAmountUsd === 'number' && newInvAmountUsd > 0 && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--neon-cyan)' }}>
                      ≈ {(newInvAmountUsd * bcvRate).toFixed(2)} VES
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción Detallada (En qué se invirtió)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Detalles sobre la compra, tienda o proveedor, garantía, repuestos específicos, etc."
                  value={newInvDescription}
                  onChange={e => setNewInvDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInvestmentModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingInv}
                >
                  {isSubmittingInv ? 'Guardando...' : 'Guardar Inversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
