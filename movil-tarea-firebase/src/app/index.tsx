import { router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
// ¡Aquí ya agregué el browserPopupRedirectResolver!
import AsyncStorage from '@react-native-async-storage/async-storage';
import { browserPopupRedirectResolver, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
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

import { auth, db } from '@/lib/firebase';

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

  // 1. INICIO DE SESIÓN CON CARNET (ENMASCARADO)
  async function iniciarSesion() {
    if (!carnet || !contrasena) {
      mostrarAlerta('Por favor ingresa tu carnet y contraseña.');
      return;
    }

    setCargando(true);
    try {
      const correoEnmascarado = `${carnet}@cruzroja.sv`;
      await signInWithEmailAndPassword(auth, correoEnmascarado, contrasena);

      const qTexto = query(collection(db, 'usuarios'), where('carnet', '==', carnet));
      let querySnapshot = await getDocs(qTexto);

      if (querySnapshot.empty) {
        const qNumero = query(collection(db, 'usuarios'), where('carnet', '==', Number(carnet)));
        querySnapshot = await getDocs(qNumero);
      }

      if (!querySnapshot.empty) {
        const datosUsuario = querySnapshot.docs[0].data();
        await AsyncStorage.setItem('usuarioSesion', JSON.stringify(datosUsuario));
        router.replace('/panel');
      } else {
        mostrarAlerta('Usuario autenticado, pero no se encontraron sus datos en Firestore.');
      }
    } catch (error: any) {
      console.error("Error de Autenticación:", error);
      mostrarAlerta('Acceso Denegado: Carnet o contraseña incorrectos.');
    } finally {
      setCargando(false);
    }
  }

  // 2. INICIO DE SESIÓN CON GOOGLE (CORREGIDO)
  async function iniciarSesionConGoogle() {
    setCargando(true);
    try {
      const provider = new GoogleAuthProvider();
      // ¡Aquí ya agregué el resolver para evitar el error de pantalla blanca!
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);

      await AsyncStorage.setItem('usuarioSesion', JSON.stringify({ nombre: "Usuario Google", rol: "Invitado" }));
      router.replace('/panel');

    } catch (error: any) {
      console.error("Error con Google:", error);
      mostrarAlerta('No se pudo iniciar sesión con Google. Revisa la consola.');
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
              <Text style={styles.textoBotonGoogle}>
                🌐 Continuar con Google
              </Text>
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
  botonGoogle: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#4285F4', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 15, elevation: 1 },
  botonDeshabilitado: { opacity: 0.7 },
  presionado: { opacity: 0.9 },
  textoBoton: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  textoBotonGoogle: { color: '#4285F4', fontSize: 16, fontWeight: 'bold' },
});