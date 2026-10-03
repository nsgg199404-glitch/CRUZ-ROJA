import { router } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pendientes = [
    { icono: '📢', titulo: 'Muro de novedades' },
    { icono: '📋', titulo: 'Bitácora de atenciones' },
    { icono: '📦', titulo: 'Inventario' },
    { icono: '🧰', titulo: 'Equipo APH' },
    { icono: '🚑', titulo: 'Chequeo de ambulancias' },
    { icono: '📖', titulo: 'Guía médica' },
    { icono: '🛑', titulo: 'Cierre de turno' },
];

export default function PanelScreen() {
    return (
        <SafeAreaView style={styles.pantalla}>
            <ScrollView contentContainerStyle={styles.contenido}>
                <Text style={styles.institucion}>CRUZ ROJA GUAZAPA</Text>
                <Text style={styles.titulo}>Panel principal</Text>
                <Text style={styles.descripcion}>
                    Seleccioná el módulo que querés utilizar.
                </Text>

                <View style={styles.aviso}>
                    <Text style={styles.avisoTitulo}>MODO DE PRUEBA</Text>
                    <Text style={styles.avisoTexto}>
                        Esta vista todavía no guarda registros en el sistema.
                    </Text>
                </View>

                <View style={styles.modulos}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir control de combustible"
                        onPress={() => router.push('./combustible')}
                        style={({ pressed }) => [
                            styles.tarjeta,
                            styles.tarjetaActiva,
                            pressed && styles.presionada,
                        ]}
                    >
                        <Text style={styles.icono}>⛽</Text>
                        <Text style={styles.nombreActivo}>
                            Control de combustible
                        </Text>
                        <Text style={styles.detalleActivo}>
                            Unidad, monto y ticket
                        </Text>
                    </Pressable>

                    {pendientes.map((modulo) => (
                        <View
                            key={modulo.titulo}
                            style={[styles.tarjeta, styles.tarjetaPendiente]}
                        >
                            <Text style={styles.icono}>{modulo.icono}</Text>
                            <Text style={styles.nombrePendiente}>
                                {modulo.titulo}
                            </Text>
                            <Text style={styles.detallePendiente}>
                                Próximamente
                            </Text>
                        </View>
                    ))}
                </View>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace('/')}
                    style={styles.volver}
                >
                    <Text style={styles.volverTexto}>
                        Volver al inicio
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contenido: {
        padding: 24,
        paddingBottom: 40,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    institucion: {
        color: '#c92327',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    titulo: {
        color: '#0f172a',
        fontSize: 28,
        fontWeight: '700',
    },
    descripcion: {
        color: '#475569',
        fontSize: 16,
        marginTop: 8,
        marginBottom: 24,
    },
    aviso: {
        backgroundColor: '#fff7ed',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    avisoTitulo: {
        color: '#9a3412',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    avisoTexto: {
        color: '#7c2d12',
        fontSize: 14,
        lineHeight: 21,
    },
    modulos: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    tarjeta: {
        flexBasis: '47%',
        flexGrow: 1,
        minWidth: 130,
        minHeight: 160,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tarjetaActiva: {
        backgroundColor: '#c92327',
    },
    tarjetaPendiente: {
        backgroundColor: '#e2e8f0',
    },
    presionada: {
        opacity: 0.8,
    },
    icono: {
        fontSize: 30,
        marginBottom: 12,
    },
    nombreActivo: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    detalleActivo: {
        color: '#ffffff',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    nombrePendiente: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    detallePendiente: {
        color: '#475569',
        fontSize: 12,
        marginTop: 8,
    },
    volver: {
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    volverTexto: {
        color: '#c92327',
        fontSize: 16,
        fontWeight: '600',
    },
});