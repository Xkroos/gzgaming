import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { InventoryItem } from '../context/AppStateContext';
import { 
  Package, Plus, TrendingDown, AlertTriangle 
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { 
    inventory, inventoryLogs, restockProduct, sellProduct, addProduct, bcvRate, currentUser 
  } = useAppState();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemForRestock, setActiveItemForRestock] = useState<InventoryItem | null>(null);

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

  const totalInvestment = inventory.reduce((sum, item) => sum + (item.stock * (item.purchasePrice || 0)), 0);
  const totalPotentialValue = inventory.reduce((sum, item) => sum + (item.stock * item.priceUsd), 0);
  const totalPotentialProfit = totalPotentialValue - totalInvestment;

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-gradient-purple title-glow" style={{ fontSize: '2.2rem' }}>Inventario de Ventas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control de stock, recargas y ventas de productos en taquilla</p>
        </div>
        {!isOperator && (
          <button className="btn btn-primary" onClick={() => setShowAddProduct(true)}>
            <Plus size={16} /> Agregar Producto
          </button>
        )}
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

      <div className="inventory-grid">
        
        {/* Inventory List */}
        <div className="glass-card">
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
                            onClick={() => sellProduct(item.id, 1)}
                            disabled={item.stock <= 0}
                          >
                            Vender 1
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }} 
                            onClick={() => setActiveItemForRestock(item)}
                          >
                            Recargar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Inventory Logs */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} style={{ color: 'var(--neon-cyan)' }} /> Bitácora de Almacén
          </h3>
          <div style={{ overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inventoryLogs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>No hay movimientos de almacén.</p>
            ) : (
              inventoryLogs.map((log) => {
                const isPositive = log.changeAmount > 0;
                return (
                  <div key={log.id} style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${isPositive ? 'rgba(57,255,20,0.1)' : 'rgba(255,51,102,0.1)'}`,
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>{log.productName}</span>
                      <span style={{ 
                        color: isPositive ? 'var(--neon-green)' : 'var(--neon-red)',
                        fontWeight: 'bold',
                        fontSize: '0.9rem' 
                      }}>
                        {isPositive ? `+${log.changeAmount}` : log.changeAmount} uds
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Razón: {log.reason}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Por: {log.userName}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
    </div>
  );
};
