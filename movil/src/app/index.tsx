import { router } from 'expo-router';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '@/lib/firebase';

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

  async function iniciarSesion() {
    if (!carnet || !contrasena) {
      mostrarAlerta('Por favor ingresa tu carnet y contraseña.');
      return;
    }

    setCargando(true);
    try {
      // 1. Buscamos el carnet como TEXTO y la clave en el campo 'password'
      const qTexto = query(
        collection(db, 'usuarios'),
        where('carnet', '==', carnet),
        where('password', '==', contrasena)
      );

      let querySnapshot = await getDocs(qTexto);

      // 2. Si no lo encuentra, lo buscamos como NÚMERO
      if (querySnapshot.empty) {
        const carnetNumero = Number(carnet);
        const qNumero = query(
          collection(db, 'usuarios'),
          where('carnet', '==', carnetNumero),
          where('password', '==', contrasena)
        );
        querySnapshot = await getDocs(qNumero);
      }

      // 3. Evaluamos si encontramos al usuario
      if (!querySnapshot.empty) {
        const datosUsuario = querySnapshot.docs[0].data();
        await AsyncStorage.setItem('usuarioSesion', JSON.stringify(datosUsuario));
        router.replace('/panel');
      } else {
        mostrarAlerta('Acceso Denegado: Carnet o contraseña incorrectos en la Base de Datos.');
      }
    } catch (error: any) {
      console.error("Error detallado:", error);
      mostrarAlerta('Error de Conexión: Revisa la consola web (F12) para más detalles.');
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
  botonDeshabilitado: { opacity: 0.7 },
  presionado: { opacity: 0.9 },
  textoBoton: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});