import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegistroScreen() {
  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');

  function validarRegistro() {
    const carnetLimpio = carnet.trim();

    if (nombre.trim().length < 3) {
      setError('Escribí tu nombre completo.');
      return;
    }

    if (!/^\d{5,10}$/.test(carnetLimpio)) {
      setError('El carnet debe tener entre 5 y 10 números.');
      return;
    }

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    Alert.alert(
      'Datos válidos',
      'El formulario de registro ya valida los datos. Falta conectarlo al sistema de usuarios de Firebase.',
    );
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <KeyboardAvoidingView
        style={styles.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formulario}>
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text style={styles.volver}>← Volver al inicio</Text>
            </Pressable>

            <View style={styles.encabezado}>
              <Text style={styles.titulo}>CREAR CUENTA</Text>
              <View style={styles.linea} />
              <Text style={styles.institucion}>Cruz Roja Guazapa</Text>
            </View>

            <Text style={styles.etiqueta}>NOMBRE COMPLETO</Text>
            <TextInput
              style={styles.campo}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Norma García"
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
            />

            <Text style={styles.etiqueta}>NÚMERO DE CARNET</Text>
            <TextInput
              style={styles.campo}
              value={carnet}
              onChangeText={setCarnet}
              placeholder="Ej. 133171"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              autoCapitalize="none"
              accessibilityLabel="Número de carnet"
            />

            <Text style={styles.etiqueta}>CONTRASEÑA</Text>
            <TextInput
              style={styles.campo}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Contraseña"
            />

            <Text style={styles.etiqueta}>CONFIRMAR CONTRASEÑA</Text>
            <TextInput
              style={styles.campo}
              value={confirmacion}
              onChangeText={setConfirmacion}
              placeholder="Repetí tu contraseña"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Confirmar contraseña"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={validarRegistro}
              style={styles.boton}
            >
              <Text style={styles.textoBoton}>VALIDAR REGISTRO</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#ffffff' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  formulario: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  volver: { color: '#475569', fontSize: 15, fontWeight: '600', marginBottom: 28 },
  encabezado: { alignItems: 'center', marginBottom: 32 },
  titulo: { fontSize: 28, fontWeight: '700', letterSpacing: 2, color: '#c92327' },
  linea: { width: 48, height: 2, backgroundColor: '#c92327', marginVertical: 16 },
  institucion: { fontSize: 16, color: '#475569' },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  campo: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  error: { color: '#b91c1c', fontSize: 14, marginBottom: 16 },
  boton: {
    minHeight: 52,
    backgroundColor: '#c92327',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  textoBoton: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
});
