import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
    Alert,
    Image,
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

const UNIDADES = ['CR-237', 'CR-55', 'CR-4'];

function validarDatos(
    kilometraje: string,
    monto: string,
    tieneFoto: boolean,
) {
    const km = kilometraje.trim();
    const importe = monto.trim().replace(',', '.');

    if (!/^\d+$/.test(km) || !Number.isSafeInteger(Number(km))) {
        return 'Escribí un kilometraje entero, igual o mayor que cero.';
    }

    if (
        !/^\d+(\.\d{1,2})?$/.test(importe) ||
        Number(importe) <= 0 ||
        !Number.isSafeInteger(Math.round(Number(importe) * 100))
    ) {
        return 'Escribí un monto mayor que cero, con hasta dos decimales.';
    }

    if (!tieneFoto) {
        return 'Agregá una foto del ticket o de la bomba.';
    }

    return '';
}

export default function CombustibleScreen() {
    const [unidad, setUnidad] = useState(UNIDADES[0]);
    const [kilometraje, setKilometraje] = useState('');
    const [monto, setMonto] = useState('');
    const [foto, setFoto] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState('');
    const [abriendoFoto, setAbriendoFoto] = useState(false);
    const selectorOcupado = useRef(false);

    const recibirFoto = useCallback(
        (resultado: ImagePicker.ImagePickerResult) => {
            if (resultado.canceled) return;

            const imagen = resultado.assets[0];

            if (!imagen?.uri) {
                setMensaje('No pudimos leer esa foto. Probá con otra.');
                return;
            }

            setFoto(imagen.uri);
            setMensaje('');
        },
        [],
    );

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        let activo = true;

        ImagePicker.getPendingResultAsync()
            .then((resultado) => {
                if (!activo || !resultado) return;

                if ('code' in resultado) {
                    setMensaje(
                        'No pudimos recuperar la foto. Seleccionala otra vez.',
                    );
                } else {
                    recibirFoto(resultado);
                }
            })
            .catch(() => {
                if (activo) {
                    setMensaje('Volvé a seleccionar la foto del ticket.');
                }
            });

        return () => {
            activo = false;
        };
    }, [recibirFoto]);

    async function seleccionarFoto(origen: 'camara' | 'galeria') {
        if (selectorOcupado.current) return;

        selectorOcupado.current = true;
        setAbriendoFoto(true);
        setMensaje('');

        try {
            if (origen === 'camara') {
                const permiso =
                    await ImagePicker.requestCameraPermissionsAsync();

                if (!permiso.granted) {
                    setMensaje(
                        'La cámara necesita permiso. Habilitalo en los ajustes de Expo Go o usá la galería.',
                    );
                    return;
                }
            }

            const opciones: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            };

            const resultado =
                origen === 'camara'
                    ? await ImagePicker.launchCameraAsync(opciones)
                    : await ImagePicker.launchImageLibraryAsync(opciones);

            recibirFoto(resultado);
        } catch {
            setMensaje(
                'No se pudo abrir la cámara o la galería. Intentá de nuevo.',
            );
        } finally {
            selectorOcupado.current = false;
            setAbriendoFoto(false);
        }
    }

    function comprobarFormulario() {
        const error = validarDatos(
            kilometraje,
            monto,
            foto !== null,
        );

        setMensaje(error);

        if (error) return;

        const importe = Number(monto.trim().replace(',', '.'));

        Alert.alert(
            'Prueba válida — sin guardar',
            `Unidad: ${unidad}\nKilometraje: ${Number(kilometraje)} km\nMonto: $${importe.toFixed(2)}\nTicket: seleccionado\n\nTodavía no se creó un registro en el sistema.`,
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
                    <Pressable
                        accessibilityRole="button"
                        style={styles.enlace}
                        onPress={() =>
                            router.canGoBack()
                                ? router.back()
                                : router.replace('./panel')
                        }
                    >
                        <Text style={styles.enlaceTexto}>
                            ← Volver al panel
                        </Text>
                    </Pressable>

                    <Text style={styles.titulo}>
                        CONTROL DE COMBUSTIBLE
                    </Text>

                    <Text style={styles.aviso}>
                        Modo de prueba. Los datos y la foto no se envían al
                        sistema.
                    </Text>

                    <Text style={styles.etiqueta}>Unidad abastecida</Text>

                    <View style={styles.unidades}>
                        {UNIDADES.map((opcion) => (
                            <Pressable
                                key={opcion}
                                accessibilityRole="radio"
                                accessibilityState={{
                                    checked: unidad === opcion,
                                }}
                                onPress={() => {
                                    setUnidad(opcion);
                                    setMensaje('');
                                }}
                                style={[
                                    styles.unidad,
                                    unidad === opcion && styles.unidadElegida,
                                ]}
                            >
                                <Text
                                    style={
                                        unidad === opcion
                                            ? styles.textoBlanco
                                            : styles.textoUnidad
                                    }
                                >
                                    {opcion}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.etiqueta}>
                        Kilometraje actual
                    </Text>

                    <TextInput
                        accessibilityLabel="Kilometraje actual"
                        style={styles.campo}
                        value={kilometraje}
                        onChangeText={(valor) => {
                            setKilometraje(valor);
                            setMensaje('');
                        }}
                        placeholder="Ej. 12542"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={9}
                    />

                    <Text style={styles.etiqueta}>
                        Monto de diésel (USD)
                    </Text>

                    <TextInput
                        accessibilityLabel="Monto de diésel en dólares"
                        style={styles.campo}
                        value={monto}
                        onChangeText={(valor) => {
                            setMonto(valor);
                            setMensaje('');
                        }}
                        placeholder="Ej. 10.50"
                        placeholderTextColor="#64748b"
                        keyboardType="decimal-pad"
                        maxLength={12}
                    />

                    <Text style={styles.etiqueta}>
                        Foto del ticket o de la bomba
                    </Text>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: abriendoFoto }}
                        disabled={abriendoFoto}
                        style={[
                            styles.botonFoto,
                            abriendoFoto && styles.deshabilitado,
                        ]}
                        onPress={() => seleccionarFoto('camara')}
                    >
                        <Text style={styles.textoBlanco}>
                            Tomar una foto
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: abriendoFoto }}
                        disabled={abriendoFoto}
                        style={[
                            styles.botonFoto,
                            abriendoFoto && styles.deshabilitado,
                        ]}
                        onPress={() => seleccionarFoto('galeria')}
                    >
                        <Text style={styles.textoBlanco}>
                            Elegir de la galería
                        </Text>
                    </Pressable>

                    {foto && (
                        <View>
                            <Image
                                source={{ uri: foto }}
                                style={styles.foto}
                                resizeMode="contain"
                                accessibilityLabel="Vista previa del ticket seleccionado"
                                onError={() => {
                                    setFoto(null);
                                    setMensaje(
                                        'No pudimos mostrar la foto. Elegí otra.',
                                    );
                                }}
                            />

                            <Pressable
                                accessibilityRole="button"
                                style={styles.enlace}
                                onPress={() => {
                                    setFoto(null);
                                    setMensaje('');
                                }}
                            >
                                <Text style={styles.enlaceTexto}>
                                    Quitar foto
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {!!mensaje && (
                        <Text
                            style={styles.error}
                            accessibilityLiveRegion="polite"
                        >
                            {mensaje}
                        </Text>
                    )}

                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: abriendoFoto }}
                        disabled={abriendoFoto}
                        onPress={comprobarFormulario}
                        style={[
                            styles.botonPrincipal,
                            abriendoFoto && styles.deshabilitado,
                        ]}
                    >
                        <Text style={styles.textoBlanco}>
                            COMPROBAR DATOS DE PRUEBA
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
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
        maxWidth: 520,
        alignSelf: 'center',
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#c92327',
        marginVertical: 16,
    },
    aviso: {
        color: '#7c2d12',
        backgroundColor: '#fff7ed',
        padding: 14,
        borderRadius: 10,
        lineHeight: 21,
        marginBottom: 24,
    },
    etiqueta: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 10,
    },
    unidades: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    unidad: {
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
    },
    unidadElegida: {
        backgroundColor: '#c92327',
    },
    textoUnidad: {
        color: '#334155',
        fontWeight: '600',
    },
    campo: {
        minHeight: 52,
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 24,
    },
    botonFoto: {
        minHeight: 52,
        backgroundColor: '#405660',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    botonPrincipal: {
        minHeight: 54,
        backgroundColor: '#c92327',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    textoBlanco: {
        color: '#ffffff',
        fontWeight: '700',
        textAlign: 'center',
    },
    deshabilitado: {
        opacity: 0.5,
    },
    foto: {
        width: '100%',
        height: 260,
        backgroundColor: '#e2e8f0',
        borderRadius: 12,
        marginTop: 12,
    },
    enlace: {
        minHeight: 48,
        justifyContent: 'center',
    },
    enlaceTexto: {
        color: '#c92327',
        fontWeight: '600',
        fontSize: 15,
    },
    error: {
        color: '#b91c1c',
        fontSize: 15,
        lineHeight: 22,
        marginTop: 12,
    },
});