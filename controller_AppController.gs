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
  // Usa un operador ternario para concisión y seguridad.
  return Array.isArray(registros) ? registros : [];
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
    // Loguea el error interno completo.
    Logger.log(`Error en eliminarBonoController: ${e.message} | Stack: ${e.stack}`);
    // Lanza un error amigable al cliente.
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
    // El Service ya lanza un error si el registro no se encuentra, simplificando este bloque.
    const registro = BonosService.getRegistroPorId(registroId);
    Logger.log(`ÉXITO: Registro para ID ${registroId} encontrado.`);
    return registro;
  } catch (e) {
    // Captura y relanza el error.
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
    // Delega la lógica de negocio (recalcular y guardar) al Service.
    const mensaje = BonosService.actualizarRegistro(data);
    Logger.log(`ÉXITO: Registro ${data.registroId} actualizado.`);
    return mensaje;
  } catch (e) {
    // Captura y relanza el error.
    Logger.log(`¡ERROR FATAL EN LA ACTUALIZACIÓN! Mensaje: ${e.message} | Stack: ${e.stack}`);
    throw new Error(`Fallo al actualizar el registro: ${e.message}`);
  }
}
