import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { InventoryItem, PaymentMethod } from '../context/AppStateContext';
import { 
  Package, Plus, TrendingDown, AlertTriangle, Search, Filter, ArrowDown, ArrowUp, Calendar
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { 
    inventory, inventoryLogs, restockProduct, sellProduct, addProduct, bcvRate, currentUser 
  } = useAppState();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemForRestock, setActiveItemForRestock] = useState<InventoryItem | null>(null);

  // Direct Sale Modal States
  const [activeItemForSale, setActiveItemForSale] = useState<InventoryItem | null>(null);
  const [saleAmount, setSaleAmount] = useState(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState<PaymentMethod>('Pago Móvil');
  const [saleReference, setSaleReference] = useState('');
  const [saleReceiptImageUrl, setSaleReceiptImageUrl] = useState('');

  // Detailed Logs Modal States
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsTypeFilter, setLogsTypeFilter] = useState<'All' | 'Restock' | 'Sale'>('All');

  // Form: Create Product
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(1.00);
  const [prodPurchasePrice, setProdPurchasePrice] = useState(0.60);
  const [prodStock, setProdStock] = useState(10);
  const [prodMinStock, setProdMinStock] = useState(5);
  const [prodCategory, setProdCategory] = useState('Bebidas');

  // Form: Restock
  const [restockAmount, setRestockAmount] = useState(10);
  const [restockReason, setRestockReason] = useState('Compra de Mercancía');

  const isOperator = currentUser?.role === 'Operador';

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) return;
    addProduct({
      name: prodName,
      description: prodDesc,
      purchasePrice: prodPurchasePrice,
      priceUsd: prodPrice,
      stock: prodStock,
      minStock: prodMinStock,
      category: prodCategory
    });
    setProdName('');
    setProdDesc('');
    setProdPrice(1.00);
    setProdPurchasePrice(0.60);
    setProdStock(10);
    setProdMinStock(5);
    setShowAddProduct(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForRestock) return;
    restockProduct(activeItemForRestock.id, restockAmount, restockReason);
    setActiveItemForRestock(null);
    setRestockAmount(10);
    setRestockReason('Compra de Mercancía');
  };

  // Process file upload to base64
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

  // Submit sale with payment details
  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForSale) return;
    
    sellProduct(
      activeItemForSale.id, 
      saleAmount, 
      salePaymentMethod, 
      saleReference || undefined, 
      saleReceiptImageUrl || undefined
    );

    setActiveItemForSale(null);
    setSaleAmount(1);
    setSalePaymentMethod('Pago Móvil');
    setSaleReference('');
    setSaleReceiptImageUrl('');
  };

  // Filter logs for the logs modal
  const filteredLogs = inventoryLogs.filter(log => {
    const matchesSearch = 
      log.productName.toLowerCase().includes(logsSearch.toLowerCase()) || 
      log.reason.toLowerCase().includes(logsSearch.toLowerCase()) ||
      log.userName.toLowerCase().includes(logsSearch.toLowerCase());

    const isPositive = log.changeAmount > 0;
    const matchesType = 
      logsTypeFilter === 'All' || 
      (logsTypeFilter === 'Restock' && isPositive) || 
      (logsTypeFilter === 'Sale' && !isPositive);

    return matchesSearch && matchesType;
  });

  const totalInvestment = inventory.reduce((sum, item) => sum + (item.stock * (item.purchasePrice || 0)), 0);
  const totalPotentialValue = inventory.reduce((sum, item) => sum + (item.stock * item.priceUsd), 0);
  const totalPotentialProfit = totalPotentialValue - totalInvestment;

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Inventario de Ventas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control de stock, recargas y ventas de productos en taquilla</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowLogsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={16} /> Ver Bitácora de Almacén
          </button>
          {!isOperator && (
            <button className="btn btn-primary" onClick={() => setShowAddProduct(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Agregar Producto
            </button>
          )}
        </div>
      </div>

      {/* Resumen Almacén Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ borderTop: '4px solid var(--neon-cyan)', padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inversión Total Almacén</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--neon-cyan)', marginTop: '4px' }}>
            ${totalInvestment.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {(totalInvestment * bcvRate).toFixed(2)} Bs.
          </div>
        </div>

        <div className="glass-card" style={{ borderTop: '4px solid var(--neon-green)', padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganancia Potencial</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--neon-green)', marginTop: '4px' }}>
            ${totalPotentialProfit.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {(totalPotentialProfit * bcvRate).toFixed(2)} Bs.
          </div>
        </div>

        <div className="glass-card" style={{ borderTop: '4px solid var(--neon-purple)', padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor Total Ventas</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--neon-purple)', marginTop: '4px' }}>
            ${totalPotentialValue.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {(totalPotentialValue * bcvRate).toFixed(2)} Bs.
          </div>
        </div>
      </div>

      {/* Inventory List (Full Width now) */}
      <div className="glass-card" style={{ width: '100%' }}>
        <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} style={{ color: 'var(--neon-purple)' }} /> Stock de Productos
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Compra / Venta</th>
                <th>Equiv. Venta (VES)</th>
                <th>Stock</th>
                <th>Inversión</th>
                <th>Ganancia Pot.</th>
                <th>Alerta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.stock <= item.minStock;
                const investment = item.stock * (item.purchasePrice || 0);
                const potentialProfit = item.stock * (item.priceUsd - (item.purchasePrice || 0));
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'white' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.description}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{item.category}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>C:</span> <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>${(item.purchasePrice || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>V:</span> <span style={{ color: 'white', fontWeight: 'bold' }}>${item.priceUsd.toFixed(2)}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {(item.priceUsd * bcvRate).toFixed(2)} Bs.
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '1rem', 
                        fontWeight: 'bold', 
                        color: isLow ? 'var(--neon-red)' : 'var(--neon-cyan)' 
                      }}>
                        {item.stock} uds
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ${investment.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ${potentialProfit.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                          <AlertTriangle size={10} /> Crítico (mín: {item.minStock})
                        </span>
                      ) : (
                        <span className="badge badge-green">Normal</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-green" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                          onClick={() => {
                            setActiveItemForSale(item);
                            setSaleAmount(1);
                            setSalePaymentMethod('Pago Móvil');
                            setSaleReference('');
                            setSaleReceiptImageUrl('');
                          }}
                          disabled={item.stock <= 0}
                        >
                          Vender
                        </button>
                        {!isOperator && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                            onClick={() => setActiveItemForRestock(item)}
                          >
                            Recargar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {showAddProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Registrar Nuevo Producto</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAddProduct(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Monster Energy 473ml" 
                    value={prodName}
                    onChange={e => setProdName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Lata fría de taurina y cafeína" 
                    value={prodDesc}
                    onChange={e => setProdDesc(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select 
                    className="form-select"
                    value={prodCategory}
                    onChange={e => setProdCategory(e.target.value)}
                  >
                    <option value="Bebidas">Bebidas</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Periféricos">Periféricos</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Precio Compra ($ USD)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0.01" 
                      step="0.01"
                      value={prodPurchasePrice}
                      onChange={e => setProdPurchasePrice(parseFloat(e.target.value) || 0)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio Venta ($ USD)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0.1" 
                      step="0.01"
                      value={prodPrice}
                      onChange={e => setProdPrice(parseFloat(e.target.value) || 0)}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Stock Inicial</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0" 
                      value={prodStock}
                      onChange={e => setProdStock(parseInt(e.target.value) || 0)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mínimo Alerta</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="1" 
                      value={prodMinStock}
                      onChange={e => setProdMinStock(parseInt(e.target.value) || 0)}
                      required 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {activeItemForRestock && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Reabastecer: {activeItemForRestock.name}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setActiveItemForRestock(null)}>✕</button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="modal-body">
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stock Actual: <strong>{activeItemForRestock.stock} uds</strong></p>
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad a Agregar</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" 
                    value={restockAmount}
                    onChange={e => setRestockAmount(parseInt(e.target.value) || 0)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo de Entrada</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={restockReason}
                    onChange={e => setRestockReason(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveItemForRestock(null)}>Volver</button>
                <button type="submit" className="btn btn-cyan">Confirmar Recarga</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT SALE / SNACK SALE PAYMENT MODAL */}
      {activeItemForSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} style={{ color: 'var(--neon-green)' }} />
                Registrar Venta de Snack
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setActiveItemForSale(null)}>✕</button>
            </div>
            <form onSubmit={handleSaleSubmit}>
              <div className="modal-body">
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
                  <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '4px' }}>{activeItemForSale.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>{activeItemForSale.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Stock Disponible: <strong>{activeItemForSale.stock} uds</strong></span>
                    <span>Precio Unitario: <strong style={{ color: 'white' }}>${activeItemForSale.priceUsd.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad a Vender</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" 
                    max={activeItemForSale.stock}
                    value={saleAmount}
                    onChange={e => setSaleAmount(Math.min(activeItemForSale.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select 
                    className="form-select"
                    value={salePaymentMethod}
                    onChange={e => setSalePaymentMethod(e.target.value as PaymentMethod)}
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
                    value={saleReference}
                    onChange={e => setSaleReference(e.target.value)}
                    required={salePaymentMethod !== 'Efectivo $'}
                  />
                  {salePaymentMethod === 'Efectivo $' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opcional para efectivo en dólares.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Adjuntar Comprobante de Pago</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-input"
                    onChange={e => handleFileChange(e, setSaleReceiptImageUrl)}
                    required={salePaymentMethod !== 'Efectivo $'}
                  />
                  {saleReceiptImageUrl && (
                    <div style={{ marginTop: '12px', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Vista previa del comprobante cargado:</p>
                      <img src={saleReceiptImageUrl} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }} />
                    </div>
                  )}
                </div>

                {/* Real-time Calculation Panel */}
                <div style={{ background: 'rgba(0,240,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.15)', marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total a pagar (USD):</span>
                    <span style={{ color: 'var(--neon-cyan)', fontSize: '1.4rem', fontWeight: 'bold' }}>${(activeItemForSale.priceUsd * saleAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Equivalente en VES (BCV {bcvRate}):</span>
                    <span style={{ color: 'var(--neon-green)', fontSize: '1.1rem', fontWeight: 'bold' }}>{((activeItemForSale.priceUsd * saleAmount) * bcvRate).toFixed(2)} Bs.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveItemForSale(null)}>Volver</button>
                <button type="submit" className="btn btn-green">Confirmar y Vender</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED LOGS MODAL */}
      {showLogsModal && (
        <div className="modal-overlay">
          <div className="modal-content wide" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={20} style={{ color: 'var(--neon-cyan)' }} />
                Bitácora de Almacén - Historial de Movimientos
              </h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setShowLogsModal(false); setLogsSearch(''); setLogsTypeFilter('All'); }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Filters */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Buscar por producto, motivo o usuario..." 
                    value={logsSearch}
                    onChange={e => setLogsSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    className="form-select"
                    style={{ width: '180px', padding: '6px 12px' }}
                    value={logsTypeFilter}
                    onChange={e => setLogsTypeFilter(e.target.value as any)}
                  >
                    <option value="All">Todos los movimientos</option>
                    <option value="Restock">Recargas / Entradas (+)</option>
                    <option value="Sale">Ventas / Salidas (-)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Motivo / Evento</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No se encontraron movimientos registrados en la bitácora.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => {
                        const isPositive = log.changeAmount > 0;
                        return (
                          <tr key={log.id}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={12} style={{ color: 'var(--neon-purple)' }} />
                                {new Date(log.createdAt).toLocaleDateString('es-VE')} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{log.productName}</td>
                            <td>
                              {isPositive ? (
                                <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}>
                                  <ArrowUp size={10} /> ENTRADA
                                </span>
                              ) : (
                                <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}>
                                  <ArrowDown size={10} /> SALIDA
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ 
                                fontWeight: 'bold', 
                                color: isPositive ? 'var(--neon-green)' : 'var(--neon-red)' 
                              }}>
                                {isPositive ? `+${log.changeAmount}` : log.changeAmount} uds
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-primary)' }}>{log.reason}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{log.userName}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowLogsModal(false); setLogsSearch(''); setLogsTypeFilter('All'); }}>Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
