/**
 * Configuración central de la URL base de la API.
 *
 * En desarrollo: Vite proxy redirige /api → http://localhost:5000/api
 * En producción: VITE_API_URL debe apuntar a la URL pública del backend (Railway / VPS)
 */
export const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

/**
 * Construye una URL de API completa.
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export interface StoredUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  status: string;
  token?: string;
  [key: string]: unknown;
}

/**
 * Decodifica la carga útil (payload) del token JWT/HMAC.
 */
export function parseTokenPayload(token: string | null): { id?: string; exp?: number } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Verifica si un token ha expirado.
 * Retorna true si no hay token o si expira en menos de 10 segundos.
 */
export function isTokenExpired(token: string | null): boolean {
  const payload = parseTokenPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= (payload.exp - 10000);
}

/**
 * Obtiene el usuario autenticado almacenado en localStorage,
 * validando inmediatamente si su token es válido y no ha expirado.
 */
export function getStoredUser<T = StoredUser>(): T | null {
  try {
    const saved = localStorage.getItem('gz_current_user');
    if (!saved) return null;
    const user = JSON.parse(saved);
    if (!user || !user.token) {
      localStorage.removeItem('gz_current_user');
      return null;
    }
    if (isTokenExpired(user.token)) {
      console.warn('[Auth] Token de sesión expirado en localStorage. Limpiando sesión...');
      localStorage.removeItem('gz_current_user');
      return null;
    }
    return user as T;
  } catch {
    localStorage.removeItem('gz_current_user');
    return null;
  }
}

/**
 * Obtiene el token de autenticación actual desde localStorage.
 */
export function getAuthToken(): string | null {
  const user = getStoredUser();
  return user?.token || null;
}

/**
 * Realiza una llamada fetch autenticada agregando automáticamente
 * el header 'Authorization: Bearer <token>' y prefijando la URL base.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http') ? input : apiUrl(input);
  const token = getAuthToken();

  // Si teníamos datos guardados pero el token ya expiró, limpiar y disparar evento de inmediato
  if (!url.includes('/api/auth/login') && !token && localStorage.getItem('gz_current_user')) {
    localStorage.removeItem('gz_current_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gz:auth_expired'));
    }
  }

  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, { ...init, headers });

    // Si el servidor responde 401 (sesión expirada o token inválido), limpiar sesión
    if (response.status === 401 && !url.includes('/api/auth/login')) {
      localStorage.removeItem('gz_current_user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gz:auth_expired'));
      }
    }

    // Si el servidor responde 502/503/504 Bad Gateway, notificar al frontend
    if ((response.status === 502 || response.status === 503 || response.status === 504) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gz:server_offline', { detail: { status: response.status } }));
    }

    return response;
  } catch (err) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gz:server_offline', { detail: { error: err } }));
    }
    throw err;
  }
}
