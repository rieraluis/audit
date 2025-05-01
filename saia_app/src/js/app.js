/**
 * Módulo principal de la aplicación SAIA - Versión Corregida
 */
class AppManager {
    constructor() {
        this.currentLang = 'es';
        this.translations = {};
        this.editingAuditId = null;
        this.initialized = false;
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('[AppManager] Iniciando aplicación...');
        
        try {
            // Inicializar DBManager primero
            window.dbManager = new DBManager();
            await window.dbManager.init();
            console.log('[AppManager] DBManager inicializado correctamente');
            
            // Cargar datos iniciales
            await window.dbManager.cargarDatosIniciales();
            console.log('[AppManager] Datos iniciales cargados');
            
            // Inicializar otros managers
            window.incidentsManager = new IncidentsManager();
            window.photoManager = new PhotoManager();
            window.exportManager = new ExportManager();
            
            await Promise.all([
                window.incidentsManager.init(),
                window.photoManager.init(),
                window.exportManager.init()
            ]);
            console.log('[AppManager] Todos los managers inicializados');
            
            // Configurar eventos
            this.setupNavigation();
            this.setupClientEvents();
            this.setupSettingsEvents();
            
            // Cargar datos iniciales de UI
            await Promise.all([
                this.loadClientsForSelector(),
                this.loadSettingsAndApplyLanguage(),
                this.loadLegislationForAudit()
            ]);
            
            // Mostrar pestaña inicial
            const initialTab = window.location.hash ? window.location.hash.substring(1) : 'new-audit';
            const initialLink = document.querySelector(`header nav a[href="#${initialTab}"]`);
            (initialLink?.click) ? initialLink.click() : document.querySelector('header nav a[href="#new-audit"]')?.click();
            
            console.log('[AppManager] Aplicación lista');
        } catch (error) {
            console.error('[AppManager] Error durante la inicialización:', error);
            alert('Error crítico al iniciar la aplicación. Consulte la consola para más detalles.');
        }
    }

    // ... (resto de métodos sin cambios, pero asegurarse de que todos tengan manejo de errores) ...

    async changeLanguage(lang) {
        console.log(`[AppManager] Cambiando idioma a: ${lang}`);
        if (!lang || lang === this.currentLang) {
            console.log(`Idioma ${lang} ya está activo o es inválido`);
            return;
        }

        try {
            this.currentLang = lang;
            
            // Cargar traducciones desde la base de datos
            const translationsDB = await window.dbManager.getByIndex('traducciones', 'idioma', lang);
            this.translations = translationsDB.reduce((acc, item) => {
                acc[item.clave] = item.texto;
                return acc;
            }, {});
            
            console.log(`[AppManager] Cargadas ${Object.keys(this.translations).length} traducciones para ${lang}`);
            
            // Aplicar traducciones al DOM
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = this.translations[key];
                
                if (translation !== undefined) {
                    if (element.placeholder && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                        element.placeholder = translation;
                    } else if (element.title && !element.textContent.trim()) {
                        element.title = translation;
                    } else if ((element.tagName === 'INPUT' && element.type === 'button') || element.tagName === 'BUTTON') {
                        element.value = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            });
            
            // Actualizar atributo lang del documento
            document.documentElement.lang = lang;
            
            // Sincronizar selector de idioma
            const langSelector = document.getElementById('language-selector');
            if (langSelector) langSelector.value = lang;
            
            // Recargar contenido dependiente del idioma
            if (document.getElementById('settings')?.classList.contains('active')) {
                await this.loadLegislationSettings();
            }
            if (document.getElementById('new-audit')?.classList.contains('active')) {
                await this.loadLegislationForAudit();
            }
            
            console.log(`[AppManager] Idioma cambiado a ${lang} correctamente`);
        } catch (error) {
            console.error(`[AppManager] Error al cambiar idioma a ${lang}:`, error);
            alert(`Error al cambiar el idioma. Consulte la consola para más detalles.`);
        }
    }

    // ... (resto de métodos sin cambios) ...
}

// Instanciar el AppManager
if (!window.appManagerInstance) {
    window.appManagerInstance = new AppManager();
}