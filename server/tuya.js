import { TuyaContext } from '@tuya/tuya-connector-nodejs';
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos el contexto de Tuya si las credenciales están presentes
let tuya = null;

if (process.env.TUYA_CLIENT_ID && process.env.TUYA_CLIENT_SECRET) {
  tuya = new TuyaContext({
    baseUrl: process.env.TUYA_REGION || 'https://openapi.tuyaus.com',
    accessKey: process.env.TUYA_CLIENT_ID,
    secretKey: process.env.TUYA_CLIENT_SECRET,
  });
}

/**
 * Enciende o apaga un dispositivo Tuya
 * @param {string} deviceId - ID del dispositivo Tuya (Tomacorriente)
 * @param {boolean} turnOn - true para encender, false para apagar
 */
export async function setTuyaDeviceState(deviceId, turnOn) {
  if (!tuya) {
    console.warn('[Tuya] Advertencia: Credenciales TUYA_CLIENT_ID o TUYA_CLIENT_SECRET no configuradas. Ignorando comando.');
    return;
  }
  
  if (!deviceId) return; // No hay dispositivo enlazado, no hacer nada

  try {
    const result = await tuya.request({
      path: `/v1.0/iot-03/devices/${deviceId}/commands`,
      method: 'POST',
      body: {
        commands: [
          {
            code: 'switch_1',
            value: turnOn
          }
        ]
      }
    });

    if (result.success) {
      console.log(`[Tuya] Tomacorriente ${deviceId} ${turnOn ? 'ENCENDIDO' : 'APAGADO'}.`);
    } else {
      console.error(`[Tuya] Error de API (${deviceId}):`, result.msg);
    }
  } catch (error) {
    console.error(`[Tuya] Error de conexión o ejecución (${deviceId}):`, error.message);
  }
}
