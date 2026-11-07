import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

type RegistroCombustible = {
    id: string;
    unidad?: string;
    kilometraje?: number;
    monto?: number;
    creadoEn?: { toDate?: () => Date };
};

export default function HistorialCombustibleScreen() {
    const [registros, setRegistros] = useState<RegistroCombustible[]>([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        const usuario = auth.currentUser;

        if (!usuario) {
            setMensaje('Tu sesión terminó. Volvé a iniciar sesión.');
            setCargando(false);
            return;
        }

        const consulta = query(
            collection(db, 'combustible'),
            where('usuarioId', '==', usuario.uid),
        );

        const cancelar = onSnapshot(
            consulta,
            (resultado) => {
                const lista = resultado.docs.map((documento) => ({
                    id: documento.id,
                    ...documento.data(),
                })) as RegistroCombustible[];

                lista.sort((a, b) => {
                    const fechaA = a.creadoEn?.toDate?.().getTime() ?? 0;
                    const fechaB = b.creadoEn?.toDate?.().getTime() ?? 0;
                    return fechaB - fechaA;
                });

                setRegistros(lista);
                setCargando(false);
            },
            () => {
                setMensaje('No se pudo cargar el historial.');
                setCargando(false);
            },
        );

        return cancelar;
    }, []);

    function mostrarFecha(registro: RegistroCombustible) {
        const fecha = registro.creadoEn?.toDate?.();

        if (!fecha) return 'Fecha pendiente';

        return fecha.toLocaleDateString('es-SV', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.contenido}>
                <Pressable style={styles.volver} onPress={() => router.back()}>
                    <Text style={styles.volverTexto}>← Volver a combustible</Text>
                </Pressable>

                <Text style={styles.titulo}>Historial de combustible</Text>

                <Text style={styles.descripcion}>
                    Aquí aparecen tus registros guardados en Firestore.
                </Text>

                {cargando ? (
                    <ActivityIndicator size="large" color="#c92327" />
                ) : mensaje ? (
                    <Text style={styles.mensaje}>{mensaje}</Text>
                ) : (
                    <FlatList
                        data={registros}
                        keyExtractor={(registro) => registro.id}
                        ListEmptyComponent={
                            <Text style={styles.vacio}>
                                Aún no tenés registros de combustible.
                            </Text>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.tarjeta}>
                                <Text style={styles.unidad}>
                                    {item.unidad ?? 'Unidad no registrada'}
                                </Text>
                                <Text style={styles.dato}>
                                    Kilometraje: {item.kilometraje ?? 0} km
                                </Text>
                                <Text style={styles.dato}>
                                    Monto: ${Number(item.monto ?? 0).toFixed(2)}
                                </Text>
                                <Text style={styles.fecha}>
                                    {mostrarFecha(item)}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contenido: {
        flex: 1,
        padding: 24,
    },
    volver: {
        minHeight: 48,
        justifyContent: 'center',
    },
    volverTexto: {
        color: '#c92327',
        fontSize: 15,
        fontWeight: '600',
    },
    titulo: {
        color: '#c92327',
        fontSize: 26,
        fontWeight: '700',
        marginTop: 12,
    },
    descripcion: {
        color: '#475569',
        fontSize: 15,
        lineHeight: 22,
        marginTop: 10,
        marginBottom: 24,
    },
    tarjeta: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 5,
        borderLeftColor: '#c92327',
    },
    unidad: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    dato: {
        color: '#334155',
        fontSize: 15,
        marginTop: 4,
    },
    fecha: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 10,
    },
    vacio: {
        color: '#64748b',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 36,
    },
    mensaje: {
        color: '#b91c1c',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 36,
    },
});