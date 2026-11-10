import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

  // 1. INICIO CON CARNET Y CONTRASEÑA 
  async function iniciarSesion() {
    if (!carnet || !contrasena) {
      mostrarAlerta('Por favor ingresa tu carnet y contraseña.');
      return;
    }

    setCargando(true);
    try {

      const qTexto = query(collection(db, 'usuarios'), where('carnet', '==', carnet));
      let querySnapshot = await getDocs(qTexto);

      if (querySnapshot.empty) {
        const qNumero = query(collection(db, 'usuarios'), where('carnet', '==', Number(carnet)));
        querySnapshot = await getDocs(qNumero);
      }

      if (!querySnapshot.empty) {
        const datosUsuario = querySnapshot.docs[0].data();

        // ¡AQUÍ ESTÁ LA SOLUCIÓN! Comparamos la contraseña de la pantalla con el campo 'password' de tu base de datos
        if (datosUsuario.password === contrasena) {
          await AsyncStorage.setItem('usuarioSesion', JSON.stringify(datosUsuario));
          router.replace('/panel');
        } else {
          mostrarAlerta('Contraseña incorrecta.');
        }
      } else {
        mostrarAlerta('El número de carnet no existe.');
      }
    } catch (error: any) {
      console.error("Error consultando la base de datos:", error);
      mostrarAlerta('Hubo un problema al conectar con la base de datos.');
    } finally {
      setCargando(false);
    }
  }

  // 2. INICIO CON GOOGLE (ASIGNA ROL VOLUNTARIO)
  async function iniciarSesionConGoogle() {
    setCargando(true);
    try {
      const provider = new GoogleAuthProvider();
      const resultado = await signInWithPopup(auth, provider, browserPopupRedirectResolver);

      const usuarioGoogle = resultado.user;

      const perfilVoluntario = {
        uid: usuarioGoogle.uid,
        nombre: usuarioGoogle.displayName || 'Voluntario',
        correo: usuarioGoogle.email,
        rol: 'voluntario'
      };

      await AsyncStorage.setItem('usuarioSesion', JSON.stringify(perfilVoluntario));
      router.replace('/panel');

    } catch (error: any) {
      console.error("Error con Google:", error);
      mostrarAlerta('No se pudo iniciar sesión con Google.');
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
                ɢ Ingresar con Google
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
  inputContainer: { borderWidth: 1, borderColor: '#757575', borderRadius: 8, marginBottom: 20, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  etiquetaFlotante: { fontSize: 12, color: '#C8102E' },
  campo: { fontSize: 16, color: '#000', paddingVertical: 4 },
  boton: { backgroundColor: '#C8102E', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 10 },
  botonGoogle: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#4285F4', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 15 },
  botonDeshabilitado: { opacity: 0.7 },
  presionado: { opacity: 0.9 },
  textoBoton: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  textoBotonGoogle: { color: '#4285F4', fontSize: 16, fontWeight: 'bold' },
});