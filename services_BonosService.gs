// ===============================================
// I. CONFIGURACIÓN DE REGLAS DE NEGOCIO
// ===============================================

/**
 * Define las reglas de pago y la dirección de cumplimiento (esAscendente) para cada métrica.
 */
const BONO_CONFIG = {
  NIVELES_METRICAS: {
    ventas: {
      esAscendente: false, // Mayor es mejor
      niveles: [
        { meta: 150, pago: 213525 },
        { meta: 120, pago: 170820 },
        { meta: 100, pago: 68328 }
      ]
    },
    calidad: {
      esAscendente: false, // Mayor es mejor
      niveles: [
        { meta: 95, pago: 128115 },
        { meta: 92, pago: 102492 },
        { meta: 90, pago: 40996.8 }
      ]
    },
    ausentismo: {
      esAscendente: true, // Menor es mejor
      niveles: [
        { meta: 2, pago: 85410 },
        { meta: 3, pago: 68328 },
        { meta: 5, pago: 27331.2 }
      ]
    }
  },
  METRICAS_KEYS: ['ventas', 'calidad', 'ausentismo']
};

// ===============================================
// II. FUNCIONES HELPER INTERNAS
// ===============================================

/** * @private 
 * Formatea un número como moneda colombiana (COP).
 */
const _formatCurrencyGS = (num) => (num || 0).toLocaleString('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
});

/** * @private 
 * Limpia y convierte los valores de las métricas a números.
 */
const _prepareMetrics = (data) => {
  const metricas = { ...data };
  BONO_CONFIG.METRICAS_KEYS.forEach(key => {
    metricas[key] = Number(data[key] || 0);
  });
  return metricas;
};

/** * @private 
 * Evalúa el valor de una métrica contra sus niveles de pago.
 */
const _calcularPagoPorMetrica = (valor, configMetrica) => {
  const { niveles, esAscendente } = configMetrica;

  for (const nivel of niveles) {
    // Lógica de cumplimiento
    const cumpleMeta = esAscendente ? (valor <= nivel.meta) : (valor >= nivel.meta);
    if (cumpleMeta) {
      return nivel.pago;
    }
  }
  return 0; // Pago si no se cumple el mínimo
};


// ===============================================
// III. SERVICE (Lógica de Negocio Principal)
// ===============================================

var BonosService = {

  // --- LÓGICA DE CÁLCULO CORE ---

  /** * Calcula el bono total sumando los componentes de Ventas, Calidad y Ausentismo.
   */
  calcularBono(metricas) {
    const config = BONO_CONFIG.NIVELES_METRICAS;
    let totalBono = 0;

    BONO_CONFIG.METRICAS_KEYS.forEach(key => {
      totalBono += _calcularPagoPorMetrica(metricas[key], config[key]);
    });

    return totalBono;
  },

  /** * @private 
   * Obtiene la meta de cumplimiento MÍNIMA para cada métrica.
   * Optimizado para iterar sobre la configuración.
   */
  _obtenerMetasBase() {
    const metas = {};

    BONO_CONFIG.METRICAS_KEYS.forEach(key => {
      const config = BONO_CONFIG.NIVELES_METRICAS[key];
      const niveles = config.niveles;

      // Si es ascendente (Menor es mejor, ej: Ausentismo), la meta base es la MÁS ALTA del array.
      // Si no es ascendente (Mayor es mejor, ej: Ventas), la meta base es la MÁS BAJA del array.
      // En ambos casos, es la última del array ordenado por valor de pago (que típicamente es el nivel mínimo de pago).
      metas[key] = niveles[niveles.length - 1].meta;

      if (config.esAscendente) {
        // Marca Ausentismo como 'Max' para el reporte
        metas[`${key}Max`] = niveles[niveles.length - 1].meta;
      }
    });

    return metas;
  },

  // --- MANEJO DE REGISTROS ---

  /** Procesa la entrada del formulario: calcula el bono y guarda el registro. */
  guardarRegistro(data) {
    if (!data) throw new Error("No se recibió información del formulario");

    const metricas = _prepareMetrics(data);
    const totalBono = BonosService.calcularBono(metricas);

    BonosModel.insert({ ...metricas, totalBono, fecha: new Date() });

    return `Registro guardado con éxito. Bono calculado: ${_formatCurrencyGS(totalBono)}`;
  },

  /** Actualiza las métricas, recalcula el total y guarda los cambios. */
  actualizarRegistro(data) {
    if (!data || !data.registroId) {
      throw new Error("Datos incompletos para la actualización.");
    }

    const metricas = _prepareMetrics(data);
    const totalBono = BonosService.calcularBono(metricas);

    const datosAActualizar = {
      registroId: data.registroId,
      ...metricas, // Incluye ventas, calidad, ausentismo
      totalBono: totalBono,
    };

    BonosModel.update(datosAActualizar);

    return `Métricas y bono actualizados con éxito. Nuevo Bono: ${_formatCurrencyGS(totalBono)}`;
  },

  // --- CONSULTA Y DELEGACIÓN ---

  // Usamos sintaxis de función para la estabilidad en Apps Script
  obtenerRegistros() { return BonosModel.getAllRecords(); },
  eliminarRegistro(registroId) { return BonosModel.deleteRecord(registroId); },

  /** Busca un registro de bono específico por su ID único. */
  getRegistroPorId(registroId) {
    if (!registroId) throw new Error("ID de registro no proporcionado para la búsqueda.");
    const registro = BonosModel.getRecordById(registroId);
    if (!registro) throw new Error(`Registro con ID ${registroId} no encontrado.`);
    return registro;
  },

  /** Calcula los datos agregados para los KPIs del dashboard. */
  obtenerKpis() {
    const registros = BonosModel.getAllRecords();

    if (registros.length === 0) {
      return { agentesRegistrados: 0, promedioBono: 0, promedioCalidad: 0 };
    }

    const totalBono = registros.reduce((sum, r) => sum + (Number(r.totalBono) || 0), 0);
    const totalCalidad = registros.reduce((sum, r) => sum + (Number(r.calidad) || 0), 0);

    // Uso de Set para contar agentes únicos
    return {
      agentesRegistrados: new Set(registros.map(r => r.id)).size,
      promedioBono: totalBono / registros.length,
      promedioCalidad: totalCalidad / registros.length
    };
  },

  // ===============================================
  // IV. LÓGICA DE REPORTES INDIVIDUALES
  // ===============================================

  /**
   * 1. Filtra los registros y calcula las métricas promedio para el reporte.
   */
  generarReporteIndividual(idAgente, fechaInicio, fechaFin) {
    const todosLosRegistros = BonosModel.getAllRecords();
    const METAS = BonosService._obtenerMetasBase();

    // Conversion de fechas a milisegundos para comparación
    const inicioMs = fechaInicio ? new Date(fechaInicio).getTime() : null;
    // Sumamos un día (24h) para INCLUIR el día de fin
    const finMs = fechaFin ? new Date(fechaFin).getTime() + (24 * 60 * 60 * 1000) : null;

    // Filtrar los registros por ID y rango de fechas
    const registrosFiltrados = todosLosRegistros.filter(registro => {
      const registroId = Number(registro.id);
      if (registroId !== idAgente) return false;

      const fechaRegistroMs = new Date(registro.fecha).getTime();

      // Validación de Fechas
      if (inicioMs !== null && fechaRegistroMs < inicioMs) return false;
      if (finMs !== null && fechaRegistroMs >= finMs) return false;

      return true;
    });

    if (registrosFiltrados.length === 0) {
      throw new Error(`No se encontraron registros para el agente ${idAgente} en ese periodo.`);
    }

    // --- CÁLCULOS Y AGREGACIÓN ---
    const totalRegistros = registrosFiltrados.length;
    const agenteNombre = registrosFiltrados[0].nombre;
    const sumaMetricas = { ventas: 0, calidad: 0, ausentismo: 0, totalBono: 0 };

    registrosFiltrados.forEach(r => {
      sumaMetricas.ventas += Number(r.ventas) || 0;
      sumaMetricas.calidad += Number(r.calidad) || 0;
      sumaMetricas.ausentismo += Number(r.ausentismo) || 0;
      sumaMetricas.totalBono += Number(r.totalBono) || 0;
    });

    const promVentas = sumaMetricas.ventas / totalRegistros;
    const promCalidad = sumaMetricas.calidad / totalRegistros;
    const promAusentismo = sumaMetricas.ausentismo / totalRegistros;

    // --- DETERMINACIÓN DE ESTADO FINAL ---
    const calidadOK = promCalidad >= METAS.calidad;
    const ventasOK = promVentas >= METAS.ventas;
    const ausentismoOK = promAusentismo <= METAS.ausentismo; // Usamos la meta base directa

    const bonoGanado = (calidadOK && ventasOK && ausentismoOK);
    const bonoMonto = bonoGanado ? sumaMetricas.totalBono : 0; // Si no cumple las bases, el bono es CERO.

    return {
      id: idAgente,
      nombre: agenteNombre,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      bonoMonto: bonoMonto,
      totalRegistros: totalRegistros,
      metrics: {
        ventas: { valor: promVentas, meta: METAS.ventas, estado: ventasOK },
        calidad: { valor: promCalidad, meta: METAS.calidad, estado: calidadOK },
        // Usamos METAS.ausentismo para la meta base, y le damos el flag 'max' para el renderizado.
        ausentismo: { valor: promAusentismo, meta: METAS.ausentismo, estado: ausentismoOK, tipo: 'max' }
      }
    };
  },

  /**
   * 2. Genera el HTML simple del reporte, usando los estilos adaptados.
   */
  renderizarReporteHTML(data) {
    // Helper para formato de moneda (reutilizado de helper interno)
    const formatCurrencyGS = _formatCurrencyGS;

    // --- COLOR BASE DE LA TARJETA Y ANÁLISIS (COINCIDE CON EL THEAD) ---
    const CARD_BACKGROUND = 'bg-[rgba(255,255,255,0.05)]';
    // --------------------------------------------------------------------

    // --- ESTILOS DE ESTADO ---
    const estadoGanadoClase = 'bg-[var(--color-primary)] text-white';
    const estadoPerdidoClase = 'bg-red-600 text-white';

    const estadoBonoClase = data.bonoMonto > 0 ? estadoGanadoClase : estadoPerdidoClase;
    const estadoBonoTexto = data.bonoMonto > 0 ? `¡BONO GANADO! ${formatCurrencyGS(data.bonoMonto)}` : `BONO NO ALCANZADO: $ 0`;

    let metricsHtml = '';

    // Generación del HTML para cada métrica
    for (const key in data.metrics) {
      const metric = data.metrics[key];
      // Formateo de valores
      const displayValue = key === 'ventas' ? metric.valor.toFixed(0) : `${metric.valor.toFixed(1)}%`;
      const displayMeta = key === 'ventas' ? metric.meta.toFixed(0) :
        metric.tipo === 'max' ? `Máx ${metric.meta}%` : `${metric.meta}%`;

      // Estilos de la tarjeta
      const cardColorCumplida = `border-[var(--color-primary)] ${CARD_BACKGROUND} text-[var(--color-text)]`;
      const cardColorFallida = `border-red-500 ${CARD_BACKGROUND} text-[var(--color-text)]`;

      const cardColor = metric.estado ? cardColorCumplida : cardColorFallida;
      const cardText = metric.estado ? 'Cumplida' : 'Fallida';

      metricsHtml += `
            <div class="p-4 border-l-4 ${cardColor} rounded-md shadow-sm">
                <h4 class="text-sm font-semibold text-[var(--color-text-muted)]">${key.toUpperCase()} (Promedio)</h4>
                <p class="text-2xl font-bold">${displayValue}</p>
                <p class="text-sm text-[var(--color-text-muted)]">Meta Base: ${displayMeta} (${cardText})</p>
            </div>
        `;
    }

    // Devolver el HTML completo
    return `
        <div class="bg-[var(--color-surface)] p-6 shadow-xl rounded-xl border border-[var(--color-border)]">
            <h2 class="text-2xl font-extrabold text-[var(--color-primary)] mb-2">${data.nombre} (ID: ${data.id})</h2>
            <p class="text-sm text-[var(--color-text-muted)] mb-4">Reporte del periodo: ${data.fechaInicio || 'Todo el Histórico'} - ${data.fechaFin || 'Hoy'}</p>
            
            <div class="p-4 mb-6 text-center font-black text-xl rounded-lg ${estadoBonoClase}">
                ${estadoBonoTexto}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                ${metricsHtml}
            </div>
            
            <div class="p-4 ${CARD_BACKGROUND} border-l-4 border-[var(--color-primary)] rounded-md">
                <h4 class="font-semibold text-[var(--color-text)]">Análisis y Foco</h4>
                <p class="text-sm text-[var(--color-text-muted)]">
                    ${data.bonoMonto > 0 ? "¡Excelente desempeño! Continúa con la consistencia para alcanzar niveles de pago superiores." : "Revisa las métricas fallidas (en tarjetas con borde rojo). La métrica más débil te ha impedido alcanzar el bono base."}
                </p>
                <p class="text-xs text-[var(--color-text-muted)] mt-2">Registros analizados: ${data.totalRegistros} entradas en el periodo.</p>
            </div>
        </div>
    `;
  },
};
