import React, { createContext, useContext, useState, useEffect } from 'react';

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
  loginUser: (username: string, password?: string) => boolean;
  logoutUser: () => void;
  
  // BCV Rate
  fetchBcvRate: () => Promise<void>;
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
  closeShift: (details: { cashUsd: number; cashVes: number; notes: string }) => ShiftClosing;
  
  // Staff CRUD
  addUser: (username: string, fullName: string, role: UserRole, password?: string) => void;
  updateUser: (id: string, fullName: string, role: UserRole, status: 'Activo' | 'Inactivo', password?: string) => void;
  deleteUser: (id: string) => void;
  
  // Inventory
  restockProduct: (id: string, amount: number, reason: string) => void;
  sellProduct: (id: string, amount: number) => void;
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
  // 1. Tasa BCV State
  const [bcvRate, setBcvRate] = useState<number>(36.50);
  const [isBcvLoading, setIsBcvLoading] = useState<boolean>(false);

  // 2. Active Session User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gz_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gz_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((u: any) => ({
        ...u,
        password: u.password ?? u.username
      }));
      return migrated;
    }
    const initialUsers: User[] = [
      { id: 'usr-1', username: 'admin', fullName: 'Carlos Mendoza', password: 'admin', role: 'Admin', status: 'Activo', createdAt: new Date().toISOString() },
      { id: 'usr-2', username: 'supervisor', fullName: 'Elena Rivas', password: 'supervisor', role: 'Encargado', status: 'Activo', createdAt: new Date().toISOString() },
      { id: 'usr-3', username: 'operador1', fullName: 'Juan Torres', password: 'operador1', role: 'Operador', status: 'Activo', createdAt: new Date().toISOString() },
    ];
    localStorage.setItem('gz_users', JSON.stringify(initialUsers));
    return initialUsers;
  });

  // Console Types
  const [consoleTypes, setConsoleTypes] = useState<ConsoleType[]>(() => {
    const saved = localStorage.getItem('gz_console_types');
    if (saved) return JSON.parse(saved);
    const initial: ConsoleType[] = [
      { id: 'ct-1', name: 'PC Gaming', emoji: '🖥️', hourlyRate: 2.00, isActive: true },
      { id: 'ct-2', name: 'PlayStation 5', emoji: '🎮', hourlyRate: 3.00, isActive: true },
      { id: 'ct-3', name: 'Simulador', emoji: '🏎️', hourlyRate: 5.00, isActive: true },
      { id: 'ct-4', name: 'Nintendo Switch', emoji: '🕹️', hourlyRate: 2.50, isActive: true },
    ];
    localStorage.setItem('gz_console_types', JSON.stringify(initial));
    return initial;
  });

  const [globalHourlyRate, setGlobalHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('gz_global_rate');
    return saved ? parseFloat(saved) : 2.00;
  });

  const [pcs, setPcs] = useState<PC[]>(() => {
    const saved = localStorage.getItem('gz_pcs');
    if (saved) return JSON.parse(saved);
    const initialPcs: PC[] = Array.from({ length: 10 }, (_, i) => {
      const id = `PC-${String(i + 1).padStart(2, '0')}`;
      return {
        id,
        pcName: `Gaming Zone ${id}`,
        ipAddress: `192.168.1.${100 + i}`,
        status: 'Disponible',
        hourlyRate: 2.00,
        details: 'Core i7-12700K, RTX 3070, 32GB RAM, Pantalla 144Hz',
        remainingTime: 0,
        totalAssignedTime: 0,
        consoleTypeId: 'ct-1',
      };
    });
    localStorage.setItem('gz_pcs', JSON.stringify(initialPcs));
    return initialPcs;
  });

  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem('gz_plans');
    if (saved) return JSON.parse(saved);
    const initialPlans: Plan[] = [
      { id: 'pl-1', name: 'Plan 1 Hora', description: 'Acceso estándar a PC por 1 hora', durationMinutes: 60, priceUsd: 2.00, isActive: true },
      { id: 'pl-2', name: 'Plan 3 Horas', description: 'Acceso con descuento por 3 horas', durationMinutes: 180, priceUsd: 5.00, isActive: true },
      { id: 'pl-3', name: 'Plan Nocturno (Night Shift)', description: 'Juega toda la noche desde las 10 PM a 6 AM', durationMinutes: 480, priceUsd: 10.00, isActive: true },
    ];
    localStorage.setItem('gz_plans', JSON.stringify(initialPlans));
    return initialPlans;
  });

  const [offers, setOffers] = useState<Offer[]>(() => {
    const saved = localStorage.getItem('gz_offers');
    if (saved) return JSON.parse(saved);
    const initialOffers: Offer[] = [
      { id: 'of-1', name: 'Lunes de Locura 50%', description: '50% de descuento en tarifas por hora los lunes', discountPercentage: 50, dayOfWeek: 1, isActive: true },
      { id: 'of-2', name: 'Combo Miércoles Gamer', description: '30% de descuento en la tarifa', discountPercentage: 30, dayOfWeek: 3, isActive: true },
    ];
    localStorage.setItem('gz_offers', JSON.stringify(initialOffers));
    return initialOffers;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('gz_payments');
    if (saved) return JSON.parse(saved);
    const initialPayments: Payment[] = [];
    localStorage.setItem('gz_payments', JSON.stringify(initialPayments));
    return initialPayments;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('gz_inventory');
    if (saved) {
      // Migrate existing data to include purchasePrice if missing
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((item: any) => ({
        ...item,
        purchasePrice: item.purchasePrice ?? Math.round(item.priceUsd * 0.6 * 100) / 100
      }));
      return migrated;
    }
    const initialInventory: InventoryItem[] = [
      { id: 'inv-1', name: 'Coca-Cola 355ml', description: 'Lata fría', purchasePrice: 0.80, priceUsd: 1.50, stock: 24, minStock: 5, category: 'Bebidas' },
      { id: 'inv-2', name: 'Pepsi 355ml', description: 'Lata fría', purchasePrice: 0.65, priceUsd: 1.25, stock: 15, minStock: 5, category: 'Bebidas' },
      { id: 'inv-3', name: 'Doritos Mega', description: 'Bolsa grande sabor queso', purchasePrice: 1.20, priceUsd: 2.00, stock: 10, minStock: 3, category: 'Snacks' },
      { id: 'inv-4', name: 'Papas Lays', description: 'Sabor natural bolsa mediana', purchasePrice: 1.00, priceUsd: 1.75, stock: 4, minStock: 5, category: 'Snacks' },
    ];
    localStorage.setItem('gz_inventory', JSON.stringify(initialInventory));
    return initialInventory;
  });

  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
    const saved = localStorage.getItem('gz_inventory_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [shiftClosings, setShiftClosings] = useState<ShiftClosing[]>(() => {
    const saved = localStorage.getItem('gz_shift_closings');
    return saved ? JSON.parse(saved) : [];
  });

  const [credentials, setCredentials] = useState<Credential[]>(() => {
    const saved = localStorage.getItem('gz_credentials');
    if (saved) return JSON.parse(saved);
    const initialCreds: Credential[] = [
      { id: 'cr-1', entityName: 'PC-01 Windows Access', loginUsername: 'AdminGZ01', loginPassword: 'GZPassWord_01', category: 'PC Login', notes: 'Acceso de red local' },
      { id: 'cr-2', entityName: 'Steam Acc 01 (CS2 / Dota2)', loginUsername: 'gz_valvesteam1', loginPassword: 'SteamSecureKey2026', category: 'Steam', notes: 'Cuenta pública con skins' },
      { id: 'cr-3', entityName: 'Riot Games Acc (Valorant)', loginUsername: 'gamezone_riot_02', loginPassword: 'RiotAccountZone26', category: 'Riot Games', notes: 'Rango Platino 2' },
    ];
    localStorage.setItem('gz_credentials', JSON.stringify(initialCreds));
    return initialCreds;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('gz_audit_logs');
    if (saved) return JSON.parse(saved);
    const initialLogs: AuditLog[] = [
      { id: 'log-1', username: 'System', role: 'System', action: 'STARTUP', details: 'Inicialización de la base de datos local de Game Zone', status: 'Éxito', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem('gz_audit_logs', JSON.stringify(initialLogs));
    return initialLogs;
  });

  // -------------------------------------------------------------
  // HELPER FOR WRITING TO LOCALSTORAGE & AUDIT LOGS
  // -------------------------------------------------------------
  const writeLog = (action: string, details: string, status: 'Éxito' | 'Fallo' | 'Advertencia' = 'Éxito') => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUser?.id,
      username: currentUser?.fullName || 'System',
      role: currentUser?.role || 'System',
      action,
      details,
      status,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 1000); // limit to 1000 items
      localStorage.setItem('gz_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Sync state helpers
  const saveToDisk = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // -------------------------------------------------------------
  // BCV EXCHANGES RATE LOGIC (Live Fetch)
  // -------------------------------------------------------------
  const fetchBcvRate = async () => {
    setIsBcvLoading(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!res.ok) throw new Error('API Response Error');
      const data = await res.json();
      if (data && data.promedio) {
        const rate = parseFloat(data.promedio);
        setBcvRate(rate);
        writeLog('BCV_SYNC', `Sincronización de tasa BCV exitosa: ${rate} VES/$`, 'Éxito');
      }
    } catch (e: any) {
      console.warn("Falla al conectar a dolarapi. Usando tasa alternativa.", e);
      writeLog('BCV_SYNC', `Fallo al sincronizar tasa BCV: ${e.message || 'Error de red'}. Usando tasa de respaldo.`, 'Advertencia');
    } finally {
      setIsBcvLoading(false);
    }
  };

  useEffect(() => {
    fetchBcvRate();
    // Auto-fetch hourly
    const interval = setInterval(fetchBcvRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Sync PCs from Local server on startup
  useEffect(() => {
    const fetchPcsFromServer = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/pcs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPcs(data);
            localStorage.setItem('gz_pcs', JSON.stringify(data));
          }
        }
      } catch (e) {
        console.log("Server offline, using localStorage for PCs.");
      }
    };
    fetchPcsFromServer();
  }, []);

  // Sync PCs to Local server on state changes
  useEffect(() => {
    const syncPcsToServer = async () => {
      try {
        await fetch('http://localhost:5000/api/pcs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pcs),
        });
      } catch (e) {
        // Silent catch: server might be offline
      }
    };
    if (pcs.length > 0) {
      localStorage.setItem('gz_pcs', JSON.stringify(pcs));
      syncPcsToServer();
    }
  }, [pcs]);

  const updateBcvRateManually = (rate: number) => {
    setBcvRate(rate);
    writeLog('BCV_MANUAL', `Tasa BCV actualizada manualmente a ${rate} VES/$`, 'Éxito');
  };

  // -------------------------------------------------------------
  // REAL AUTHENTICATION
  // -------------------------------------------------------------
  const loginUser = (username: string, password?: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.status === 'Activo');
    if (user && (user.password === password || !user.password)) {
      setCurrentUser(user);
      localStorage.setItem('gz_current_user', JSON.stringify(user));
      writeLog('LOGIN', `Inicio de sesión exitoso como ${user.fullName} (${user.role})`, 'Éxito');
      return true;
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
  // TIMER TICKER FOR GAME PCS
  // -------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setPcs((prevPcs) => {
        let changed = false;
        const updated = prevPcs.map((pc) => {
          if (pc.status === 'En Uso' && pc.remainingTime > 0) {
            changed = true;
            const newTime = pc.remainingTime - 1;
            if (newTime === 0) {
              // PC locks!
              writeLog('PC_LOCK', `El tiempo de juego en ${pc.id} llegó a 0. Pantalla bloqueada automáticamente.`, 'Advertencia');
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

        if (changed) {
          saveToDisk('gz_pcs', updated);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser]);

  // -------------------------------------------------------------
  // PC OPERATION ACTIONS
  // -------------------------------------------------------------
  const assignPC = (pcId: string, clientName: string, durationMinutes: number, offerId?: string, planId?: string) => {
    setPcs((prevPcs) => {
      const updated = prevPcs.map((pc) => {
        if (pc.id === pcId) {
          const seconds = durationMinutes * 60;
          let hourlyRate = pc.hourlyRate;
          let finalPrice = (durationMinutes / 60) * hourlyRate;
          let offerDesc = '';

          // Apply plan price if selected
          if (planId) {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
              finalPrice = plan.priceUsd;
              hourlyRate = (plan.priceUsd / plan.durationMinutes) * 60;
            }
          }

          // Apply discount offer if selected
          if (offerId) {
            const offer = offers.find(o => o.id === offerId);
            if (offer) {
              finalPrice = finalPrice * (1 - offer.discountPercentage / 100);
              offerDesc = `${offer.name} (${offer.discountPercentage}% desc)`;
            }
          }

          writeLog('PC_ASSIGN', `Asignado ${pc.id} a "${clientName}" por ${durationMinutes} min. Precio: $${finalPrice.toFixed(2)}. ${offerDesc ? `Oferta: ${offerDesc}` : ''}`, 'Éxito');
          
          return {
            ...pc,
            status: 'En Uso' as PCStatus,
            remainingTime: seconds,
            totalAssignedTime: seconds,
            clientName,
            currentSessionId: `sess-${Date.now()}`,
          };
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const releasePC = (pcId: string) => {
    setPcs((prevPcs) => {
      const updated = prevPcs.map((pc) => {
        if (pc.id === pcId) {
          writeLog('PC_RELEASE', `PC ${pc.id} liberada manualmente. Se eliminó el tiempo restante.`, 'Éxito');
          return {
            ...pc,
            status: 'Disponible' as PCStatus,
            remainingTime: 0,
            totalAssignedTime: 0,
            clientName: undefined,
            currentSessionId: undefined,
          };
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const pausePC = (pcId: string) => {
    setPcs((prevPcs) => {
      const updated = prevPcs.map((pc) => {
        if (pc.id === pcId && pc.status === 'En Uso') {
          writeLog('PC_PAUSE', `Sesión pausada en ${pc.id}`, 'Éxito');
          return { ...pc, status: 'Suspendida' as PCStatus };
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const resumePC = (pcId: string) => {
    setPcs((prevPcs) => {
      const updated = prevPcs.map((pc) => {
        if (pc.id === pcId && pc.status === 'Suspendida') {
          writeLog('PC_RESUME', `Sesión reanudada en ${pc.id}`, 'Éxito');
          return { ...pc, status: 'En Uso' as PCStatus };
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const addTimeToPC = (pcId: string, additionalMinutes: number) => {
    setPcs((prevPcs) => {
      const updated = prevPcs.map((pc) => {
        if (pc.id === pcId && (pc.status === 'En Uso' || pc.status === 'Bloqueada')) {
          const additionalSeconds = additionalMinutes * 60;
          writeLog('PC_ADD_TIME', `Agregados ${additionalMinutes} min a ${pc.id}`, 'Éxito');
          return {
            ...pc,
            status: 'En Uso' as PCStatus,
            remainingTime: pc.remainingTime + additionalSeconds,
            totalAssignedTime: pc.totalAssignedTime + additionalSeconds,
          };
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const addPC = (pcData: Omit<PC, 'id' | 'status' | 'remainingTime' | 'totalAssignedTime'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newPC: PC = {
      ...pcData,
      id: pcData.pcName.trim().toUpperCase(),
      status: 'Disponible',
      remainingTime: 0,
      totalAssignedTime: 0,
    };
    setPcs((prev) => {
      const updated = [...prev, newPC];
      saveToDisk('gz_pcs', updated);
      return updated;
    });
    writeLog('PC_CREATE', `Equipo creado: ${newPC.id} (${newPC.pcName}) - IP: ${newPC.ipAddress}`, 'Éxito');
  };

  const updatePC = (id: string, updatedFields: Partial<PC>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    setPcs((prev) => {
      const updated = prev.map((pc) => {
        if (pc.id === id) {
          const up = { ...pc, ...updatedFields };
          writeLog('PC_UPDATE', `Equipo actualizado: ${up.id} - Estado: ${up.status}`, 'Éxito');
          return up;
        }
        return pc;
      });
      saveToDisk('gz_pcs', updated);
      return updated;
    });
  };

  const deletePC = (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const pc = pcs.find(p => p.id === id);
    if (pc) {
      setPcs((prev) => {
        const updated = prev.filter(p => p.id !== id);
        saveToDisk('gz_pcs', updated);
        return updated;
      });
      writeLog('PC_DELETE', `Equipo eliminado: ${pc.id}`, 'Éxito');
    }
  };

  // -------------------------------------------------------------
  // PAYMENTS MANAGEMENT
  // -------------------------------------------------------------
  const registerPayment = (paymentData: Omit<Payment, 'id' | 'operatorId' | 'operatorName' | 'status' | 'createdAt'>) => {
    if (!currentUser) return;
    const newPayment: Payment = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      operatorId: currentUser.id,
      operatorName: currentUser.fullName,
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => {
      const updated = [newPayment, ...prev];
      saveToDisk('gz_payments', updated);
      return updated;
    });

    writeLog('PAYMENT_REGISTER', `Pago registrado por ${currentUser.fullName}: $${paymentData.amountUsd.toFixed(2)} (${paymentData.amountVes.toFixed(2)} VES) via ${paymentData.paymentMethod}${paymentData.reference ? ` Ref: ${paymentData.reference}` : ''}`, 'Éxito');
  };

  const validatePayment = (paymentId: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    setPayments((prev) => {
      const updated = prev.map((pay) => {
        if (pay.id === paymentId) {
          writeLog('PAYMENT_VALIDATE', `Administrador ${currentUser.fullName} validó el pago ${pay.id} por $${pay.amountUsd.toFixed(2)}`, 'Éxito');
          return {
            ...pay,
            status: 'Validado' as PaymentStatus,
            validatorId: currentUser.id,
            validatorName: currentUser.fullName,
            validatedAt: new Date().toISOString(),
          };
        }
        return pay;
      });
      saveToDisk('gz_payments', updated);
      return updated;
    });
  };

  const rejectPayment = (paymentId: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    setPayments((prev) => {
      const updated = prev.map((pay) => {
        if (pay.id === paymentId) {
          writeLog('PAYMENT_REJECT', `Administrador ${currentUser.fullName} rechazó el pago ${pay.id}`, 'Advertencia');
          return {
            ...pay,
            status: 'Rechazado' as PaymentStatus,
            validatorId: currentUser.id,
            validatorName: currentUser.fullName,
            validatedAt: new Date().toISOString(),
          };
        }
        return pay;
      });
      saveToDisk('gz_payments', updated);
      return updated;
    });
  };

  // -------------------------------------------------------------
  // SHIFT CLOSING (Cerrar Caja)
  // -------------------------------------------------------------
  const closeShift = (details: { cashUsd: number; cashVes: number; notes: string }) => {
    if (!currentUser) throw new Error('No user connected');
    
    // Filter today's payments created by this operator
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

    // Sum details methods
    const pmVes = operatorPayments
      .filter(p => p.paymentMethod === 'Pago Móvil')
      .reduce((sum, p) => sum + p.amountVes, 0);

    const posVes = operatorPayments
      .filter(p => p.paymentMethod === 'Punto de Venta')
      .reduce((sum, p) => sum + p.amountVes, 0);

    // Simulated total game time (e.g. 180 min)
    const totalTimeMinutes = operatorPayments.length * 60; 

    const newClosing: ShiftClosing = {
      id: `shift-${Date.now()}`,
      operatorId: currentUser.id,
      operatorName: currentUser.fullName,
      startTime: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), // mock shift start at 8:00 AM
      endTime: new Date().toISOString(),
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
      },
      createdAt: new Date().toISOString(),
    };

    setShiftClosings((prev) => {
      const updated = [newClosing, ...prev];
      saveToDisk('gz_shift_closings', updated);
      return updated;
    });

    writeLog('SHIFT_CLOSE', `Cierre de Caja registrado por ${currentUser.fullName}. USD Generado: $${totalUsdGenerated.toFixed(2)}, VES Generado: ${totalVesGenerated.toFixed(2)} Bs.`, 'Éxito');
    return newClosing;
  };

  // -------------------------------------------------------------
  // STAFF MANAGEMENT (CRUD)
  // -------------------------------------------------------------
  const addUser = (username: string, fullName: string, role: UserRole, password?: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: username.toLowerCase().trim(),
      fullName,
      password: password || username.toLowerCase().trim(),
      role,
      status: 'Activo',
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => {
      const updated = [...prev, newUser];
      saveToDisk('gz_users', updated);
      return updated;
    });
    writeLog('USER_CREATE', `Usuario creado: ${fullName} con rol ${role}`, 'Éxito');
  };

  const updateUser = (id: string, fullName: string, role: UserRole, status: 'Activo' | 'Inactivo', password?: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          writeLog('USER_UPDATE', `Usuario actualizado: ${fullName} (Rol: ${role}, Estado: ${status})`, 'Éxito');
          const updatedUser = { ...u, fullName, role, status };
          if (password) {
            updatedUser.password = password;
          }
          return updatedUser;
        }
        return u;
      });
      saveToDisk('gz_users', updated);
      return updated;
    });
  };

  const deleteUser = (id: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const user = users.find(u => u.id === id);
    if (user) {
      setUsers((prev) => {
        const updated = prev.filter(u => u.id !== id);
        saveToDisk('gz_users', updated);
        return updated;
      });
      writeLog('USER_DELETE', `Usuario eliminado: ${user.fullName}`, 'Éxito');
    }
  };

  // -------------------------------------------------------------
  // INVENTORY MANAGEMENT
  // -------------------------------------------------------------
  const restockProduct = (id: string, amount: number, reason: string) => {
    if (!currentUser) return;
    setInventory((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newStock = item.stock + amount;
          
          // Log restocking
          const log: InventoryLog = {
            id: `invlog-${Date.now()}`,
            productId: item.id,
            productName: item.name,
            userName: currentUser.fullName,
            changeAmount: amount,
            reason,
            createdAt: new Date().toISOString(),
          };
          setInventoryLogs((prevLogs) => {
            const updatedLogs = [log, ...prevLogs];
            saveToDisk('gz_inventory_logs', updatedLogs);
            return updatedLogs;
          });

          writeLog('INV_RESTOCK', `Producto reabastecido: ${item.name} (+${amount} unidades). Motivo: ${reason}`, 'Éxito');
          return { ...item, stock: newStock };
        }
        return item;
      });
      saveToDisk('gz_inventory', updated);
      return updated;
    });
  };

  const sellProduct = (id: string, amount: number) => {
    if (!currentUser) return;
    setInventory((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newStock = Math.max(0, item.stock - amount);
          
          // Log sale
          const log: InventoryLog = {
            id: `invlog-${Date.now()}`,
            productId: item.id,
            productName: item.name,
            userName: currentUser.fullName,
            changeAmount: -amount,
            reason: 'Venta Directa',
            createdAt: new Date().toISOString(),
          };
          setInventoryLogs((prevLogs) => {
            const updatedLogs = [log, ...prevLogs];
            saveToDisk('gz_inventory_logs', updatedLogs);
            return updatedLogs;
          });

          // Create standard transaction
          const totalCostUsd = item.priceUsd * amount;
          const totalCostVes = totalCostUsd * bcvRate;
          registerPayment({
            amountUsd: totalCostUsd,
            amountVes: totalCostVes,
            bcvRate,
            paymentMethod: 'Efectivo $', // default payment
            offerApplied: `Venta Inventario: ${item.name} x${amount}`,
          });

          writeLog('INV_SALE', `Producto vendido: ${item.name} (x${amount} unidades). Total: $${totalCostUsd.toFixed(2)}`, 'Éxito');
          return { ...item, stock: newStock };
        }
        return item;
      });
      saveToDisk('gz_inventory', updated);
      return updated;
    });
  };

  const addProduct = (productData: Omit<InventoryItem, 'id'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newItem: InventoryItem = {
      ...productData,
      id: `inv-${Date.now()}`,
    };
    setInventory((prev) => {
      const updated = [...prev, newItem];
      saveToDisk('gz_inventory', updated);
      return updated;
    });
    writeLog('INV_CREATE', `Nuevo producto en inventario: ${newItem.name} (Compra: $${newItem.purchasePrice.toFixed(2)}, Venta: $${newItem.priceUsd.toFixed(2)})`, 'Éxito');
  };

  // -------------------------------------------------------------
  // PLANS & OFFERS
  // -------------------------------------------------------------
  const addPlan = (planData: Omit<Plan, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newPlan: Plan = {
      ...planData,
      id: `pl-${Date.now()}`,
      isActive: true,
    };
    setPlans((prev) => {
      const updated = [...prev, newPlan];
      saveToDisk('gz_plans', updated);
      return updated;
    });
    writeLog('PLAN_CREATE', `Plan creado: ${newPlan.name} ($${newPlan.priceUsd.toFixed(2)}, ${newPlan.durationMinutes} min)`, 'Éxito');
  };

  const updatePlan = (id: string, updatedFields: Partial<Plan>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    setPlans((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const up = { ...p, ...updatedFields };
          writeLog('PLAN_UPDATE', `Plan actualizado: ${up.name} ($${up.priceUsd.toFixed(2)}, Activo: ${up.isActive})`, 'Éxito');
          return up;
        }
        return p;
      });
      saveToDisk('gz_plans', updated);
      return updated;
    });
  };

  const addOffer = (offerData: Omit<Offer, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newOffer: Offer = {
      ...offerData,
      id: `of-${Date.now()}`,
      isActive: true,
    };
    setOffers((prev) => {
      const updated = [...prev, newOffer];
      saveToDisk('gz_offers', updated);
      return updated;
    });
    writeLog('OFFER_CREATE', `Oferta creada: ${newOffer.name} (${newOffer.discountPercentage}% desc)`, 'Éxito');
  };

  const updateOffer = (id: string, updatedFields: Partial<Offer>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    setOffers((prev) => {
      const updated = prev.map((o) => {
        if (o.id === id) {
          const uo = { ...o, ...updatedFields };
          writeLog('OFFER_UPDATE', `Oferta actualizada: ${uo.name} (${uo.discountPercentage}% desc, Activa: ${uo.isActive})`, 'Éxito');
          return uo;
        }
        return o;
      });
      saveToDisk('gz_offers', updated);
      return updated;
    });
  };

  // -------------------------------------------------------------
  // CREDENTIALS
  // -------------------------------------------------------------
  const addCredential = (credData: Omit<Credential, 'id'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newCred: Credential = {
      ...credData,
      id: `cr-${Date.now()}`,
    };
    setCredentials((prev) => {
      const updated = [...prev, newCred];
      saveToDisk('gz_credentials', updated);
      return updated;
    });
    writeLog('CRED_CREATE', `Credencial registrada: ${newCred.entityName} (${newCred.category})`, 'Éxito');
  };

  const deleteCredential = (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const cred = credentials.find(c => c.id === id);
    if (cred) {
      setCredentials((prev) => {
        const updated = prev.filter(c => c.id !== id);
        saveToDisk('gz_credentials', updated);
        return updated;
      });
      writeLog('CRED_DELETE', `Credencial eliminada: ${cred.entityName}`, 'Éxito');
    }
  };

  // -------------------------------------------------------------
  // CONSOLE TYPES MANAGEMENT
  // -------------------------------------------------------------
  const addConsoleType = (ctData: Omit<ConsoleType, 'id' | 'isActive'>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const newCt: ConsoleType = {
      ...ctData,
      id: `ct-${Date.now()}`,
      isActive: true,
    };
    setConsoleTypes((prev) => {
      const updated = [...prev, newCt];
      saveToDisk('gz_console_types', updated);
      return updated;
    });
    writeLog('CONSOLE_TYPE_CREATE', `Tipo de consola creado: ${newCt.name} (${newCt.emoji}) - Tarifa: $${newCt.hourlyRate.toFixed(2)}/h`, 'Éxito');
  };

  const updateConsoleType = (id: string, updatedFields: Partial<ConsoleType>) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    setConsoleTypes((prev) => {
      const updated = prev.map((ct) => {
        if (ct.id === id) {
          const uct = { ...ct, ...updatedFields };
          writeLog('CONSOLE_TYPE_UPDATE', `Tipo de consola actualizado: ${uct.name} - Tarifa: $${uct.hourlyRate.toFixed(2)}/h, Activo: ${uct.isActive}`, 'Éxito');
          return uct;
        }
        return ct;
      });
      saveToDisk('gz_console_types', updated);
      return updated;
    });
  };

  const deleteConsoleType = (id: string) => {
    if (!currentUser || currentUser.role === 'Operador') return;
    const ct = consoleTypes.find(c => c.id === id);
    if (ct) {
      setConsoleTypes((prev) => {
        const updated = prev.filter(c => c.id !== id);
        saveToDisk('gz_console_types', updated);
        return updated;
      });
      writeLog('CONSOLE_TYPE_DELETE', `Tipo de consola eliminado: ${ct.name}`, 'Éxito');
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
