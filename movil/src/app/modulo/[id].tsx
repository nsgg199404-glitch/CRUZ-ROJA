import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MODULOS: Record<string, { icono: string; titulo: string; descripcion: string; acciones: string[] }> = {
  novedades: {
    icono: '📢',
    titulo: 'Muro de novedades',
    descripcion: 'Consulta los avisos operativos publicados por la seccional.',
    acciones: ['Ver novedades recientes', 'Consultar comunicados de brigada'],
  },
  bitacora: {
    icono: '📋',
    titulo: 'Bitácora de atenciones',
    descripcion: 'Registra y consulta las atenciones realizadas durante el turno.',
    acciones: ['Registrar atención', 'Consultar historial de atenciones'],
  },
  inventario: {
    icono: '📦',
    titulo: 'Inventario',
    descripcion: 'Consulta el estado del equipo y los insumos operativos.',
    acciones: ['Ver existencias', 'Revisar movimientos de inventario'],
  },
  'equipo-aph': {
    icono: '🧰',
    titulo: 'Equipo APH',
    descripcion: 'Verifica la disponibilidad del equipo de atención prehospitalaria.',
    acciones: ['Consultar equipo asignado', 'Revisar estado del equipo'],
  },
  ambulancias: {
    icono: '🚑',
    titulo: 'Chequeo de ambulancias',
    descripcion: 'Realiza la revisión operativa de las unidades de ambulancia.',
    acciones: ['Iniciar chequeo', 'Consultar chequeos anteriores'],
  },
  'guia-medica': {
    icono: '📖',
    titulo: 'Guía médica',
    descripcion: 'Accede a material de consulta para la atención prehospitalaria.',
    acciones: ['Consultar protocolos', 'Revisar material de apoyo'],
  },
  'cierre-turno': {
    icono: '🛑',
    titulo: 'Cierre de turno',
    descripcion: 'Prepara el resumen operativo al finalizar el turno.',
    acciones: ['Revisar pendientes', 'Generar resumen de turno'],
  },
};

export default function ModuloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const modulo = id ? MODULOS[id] : undefined;

  if (!modulo) {
    router.replace('/panel');
    return null;
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.volver}>← Volver al panel</Text>
        </Pressable>

        <View style={styles.encabezado}>
          <Text style={styles.icono}>{modulo.icono}</Text>
          <Text style={styles.titulo}>{modulo.titulo}</Text>
          <Text style={styles.descripcion}>{modulo.descripcion}</Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>OPCIONES DEL MÓDULO</Text>
          {modulo.acciones.map((accion) => (
            <View key={accion} style={styles.accion}>
              <Text style={styles.punto}>•</Text>
              <Text style={styles.textoAccion}>{accion}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#f8fafc' },
  contenido: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 600, alignSelf: 'center' },
  volver: { color: '#475569', fontSize: 15, fontWeight: '600', marginBottom: 28 },
  encabezado: { alignItems: 'center', marginBottom: 24 },
  icono: { fontSize: 54, marginBottom: 14 },
  titulo: { color: '#0f172a', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  descripcion: { color: '#475569', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  tarjeta: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  etiqueta: { color: '#c92327', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  accion: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  punto: { color: '#c92327', fontSize: 18, marginRight: 10 },
  textoAccion: { color: '#334155', fontSize: 16, flex: 1 },
});
