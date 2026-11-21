import { router } from 'expo-router';
import { useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, getDocs, where } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';

export default function InformeMensualScreen() {
    const [buscando, setBuscando] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [datosCargados, setDatosCargados] = useState(false);

    const [mes, setMes] = useState('10');
    const [anio, setAnio] = useState('2026');


    const [form, setForm] = useState({
        // Casos Seccional 
        sec_heridos: '', sec_quemados: '', sec_fracturados: '', sec_intoxicados: '',
        sec_partos: '', sec_comunes: '', sec_curaciones: '', sec_inyecciones: '', sec_otros: '',

        // Traslados 
        t_heridos: '', t_quemados: '', t_fracturados: '', t_intoxicados: '',
        t_embarazos: '', t_comunes: '', vehiculos: '', t_otros: '',

        // Rescates 
        r_transito: '', r_verticales: '', r_acuaticos: '', r_profundos: '', r_simples: '', r_otros: '',

        // Comunitarias (
        c_excursiones: '', c_repartos: '', c_damnificados: '', c_comunidades: '',
        c_centros: '', c_charlas: '', c_instituciones: '', c_deportivos: '', c_sociales: '',

        // Actividades Internas 
        i_asambleas: '', i_reuniones: '', i_campamentos: '', i_practicas: '',
        i_seminarios: '', i_charlas: '', i_cursos: '', i_talleres: '', i_primerosAux: '',

        // Caja Chica 
        cc_saldoAnt: '', cc_ingreso: '', cc_egreso: '',

        // Miembros 
        m_conCarne: '', m_activos: '', m_horas: '',
        m_permiso: '', m_sancionados: '', m_expulsados: '', m_retirados: '',
        m_periodo: '', m_causa: '', m_nuevoIngreso: ''
    });

    const updateForm = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    const mesesNombres: any = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
        '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
        '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    //  BUSCAR DATOS
    async function buscarDatosFirebase() {
        if (!mes || !anio) {
            mostrarAlerta('Por favor ingrese mes y año.');
            return;
        }

        setBuscando(true);
        try {
            // 1. Usuarios con carné
            const snapUsuarios = await getDocs(query(collection(db, 'usuarios')));
            const totalConCarne = snapUsuarios.size.toString();

            // 2. Horas y Activos
            const snapHoras = await getDocs(query(collection(db, 'registro_horas'), where('fecha', '==', `${mes}/${anio}`)));
            let totalHoras = 0;
            let activosSet = new Set();

            snapHoras.forEach(doc => {
                const data = doc.data();
                if (data.horasTrabajadas) totalHoras += parseFloat(data.horasTrabajadas);
                if (data.carnet) activosSet.add(data.carnet);
            });
            const totalActivos = activosSet.size.toString();
            const horasTexto = totalHoras.toFixed(1);

            // 3. Atenciones 
            const snapAtenciones = await getDocs(query(collection(db, 'bitacora_atenciones')));
            const atencionesMes = snapAtenciones.docs
                .map(doc => doc.data())
                .filter(ata => ata.fechaHora && ata.fechaHora.includes(`/${mes}/${anio}`));

            let th = 0, tq = 0, tf = 0, ti = 0, te = 0, tc = 0, to = 0;
            let rt = 0, rv = 0, ra = 0, rp = 0, rs = 0, ro = 0;
            let veh = atencionesMes.length;

            atencionesMes.forEach(ata => {
                const tipo = (ata.tipoServicio || '').toLowerCase();
                if (tipo.includes('tránsito') || tipo.includes('transito') || tipo.includes('choque')) rt++;
                else if (tipo.includes('enfermedad') || tipo.includes('común') || tipo.includes('comun')) tc++;
                else if (tipo.includes('traumatismo') || tipo.includes('caída') || tipo.includes('caida')) tf++;
                else if (tipo.includes('quemadura')) tq++;
                else if (tipo.includes('intoxicación')) ti++;
                else if (tipo.includes('embarazo') || tipo.includes('parto')) te++;
                else if (tipo.includes('rescate')) rs++;
                else if (tipo.includes('herido') || tipo.includes('arma')) th++;
                else to++;
            });

            // Actualizar estado del formulario 
            setForm(prev => ({
                ...prev,
                m_conCarne: totalConCarne, m_activos: totalActivos, m_horas: horasTexto,
                t_heridos: th > 0 ? th.toString() : '',
                t_quemados: tq > 0 ? tq.toString() : '',
                t_fracturados: tf > 0 ? tf.toString() : '',
                t_intoxicados: ti > 0 ? ti.toString() : '',
                t_embarazos: te > 0 ? te.toString() : '',
                t_comunes: tc > 0 ? tc.toString() : '',
                vehiculos: veh > 0 ? veh.toString() : '',
                t_otros: to > 0 ? to.toString() : '',
                r_transito: rt > 0 ? rt.toString() : '',
                r_simples: rs > 0 ? rs.toString() : '',
            }));

            setDatosCargados(true);
        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al buscar datos en Firebase.');
        } finally {
            setBuscando(false);
        }
    }

    // GENERAR PDF 
    const v = (val: string) => val.trim() !== '' ? val : '___';

    async function generarYImprimirPDF() {
        setGenerando(true);
        try {

            const c_ant = parseFloat(form.cc_saldoAnt) || 0;
            const c_ing = parseFloat(form.cc_ingreso) || 0;
            const c_egr = parseFloat(form.cc_egreso) || 0;
            const c_total = c_ant + c_ing;
            const c_saldo = c_total - c_egr;

            const txtTotal = (form.cc_saldoAnt || form.cc_ingreso) ? c_total.toFixed(2) : '';
            const txtSaldo = (form.cc_saldoAnt || form.cc_ingreso || form.cc_egreso) ? c_saldo.toFixed(2) : '';

            let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    @page { size: landscape; margin: 10mm; }
                    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #000; }
                    .header-title { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px; text-transform: uppercase; }
                    .sub-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; vertical-align: top; }
                    th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
                    .no-border-table td { border: none; padding: 2px 5px; }
                    .line-field { border-bottom: 1px dashed #000; display: inline-block; width: 30px; margin-right: 5px; text-align: center; font-weight: bold; color: #C8102E; }
                    .firmas { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; padding: 0 50px; }
                    .linea-firma { border-top: 1px solid #000; width: 200px; padding-top: 5px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header-title">CRUZ ROJA SALVADOREÑA<br>INFORME CONSOLIDADO DE ACTIVIDADES MENSUALES</div>
                <div class="sub-header">
                    <div>SECCIONAL: GUAZAPA</div><div>MES: ${mesesNombres[mes] || mes}</div><div>AÑO: ${anio}</div>
                </div>

                <table>
                    <tr>
                        <th rowspan="2" style="width: 20%;">CASOS ATENDIDOS EN SECCIONAL</th>
                        <th colspan="3">ACTIVIDADES DE ASISTENCIA A LA POBLACIÓN</th>
                    </tr>
                    <tr>
                        <th style="width: 26%;">TRASLADOS REALIZADOS</th>
                        <th style="width: 26%;">RESCATES REALIZADOS</th>
                        <th style="width: 28%;">ACTIVIDADES COMUNITARIAS</th>
                    </tr>
                    <tr>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.sec_heridos)}</span> Heridos</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_quemados)}</span> Quemados</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_fracturados)}</span> Fracturados</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_intoxicados)}</span> Intoxicados</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_partos)}</span> Partos</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_comunes)}</span> Enferm. Comunes</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_curaciones)}</span> Curaciones</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_inyecciones)}</span> Inyecciones</td></tr>
                                <tr><td><span class="line-field">${v(form.sec_otros)}</span> Otros</td></tr>
                            </table>
                        </td>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.t_heridos)}</span> Heridos</td></tr>
                                <tr><td><span class="line-field">${v(form.t_quemados)}</span> Quemados</td></tr>
                                <tr><td><span class="line-field">${v(form.t_fracturados)}</span> Fracturados</td></tr>
                                <tr><td><span class="line-field">${v(form.t_intoxicados)}</span> Intoxicados</td></tr>
                                <tr><td><span class="line-field">${v(form.t_embarazos)}</span> Embarazos</td></tr>
                                <tr><td><span class="line-field">${v(form.t_comunes)}</span> Enferm. Comunes</td></tr>
                                <tr><td><span class="line-field">${v(form.vehiculos)}</span> Cant. de Vehicul.</td></tr>
                                <tr><td><span class="line-field">${v(form.t_otros)}</span> Otros</td></tr>
                            </table>
                        </td>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.r_transito)}</span> Accid. Tránsito</td></tr>
                                <tr><td><span class="line-field">${v(form.r_verticales)}</span> Rescat. Verticales</td></tr>
                                <tr><td><span class="line-field">${v(form.r_acuaticos)}</span> Acuáticos</td></tr>
                                <tr><td><span class="line-field">${v(form.r_profundos)}</span> Rescat. Profundos</td></tr>
                                <tr><td><span class="line-field">${v(form.r_simples)}</span> Rescates simples</td></tr>
                                <tr><td><span class="line-field">${v(form.r_otros)}</span> Otros</td></tr>
                            </table>
                        </td>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.c_excursiones)}</span> Excursiones</td></tr>
                                <tr><td><span class="line-field">${v(form.c_repartos)}</span> Repartos</td></tr>
                                <tr><td><span class="line-field">${v(form.c_damnificados)}</span> Damnificados</td></tr>
                                <tr><td><span class="line-field">${v(form.c_comunidades)}</span> Comunidades Vis.</td></tr>
                                <tr><td><span class="line-field">${v(form.c_centros)}</span> Centros Esc. Vis.</td></tr>
                                <tr><td><span class="line-field">${v(form.c_charlas)}</span> Charlas impartidas</td></tr>
                                <tr><td><span class="line-field">${v(form.c_instituciones)}</span> Instituciones Vis.</td></tr>
                                <tr><td><span class="line-field">${v(form.c_deportivos)}</span> Eventos Deportivos</td></tr>
                                <tr><td><span class="line-field">${v(form.c_sociales)}</span> Eventos Sociales</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table>
                    <tr><th colspan="3">ACTIVIDADES INTERNAS</th></tr>
                    <tr>
                        <th style="width: 33%;">ACTIVIDADES</th>
                        <th style="width: 33%;">CAJA CHICA</th>
                        <th style="width: 34%;">MIEMBROS</th>
                    </tr>
                    <tr>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.i_asambleas)}</span> Asambleas</td></tr>
                                <tr><td><span class="line-field">${v(form.i_reuniones)}</span> Reuniones</td></tr>
                                <tr><td><span class="line-field">${v(form.i_campamentos)}</span> Campamentos</td></tr>
                                <tr><td><span class="line-field">${v(form.i_practicas)}</span> Prácticas</td></tr>
                                <tr><td><span class="line-field">${v(form.i_seminarios)}</span> Seminarios</td></tr>
                                <tr><td><span class="line-field">${v(form.i_charlas)}</span> Charlas</td></tr>
                                <tr><td><span class="line-field">${v(form.i_cursos)}</span> Cursos</td></tr>
                                <tr><td><span class="line-field">${v(form.i_talleres)}</span> Talleres</td></tr>
                                <tr><td><span class="line-field">${v(form.i_primerosAux)}</span> Curso Primeros Aux.</td></tr>
                            </table>
                        </td>
                        <td>
                            <table class="no-border-table">
                                <tr><td><span class="line-field">${v(form.cc_saldoAnt)}</span> Saldo Anterior</td></tr>
                                <tr><td><span class="line-field">${v(form.cc_ingreso)}</span> Ingreso</td></tr>
                                <tr><td><span class="line-field">${v(txtTotal)}</span> Total</td></tr>
                                <tr><td><span class="line-field">${v(form.cc_egreso)}</span> Egreso</td></tr>
                                <tr><td><span class="line-field">${v(txtSaldo)}</span> Saldo</td></tr>
                            </table>
                        </td>
                        <td>
                            <table class="no-border-table">
                                <tr><td style="width:40px; font-weight:bold; text-align:center; color:#2E86C1;">${v(form.m_conCarne)}</td><td>Con carné</td></tr>
                                <tr><td style="width:40px; font-weight:bold; text-align:center; color:#28B463;">${v(form.m_activos)}</td><td>Activos</td></tr>
                                <tr><td><span class="line-field">${v(form.m_permiso)}</span></td><td>Permiso</td></tr>
                                <tr><td><span class="line-field">${v(form.m_sancionados)}</span></td><td>Sancionados</td></tr>
                                <tr><td><span class="line-field">${v(form.m_expulsados)}</span></td><td>Expulsados</td></tr>
                                <tr><td><span class="line-field">${v(form.m_retirados)}</span></td><td>Retirados</td></tr>
                                <tr><td colspan="2" style="font-size:10px; font-style:italic;">Por un periodo de: <span style="font-weight:bold;">${form.m_periodo}</span></td></tr>
                                <tr><td colspan="2" style="font-size:10px; font-style:italic;">Causa: <span style="font-weight:bold;">${form.m_causa}</span></td></tr>
                                <tr><td><span class="line-field">${v(form.m_nuevoIngreso)}</span></td><td>Nuevo Ingreso</td></tr>
                                <tr><td style="width:40px; font-weight:bold; text-align:center; color:#C8102E;">${v(form.m_horas)}</td><td>Horas Trabajadas</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <div class="firmas">
                    <div class="linea-firma">Firma</div>
                    <div class="linea-firma">Jefe Dptal/Local</div>
                    <div class="linea-firma">Deleg. Dptal/Junta</div>
                </div>
            </body>
            </html>
            `;

            if (Platform.OS === 'web') {
                await Print.printAsync({ html: htmlContent, orientation: Print.Orientation.landscape });
            } else {
                const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
                const puedeCompartir = await Sharing.isAvailableAsync();
                if (puedeCompartir) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Informe_Mensual_${mesesNombres[mes]}_${anio}`,
                        UTI: 'com.adobe.pdf'
                    });
                }
            }
        } catch (error) {
            console.error(error);
            mostrarAlerta('Hubo un error al generar el PDF.');
        } finally {
            setGenerando(false);
        }
    }


    const InputCampo = ({ label, valorKey, ancho = '48%', numerico = true, placeholder = '' }: any) => (
        <View style={[styles.inputBoxMini, { width: ancho }]}>
            <Text style={styles.labelMini} numberOfLines={1}>{label}</Text>
            <TextInput
                style={styles.textInputMini}
                value={(form as any)[valorKey]}
                onChangeText={(v) => updateForm(valorKey, v)}
                keyboardType={numerico ? "numeric" : "default"}
                placeholder={placeholder}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <Text style={styles.tituloHeader}>GENERAR INFORME MENSUAL</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>


                <View style={styles.cajaTop}>
                    <View style={styles.rowInputs}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.etiqueta}>Mes (01-12):</Text>
                            <TextInput style={styles.inputBox} value={mes} onChangeText={setMes} keyboardType="numeric" maxLength={2} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.etiqueta}>Año:</Text>
                            <TextInput style={styles.inputBox} value={anio} onChangeText={setAnio} keyboardType="numeric" maxLength={4} />
                        </View>
                    </View>
                    <Pressable style={styles.botonVerde} onPress={buscarDatosFirebase} disabled={buscando}>
                        {buscando ? <ActivityIndicator color="#27AE60" /> : <Text style={styles.textoBotonVerde}>Buscando...</Text>}
                    </Pressable>
                </View>


                {datosCargados && (
                    <View>
                        <Text style={styles.tituloRojoSeccion}>1. ASISTENCIA A LA POBLACIÓN</Text>
                        <View style={styles.gridFormulario}>
                            <View style={styles.columnaGrid}>
                                <Text style={styles.tituloColumna}>En Seccional (Manual)</Text>
                                <InputCampo label="Heridos" valorKey="sec_heridos" ancho="100%" />
                                <InputCampo label="Quemados" valorKey="sec_quemados" ancho="100%" />
                                <InputCampo label="Fracturados" valorKey="sec_fracturados" ancho="100%" />
                                <InputCampo label="Intoxicados" valorKey="sec_intoxicados" ancho="100%" />
                                <InputCampo label="Partos" valorKey="sec_partos" ancho="100%" />
                                <InputCampo label="Comunes" valorKey="sec_comunes" ancho="100%" />
                            </View>
                            <View style={styles.columnaGrid}>
                                <Text style={styles.tituloColumna}>Traslados (Automático)</Text>
                                <InputCampo label="Heridos" valorKey="t_heridos" ancho="100%" />
                                <InputCampo label="Quemados" valorKey="t_quemados" ancho="100%" />
                                <InputCampo label="Fracturados" valorKey="t_fracturados" ancho="100%" />
                                <InputCampo label="Embarazos" valorKey="t_embarazos" ancho="100%" />
                                <InputCampo label="Comunes" valorKey="t_comunes" ancho="100%" />
                                <InputCampo label="Vehículos" valorKey="vehiculos" ancho="100%" />
                            </View>
                        </View>

                        <Text style={[styles.tituloRojoSeccion, { marginTop: 15 }]}>2. ACTIVIDADES INTERNAS Y CAJA</Text>
                        <View style={styles.gridFormulario}>
                            <View style={styles.columnaGrid}>
                                <Text style={styles.tituloColumna}>Act. Internas (Manual)</Text>
                                <InputCampo label="Asambleas" valorKey="i_asambleas" ancho="100%" />
                                <InputCampo label="Reuniones" valorKey="i_reuniones" ancho="100%" />
                                <InputCampo label="Prácticas" valorKey="i_practicas" ancho="100%" />
                                <InputCampo label="Charlas" valorKey="i_charlas" ancho="100%" />
                                <InputCampo label="Cursos" valorKey="i_cursos" ancho="100%" />
                            </View>
                            <View style={styles.columnaGrid}>
                                <Text style={styles.tituloColumna}>Caja Chica ($)</Text>
                                <InputCampo label="Saldo Ant." valorKey="cc_saldoAnt" ancho="100%" />
                                <InputCampo label="Ingreso" valorKey="cc_ingreso" ancho="100%" />
                                <InputCampo label="Egreso" valorKey="cc_egreso" ancho="100%" />
                            </View>
                        </View>

                        <Text style={[styles.tituloRojoSeccion, { marginTop: 15 }]}>3. MIEMBROS</Text>
                        <View style={[styles.cajaBlanca, { padding: 15 }]}>
                            <View style={styles.rowInputs}>
                                <View style={styles.cajaDatoAuto}>
                                    <Text style={[styles.numeroAuto, { color: '#2E86C1' }]}>{form.m_conCarne || '0'}</Text>
                                    <Text style={styles.textoAuto}>CON CARNÉ</Text>
                                </View>
                                <View style={styles.cajaDatoAuto}>
                                    <Text style={[styles.numeroAuto, { color: '#28B463' }]}>{form.m_activos || '0'}</Text>
                                    <Text style={styles.textoAuto}>ACTIVOS</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                <InputCampo label="Permiso" valorKey="m_permiso" />
                                <InputCampo label="Sancionados" valorKey="m_sancionados" />
                                <InputCampo label="Retirados" valorKey="m_retirados" />
                                <InputCampo label="Nuevo Ingr." valorKey="m_nuevoIngreso" />
                                <InputCampo label="Periodo (Meses)" valorKey="m_periodo" ancho="100%" numerico={false} placeholder="Ej: 3 meses..." />
                                <InputCampo label="Causa" valorKey="m_causa" ancho="100%" numerico={false} placeholder="Motivo sanción/retiro..." />
                            </View>

                            <View style={styles.cajaDatoAutoRojo}>
                                <Text style={styles.numeroAutoRojo}>{form.m_horas || '0.0'}</Text>
                                <Text style={styles.textoAutoRojo}>HORAS TRABAJADAS</Text>
                            </View>
                        </View>

                        <Pressable style={styles.botonImprimir} onPress={generarYImprimirPDF} disabled={generando}>
                            {generando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoBotonBlanco}>IMPRIMIR INFORME OFICIAL</Text>}
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#C8102E', fontSize: 24, fontWeight: 'bold' },
    tituloHeader: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', marginLeft: 10 },

    scrollContainer: { paddingHorizontal: 15, paddingTop: 20, paddingBottom: 40 },

    cajaTop: { backgroundColor: '#FFF', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#E1E8ED', marginBottom: 20 },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    inputContainer: { width: '48%' },
    etiqueta: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
    inputBox: { backgroundColor: '#F9FAFC', borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#2C3E50' },

    botonVerde: { backgroundColor: '#E8F8F5', borderWidth: 1, borderColor: '#A3E4D7', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
    textoBotonVerde: { color: '#117A65', fontWeight: 'bold', fontSize: 14 },

    tituloRojoSeccion: { fontSize: 14, fontWeight: 'bold', color: '#C8102E', marginBottom: 10, marginLeft: 5 },
    gridFormulario: { flexDirection: 'row', justifyContent: 'space-between' },
    columnaGrid: { width: '48%', backgroundColor: '#FFF', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E1E8ED' },
    tituloColumna: { fontSize: 12, fontWeight: 'bold', color: '#34495E', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EAEDED', paddingBottom: 5 },

    cajaBlanca: { backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E1E8ED', marginBottom: 20 },
    inputBoxMini: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
    labelMini: { fontSize: 11, color: '#7F8C8D', flex: 1 },
    textInputMini: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, width: '50%', padding: 4, fontSize: 12, textAlign: 'center', backgroundColor: '#F9FAFC' },

    cajaDatoAuto: { width: '48%', alignItems: 'center', padding: 15, backgroundColor: '#F9FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#EAEDED' },
    numeroAuto: { fontSize: 24, fontWeight: 'bold' },
    textoAuto: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D', marginTop: 4 },

    cajaDatoAutoRojo: { alignItems: 'center', padding: 15, backgroundColor: '#FDEDEC', borderRadius: 6, borderWidth: 1, borderColor: '#F5B7B1', marginTop: 15 },
    numeroAutoRojo: { fontSize: 22, fontWeight: 'bold', color: '#C8102E' },
    textoAutoRojo: { fontSize: 12, fontWeight: 'bold', color: '#C8102E', marginTop: 4 },

    botonImprimir: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 6, alignItems: 'center', elevation: 2, marginTop: 10 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }
});