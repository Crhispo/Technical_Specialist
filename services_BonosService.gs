// ===============================================
// I. CONFIGURACIÓN DE REGLAS DE NEGOCIO
// ===============================================

/**
 * Define las reglas de pago para cada métrica.
 * esAscendente: true si menor es mejor (Ausentismo), false si mayor es mejor (Ventas/Calidad).
 */
const BONO_CONFIG = {
  NIVELES_METRICAS: {
    ventas: {
      esAscendente: false,
      niveles: [
        { meta: 150, pago: 213525 },
        { meta: 120, pago: 170820 },
        { meta: 100, pago: 68328 }
      ]
    },
    calidad: {
      esAscendente: false,
      niveles: [
        { meta: 95, pago: 128115 },
        { meta: 92, pago: 102492 },
        { meta: 90, pago: 40996.8 }
      ]
    },
    ausentismo: {
      esAscendente: true,
      niveles: [
        { meta: 2, pago: 85410 },
        { meta: 3, pago: 68328 },
        { meta: 5, pago: 27331.2 }
      ]
    }
  }
};


// ===============================================
// II. SERVICE (Lógica de Negocio Pura)
// ===============================================

var BonosService = {

  /** * @private 
   * Evalúa el valor de una métrica contra sus niveles de pago.
   */
  _calcularPagoPorMetrica(valor, configMetrica) {
    const { niveles, esAscendente } = configMetrica;

    for (const nivel of niveles) {
      // Lógica de cumplimiento: (valor <= meta) para Ausentismo; (valor >= meta) para Ventas/Calidad
      const cumpleMeta = esAscendente ? (valor <= nivel.meta) : (valor >= nivel.meta);
      if (cumpleMeta) {
        return nivel.pago;
      }
    }
    return 0; // Pago si no se cumple el mínimo
  },

  /** Calcula el bono total sumando los componentes de Ventas, Calidad y Ausentismo. */
  calcularBono({ ventas, calidad, ausentismo }) {
    const config = BONO_CONFIG.NIVELES_METRICAS;

    // Utilizamos BonosService para asegurar el contexto en Apps Script
    const bonoVentas = BonosService._calcularPagoPorMetrica(ventas, config.ventas);
    const bonoCalidad = BonosService._calcularPagoPorMetrica(calidad, config.calidad);
    const bonoAusentismo = BonosService._calcularPagoPorMetrica(ausentismo, config.ausentismo);

    return bonoVentas + bonoCalidad + bonoAusentismo;
  },

  /** Procesa la entrada del formulario: calcula el bono y guarda el registro. */
  guardarRegistro(data) {
    if (!data) throw new Error("No se recibió información del formulario");

    const metricas = {
      ...data,
      ventas: Number(data.ventas || 0),
      calidad: Number(data.calidad || 0),
      ausentismo: Number(data.ausentismo || 0)
    };

    // Utilizamos BonosService para asegurar el contexto en Apps Script
    const totalBono = BonosService.calcularBono(metricas);

    BonosModel.insert({ ...metricas, totalBono, fecha: new Date() });

    const bonoFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(totalBono);

    return `Registro guardado con éxito. Bono calculado: ${bonoFormateado}`;
  },

  /** Actualiza las métricas, recalcula el total y guarda los cambios. */
  actualizarRegistro(data) {
    if (!data || !data.registroId) {
      throw new Error("Datos incompletos para la actualización.");
    }

    const metricas = {
      ...data,
      ventas: Number(data.ventas || 0),
      calidad: Number(data.calidad || 0),
      ausentismo: Number(data.ausentismo || 0)
    };

    // Utilizamos BonosService para asegurar el contexto en Apps Script
    const totalBono = BonosService.calcularBono(metricas);

    const datosAActualizar = {
      registroId: data.registroId,
      ventas: metricas.ventas,
      calidad: metricas.calidad,
      ausentismo: metricas.ausentismo,
      totalBono: totalBono,
    };

    BonosModel.update(datosAActualizar);

    const bonoFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(totalBono);

    return `Métricas y bono actualizados con éxito. Nuevo Bono: ${bonoFormateado}`;
  },

  // ===============================================
  // III. DELEGACIÓN CONCISA (Pass-Through al Model)
  // ===============================================

  /** Obtiene todos los registros históricos del Model. */
  obtenerRegistros: BonosModel.getAllRecords,

  /** Elimina una fila del registro de bonos por su ID único. */
  eliminarRegistro: BonosModel.deleteRecord,

  /** Busca un registro de bono específico por su ID único (con manejo de errores). */
  getRegistroPorId(registroId) {
    if (!registroId) {
      throw new Error("ID de registro no proporcionado para la búsqueda.");
    }
    // Llamada directa a BonosModel.getRecordById
    const registro = BonosModel.getRecordById(registroId);
    if (!registro) {
      throw new Error(`Registro con ID ${registroId} no encontrado.`);
    }
    return registro;
  },

  /** Calcula los datos agregados para los KPIs del dashboard. */
  obtenerKpis() {
    // Llamada directa a BonosModel.getAllRecords
    const registros = BonosModel.getAllRecords();

    if (registros.length === 0) {
      return { agentesRegistrados: 0, promedioBono: 0, promedioCalidad: 0 };
    }

    // Reducción de datos simplificada
    const totalBono = registros.reduce((sum, r) => sum + (Number(r.totalBono) || 0), 0);
    const totalCalidad = registros.reduce((sum, r) => sum + (Number(r.calidad) || 0), 0);

    return {
      // Se utiliza Set para contar agentes únicos
      agentesRegistrados: new Set(registros.map(r => r.id)).size,
      promedioBono: totalBono / registros.length,
      promedioCalidad: totalCalidad / registros.length
    };
  },
};
