/**
 * Módulo encargado de gestionar y comunicarse ÚNICAMENTE con la hoja de cálculo de Google Sheets.
 * Su tarea es leer y escribir datos sin realizar cálculos de negocio.
 * @namespace
 */
var BonosModel = {

  _SHEET_NAME: "BD_Bonos", // Nombre exacto de la hoja de cálculo.

  // Nombres de encabezados estándar y su orden esperado en la hoja
  _HEADERS: ["id", "nombre", "correo", "ventas", "calidad", "ausentismo", "totalBono", "fecha"],

  // =======================================================
  // I. UTILITIES (Funciones Auxiliares)
  // =======================================================

  /**
   * @private
   * Encuentra la hoja de cálculo o la crea si no existe.
   * Siempre usa la referencia BonosModel para llamadas internas (consistencia de Apps Script).
   */
  _getSheet() {
    const hojaDeCalculo = SpreadsheetApp.getActiveSpreadsheet();

    // Acceso a propiedad con 'this' es seguro.
    const sheet = hojaDeCalculo.getSheetByName(this._SHEET_NAME);
    if (sheet) return sheet;

    // Si no existe, la inserta e inicializa los encabezados.
    const newSheet = hojaDeCalculo.insertSheet(this._SHEET_NAME);
    BonosModel._insertInitialHeaders(newSheet);
    return newSheet;
  },

  /**
   * @private
   * Inserta los encabezados iniciales en una hoja recién creada.
   */
  _insertInitialHeaders(sheet) {
    const displayHeaders = [
      "ID", "Nombre", "Correo", "Ventas",
      "Calidad %", "Ausentismo %", "Total Bono", "Fecha"
    ];
    sheet.appendRow(displayHeaders);
  },

  /**
   * @private
   * Genera la clave única (ID_FECHA_ISO) para un registro dado, garantizando la consistencia.
   */
  _getRecordKey(record) {
    let fechaISO;

    // Simplificación y priorización de conversión.
    try {
      // Intenta siempre obtener un ISO string válido desde la fecha, sin anidar IFs.
      const dateObj = new Date(record.fecha);
      if (isNaN(dateObj.getTime())) {
        fechaISO = String(record.fecha); // Si no es una fecha válida, usa el valor crudo.
      } else {
        fechaISO = dateObj.toISOString();
      }
    } catch (e) {
      fechaISO = String(record.fecha);
    }

    return `${record.id}_${fechaISO}`;
  },

  /**
   * @private
   * Retorna los encabezados normalizados (_HEADERS).
   */
  _getHeaders() {
    return this._HEADERS;
  },


  // =======================================================
  // II. CRUD METHODS (Persistencia)
  // =======================================================

  /**
   * Guarda un nuevo registro (una nueva fila) en la hoja de cálculo.
   */
  insert(data) {
    const sheet = BonosModel._getSheet();

    // Organiza los datos en el orden de las columnas.
    const row = [
      data.id, data.nombre, data.correo, data.ventas,
      data.calidad, data.ausentismo, data.totalBono,
      data.fecha
    ];

    sheet.appendRow(row);
  },

  /**
   * Lee todos los registros de la hoja y los mapea a objetos JavaScript.
   */
  getAllRecords() {
    const sheet = BonosModel._getSheet();
    const values = sheet.getDataRange().getValues();

    if (values.length <= 1) return [];

    const dataRows = values.slice(1);
    const headerKeys = BonosModel._getHeaders();

    const records = dataRows.map(row => {
      const record = {};
      row.forEach((value, i) => {
        const key = headerKeys[i];
        if (!key) return; // Evita columnas sin encabezado

        // Convertir Date objects a ISO string para transferencia a Frontend
        if (value instanceof Date) {
          record[key] = value.toISOString();
        } else if (value !== null && value !== undefined) {
          record[key] = value;
        }
      });
      return record;
    });
    return records;
  },

  /**
   * @private
   * Busca la fila de datos y retorna su índice (1-basado en la hoja de cálculo).
   */
  _findRowByRecordId(registroId) {
    const sheet = BonosModel._getSheet();
    const values = sheet.getDataRange().getValues();
    const numRows = values.length;

    for (let i = 1; i < numRows; i++) {
      const rowData = values[i];
      const claveFila = BonosModel._getRecordKey({ id: rowData[0], fecha: rowData[7] }); // Simplificación

      if (claveFila === registroId) {
        return i + 1;
      }
    }
    return -1;
  },

  /**
   * Busca un único registro por su ID y lo retorna para edición.
   */
  getRecordById(registroId) {
    const records = BonosModel.getAllRecords();

    return records.find(record => {
      return BonosModel._getRecordKey(record) === registroId;
    }) || null;
  },

  /**
   * Actualiza las métricas de un registro existente.
   */
  update(data) {
    const sheet = BonosModel._getSheet();
    const rowNumber = BonosModel._findRowByRecordId(data.registroId);

    if (rowNumber === -1) {
      throw new Error(`Fila no encontrada para el ID de registro: ${data.registroId}.`);
    }

    // Uso de .setValues() en un rango horizontal (D(4) a G(7)) para mejor performance
    sheet.getRange(rowNumber, 4, 1, 4).setValues([
      [data.ventas, data.calidad, data.ausentismo, data.totalBono]
    ]);
  },

  /**
   * Elimina una fila del registro de bonos por su ID único.
   */
  deleteRecord(registroId) {
    const sheet = BonosModel._getSheet();
    const rowNumber = BonosModel._findRowByRecordId(registroId);

    if (rowNumber !== -1) {
      sheet.deleteRow(rowNumber);
    } else {
      throw new Error(`Registro con ID: ${registroId} no encontrado para eliminar.`);
    }
  }
};
