import { doc, getDoc } from 'firebase/firestore';

import { normalizarCarnet } from '@/lib/auth-carnet';
import { db } from '@/lib/firebase';

export type RolUsuario = 'superadmin' | 'administrador' | 'voluntario';

export type PerfilUsuario = {
  carnet: string;
  nombre: string;
  rol: RolUsuario;
};

export function carnetDesdeCorreo(correo: string | null | undefined) {
  if (!correo) return null;

  const coincidencia = correo.match(/^(\d{4,10})@(cruzroja\.sv|auth\.cruzroja\.invalid)$/);
  return coincidencia?.[1] ?? null;
}

export function esAdministrador(rol: RolUsuario) {
  return rol === 'administrador' || rol === 'superadmin';
}

export async function obtenerPerfilUsuario(carnet: string): Promise<PerfilUsuario> {
  const carnetLimpio = normalizarCarnet(carnet);
  const referencia = doc(db, 'usuarios', carnetLimpio);
  const resultado = await getDoc(referencia);
  const datos = resultado.data();
  const rolGuardado = datos?.rol;
  const rol: RolUsuario = rolGuardado === 'administrador' || rolGuardado === 'superadmin'
    ? rolGuardado
    : 'voluntario';

  return {
    carnet: carnetLimpio,
    nombre: typeof datos?.nombre === 'string' ? datos.nombre : '',
    rol,
  };
}
