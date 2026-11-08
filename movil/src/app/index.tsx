import { router } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useState } from 'react';
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '@/lib/firebase';
import { correoInternoDeCarnet, mensajeDeErrorAuth } from '@/lib/auth-carnet';

// Este identificador pertenece al proyecto de Firebase de Cruz Roja. Permite
// que Google entregue un token que Firebase Authentication puede verificar.
GoogleSignin.configure({
  webClientId: '531896448688-iam6hbuqu8i1al4pa6qhvsnjj6uhal8l.apps.googleusercontent.com',
  offlineAccess: false,
});

export default function HomeScreen() {
  const [carnet, setCarnet] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const mostrarAlerta = (mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(mensaje);
    } else {
      alert(mensaje);
    }
  };

  async function buscarUsuarioPorCarnet(carnetIngresado: string) {
    const carnetLimpio = carnetIngresado.trim();
    // Los perfiles existentes usan el carnet como ID del documento, por
    // ejemplo: usuarios/133171. Leerlo directamente evita una consulta global.
    const perfil = await getDoc(doc(db, 'usuarios', carnetLimpio));
    return perfil.exists() ? perfil.data() : null;
  }

  async function buscarUsuarioPorCorreoGoogle(correo: string) {
    const consulta = await getDocs(
      query(
        collection(db, 'usuarios'),
        where('correoGoogle', '==', correo.trim().toLowerCase())
      )
    );

    return consulta.empty ? null : consulta.docs[0].data();
  }

  async function iniciarSesion() {
    if (!carnet || !contrasena) {
      mostrarAlerta('Por favor ingresa tu carnet y contraseña.');
      return;
    }

    const correoInterno = correoInternoDeCarnet(carnet);
    if (!correoInterno) {
      mostrarAlerta('El carnet debe contener entre 4 y 10 números.');
      return;
    }

    setCargando(true);
    try {
      // El usuario escribe su carnet, pero Firebase Authentication valida la
      // cuenta técnica carnet@cruzroja.sv sin mostrar ese correo en pantalla.
      await signInWithEmailAndPassword(auth, correoInterno, contrasena);

      const datosUsuario = await buscarUsuarioPorCarnet(carnet);
      if (!datosUsuario) {
        await signOut(auth);
        mostrarAlerta('La cuenta existe, pero no tiene perfil autorizado en el sistema.');
        return;
      }

      await AsyncStorage.setItem('usuarioSesion', JSON.stringify(datosUsuario));
      router.replace('/panel');
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      mostrarAlerta(mensajeDeErrorAuth(error));
    } finally {
      setCargando(false);
    }
  }

  async function iniciarSesionConGoogle() {
    if (Platform.OS === 'web') {
      mostrarAlerta('El acceso con Google se prueba desde la APK de Android.');
      return;
    }

    setCargando(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const respuestaGoogle = await GoogleSignin.signIn();

      if (!isSuccessResponse(respuestaGoogle)) {
        return;
      }

      const idToken = respuestaGoogle.data.idToken;
      if (!idToken) {
        throw new Error('Google no entregó un token de identidad.');
      }

      const credencial = GoogleAuthProvider.credential(idToken);
      const resultado = await signInWithCredential(auth, credencial);
      const correoGoogle = resultado.user.email;

      if (!correoGoogle) {
        await signOut(auth);
        mostrarAlerta('La cuenta de Google no tiene un correo disponible.');
        return;
      }

      // Un administrador debe agregar correoGoogle al documento del usuario.
      // Así Google no crea cuentas nuevas ni da acceso a personas no autorizadas.
      const datosUsuario = await buscarUsuarioPorCorreoGoogle(correoGoogle);
      if (!datosUsuario) {
        await GoogleSignin.signOut();
        await signOut(auth);
        mostrarAlerta('Tu correo Google no está autorizado. Pedí al administrador que lo vincule a tu usuario.');
        return;
      }

      await AsyncStorage.setItem('usuarioSesion', JSON.stringify(datosUsuario));
      router.replace('/panel');
    } catch (error: any) {
      console.error('Error con Google:', error);
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      // Se muestra el código técnico solo si ocurre un fallo. Así podemos
      // diferenciar una configuración de Android de un problema de conexión.
      const detalle = error?.code || error?.message || 'error desconocido';
      mostrarAlerta(`No se pudo iniciar sesión con Google. Código: ${detalle}`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <KeyboardAvoidingView
        style={styles.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contenido}>

          <Text style={styles.titulo}>CONTROL OPERATIVO</Text>

          <View style={styles.formulario}>
            <View style={styles.inputContainer}>
              <Text style={styles.etiquetaFlotante}>Número de Carnet</Text>
              <TextInput
                style={styles.campo}
                value={carnet}
                onChangeText={setCarnet}
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={!cargando}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.etiquetaFlotante}>Contraseña</Text>
              <TextInput
                style={styles.campo}
                value={contrasena}
                onChangeText={setContrasena}
                secureTextEntry
                autoCapitalize="none"
                editable={!cargando}
              />
              <Text style={styles.iconoOjo}>༗</Text>
            </View>

            <Pressable
              disabled={cargando}
              onPress={iniciarSesion}
              style={({ pressed }) => [
                styles.boton,
                cargando && styles.botonDeshabilitado,
                pressed && !cargando && styles.presionado,
              ]}
            >
              <Text style={styles.textoBoton}>
                {cargando ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
              </Text>
            </Pressable>

            <Pressable
              disabled={cargando}
              onPress={iniciarSesionConGoogle}
              style={({ pressed }) => [
                styles.botonGoogle,
                cargando && styles.botonDeshabilitado,
                pressed && !cargando && styles.presionado,
              ]}
            >
              <Text style={styles.textoBotonGoogle}>Continuar con Google</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#ffffff' },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#C8102E', marginBottom: 40, letterSpacing: 0.5 },
  formulario: { width: '100%', maxWidth: 400 },
  inputContainer: { borderWidth: 1, borderColor: '#757575', borderRadius: 8, marginBottom: 20, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, position: 'relative' },
  etiquetaFlotante: { fontSize: 12, color: '#C8102E' },
  campo: { fontSize: 16, color: '#000', paddingVertical: 4, outlineStyle: 'none' as any },
  iconoOjo: { position: 'absolute', right: 15, top: 15, fontSize: 18 },
  boton: { backgroundColor: '#C8102E', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 10, elevation: 3 },
  botonGoogle: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#4285F4', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 14 },
  botonDeshabilitado: { opacity: 0.7 },
  presionado: { opacity: 0.9 },
  textoBoton: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  textoBotonGoogle: { color: '#4285F4', fontSize: 16, fontWeight: 'bold' },
});
