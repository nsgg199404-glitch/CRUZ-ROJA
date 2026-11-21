type FirebaseError = { code?: string };

export function normalizarCarnet(valor: string) {
  return valor.trim();
}

export function correoInternoDeCarnet(carnet: string) {
  const carnetLimpio = normalizarCarnet(carnet);

  if (!/^\d{5,10}$/.test(carnetLimpio)) {
    return null;
  }

  return `${carnetLimpio}@auth.cruzroja.invalid`;
}

export function mensajeDeErrorAuth(error: unknown) {
  const codigo = (error as FirebaseError)?.code;

  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Este carnet ya tiene una cuenta móvil. Iniciá sesión.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'El carnet o la contraseña no son correctos.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisá tu internet e intentá de nuevo.';
    case 'auth/too-many-requests':
      return 'Hubo muchos intentos. Esperá un momento antes de continuar.';
    default:
      return 'No fue posible completar la operación. Intentá de nuevo.';
  }
}
