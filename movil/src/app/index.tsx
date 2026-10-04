import { router } from 'expo-router';
import { useState } from 'react';
import {
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

export default function HomeScreen() {
  const [carnet, setCarnet] = useState('');
  const [contrasena, setContrasena] = useState('');

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
              <View style={styles.encabezado}>
                <Text style={styles.titulo}>CONTROL</Text>
                <Text style={styles.subtitulo}>OPERATIVO</Text>
                <View style={styles.linea} />
                <Text style={styles.institucion}>
                  Cruz Roja Guazapa
                </Text>
              </View>

              <Text style={styles.etiqueta}>NÚMERO DE CARNET</Text>
              <TextInput
                  style={styles.campo}
                  value={carnet}
                  onChangeText={setCarnet}
                  placeholder="Ej. 133171"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Número de carnet"
              />

              <Text style={styles.etiqueta}>CONTRASEÑA</Text>
              <TextInput
                  style={styles.campo}
                  value={contrasena}
                  onChangeText={setContrasena}
                  placeholder="Escribe tu contraseña"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  accessibilityLabel="Contraseña"
              />

              <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('./panel')}
                  style={{
                    backgroundColor: '#405660',
                    borderRadius: 8,
                    minHeight: 52,
                    padding: 16,
                    marginTop: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
              >
                <Text style={styles.textoBoton}>
                  ABRIR PANEL DE PRUEBA
                </Text>
              </Pressable>

              <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('./registro')}
                  style={styles.botonRegistro}
              >
                <Text style={styles.textoRegistro}>CREAR CUENTA</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formulario: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 5,
    color: '#c92327',
  },
  subtitulo: {
    fontSize: 24,
    letterSpacing: 3,
    color: '#c92327',
    marginTop: 6,
  },
  linea: {
    width: 48,
    height: 2,
    backgroundColor: '#c92327',
    marginVertical: 20,
  },
  institucion: {
    fontSize: 16,
    color: '#475569',
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
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
    marginBottom: 24,
  },
  boton: {
    minHeight: 52,
    backgroundColor: '#c92327',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    opacity: 0.5,
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  botonRegistro: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#c92327',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 14,
  },
  textoRegistro: {
    color: '#c92327',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
