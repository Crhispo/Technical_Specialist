// ===============================================
// CONTROLLER - Exposición de Funciones Globales
// ===============================================

/**
 * Expone la función de guardado al Frontend, delegando al Service.
 * @param {Object} data - Datos del formulario.
 * @returns {string} Mensaje de éxito.
 */
const guardarDatosController = (data) => BonosService.guardarRegistro(data);

/**
 * Expone la función para obtener los KPI agregados, delegando al Service.
 * @returns {Object} Un objeto con los KPIs.
 */
const obtenerKpisController = () => BonosService.obtenerKpis();


/**
 * Expone la función para obtener todos los registros del histórico de bonos.
 * Asegura que el valor de retorno sea un Array.
 * @returns {Array<Object>} Lista de registros.
 */
function obtenerRegistrosController() {
  const registros = BonosService.obtenerRegistros();
  return Array.isArray(registros) ? registros : [];
}

// ===============================================
// CONTROLLER - LÓGICA DE REPORTES INDIVIDUALES (NUEVO)
// ===============================================

/**
 * Controlador principal para generar el reporte HTML.
 * Llama al Service para calcular los datos del reporte y renderizar el HTML.
 * @param {number} idAgente ID del agente.
 * @param {string} fechaInicio Fecha de inicio del periodo (opcional).
 * @param {string} fechaFin Fecha de fin del periodo (opcional).
 * @returns {string} El HTML del reporte.
 */
function generarReporteIndividualController(idAgente, fechaInicio, fechaFin) {
  try {
    // 1. Obtener los datos procesados del Service
    const reporteData = BonosService.generarReporteIndividual(
      Number(idAgente), 
      fechaInicio || '', 
      fechaFin || ''
    );

    // 2. Renderizar el objeto de datos a un string HTML
    const reporteHTML = BonosService.renderizarReporteHTML(reporteData);
    
    Logger.log(`ÉXITO: Reporte para Agente ${idAgente} generado.`);
    return reporteHTML;

  } catch (e) {
    Logger.log(`Error en generarReporteIndividualController: ${e.message} | Stack: ${e.stack}`);
    // Lanza un error amigable al cliente.
    throw new Error("No se pudo generar el reporte. Verifique el ID o el rango de fechas.");
  }
}

// ===============================================
// CONTROLLER - Lógica de Modificación (Manejo de Errores)
// ===============================================

/**
 * Expone la función para eliminar un registro de bono específico.
 * @param {string} registroId ID único de la fila a eliminar.
 * @returns {string} Mensaje de éxito.
 */
function eliminarBonoController(registroId) {
  try {
    BonosService.eliminarRegistro(registroId);
    return `Bono para ${registroId} eliminado correctamente.`;
  } catch (e) {
    Logger.log(`Error en eliminarBonoController: ${e.message} | Stack: ${e.stack}`);
    throw new Error(`No se pudo eliminar el bono: ${e.message}`);
  }
}

/**
 * Endpoint para obtener un registro de bono específico para edición.
 * @param {string} registroId - La clave única del registro (ID_FECHA).
 * @returns {Object} El objeto de datos del agente.
 */
function obtenerRegistroParaEdicionController(registroId) {
  if (!registroId) {
    Logger.log("Error en obtenerRegistroParaEdicionController: ID de registro no proporcionado.");
    throw new Error("Clave de registro de bono no definida.");
  }

  try {
    const registro = BonosService.getRegistroPorId(registroId);
    Logger.log(`ÉXITO: Registro para ID ${registroId} encontrado.`);
    return registro;
  } catch (e) {
    Logger.log(`¡ERROR FATAL EN LA BÚSQUEDA! Mensaje: ${e.message} | Stack: ${e.stack}`);
    throw new Error(`Fallo en el servidor al buscar el registro: ${e.message}`);
  }
}

/**
 * Endpoint para actualizar las métricas de un bono existente.
 * @param {Object} data - Datos del formulario de edición (incluye registroId, métricas).
 * @returns {string} Mensaje de éxito con el bono recalculado.
 */
function actualizarRegistroController(data) {
  if (!data || !data.registroId) {
    Logger.log("Error en actualizarRegistroController: Datos incompletos para la actualización.");
    throw new Error("Datos de registro o ID de registro no definidos.");
  }

  try {
    const mensaje = BonosService.actualizarRegistro(data);
    Logger.log(`ÉXITO: Registro ${data.registroId} actualizado.`);
    return mensaje;
  } catch (e) {
    Logger.log(`¡ERROR FATAL EN LA ACTUALIZACIÓN! Mensaje: ${e.message} | Stack: ${e.stack}`);
    throw new Error(`Fallo al actualizar el registro: ${e.message}`);
  }
}
