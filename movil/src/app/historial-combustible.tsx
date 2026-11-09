import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { db } from '@/lib/firebase';

type RegistroCombustible = {
    id: string;
    unidad?: string;
    kilometraje?: string;
    monto?: number;
    fechaHora?: string;
    timestamp?: number;
};

export default function HistorialCombustibleScreen() {
    const [registros, setRegistros] = useState<RegistroCombustible[]>([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        async function cargarHistorial() {
            const sesion = await AsyncStorage.getItem('usuarioSesion');
            if (!sesion) {
                setMensaje('Tu sesión terminó. Volvé a iniciar sesión.');
                setCargando(false);
                return;
            }

            const usuario = JSON.parse(sesion);
            const consulta = query(
                collection(db, 'control_combustible'),
                where('usuario', '==', String(usuario.carnet)),
            );

            return onSnapshot(
                consulta,
                (resultado) => {
                    const lista = resultado.docs.map((documento) => ({
                        id: documento.id,
                        ...documento.data(),
                    })) as RegistroCombustible[];

                    lista.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
                    setRegistros(lista);
                    setCargando(false);
                },
                () => {
                    setMensaje('No se pudo cargar el historial.');
                    setCargando(false);
                },
            );
        }

        let cancelar: (() => void) | undefined;
        cargarHistorial().then((suscripcion) => {
            cancelar = suscripcion;
        });
        return () => cancelar?.();
    }, []);

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.contenido}>
                <Pressable style={styles.volver} onPress={() => router.back()}>
                    <Text style={styles.volverTexto}>← Volver a combustible</Text>
                </Pressable>

                <Text style={styles.titulo}>Historial de combustible</Text>
                <Text style={styles.descripcion}>
                    Registros guardados con tu carnet en Firestore.
                </Text>

                {cargando ? (
                    <ActivityIndicator size="large" color="#C8102E" />
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
                                <Text style={styles.unidad}>{item.unidad ?? 'Unidad no registrada'}</Text>
                                <Text style={styles.dato}>Kilometraje: {item.kilometraje ?? '0'} km</Text>
                                <Text style={styles.dato}>Monto: ${Number(item.monto ?? 0).toFixed(2)}</Text>
                                <Text style={styles.fecha}>{item.fechaHora ?? 'Fecha pendiente'}</Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F8F9FA' },
    contenido: { flex: 1, padding: 24 },
    volver: { minHeight: 48, justifyContent: 'center' },
    volverTexto: { color: '#C8102E', fontSize: 15, fontWeight: '600' },
    titulo: { color: '#C8102E', fontSize: 26, fontWeight: '700', marginTop: 12 },
    descripcion: { color: '#475569', fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 24 },
    tarjeta: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#C8102E' },
    unidad: { color: '#0F172A', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    dato: { color: '#334155', fontSize: 15, marginTop: 4 },
    fecha: { color: '#64748B', fontSize: 13, marginTop: 10 },
    vacio: { color: '#64748B', fontSize: 16, textAlign: 'center', marginTop: 36 },
    mensaje: { color: '#B91C1C', fontSize: 16, textAlign: 'center', marginTop: 36 },
});
