import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

// -------------------------------------------------------------
// TYPES & INTERFACES
// -------------------------------------------------------------
export type UserRole = 'Admin' | 'Encargado' | 'Operador';
export type PCStatus = 'Disponible' | 'En Uso' | 'Bloqueada' | 'Suspendida';
export type PaymentStatus = 'Pendiente' | 'Validado' | 'Rechazado';
export type PaymentMethod = 'Pago Móvil' | 'Efectivo $' | 'Efectivo Bs.' | 'Transferencia' | 'Punto de Venta';
export type CredentialCategory = 'PC Login' | 'Steam' | 'Epic Games' | 'Riot Games' | 'Otros';

export interface ConsoleType {
  id: string;
  name: string;
  emoji: string;
  hourlyRate: number;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  status: 'Activo' | 'Inactivo';
  createdAt: string;
}

export interface PC {
  id: string;
  pcName: string;
  ipAddress: string;
  status: PCStatus;
  hourlyRate: number;
  details: string;
  remainingTime: number; // in seconds
  totalAssignedTime: number; // in seconds
  clientName?: string;
  currentSessionId?: string;
  consoleTypeId?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
  isActive: boolean;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  discountPercentage: number; // e.g. 50
  dayOfWeek?: number; // 1 = Lunes, etc.
  isActive: boolean;
}

export interface GameSession {
  id: string;
  pcId: string;
  clientName: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  priceUsd: number;
  status: 'Activa' | 'Completada' | 'Bloqueada';
  offerApplied?: string;
}

export interface Payment {
  id: string;
  sessionId?: string;
  operatorId: string;
  operatorName: string;
  validatorId?: string;
  validatorName?: string;
  amountUsd: number;
  amountVes: number;
  bcvRate: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  receiptImageUrl?: string;
  hasReceipt?: boolean;
  status: PaymentStatus;
  offerApplied?: string;
  createdAt: string;
  validatedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  purchasePrice: number;
  priceUsd: number;
  stock: number;
  minStock: number;
  category: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  userName: string;
  changeAmount: number;
  reason: string;
  createdAt: string;
}

export interface ShiftClosing {
  id: string;
  operatorId: string;
  operatorName: string;
  startTime: string;
  endTime: string;
  totalUsdGenerated: number;
  totalVesGenerated: number;
  totalTimeMinutes: number;
  details: {
    cashUsd: number;
    cashVes: number;
    pagoMovilVes: number;
    posVes: number;
    paymentsCount: number;
    notes: string;
  };
  createdAt: string;
}

export interface Credential {
  id: string;
  entityName: string;
  loginUsername: string;
  loginPassword?: string;
  category: CredentialCategory;
  notes: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  username: string;
  role: string;
  action: string;
  details: string;
  status: 'Éxito' | 'Fallo' | 'Advertencia';
  createdAt: string;
}

interface AppStateContextType {
  currentUser: User | null;
  users: User[];
  pcs: PC[];
  plans: Plan[];
  offers: Offer[];
  payments: Payment[];
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  shiftClosings: ShiftClosing[];
  credentials: Credential[];
  auditLogs: AuditLog[];
  consoleTypes: ConsoleType[];
  globalHourlyRate: number;
  bcvRate: number;
  isBcvLoading: boolean;
  
  // Auth simulation
  loginUser: (username: string, password?: string) => Promise<boolean>;
  logoutUser: () => void;
  
  // BCV Rate
  fetchBcvRate: (force?: boolean) => Promise<void>;
  updateBcvRateManually: (rate: number) => void;
  
  // PC Control
  assignPC: (pcId: string, clientName: string, durationMinutes: number, offerId?: string, planId?: string) => void;
  releasePC: (pcId: string) => void;
  pausePC: (pcId: string) => void;
  resumePC: (pcId: string) => void;
  addTimeToPC: (pcId: string, additionalMinutes: number) => void;
  addPC: (pc: Omit<PC, 'id' | 'status' | 'remainingTime' | 'totalAssignedTime'>) => void;
  updatePC: (id: string, pc: Partial<PC>) => void;
  deletePC: (id: string) => void;
  
  // Payments
  registerPayment: (payment: Omit<Payment, 'id' | 'operatorId' | 'operatorName' | 'status' | 'createdAt'>) => void;
  validatePayment: (paymentId: string) => void;
  rejectPayment: (paymentId: string) => void;
  
  // Shift Closings
  closeShift: (details: { cashUsd: number; cashVes: number; notes: string }) => Promise<ShiftClosing | null>;
  
  // Staff CRUD
  addUser: (username: string, fullName: string, role: UserRole, password?: string) => void;
  updateUser: (id: string, fullName: string, role: UserRole, status: 'Activo' | 'Inactivo', password?: string) => void;
  deleteUser: (id: string) => void;
  
  // Inventory
  restockProduct: (id: string, amount: number, reason: string) => void;
  sellProduct: (
    id: string,
    amount: number,
    paymentMethod?: PaymentMethod,
    reference?: string,
    receiptImageUrl?: string,
    skipPayment?: boolean
  ) => void;
  addProduct: (product: Omit<InventoryItem, 'id'>) => void;
  
  // Plans & Offers
  addPlan: (plan: Omit<Plan, 'id' | 'isActive'>) => void;
  updatePlan: (id: string, plan: Partial<Plan>) => void;
  addOffer: (offer: Omit<Offer, 'id' | 'isActive'>) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  
  // Credentials
  addCredential: (cred: Omit<Credential, 'id'>) => void;
  deleteCredential: (id: string) => void;

  // Console Types
  addConsoleType: (ct: Omit<ConsoleType, 'id' | 'isActive'>) => void;
  updateConsoleType: (id: string, ct: Partial<ConsoleType>) => void;
  deleteConsoleType: (id: string) => void;
  updateGlobalRate: (rate: number) => void;
}

// -------------------------------------------------------------
// INITIAL VALUES & CONTEXT
// -------------------------------------------------------------
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Tasa BCV State (Persistente en localStorage con fallback)
  const [bcvRate, setBcvRate] = useState<number>(() => {
    const saved = localStorage.getItem('gz_bcv_rate');
    return saved ? parseFloat(saved) : 36.50;
  });
  const [isBcvLoading, setIsBcvLoading] = useState<boolean>(false);

  // 2. Active Session User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gz_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [consoleTypes, setConsoleTypes] = useState<ConsoleType[]>([]);
  const [globalHourlyRate, setGlobalHourlyRate] = useState<number>(2.00);
  const [pcs, setPcs] = useState<PC[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [shiftClosings, setShiftClosings] = useState<ShiftClosing[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // -------------------------------------------------------------
  // HELPER FOR WRITING TO AUDIT LOGS IN DATABASE
  // -------------------------------------------------------------
  const writeLog = async (action: string, details: string, status: 'Éxito' | 'Fallo' | 'Advertencia' = 'Éxito') => {
    try {
      const res = await fetch(apiUrl('/api/audit-logs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.fullName || 'System',
          role: currentUser?.role || 'System',
          action,
          details,
          status
        })
      });
      if (res.ok) {
        const newLog = await res.json();
        setAuditLogs(prev => [newLog, ...prev]);
      }
    } catch (e) {
      console.error("Failed to write audit log to database:", e);
    }
  };

  // -------------------------------------------------------------
  // BCV EXCHANGES RATE LOGIC (Live Fetch with Manual Sync Check)
  // -------------------------------------------------------------
  const fetchBcvRate = async (force: boolean = false) => {
    const isManual = localStorage.getItem('gz_bcv_rate_is_manual') === 'true';
    if (isManual && !force) {
      console.log("[BCV Sync] Usando tasa manual establecida por administrador. Saltando sincronización automática.");
      return;
    }

    setIsBcvLoading(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!res.ok) throw new Error('API Response Error');
      const data = await res.json();
      if (data && data.promedio) {
        const rate = parseFloat(data.promedio);
        setBcvRate(rate);
        localStorage.setItem('gz_bcv_rate', String(rate));
        if (force) {
          localStorage.setItem('gz_bcv_rate_is_manual', 'false');
          writeLog('BCV_SYNC', `Sincronización forzada de tasa BCV exitosa: ${rate} VES/$`, 'Éxito');
        } else {
          writeLog('BCV_SYNC', `Sincronización de tasa BCV exitosa: ${rate} VES/$`, 'Éxito');
        }
      }
    } catch (e: any) {
      console.warn("Falla al conectar a dolarapi. Usando tasa alternativa.", e);
      writeLog('BCV_SYNC', `Fallo al sincronizar tasa BCV: ${e.message || 'Error de red'}. Usando tasa de respaldo.`, 'Advertencia');
    } finally {
      setIsBcvLoading(false);
    }
  };

  useEffect(() => {
    fetchBcvRate(false);
    const interval = setInterval(() => fetchBcvRate(false), 3600000);
    return () => clearInterval(interval);
  }, []);

  const updateBcvRateManually = (rate: number) => {
    setBcvRate(rate);
    localStorage.setItem('gz_bcv_rate', String(rate));
    localStorage.setItem('gz_bcv_rate_is_manual', 'true');
    writeLog('BCV_MANUAL', `Tasa BCV actualizada manualmente a ${rate} VES/$`, 'Éxito');
  };

  // -------------------------------------------------------------
  // FETCH ALL DATA FROM DATABASE PERIODICALLY
  // -------------------------------------------------------------
  const fetchAllData = async () => {
    try {
      const endpoints = {
        users: apiUrl('/api/users'),
        consoleTypes: apiUrl('/api/console-types'),
        pcs: apiUrl('/api/pcs'),
        plans: apiUrl('/api/plans'),
        offers: apiUrl('/api/offers'),
        payments: apiUrl('/api/payments'),
        inventory: apiUrl('/api/inventory'),
        inventoryLogs: apiUrl('/api/inventory-logs'),
        shiftClosings: apiUrl('/api/shift-closings'),
        credentials: apiUrl('/api/credentials'),
        auditLogs: apiUrl('/api/audit-logs'),
      };

      const [
        usersRes,
        consoleTypesRes,
        pcsRes,
        plansRes,
        offersRes,
        paymentsRes,
        inventoryRes,
        inventoryLogsRes,
        shiftClosingsRes,
        credentialsRes,
        auditLogsRes
      ] = await Promise.all([
        fetch(endpoints.users).then(r => r.json()),
        fetch(endpoints.consoleTypes).then(r => r.json()),
        fetch(endpoints.pcs).then(r => r.json()),
        fetch(endpoints.plans).then(r => r.json()),
        fetch(endpoints.offers).then(r => r.json()),
        fetch(endpoints.payments).then(r => r.json()),
        fetch(endpoints.inventory).then(r => r.json()),
        fetch(endpoints.inventoryLogs).then(r => r.json()),
        fetch(endpoints.shiftClosings).then(r => r.json()),
        fetch(endpoints.credentials).then(r => r.json()),
        fetch(endpoints.auditLogs).then(r => r.json()),
      ]);

      if (Array.isArray(usersRes)) setUsers(usersRes);
      if (Array.isArray(consoleTypesRes)) setConsoleTypes(consoleTypesRes);
      if (Array.isArray(pcsRes)) setPcs(pcsRes);
      if (Array.isArray(plansRes)) setPlans(plansRes);
      if (Array.isArray(offersRes)) setOffers(offersRes);
      if (Array.isArray(paymentsRes)) setPayments(paymentsRes);
      if (Array.isArray(inventoryRes)) setInventory(inventoryRes);
      if (Array.isArray(inventoryLogsRes)) setInventoryLogs(inventoryLogsRes);
      if (Array.isArray(shiftClosingsRes)) setShiftClosings(shiftClosingsRes);
      if (Array.isArray(credentialsRes)) setCredentials(credentialsRes);
      if (Array.isArray(auditLogsRes)) setAuditLogs(auditLogsRes);
    } catch (error) {
      console.error('Error fetching data from API server:', error);
    }
  };

  const fetchDynamicData = async () => {
    try {
      const [pcsRes, paymentsRes] = await Promise.all([
        fetch(apiUrl('/api/pcs')).then(r => r.json()),
        fetch(apiUrl('/api/payments')).then(r => r.json())
      ]);
      if (Array.isArray(pcsRes)) setPcs(pcsRes);
      if (Array.isArray(paymentsRes)) setPayments(paymentsRes);
    } catch (error) {
      console.error('Error fetching dynamic data:', error);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchDynamicData, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // -------------------------------------------------------------
  // TIMER TICKER FOR GAME PCs (Client-side smooth UI update)
  // -------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setPcs((prevPcs) => {
        return prevPcs.map((pc) => {
          if (pc.status === 'En Uso' && pc.remainingTime > 0) {
            const newTime = pc.remainingTime - 1;
            if (newTime === 0) {
              return {
                ...pc,
                remainingTime: 0,
                status: 'Bloqueada' as PCStatus,
              };
            }
            return {
              ...pc,
              remainingTime: newTime,
            };
          }
          return pc;
        });
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser]);

  // -------------------------------------------------------------
  // PC OPERATION ACTIONS
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // REAL AUTHENTICATION
  // -------------------------------------------------------------
  const loginUser = async (username: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        localStorage.setItem('gz_current_user', JSON.stringify(user));
        writeLog('LOGIN', `Inicio de sesión exitoso como ${user.fullName} (${user.role})`, 'Éxito');
        return true;
      }
    } catch (e) {
      console.error("Login request failed:", e);
    }
    writeLog('LOGIN_FAIL', `Intento de acceso fallido para el usuario: ${username}`, 'Fallo');
    return false;
  };

  const logoutUser = () => {
    if (currentUser) {
      writeLog('LOGOUT', `Cierre de sesión para ${currentUser.fullName}`, 'Éxito');
      setCurrentUser(null);
      localStorage.removeItem('gz_current_user');
    }
  };

  // -------------------------------------------------------------
  // PC OPERATION ACTIONS
  // -------------------------------------------------------------
  const assignPC = async (pcId: string, clientName: string, durationMinutes: number, offerId?: string, planId?: string) => {
    const seconds = durationMinutes * 60;
    const pc = pcs.find(p => p.id === pcId);
    if (!pc) return;
    let hourlyRate = pc.hourlyRate;
    let finalPrice = (durationMinutes / 60) * hourlyRate;
    let offerDesc = '';

    if (planId) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        finalPrice = plan.priceUsd;
        hourlyRate = (plan.priceUsd / plan.durationMinutes) * 60;
      }
    }

    if (offerId) {
      const offer = offers.find(o => o.id === offerId);
      if (offer) {
        finalPrice = finalPrice * (1 - offer.discountPercentage / 100);
        offerDesc = `${offer.name} (${offer.discountPercentage}% desc)`;
      }
    }

    const sessionId = `sess-${Date.now()}`;

    try {
      await fetch(apiUrl(`/api/pcs/${pcId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'En Uso',
          remainingTime: seconds,
          totalAssignedTime: seconds,
          clientName,
          currentSessionId: sessionId,
        })
      });
      
      writeLog('PC_ASSIGN', `Asignado ${pcId} a "${clientName}" por ${durationMinutes} min. Precio: $${finalPrice.toFixed(2)}. ${offerDesc ? `Oferta: ${offerDesc}` : ''}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error("Failed to assign PC on database:", e);
    }
  };

  const releasePC = async (pcId: string) => {
    try {
      await fetch(apiUrl(`/api/pcs/${pcId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Disponible',
          remainingTime: 0,
          totalAssignedTime: 0,
          clientName: null,
          currentSessionId: null,
        })
      });
      writeLog('PC_RELEASE', `PC ${pcId} liberada manualmente. Se eliminó el tiempo restante.`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const pausePC = async (pcId: string) => {
    try {
      await fetch(apiUrl(`/api/pcs/${pcId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Suspendida' })
      });
      writeLog('PC_PAUSE', `Sesión pausada en ${pcId}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const resumePC = async (pcId: string) => {
    try {
      await fetch(apiUrl(`/api/pcs/${pcId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'En Uso' })
      });
      writeLog('PC_RESUME', `Sesión reanudada en ${pcId}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const addTimeToPC = async (pcId: string, additionalMinutes: number) => {
    const pc = pcs.find(p => p.id === pcId);
    if (!pc) return;
    const additionalSeconds = additionalMinutes * 60;
    try {
      await fetch(apiUrl(`/api/pcs/${pcId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'En Uso',
          remainingTime: pc.remainingTime + additionalSeconds,
          totalAssignedTime: pc.totalAssignedTime + additionalSeconds,
        })
      });
      writeLog('PC_ADD_TIME', `Agregados ${additionalMinutes} min a ${pcId}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const addPC = async (pcData: Omit<PC, 'id' | 'status' | 'remainingTime' | 'totalAssignedTime'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/pcs/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pcData.pcName.trim().toUpperCase(),
          pcName: pcData.pcName,
          ipAddress: pcData.ipAddress,
          hourlyRate: pcData.hourlyRate,
          details: pcData.details,
          consoleTypeId: pcData.consoleTypeId
        })
      });
      if (res.ok) {
        const newPC = await res.json();
        writeLog('PC_CREATE', `Equipo creado: ${newPC.id} (${newPC.pcName}) - IP: ${newPC.ipAddress}`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updatePC = async (id: string, updatedFields: Partial<PC>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      await fetch(apiUrl(`/api/pcs/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      writeLog('PC_UPDATE', `Equipo actualizado: ${id}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const deletePC = async (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      await fetch(apiUrl(`/api/pcs/${id}`), {
        method: 'DELETE'
      });
      writeLog('PC_DELETE', `Equipo eliminado: ${id}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // PAYMENTS MANAGEMENT
  // -------------------------------------------------------------
  const registerPayment = async (paymentData: Omit<Payment, 'id' | 'operatorId' | 'operatorName' | 'status' | 'createdAt'>) => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl('/api/payments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          operatorId: currentUser.id
        })
      });
      if (res.ok) {
        writeLog('PAYMENT_REGISTER', `Pago registrado por ${currentUser.fullName}: $${paymentData.amountUsd.toFixed(2)} (${paymentData.amountVes.toFixed(2)} VES) via ${paymentData.paymentMethod}`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validatePayment = async (paymentId: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      await fetch(apiUrl(`/api/payments/${paymentId}/validate`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validatorId: currentUser.id })
      });
      writeLog('PAYMENT_VALIDATE', `Administrador ${currentUser.fullName} validó el pago ${paymentId}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      await fetch(apiUrl(`/api/payments/${paymentId}/reject`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validatorId: currentUser.id })
      });
      writeLog('PAYMENT_REJECT', `Administrador ${currentUser.fullName} rechazó el pago ${paymentId}`, 'Advertencia');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // SHIFT CLOSING (Cerrar Caja)
  // -------------------------------------------------------------
  const closeShift = async (details: { cashUsd: number; cashVes: number; notes: string }) => {
    if (!currentUser) throw new Error('No user connected');
    
    const today = new Date().toDateString();
    const operatorPayments = payments.filter((p) => {
      const pDate = new Date(p.createdAt).toDateString();
      return p.operatorId === currentUser.id && pDate === today;
    });

    const totalUsdGenerated = operatorPayments
      .filter((p) => p.status === 'Validado' || p.status === 'Pendiente')
      .reduce((sum, p) => sum + p.amountUsd, 0);

    const totalVesGenerated = operatorPayments
      .filter((p) => p.status === 'Validado' || p.status === 'Pendiente')
      .reduce((sum, p) => sum + p.amountVes, 0);

    const pmVes = operatorPayments
      .filter(p => p.paymentMethod === 'Pago Móvil')
      .reduce((sum, p) => sum + p.amountVes, 0);

    const posVes = operatorPayments
      .filter(p => p.paymentMethod === 'Punto de Venta')
      .reduce((sum, p) => sum + p.amountVes, 0);

    const totalTimeMinutes = operatorPayments.length * 60; 

    const bodyData = {
      operatorId: currentUser.id,
      startTime: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
      totalUsdGenerated,
      totalVesGenerated,
      totalTimeMinutes,
      details: {
        cashUsd: details.cashUsd,
        cashVes: details.cashVes,
        pagoMovilVes: pmVes,
        posVes: posVes,
        paymentsCount: operatorPayments.length,
        notes: details.notes,
      }
    };

    try {
      const res = await fetch(apiUrl('/api/shift-closings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        const newClosing = await res.json();
        writeLog('SHIFT_CLOSE', `Cierre de Caja registrado por ${currentUser.fullName}. USD Generado: $${totalUsdGenerated.toFixed(2)}, VES Generado: ${totalVesGenerated.toFixed(2)} Bs.`, 'Éxito');
        fetchAllData();
        return newClosing;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // -------------------------------------------------------------
  // STAFF MANAGEMENT (CRUD)
  // -------------------------------------------------------------
  const addUser = async (username: string, fullName: string, role: UserRole, password?: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, role, password })
      });
      if (res.ok) {
        writeLog('USER_CREATE', `Usuario creado: ${fullName} con rol ${role}`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateUser = async (id: string, fullName: string, role: UserRole, status: 'Activo' | 'Inactivo', password?: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, role, status, password })
      });
      if (res.ok) {
        writeLog('USER_UPDATE', `Usuario actualizado: ${fullName} (Rol: ${role}, Estado: ${status})`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (id: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      await fetch(apiUrl(`/api/users/${id}`), {
        method: 'DELETE'
      });
      writeLog('USER_DELETE', `Usuario inhabilitado ID: ${id}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // INVENTORY MANAGEMENT
  // -------------------------------------------------------------
  const restockProduct = async (id: string, amount: number, reason: string) => {
    if (!currentUser) return;
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    try {
      await fetch(apiUrl('/api/inventory-logs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: id,
          changeAmount: amount,
          reason,
          userName: currentUser.fullName
        })
      });

      await fetch(apiUrl(`/api/inventory/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: item.stock + amount
        })
      });

      writeLog('INV_RESTOCK', `Producto reabastecido: ${item.name} (+${amount} unidades). Motivo: ${reason}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const sellProduct = async (
    id: string,
    amount: number,
    paymentMethod: PaymentMethod = 'Efectivo $',
    reference?: string,
    receiptImageUrl?: string,
    skipPayment: boolean = false
  ) => {
    if (!currentUser) return;
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    try {
      await fetch(apiUrl('/api/inventory-logs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: id,
          changeAmount: -amount,
          reason: 'Venta Directa',
          userName: currentUser.fullName
        })
      });

      await fetch(apiUrl(`/api/inventory/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: Math.max(0, item.stock - amount)
        })
      });

      const totalCostUsd = item.priceUsd * amount;
      const totalCostVes = totalCostUsd * bcvRate;
      
      if (!skipPayment) {
        await registerPayment({
          amountUsd: totalCostUsd,
          amountVes: totalCostVes,
          bcvRate,
          paymentMethod,
          reference: reference || undefined,
          receiptImageUrl: receiptImageUrl || undefined,
          offerApplied: `Venta Inventario: ${item.name} x${amount}`,
        });
      }

      writeLog('INV_SALE', `Producto vendido: ${item.name} (x${amount} unidades). Total: $${totalCostUsd.toFixed(2)}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const addProduct = async (productData: Omit<InventoryItem, 'id'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/inventory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const newItem = await res.json();
        writeLog('INV_CREATE', `Nuevo producto en inventario: ${newItem.name} (Compra: $${newItem.purchasePrice.toFixed(2)}, Venta: $${newItem.priceUsd.toFixed(2)})`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // PLANS & OFFERS
  // -------------------------------------------------------------
  const addPlan = async (planData: Omit<Plan, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/plans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });
      if (res.ok) {
        const newPlan = await res.json();
        writeLog('PLAN_CREATE', `Plan creado: ${newPlan.name} ($${newPlan.priceUsd.toFixed(2)}, ${newPlan.durationMinutes} min)`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updatePlan = async (id: string, updatedFields: Partial<Plan>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl(`/api/plans/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const up = await res.json();
        writeLog('PLAN_UPDATE', `Plan actualizado: ${up.name} ($${up.priceUsd.toFixed(2)}, Activo: ${up.isActive})`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addOffer = async (offerData: Omit<Offer, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/offers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      });
      if (res.ok) {
        const newOffer = await res.json();
        writeLog('OFFER_CREATE', `Oferta creada: ${newOffer.name} (${newOffer.discountPercentage}% desc)`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateOffer = async (id: string, updatedFields: Partial<Offer>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl(`/api/offers/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const uo = await res.json();
        writeLog('OFFER_UPDATE', `Oferta actualizada: ${uo.name} (${uo.discountPercentage}% desc, Activa: ${uo.isActive})`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // CREDENTIALS
  // -------------------------------------------------------------
  const addCredential = async (credData: Omit<Credential, 'id'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/credentials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credData)
      });
      if (res.ok) {
        const newCred = await res.json();
        writeLog('CRED_CREATE', `Credencial registrada: ${newCred.entityName} (${newCred.category})`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCredential = async (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      await fetch(apiUrl(`/api/credentials/${id}`), {
        method: 'DELETE'
      });
      writeLog('CRED_DELETE', `Credencial eliminada ID: ${id}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // CONSOLE TYPES MANAGEMENT
  // -------------------------------------------------------------
  const addConsoleType = async (ctData: Omit<ConsoleType, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl('/api/console-types'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctData)
      });
      if (res.ok) {
        const newCt = await res.json();
        writeLog('CONSOLE_TYPE_CREATE', `Tipo de consola creado: ${newCt.name} (${newCt.emoji}) - Tarifa: $${newCt.hourlyRate.toFixed(2)}/h`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateConsoleType = async (id: string, updatedFields: Partial<ConsoleType>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      const res = await fetch(apiUrl(`/api/console-types/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const uct = await res.json();
        writeLog('CONSOLE_TYPE_UPDATE', `Tipo de consola actualizado: ${uct.name} - Tarifa: $${uct.hourlyRate.toFixed(2)}/h, Activo: ${uct.isActive}`, 'Éxito');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteConsoleType = async (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    try {
      await fetch(apiUrl(`/api/console-types/${id}`), {
        method: 'DELETE'
      });
      writeLog('CONSOLE_TYPE_DELETE', `Tipo de consola inhabilitado ID: ${id}`, 'Éxito');
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateGlobalRate = (rate: number) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    setGlobalHourlyRate(rate);
    localStorage.setItem('gz_global_rate', String(rate));
    writeLog('GLOBAL_RATE_UPDATE', `Tarifa global por hora actualizada a $${rate.toFixed(2)}/h`, 'Éxito');
  };

  // Context value assignment
  return (
    <AppStateContext.Provider
      value={{
        currentUser,
        users,
        pcs,
        plans,
        offers,
        payments,
        inventory,
        inventoryLogs,
        shiftClosings,
        credentials,
        auditLogs,
        bcvRate,
        isBcvLoading,
        consoleTypes,
        globalHourlyRate,
        
        loginUser,
        logoutUser,
        fetchBcvRate,
        updateBcvRateManually,
        
        assignPC,
        releasePC,
        pausePC,
        resumePC,
        addTimeToPC,
        addPC,
        updatePC,
        deletePC,
        
        registerPayment,
        validatePayment,
        rejectPayment,
        closeShift,
        
        addUser,
        updateUser,
        deleteUser,
        
        restockProduct,
        sellProduct,
        addProduct,
        
        addPlan,
        updatePlan,
        addOffer,
        updateOffer,
        
        addCredential,
        deleteCredential,

        addConsoleType,
        updateConsoleType,
        deleteConsoleType,
        updateGlobalRate,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
};

