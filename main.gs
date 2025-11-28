// ===============================================
// MAIN - Punto de Entrada de la Web App
// ===============================================

/**
 * Maneja la solicitud GET para servir la aplicación web.
 * Es el punto de entrada principal para el despliegue.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} La interfaz de usuario (UI) completa.
 */
function doGet() {
  // Crea la plantilla del archivo principal del dashboard.
  const template = HtmlService.createTemplateFromFile('ui_dashboard');
  
  // Renderiza la plantilla.
  const htmlOutput = template.evaluate();
  
  // Configuración de la Web App:
  // 1. Título para el navegador.
  // 2. Modo de sandbox (IFRAME para la seguridad moderna).
  // 3. Permite que la aplicación se cargue en otros sitios web (XFrameOptions).
  return htmlOutput
      .setTitle('Dashboard — Gestión de Bonos')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Usamos ALLOWALL por compatibilidad del entorno
      .setSandboxMode(HtmlService.SandboxMode.IFRAME); // Modo recomendado para seguridad y performance
}

/**
 * Helper para incluir archivos HTML dentro de otros (necesario para usar <!? include('archivo') ?>)
 * Es una función esencial y no requiere refactorización, pero se mantiene clara.
 * @param {string} filename El nombre del archivo HTML sin la extensión .html.
 * @returns {string} El contenido del archivo HTML como una cadena.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
