/**
 * Configuración central de la URL base de la API.
 *
 * En desarrollo: Vite proxy redirige /api → http://localhost:5000/api
 * En producción: VITE_API_URL debe apuntar a la URL pública del backend (Railway)
 *
 * Para configurar en producción, agrega en Netlify:
 *   VITE_API_URL = https://tu-backend.up.railway.app
 */
export const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

/**
 * Construye una URL de API completa.
 * - En dev:        apiUrl('/api/users') → '/api/users'  (Vite proxy se encarga)
 * - En producción: apiUrl('/api/users') → 'https://tu-backend.up.railway.app/api/users'
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

