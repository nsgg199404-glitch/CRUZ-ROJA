import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '@/lib/firebase';
import {
    carnetDesdeCorreo,
    esAdministrador,
    obtenerPerfilUsuario,
    PerfilUsuario,
} from '@/lib/perfil-usuario';

const pendientes = [
    { id: 'novedades', icono: '📢', titulo: 'Muro de novedades' },
    { id: 'bitacora', icono: '📋', titulo: 'Bitácora de atenciones' },
    { id: 'inventario', icono: '📦', titulo: 'Inventario' },
    { id: 'equipo-aph', icono: '🧰', titulo: 'Equipo APH' },
    { id: 'ambulancias', icono: '🚑', titulo: 'Chequeo de ambulancias' },
    { id: 'guia-medica', icono: '📖', titulo: 'Guía médica' },
    { id: 'cierre-turno', icono: '🛑', titulo: 'Cierre de turno' },
];

export default function PanelScreen() {
    const [sesionLista, setSesionLista] = useState(false);
    const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

    useEffect(() => {
        return onAuthStateChanged(auth, async (usuario) => {
            if (!usuario) {
                router.replace('/');
                return;
            }

            const carnet = carnetDesdeCorreo(usuario.email);
            if (!carnet) {
                await signOut(auth);
                router.replace('/');
                return;
            }

            try {
                setPerfil(await obtenerPerfilUsuario(carnet));
            } catch {
                setPerfil({ carnet, nombre: usuario.displayName ?? '', rol: 'voluntario' });
            } finally {
                setSesionLista(true);
            }
        });
    }, []);

    async function cerrarSesion() {
        await signOut(auth);
        router.replace('/');
    }

    if (!sesionLista) {
        return (
            <SafeAreaView style={styles.cargandoPantalla}>
                <ActivityIndicator size="large" color="#c92327" />
                <Text style={styles.cargandoTexto}>Verificando sesión...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.pantalla}>
            <ScrollView contentContainerStyle={styles.contenido}>
                <Text style={styles.institucion}>CRUZ ROJA GUAZAPA</Text>
                <Text style={styles.titulo}>Panel principal</Text>
                <Text style={styles.descripcion}>
                    Seleccioná el módulo que querés utilizar.
                </Text>

                {perfil ? (
                    <View style={styles.perfil}>
                        <Text style={styles.perfilNombre}>
                            {perfil.nombre || `Carnet ${perfil.carnet}`}
                        </Text>
                        <Text style={styles.perfilRol}>Rol: {perfil.rol}</Text>
                    </View>
                ) : null}

                <View style={styles.modulos}>
                    {perfil && esAdministrador(perfil.rol) ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Registrar usuario"
                            onPress={() => router.push('/registro')}
                            style={({ pressed }) => [
                                styles.tarjeta,
                                styles.tarjetaAdministrador,
                                pressed && styles.presionada,
                            ]}
                        >
                            <Text style={styles.icono}>👤</Text>
                            <Text style={styles.nombreActivo}>Registrar usuario</Text>
                            <Text style={styles.detalleActivo}>Solo administrador</Text>
                        </Pressable>
                    ) : null}

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
                        <Pressable
                            key={modulo.titulo}
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir ${modulo.titulo}`}
                            onPress={() => router.push(`/modulo/${modulo.id}` as never)}
                            style={({ pressed }) => [
                                styles.tarjeta,
                                styles.tarjetaPendiente,
                                pressed && styles.presionada,
                            ]}
                        >
                            <Text style={styles.icono}>{modulo.icono}</Text>
                            <Text style={styles.nombrePendiente}>
                                {modulo.titulo}
                            </Text>
                            <Text style={styles.detallePendiente}>
                                Abrir módulo
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    accessibilityRole="button"
                    onPress={cerrarSesion}
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
    cargandoPantalla: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    cargandoTexto: {
        color: '#475569',
        fontSize: 15,
        marginTop: 12,
    },
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
    perfil: {
        backgroundColor: '#e0f2fe',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    perfilNombre: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
    perfilRol: { color: '#0369a1', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
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
    tarjetaAdministrador: {
        backgroundColor: '#475569',
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
