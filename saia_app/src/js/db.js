/**
 * Módulo de base de datos para la aplicación SAIA
 * Gestiona el almacenamiento y recuperación de datos usando IndexedDB
 */

class DBManager {
    constructor() {
        this.db = null;
        this.dbName = 'saiaDB';
        // *** VERSIÓN INCREMENTADA a 2 para forzar onupgradeneeded ***
        this.dbVersion = 2;
        this.stores = [
            'clientes', 'auditorias', 'incidencias', 'fotos',
            'incidencias_predefinidas', 'legislacion', 'traducciones', 'configuracion'
        ];
    }

    /**
     * Inicializa la base de datos
     * @returns {Promise<IDBDatabase>} Promesa que se resuelve con la instancia de la BD
     */
    init() {
        return new Promise((resolve, reject) => {
            console.log(`[DBManager] Inicializando base de datos '${this.dbName}' v${this.dbVersion}...`);

            const request = indexedDB.open(this.dbName, this.dbVersion);

            // Error al abrir la base de datos
            request.onerror = (event) => {
                console.error('[DBManager] Error al abrir IndexedDB:', event.target.error);
                reject(new Error(`Error al abrir IndexedDB: ${event.target.error?.message || 'Desconocido'}`));
            };

            // Bloqueado por otra conexión (otra pestaña?)
            request.onblocked = (event) => {
                console.warn('[DBManager] Apertura de IndexedDB bloqueada. Cierra otras pestañas de la aplicación.');
                alert('La base de datos necesita actualizarse, pero está bloqueada. Por favor, cierra otras pestañas de esta aplicación y recarga.');
                reject(new Error('Apertura de IndexedDB bloqueada.'));
            };

            // Crear o actualizar estructura (SOLO se ejecuta si dbVersion > versión actual o si no existe)
            request.onupgradeneeded = (event) => {
                console.log(`[DBManager] Ejecutando onupgradeneeded (versión ${event.newVersion} desde ${event.oldVersion})...`);
                const db = event.target.result;
                const transaction = event.target.transaction; // Usar transacción existente

                console.log("[DBManager] Almacenes existentes:", [...db.objectStoreNames]);

                // Crear almacenes si no existen
                this.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        console.log(`[DBManager] Creando almacén: ${storeName}`);
                        try {
                            switch (storeName) {
                                case 'clientes':
                                    const clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
                                    clientesStore.createIndex('nombre', 'nombre', { unique: false });
                                    break;
                                case 'auditorias':
                                    const auditoriasStore = db.createObjectStore('auditorias', { keyPath: 'id', autoIncrement: true });
                                    auditoriasStore.createIndex('cliente_id', 'cliente_id', { unique: false });
                                    auditoriasStore.createIndex('fecha', 'fecha', { unique: false });
                                    break;
                                case 'incidencias':
                                    const incidenciasStore = db.createObjectStore('incidencias', { keyPath: 'id', autoIncrement: true });
                                    incidenciasStore.createIndex('auditoria_id', 'auditoria_id', { unique: false });
                                    incidenciasStore.createIndex('bloque', 'bloque', { unique: false });
                                    break;
                                case 'fotos':
                                    const fotosStore = db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
                                    fotosStore.createIndex('incidencia_id', 'incidencia_id', { unique: false });
                                    break;
                                case 'incidencias_predefinidas':
                                    const incidenciasPredefStore = db.createObjectStore('incidencias_predefinidas', { keyPath: 'id', autoIncrement: true });
                                    incidenciasPredefStore.createIndex('bloque', 'bloque', { unique: false });
                                    incidenciasPredefStore.createIndex('descripcion', 'descripcion', { unique: false }); // Índice útil?
                                    break;
                                case 'legislacion':
                                    const legislacionStore = db.createObjectStore('legislacion', { keyPath: 'id', autoIncrement: true });
                                    legislacionStore.createIndex('idioma', 'idioma', { unique: false });
                                    legislacionStore.createIndex('orden', 'orden', { unique: false });
                                    legislacionStore.createIndex('activo', 'activo', { unique: false }); // Índice para filtrar activas
                                    legislacionStore.createIndex('idioma_activo', ['idioma', 'activo'], { unique: false }); // Índice compuesto
                                    break;
                                case 'traducciones':
                                    const traduccionesStore = db.createObjectStore('traducciones', { keyPath: 'id', autoIncrement: true });
                                    traduccionesStore.createIndex('idioma', 'idioma', { unique: false });
                                    traduccionesStore.createIndex('clave', 'clave', { unique: false });
                                    traduccionesStore.createIndex('idioma_clave', ['idioma', 'clave'], { unique: true }); // Clave única por idioma
                                    break;
                                case 'configuracion':
                                    db.createObjectStore('configuracion', { keyPath: 'id' }); // id será 'general', 'logo', etc.
                                    break;
                            }
                        } catch (e) {
                             console.error(`[DBManager] Error creando almacén ${storeName}:`, e);
                             // Si falla la creación de un almacén, la transacción se abortará.
                             // Es importante manejar esto en onerror.
                             if (transaction) transaction.abort(); // Intentar abortar
                             reject(new Error(`Error creando almacén ${storeName}: ${e.message}`));
                             return; // Salir del forEach
                         }
                    } else {
                        console.log(`[DBManager] Almacén ${storeName} ya existe.`);
                        // Aquí podrías añadir lógica para actualizar índices si fuera necesario en futuras versiones
                    }
                });

                console.log('[DBManager] onupgradeneeded completado.');
                // NO llamar a cargarDatosIniciales aquí, se hará en onsuccess.
            };

            // Éxito al abrir la conexión (después de onupgradeneeded si hubo cambio de versión)
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log(`[DBManager] Conexión a BD v${this.db.version} establecida.`);

                 // Manejar cierres inesperados
                 this.db.onclose = () => {
                     console.warn("[DBManager] Conexión a BD cerrada inesperadamente.");
                     this.db = null; // Marcar como cerrada
                 };
                 this.db.onerror = (ev) => {
                      console.error("[DBManager] Error en la conexión de BD:", ev.target.error);
                  };


                // Ahora es seguro cargar datos iniciales porque la estructura está lista.
                // Pero lo llamaremos desde AppManager.init después de que esta promesa resuelva.
                // this.cargarDatosIniciales().then(() => {
                //     console.log('[DBManager] Carga inicial de datos (si era necesaria) completada.');
                //     resolve(this.db); // Resolver con la instancia de la BD
                // }).catch(error => {
                //     console.error('[DBManager] Error durante cargarDatosIniciales:', error);
                //     // Resolvemos igualmente? O rechazamos? Depende de si la app puede funcionar sin datos iniciales
                //     // Resolvemos, pero AppManager debe ser consciente del posible fallo.
                //     resolve(this.db);
                // });

                 // Simplemente resolvemos, AppManager se encargará de los datos iniciales si es necesario
                 resolve(this.db);
            };
        });
    }

    /**
     * Carga datos iniciales (traducciones, legislación por defecto, config) si los almacenes están vacíos.
     * Es llamado DESPUÉS de que init() haya resuelto y this.db esté disponible.
     * @returns {Promise<void>}
     */
    async cargarDatosIniciales() {
        if (!this.db) {
             console.error("[DBManager] Intento de cargar datos iniciales sin conexión a DB.");
             return;
         }
         console.log("[DBManager] Verificando necesidad de cargar datos iniciales...");

         try {
             // Verificar si CADA almacén relevante está vacío ANTES de intentar in             const configCount = await this.count("configuracion");
             const traduccionesCount = await this.count("traducciones");
             const legislacionCount = await this.count("legislacion");
             const incidenciasPredefCount = await this.count("incidencias_predefinidas"); // Añadir contador

             // Si alguno de los almacenes clave está vacío, proceder a cargar todo.
             // Incluir incidenciasPredefCount en la condición
             if (configCount === 0 || traduccionesCount === 0 || legislacionCount === 0 || incidenciasPredefCount === 0) {
                 console.log("[DBManager] Al menos un almacén clave está vacío. Cargando datos iniciales...");

                 const transaction = this.db.transaction(this.stores, "readwrite"); // Transacción única para todo
                 const promises = [];

                 // --- Cargar Configuración por defecto ---
                 if (configCount === 0) {
                      console.log("[DBManager] Cargando config por defecto...");
                     const configStore = transaction.objectStore("configuracion");
                     promises.push(this._putInTransaction(configStore, { id: "general", idioma: "es", textoCierre: "Para cualquier consulta o aclaración, no dude en contactar con nosotros. Atentamente, el equipo de SAIA Consultores." }));
                     promises.push(this._putInTransaction(configStore, { id: "logo", src: "img/logo_saia.jpg" })); // Logo por defecto
                 }

                 // --- Cargar Traducciones ---
                 if (traduccionesCount === 0) {
                      console.log("[DBManager] Cargando traducciones por defecto...");
                     const traduccionesStore = transaction.objectStore("traducciones");
                     // Asegúrate de que las traducciones estén definidas o cárgalas aquí
                     const traducciones = this.getDefaultTranslations(); // Llama a una función para obtenerlas
                     traducciones.forEach(t => promises.push(this._addInTransaction(traduccionesStore, t)));
                 }

                 // --- Cargar Legislación ---
                  if (legislacionCount === 0) {
                       console.log("[DBManager] Cargando legislación por defecto...");
                      const legislacionStore = transaction.objectStore("legislacion");
                      // Asegúrate de que las legislaciones estén definidas o cárgalas aquí
                      const legislaciones = this.getDefaultLegislation(); // Llama a una función para obtenerlas
                       legislaciones.forEach(l => promises.push(this._addInTransaction(legislacionStore, l)));
                  }

                 // --- Cargar Incidencias Predefinidas ---
                 if (incidenciasPredefCount === 0) {
                     console.log("[DBManager] Cargando incidencias predefinidas...");
                     // Verificar que predefinedIncidentsData existe (cargado desde el script)
                     if (typeof predefinedIncidentsData !== 'undefined' && Array.isArray(predefinedIncidentsData)) {
                         const incidenciasPredefStore = transaction.objectStore("incidencias_predefinidas");
                         predefinedIncidentsData.forEach(inc => {
                             // Asegurarse de que la incidencia tiene los campos necesarios
                             if (inc.bloque && inc.descripcion && typeof inc.medida_correctora !== 'undefined') {
                                 promises.push(this._addInTransaction(incidenciasPredefStore, inc));
                             } else {
                                 console.warn("[DBManager] Omitiendo incidencia predefinida inválida:", inc);
                             }
                         });
                         console.log(`[DBManager] ${predefinedIncidentsData.length} incidencias predefinidas añadidas a la transacción.`);
                     } else {
                         console.error("[DBManager] La variable 'predefinedIncidentsData' no está definida o no es un array. No se pueden cargar incidencias predefinidas.");
                         // Considerar si esto debe ser un error fatal o solo una advertencia
                     }
                 }


                 // Esperar a que todas las inserciones de la transacción terminen
                 await Promise.all(promises);
                 await new Promise((resolve, reject) => { // Esperar a que la transacción se complete
                    transaction.oncomplete = () => {
                        console.log("[DBManager] Transacción de carga inicial completada.");
                        resolve();
                    };
                    transaction.onerror = (event) => {
                        console.error("[DBManager] Error en transacción de carga inicial:", event.target.error);
                        reject(event.target.error); // Rechazar la promesa si la transacción falla
                    };
                 });
             } else {
                 console.log("[DBManager] Los almacenes clave ya contienen datos. No se cargan datos iniciales.");
             }
         } catch (error) {
             console.error("[DBManager] Error CRÍTICO durante cargarDatosIniciales:", error);
             // Propagar el error para que AppManager pueda manejarlo si es necesario
             throw error;
         }
    }

    // Helper para obtener traducciones por defecto (evita tener el array gigante dentro de la función principal)
    getDefaultTranslations() {
        return [
             // Español
             { idioma: 'es', clave: 'app_title', texto: 'SAIA - Sistema de Auditoría e Informes Alimentarios' },
             { idioma: 'es', clave: 'new_audit', texto: 'Nueva Auditoría' }, { idioma: 'es', clave: 'audit_history', texto: 'Historial de Auditorías' },
             { idioma: 'es', clave: 'clients', texto: 'Gestión de Clientes' }, { idioma: 'es', clave: 'incidents_db', texto: 'Base de Datos de Incidencias' },
             { idioma: 'es', clave: 'settings', texto: 'Configuración' }, { idioma: 'es', clave: 'save', texto: 'Guardar' },
             { idioma: 'es', clave: 'preview', texto: 'Vista Previa' }, { idioma: 'es', clave: 'export', texto: 'Exportar' },
             { idioma: 'es', clave: 'export_word', texto: 'Exportar a Word' }, { idioma: 'es', clave: 'export_pdf', texto: 'Exportar a PDF' },
             { idioma: 'es', clave: 'client', texto: 'Cliente' }, { idioma: 'es', clave: 'select_client', texto: 'Selecciona un cliente' },
             { idioma: 'es', clave: 'date', texto: 'Fecha' }, { idioma: 'es', clave: 'visit_type', texto: 'Tipo de Visita' },
             { idioma: 'es', clave: 'auditor', texto: 'Auditor' }, { idioma: 'es', clave: 'shift', texto: 'Turno' },
             { idioma: 'es', clave: 'contact_person', texto: 'Persona de contacto' }, { idioma: 'es', clave: 'address', texto: 'Dirección' },
             { idioma: 'es', clave: 'client_logo', texto: 'Logo del cliente' }, { idioma: 'es', clave: 'no_logo', texto: 'No hay logo' },
             { idioma: 'es', clave: 'introduction', texto: 'Introducción' }, { idioma: 'es', clave: 'intro_placeholder', texto: 'Texto introductorio del informe' },
             { idioma: 'es', clave: 'infrastructure', texto: 'Infraestructura' }, { idioma: 'es', clave: 'good_practices', texto: 'Buenas Prácticas' },
             { idioma: 'es', clave: 'self_controls', texto: 'Autocontroles' }, { idioma: 'es', clave: 'observations', texto: 'Observaciones' },
             { idioma: 'es', clave: 'legislation', texto: 'Legislación' }, { idioma: 'es', clave: 'closing', texto: 'Cierre' },
             { idioma: 'es', clave: 'add_incident', texto: 'Añadir Incidencia' }, { idioma: 'es', clave: 'appcc_status', texto: 'Estado del Manual APPCC / Autocontroles' },
             { idioma: 'es', clave: 'appcc_placeholder', texto: 'Descripción del estado del manual APPCC' },
             { idioma: 'es', clave: 'observations_placeholder', texto: 'Observaciones generales' },
             { idioma: 'es', clave: 'legislation_reference', texto: 'Legislación de Referencia' },
             { idioma: 'es', clave: 'closing_placeholder', texto: 'Texto de cierre del informe' },
             { idioma: 'es', clave: 'default_closing_text', texto: 'Para cualquier consulta o aclaración, no dude en contactar con nosotros. Atentamente, el equipo de SAIA Consultores.' },
             { idioma: 'es', clave: 'incident_description', texto: 'Descripción Incidencia' }, { idioma: 'es', clave: 'corrective_measure', texto: 'Medida Correctora' },
             { idioma: 'es', clave: 'photos', texto: 'Fotos' }, { idioma: 'es', clave: 'add_photo', texto: 'Añadir Foto' },
             // Catalán
             { idioma: 'ca', clave: 'app_title', texto: 'SAIA - Sistema d\\'Auditoria i Informes Alimentaris' },
             { idioma: 'ca', clave: 'new_audit', texto: 'Nova Auditoria' }, { idioma: 'ca', clave: 'audit_history', texto: 'Historial d\\'Auditories' },
             { idioma: 'ca', clave: 'clients', texto: 'Gestió de Clients' }, { idioma: 'ca', clave: 'incidents_db', texto: 'Base de Dades d\\'Incidències' },
             { idioma: 'ca', clave: 'settings', texto: 'Configuració' }, { idioma: 'ca', clave: 'save', texto: 'Desar' },
             { idioma: 'ca', clave: 'preview', texto: 'Vista Prèvia' }, { idioma: 'ca', clave: 'export', texto: 'Exportar' },
             { idioma: 'ca', clave: 'export_word', texto: 'Exportar a Word' }, { idioma: 'ca', clave: 'export_pdf', texto: 'Exportar a PDF' },
             { idioma: 'ca', clave: 'client', texto: 'Client' }, { idioma: 'ca', clave: 'select_client', texto: 'Selecciona un client' },
             { idioma: 'ca', clave: 'date', texto: 'Data' }, { idioma: 'ca', clave: 'visit_type', texto: 'Tipus de Visita' },
             { idioma: 'ca', clave: 'auditor', texto: 'Auditor' }, { idioma: 'ca', clave: 'shift', texto: 'Torn' },
             { idioma: 'ca', clave: 'contact_person', texto: 'Persona de contacte' }, { idioma: 'ca', clave: 'address', texto: 'Adreça' },
             { idioma: 'ca', clave: 'client_logo', texto: 'Logo del client' }, { idioma: 'ca', clave: 'no_logo', texto: 'No hi ha logo' },
             { idioma: 'ca', clave: 'introduction', texto: 'Introducció' }, { idioma: 'ca', clave: 'intro_placeholder', texto: 'Text introductori de l\\'informe' },
             { idioma: 'ca', clave: 'infrastructure', texto: 'Infraestructura' }, { idioma: 'ca', clave: 'good_practices', texto: 'Bones Pràctiques' },
             { idioma: 'ca', clave: 'self_controls', texto: 'Autocontrols' }, { idioma: 'ca', clave: 'observations', texto: 'Observacions' },
             { idioma: 'ca', clave: 'legislation', texto: 'Legislació' }, { idioma: 'ca', clave: 'closing', texto: 'Tancament' },
             { idioma: 'ca', clave: 'add_incident', texto: 'Afegir Incidència' }, { idioma: 'ca', clave: 'appcc_status', texto: 'Estat del Manual APPCC / Autocontrols' },
             { idioma: 'ca', clave: 'appcc_placeholder', texto: 'Descripció de l\\'estat del manual APPCC' },
             { idioma: 'ca', clave: 'observations_placeholder', texto: 'Observacions generals' },
             { idioma: 'ca', clave: 'legislation_reference', texto: 'Legislació de Referència' },
             { idioma: 'ca', clave: 'closing_placeholder', texto: 'Text de tancament de l\\'informe' },
             { idioma: 'ca', clave: 'default_closing_text', texto: 'Per a qualsevol consulta o aclariment, no dubteu a contactar amb nosaltres. Atentament, l\\'equip de SAIA Consultors.' },
             { idioma: 'ca', clave: 'incident_description', texto: 'Descripció Incidència' }, { idioma: 'ca', clave: 'corrective_measure', texto: 'Mesura Correctora' },
             { idioma: 'ca', clave: 'photos', texto: 'Fotos' }, { idioma: 'ca', clave: 'add_photo', texto: 'Afegir Foto' },
             // Inglés (básico, podría necesitar revisión)
             { idioma: 'en', clave: 'app_title', texto: 'SAIA - Food Audit and Reporting System' },
             { idioma: 'en', clave: 'new_audit', texto: 'New Audit' }, { idioma: 'en', clave: 'audit_history', texto: 'Audit History' },
             { idioma: 'en', clave: 'clients', texto: 'Client Management' }, { idioma: 'en', clave: 'incidents_db', texto: 'Incidents Database' },
             { idioma: 'en', clave: 'settings', texto: 'Settings' }, { idioma: 'en', clave: 'save', texto: 'Save' },
             { idioma: 'en', clave: 'preview', texto: 'Preview' }, { idioma: 'en', clave: 'export', texto: 'Export' },
             { idioma: 'en', clave: 'export_word', texto: 'Export to Word' }, { idioma: 'en', clave: 'export_pdf', texto: 'Export to PDF' },
             { idioma: 'en', clave: 'client', texto: 'Client' }, { idioma: 'en', clave: 'select_client', texto: 'Select a client' },
             { idioma: 'en', clave: 'date', texto: 'Date' }, { idioma: 'en', clave: 'visit_type', texto: 'Visit Type' },
             { idioma: 'en', clave: 'auditor', texto: 'Auditor' }, { idioma: 'en', clave: 'shift', texto: 'Shift' },
             { idioma: 'en', clave: 'contact_person', texto: 'Contact Person' }, { idioma: 'en', clave: 'address', texto: 'Address' },
             { idioma: 'en', clave: 'client_logo', texto: 'Client Logo' }, { idioma: 'en', clave: 'no_logo', texto: 'No logo' },
             { idioma: 'en', clave: 'introduction', texto: 'Introduction' }, { idioma: 'en', clave: 'intro_placeholder', texto: 'Introductory text of the report' },
             { idioma: 'en', clave: 'infrastructure', texto: 'Infrastructure' }, { idioma: 'en', clave: 'good_practices', texto: 'Good Practices' },
             { idioma: 'en', clave: 'self_controls', texto: 'Self-Controls' }, { idioma: 'en', clave: 'observations', texto: 'Observations' },
             { idioma: 'en', clave: 'legislation', texto: 'Legislation' }, { idioma: 'en', clave: 'closing', texto: 'Closing' },
             { idioma: 'en', clave: 'add_incident', texto: 'Add Incident' }, { idioma: 'en', clave: 'appcc_status', texto: 'HACCP Manual / Self-Controls Status' },
             { idioma: 'en', clave: 'appcc_placeholder', texto: 'Description of the HACCP manual status' },
             { idioma: 'en', clave: 'observations_placeholder', texto: 'General observations' },
             { idioma: 'en', clave: 'legislation_reference', texto: 'Reference Legislation' },
             { idioma: 'en', clave: 'closing_placeholder', texto: 'Closing text of the report' },
             { idioma: 'en', clave: 'default_closing_text', texto: 'For any questions or clarifications, please do not hesitate to contact us. Sincerely, the SAIA Consultants team.' },
             { idioma: 'en', clave: 'incident_description', texto: 'Incident Description' }, { idioma: 'en', clave: 'corrective_measure', texto: 'Corrective Measure' },
             { idioma: 'en', clave: 'photos', texto: 'Photos' }, { idioma: 'en', clave: 'add_photo', texto: 'Add Photo' },
        ];
    }

    // Helper para obtener legislación por defecto
    getDefaultLegislation() {
        return [
             // Español
             { idioma: 'es', orden: 1, texto: 'Reglamento (CE) nº 852/2004, relativo a la higiene de los productos alimenticios.', activo: true },
             { idioma: 'es', orden: 2, texto: 'Reglamento (CE) nº 853/2004, por el que se establecen normas específicas de higiene de los alimentos de origen animal.', activo: true },
             { idioma: 'es', orden: 3, texto: 'Real Decreto 3484/2000, por el que se establecen las normas de higiene para la elaboración, distribución y comercio de comidas preparadas.', activo: true },
             { idioma: 'es', orden: 4, texto: 'Reglamento (UE) 1169/2011, sobre la información alimentaria facilitada al consumidor.', activo: true },
             { idioma: 'es', orden: 5, texto: 'Real Decreto 1021/2022, por el que se regulan determinados requisitos en materia de higiene de la producción y comercialización de los productos alimenticios en establecimientos de comercio al por menor.', activo: true },
             // Catalán
             { idioma: 'ca', orden: 1, texto: 'Reglament (CE) núm. 852/2004, relatiu a la higiene dels productes alimentaris.', activo: true },
             { idioma: 'ca', orden: 2, texto: 'Reglament (CE) núm. 853/2004, pel qual s\\'estableixen normes específiques d\\'higiene dels aliments d\\'origen animal.', activo: true },
             { idioma: 'ca', orden: 3, texto: 'Reial Decret 3484/2000, pel qual s\\'estableixen les normes d\\'higiene per a l\\'elaboració, distribució i comerç de menjars preparats.', activo: true },
             { idioma: 'ca', orden: 4, texto: 'Reglament (UE) 1169/2011, sobre la informació alimentària facilitada al consumidor.', activo: true },
             { idioma: 'ca', orden: 5, texto: 'Reial Decret 1021/2022, pel qual es regulen determinats requisits en matèria d\\'higiene de la producció i comercialització dels productes alimentaris en establiments de comerç al detall.', activo: true },
             // Inglés
             { idioma: 'en', orden: 1, texto: 'Regulation (EC) No 852/2004 on the hygiene of foodstuffs.', activo: true },
             { idioma: 'en', orden: 2, texto: 'Regulation (EC) No 853/2004 laying down specific hygiene rules for food of animal origin.', activo: true },
             { idioma: 'en', orden: 3, texto: 'Royal Decree 3484/2000, which establishes hygiene standards for the preparation, distribution and trade of prepared meals.', activo: true },
             { idioma: 'en', orden: 4, texto: 'Regulation (EU) No 1169/2011 on the provision of food information to consumers.', activo: true },
             { idioma: 'en', orden: 5, texto: 'Royal Decree 1021/2022, regulating certain requirements regarding the hygiene of the production and marketing of food products in retail establishments.', activo: true },
        ];
    }

    /**
     * Método auxiliar para añadir un registro dentro de una transacción existente.
     * Devuelve una promesa que se resuelve o rechaza según el resultado de la petición.
     * @param {IDBObjectStore} store
     * @param {object} data
     * @returns {Promise<void>}
     */
    _addInTransaction(store, data) {
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Método auxiliar para actualizar/insertar (put) un registro dentro de una transacción existente.
     * Devuelve una promesa que se resuelve o rechaza según el resultado de la petición.
     * @param {IDBObjectStore} store
     * @param {object} data
     * @returns {Promise<void>}
     */
    _putInTransaction(store, data) {
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Obtiene una transacción para las tiendas especificadas.
     * @param {string|string[]} storeNames Nombre(s) de las tiendas
     * @param {IDBTransactionMode} mode Modo (", old_str =         };
                     transaction.onabort = (event) => {
                          console.error("[DBManager] Transacción de carga inicial abortada:", event.target.error);
                          reject(event.target.error || new Error("Transacción abortada"));
                      };
                 });
                 console.log("[DBManager] Datos iniciales cargados.");

             } else {
                 console.log("[DBManager] Los almacenes clave ya contienen datos. No se cargan datos iniciales.");
             }
         } catch (error) {
              // El error NotFoundError ya no debería ocurrir aquí si init() funcionó.
              // Podría haber otros errores (QuotaExceeded, etc.)
             console.error('[DBManager] Error durante la carga de datos iniciales:', error);
             throw error; // Relanzar para que AppManager sepa que falló
         }
     }

    // --- Métodos auxiliares para operaciones dentro de una transacción existente ---
    _addInTransaction(store, data) {
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = (event) => resolve(event.target.result);
            // No añadir onerror aquí, se maneja en la transacción principal
        });
    }
    _putInTransaction(store, data) {
         return new Promise((resolve, reject) => {
             const request = store.put(data); // put actualiza o inserta
             request.onsuccess = (event) => resolve(event.target.result);
         });
     }


    // --- Métodos CRUD Genéricos (Abren su propia transacción) ---

    _getStore(storeName, mode = 'readonly') {
         if (!this.db) throw new Error('Base de datos no inicializada');
         try {
             const transaction = this.db.transaction([storeName], mode);
             return transaction.objectStore(storeName);
         } catch (error) {
              console.error(`[DBManager] Error obteniendo store '${storeName}' (modo ${mode}):`, error);
              // Podría ser que el store no exista si onupgradeneeded falló
              if (error.name === 'NotFoundError') {
                  console.error(`[DBManager] ¡El almacén '${storeName}' no existe en la base de datos!`);
                  // Intentar recargar? O simplemente fallar?
              }
              throw error; // Relanzar
          }
     }

    add(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getStore(storeName, 'readwrite');
                const request = store.add(data);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => { console.error(`[DBManager] Error en add ${storeName}:`, event.target.error); reject(event.target.error); };
            } catch (error) { reject(error); }
        });
    }

    update(storeName, data) {
        return new Promise((resolve, reject) => {
             try {
                 const store = this._getStore(storeName, 'readwrite');
                 const request = store.put(data); // put actualiza o inserta
                 request.onsuccess = (event) => resolve(event.target.result); // Devuelve la key
                 request.onerror = (event) => { console.error(`[DBManager] Error en update ${storeName}:`, event.target.error); reject(event.target.error); };
             } catch (error) { reject(error); }
         });
    }

    delete(storeName, key) {
        return new Promise((resolve, reject) => {
             try {
                 const store = this._getStore(storeName, 'readwrite');
                 const request = store.delete(key);
                 request.onsuccess = () => resolve();
                 request.onerror = (event) => { console.error(`[DBManager] Error en delete ${storeName}:`, event.target.error); reject(event.target.error); };
             } catch (error) { reject(error); }
         });
    }

    get(storeName, key) {
         // Alias para getByKey
         return this.getByKey(storeName, key);
     }

    getByKey(storeName, key) {
        return new Promise((resolve, reject) => {
            if (key === undefined || key === null || key === '') {
                 // console.warn(`[DBManager] getByKey llamado con clave inválida (${key}) para ${storeName}`);
                 return resolve(undefined); // Devolver undefined si la key es inválida
             }
            try {
                const store = this._getStore(storeName);
                const request = store.get(key);
                request.onsuccess = (event) => resolve(event.target.result); // Puede ser undefined si no se encuentra
                request.onerror = (event) => { console.error(`[DBManager] Error en getByKey ${storeName}:`, event.target.error); reject(event.target.error); };
            } catch (error) { reject(error); }
        });
    }

    getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
             if (value === undefined || value === null) {
                  console.warn(`[DBManager] getByIndex llamado con valor inválido (${value}) para ${storeName}/${indexName}`);
                  return resolve([]); // Devolver array vacío
              }
             try {
                 const store = this._getStore(storeName);
                 const index = store.index(indexName);
                 const request = index.getAll(value); // Obtiene todos los que coincidan
                 request.onsuccess = (event) => resolve(event.target.result || []);
                 request.onerror = (event) => { console.error(`[DBManager] Error en getByIndex ${storeName}/${indexName}:`, event.target.error); reject(event.target.error); };
             } catch (error) { reject(error); }
         });
    }

    getAll(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getStore(storeName);
                const request = store.getAll();
                request.onsuccess = (event) => resolve(event.target.result || []);
                request.onerror = (event) => { console.error(`[DBManager] Error en getAll ${storeName}:`, event.target.error); reject(event.target.error); };
            } catch (error) { reject(error); }
        });
    }

     count(storeName) {
         return new Promise((resolve, reject) => {
             try {
                 const store = this._getStore(storeName);
                 const request = store.count();
                 request.onsuccess = (event) => resolve(event.target.result || 0);
                 request.onerror = (event) => { console.error(`[DBManager] Error en count ${storeName}:`, event.target.error); reject(event.target.error); };
             } catch (error) { reject(error); }
         });
     }


    // --- Métodos específicos de la aplicación ---

     /**
      * Obtiene todos los clientes cuyas IDs están en la lista.
      * @param {number[]} clientIds Array de IDs de cliente.
      * @returns {Promise<Array>} Array de objetos cliente encontrados.
      */
     getAllClientsByIds(clientIds) {
         return new Promise(async (resolve, reject) => {
             if (!this.db) return reject(new Error('DB no inicializada'));
             if (!clientIds || clientIds.length === 0) return resolve([]);

             const transaction = this.db.transaction(['clientes'], 'readonly');
             const store = transaction.objectStore('clientes');
             const uniqueIds = [...new Set(clientIds)]; // Asegurar IDs únicos
             const results = [];
             let completed = 0;

             uniqueIds.forEach(id => {
                 const request = store.get(id);
                 request.onsuccess = (event) => {
                     if (event.target.result) {
                         results.push(event.target.result);
                     }
                     completed++;
                     if (completed === uniqueIds.length) {
                         resolve(results);
                     }
                 };
                 request.onerror = (event) => {
                     // No rechazar por un solo error, solo loguear
                     console.error(`[DBManager] Error obteniendo cliente ID ${id}:`, event.target.error);
                     completed++;
                     if (completed === uniqueIds.length) {
                         resolve(results);
                     }
                 };
             });

             transaction.onerror = (event) => { reject(event.target.error); };
             transaction.onabort = (event) => { reject(event.target.error || new Error("Transacción abortada")); };
         });
     }

     /**
      * Obtiene la legislación activa para un idioma específico, ordenada.
      * @param {string} lang Código de idioma ('es', 'ca', 'en')
      * @returns {Promise<Array>} Array de objetos de legislación activos y ordenados.
      */
     getLegislacionActiva(lang) {
         return new Promise(async (resolve, reject) => {
             console.log(`[DBManager] Buscando legislación activa para idioma: ${lang}`);
             if (!this.db) return reject(new Error('DB no inicializada'));

             try {
                 const store = this._getStore('legislacion');
                 // Usar índice compuesto [idioma, activo]
                 const index = store.index('idioma_activo');
                 // Crear un rango para buscar idioma=lang y activo=true
                 // Nota: IndexedDB no soporta booleanos directamente en rangos de forma fiable en todos los navegadores.
                 // Alternativa 1: Filtrar después de obtener por idioma.
                 // Alternativa 2: Guardar 'activo' como número (1/0) o string ('true'/'false') y usar eso en el índice.
                 // Vamos por Alternativa 1 por simplicidad ahora.

                 const request = store.index('idioma').getAll(lang); // Obtener todas por idioma

                 request.onsuccess = (event) => {
                     const results = event.target.result || [];
                     console.log(`[DBManager] Encontradas ${results.length} legislaciones para ${lang}. Filtrando activas...`);
                     const activas = results
                         .filter(item => item.activo === true) // Filtrar por activo=true
                         .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)); // Ordenar por 'orden'
                     console.log(`[DBManager] Encontradas ${activas.length} legislaciones activas para ${lang}.`);
                     resolve(activas);
                 };
                 request.onerror = (event) => {
                     console.error(`[DBManager] Error buscando legislación por idioma ${lang}:`, event.target.error);
                     reject(event.target.error);
                 };

             } catch (error) {
                 console.error(`[DBManager] Error configurando búsqueda de legislación activa para ${lang}:`, error);
                 reject(error);
             }
         });
     }


    /**
     * Guarda una auditoría completa (datos generales, incidencias, fotos).
     * Maneja la creación o actualización. Retroalimenta incidencias predefinidas.
     * @param {Object} auditoriaCompleta Datos de la auditoría (incluyendo id si es actualización).
     * @returns {Promise<number>} ID de la auditoría guardada/actualizada.
     */
    async guardarAuditoria(auditoriaCompleta) {
         console.log("[DBManager] Guardando auditoría completa:", auditoriaCompleta.id ? `ID ${auditoriaCompleta.id}` : "(Nueva)");
         if (!this.db) throw new Error('DB no inicializada');

         const transaction = this.db.transaction(['auditorias', 'incidencias', 'fotos', 'incidencias_predefinidas'], 'readwrite');
         const auditoriasStore = transaction.objectStore('auditorias');
         const incidenciasStore = transaction.objectStore('incidencias');
         const fotosStore = transaction.objectStore('fotos');
         const predefinidasStore = transaction.objectStore('incidencias_predefinidas');
         const allPromises = [];

         return new Promise(async (resolve, reject) => {
              transaction.onerror = (event) => { console.error("[DBManager] Error en transacción guardarAuditoria:", event.target.error); reject(event.target.error); };
              transaction.onabort = (event) => { console.error("[DBManager] Transacción guardarAuditoria abortada:", event.target.error); reject(event.target.error || new Error("Transacción abortada")); };
              transaction.oncomplete = () => { console.log("[DBManager] Transacción guardarAuditoria completada."); resolve(auditoriaIdResult); }; // Resolvemos con el ID al final

             let auditoriaIdResult; // Para guardar el ID resultante

             try {
                 // 1. Separar datos de auditoría y de incidencias/fotos
                 const { id, incidencias, ...auditoriaData } = auditoriaCompleta;

                 // 2. Si es actualización, eliminar incidencias y fotos antiguas asociadas PRIMERO
                 if (id) {
                      console.log(`[DBManager] Es actualización (ID: ${id}). Eliminando incidencias/fotos antiguas...`);
                      auditoriaIdResult = id; // Usar ID existente
                      const incidenciasAntiguas = await this.getByIndex('incidencias', 'auditoria_id', id); // Necesita transacción separada o usar la misma? Mejor separada antes.

                      // REFACTOR: La eliminación debe hacerse ANTES de iniciar la nueva transacción o dentro de ella si es posible.
                      // Por simplicidad ahora, asumimos que esto se maneja o se hará refactor.
                      // await this.eliminarIncidenciasFotosDeAuditoria(id, transaction); // Función auxiliar ideal

                       // Actualizar datos de la auditoría principal
                       auditoriaData.id = id; // Asegurar que el ID está en los datos a guardar
                       allPromises.push(this._putInTransaction(auditoriasStore, auditoriaData));

                 } else {
                      // 3. Si es nueva, añadir auditoría y obtener su ID
                      console.log("[DBManager] Es nueva auditoría. Añadiendo...");
                      const addAuditoriaPromise = this._addInTransaction(auditoriasStore, auditoriaData);
                      allPromises.push(addAuditoriaPromise);
                      // Esperar a que se añada para obtener el ID para las incidencias
                      auditoriaIdResult = await addAuditoriaPromise;
                       console.log(`[DBManager] Nueva auditoría creada con ID: ${auditoriaIdResult}`);
                 }


                 // 4. Añadir las nuevas incidencias y fotos (usando el auditoriaIdResult)
                  if (incidencias && incidencias.length > 0) {
                       console.log(`[DBManager] Añadiendo ${incidencias.length} incidencias para auditoría ID ${auditoriaIdResult}...`);
                      for (const inc of incidencias) {
                           const { fotos, ...incidenciaData } = inc;
                           incidenciaData.auditoria_id = auditoriaIdResult; // Asociar con la auditoría

                           // Añadir incidencia y obtener su ID
                           const addIncidenciaPromise = this._addInTransaction(incidenciasStore, incidenciaData);
                           allPromises.push(addIncidenciaPromise);
                           const incidenciaId = await addIncidenciaPromise;

                           // Añadir fotos asociadas a la incidencia
                           if (fotos && fotos.length > 0) {
                                for (const foto of fotos) {
                                     const fotoData = { incidencia_id: incidenciaId, src: foto.src, alt: foto.alt };
                                     allPromises.push(this._addInTransaction(fotosStore, fotoData));
                                 }
                           }

                            // 5. Retroalimentar base de datos predefinida (dentro de la misma transacción)
                           if (incidenciaData.descripcion && incidenciaData.medida_correctora) {
                               const desc = incidenciaData.descripcion;
                               const mc = incidenciaData.medida_correctora;
                               const block = incidenciaData.bloque;
                               // Necesitamos buscar si ya existe, pero getAll/getByIndex no funciona bien dentro de la misma transacción de escritura en algunos casos.
                               // Solución simple: Intentar añadir siempre, si falla por índice único (si lo hubiera), no pasa nada.
                               // Solución mejor: Hacer la búsqueda antes de la transacción o aceptar posibles duplicados iniciales.
                               // Por ahora, añadimos sin verificar duplicados aquí para evitar complejidad transaccional.
                               const predefinidaData = { bloque: block, descripcion: desc, medida_correctora: mc };
                                allPromises.push(
                                     this._addInTransaction(predefinidasStore, predefinidaData)
                                         .catch(e => { if (e.name !== 'ConstraintError') console.warn("Error añadiendo a predefinidas:", e); }) // Ignorar errores de constraint (duplicado)
                                 );
                            }
                      }
                  }

                 // 6. Esperar a todas las promesas (aunque la transacción se completará de todas formas)
                 // await Promise.all(allPromises); // No necesario esperar aquí, oncomplete es la señal

             } catch (error) {
                  console.error("[DBManager] Error dentro de la lógica de guardarAuditoria:", error);
                  if (transaction && transaction.abort) transaction.abort(); // Abortar transacción si algo falla
                  reject(error); // Rechazar la promesa principal
              }

             // La transacción se completará o abortará, y oncomplete/onerror/onabort se encargarán de resolver/rechazar.
         });
     }

     /**
      * Elimina una auditoría y todas sus incidencias y fotos asociadas.
      * @param {number} auditoriaId
      * @returns {Promise<void>}
      */
     async eliminarAuditoriaCompleta(auditoriaId) {
          console.log(`[DBManager] Eliminando auditoría completa ID: ${auditoriaId}`);
          if (!this.db) throw new Error('DB no inicializada');

          const transaction = this.db.transaction(['auditorias', 'incidencias', 'fotos'], 'readwrite');
          const auditoriasStore = transaction.objectStore('auditorias');
          const incidenciasStore = transaction.objectStore('incidencias');
          const fotosStore = transaction.objectStore('fotos');
          const incidenciasIndex = incidenciasStore.index('auditoria_id');
          const fotosIndex = fotosStore.index('incidencia_id'); // Asume que existe
          const promises = [];

          return new Promise(async (resolve, reject) => {
               transaction.onerror = (event) => { console.error("[DBManager] Error en transacción eliminarAuditoria:", event.target.error); reject(event.target.error); };
               transaction.onabort = (event) => { console.error("[DBManager] Transacción eliminarAuditoria abortada:", event.target.error); reject(event.target.error || new Error("Transacción abortada")); };
               transaction.oncomplete = () => { console.log(`[DBManager] Auditoría ${auditoriaId} y asociados eliminados.`); resolve(); };

               try {
                   // 1. Encontrar todas las incidencias de la auditoría
                   const incidenciasAEliminar = await new Promise((res, rej) => {
                       const request = incidenciasIndex.getAllKeys(auditoriaId); // Obtener solo las claves
                       request.onsuccess = (e) => res(e.target.result || []);
                       request.onerror = (e) => rej(e.target.error);
                   });
                   console.log(`[DBManager] Incidencias a eliminar (${incidenciasAEliminar.length}) para auditoría ${auditoriaId}`);


                   // 2. Por cada incidencia, encontrar y eliminar sus fotos
                   for (const incidenciaId of incidenciasAEliminar) {
                       const fotosAEliminar = await new Promise((res, rej) => {
                           const request = fotosIndex.getAllKeys(incidenciaId); // Claves de las fotos
                           request.onsuccess = (e) => res(e.target.result || []);
                           request.onerror = (e) => rej(e.target.error);
                       });
                        console.log(`[DBManager]   Fotos a eliminar (${fotosAEliminar.length}) para incidencia ${incidenciaId}`);
                       fotosAEliminar.forEach(fotoId => promises.push(this._deleteInTransaction(fotosStore, fotoId)));

                       // 3. Eliminar la incidencia misma
                       promises.push(this._deleteInTransaction(incidenciasStore, incidenciaId));
                   }

                   // 4. Eliminar la auditoría principal
                   promises.push(this._deleteInTransaction(auditoriasStore, auditoriaId));

                   // 5. Esperar a que las promesas de borrado se registren (opcional, la transacción lo maneja)
                   // await Promise.all(promises);

               } catch (error) {
                    console.error("[DBManager] Error dentro de la lógica de eliminarAuditoriaCompleta:", error);
                    if (transaction.abort) transaction.abort();
                    reject(error);
                }
          });
      }
     // Método auxiliar para delete dentro de transacción
     _deleteInTransaction(store, key) {
          return new Promise((resolve, reject) => {
              const request = store.delete(key);
              request.onsuccess = () => resolve();
              // onerror se maneja a nivel de transacción
          });
      }


    /**
     * Obtiene una auditoría completa (con incidencias y fotos anidadas).
     * @param {number} auditoriaId ID de la auditoría.
     * @returns {Promise<Object|null>} Auditoría completa o null si no se encuentra.
     */
    async obtenerAuditoriaCompleta(auditoriaId) {
         console.log(`[DBManager] Obteniendo auditoría completa ID: ${auditoriaId}`);
         if (!this.db) throw new Error('DB no inicializada');
         if (auditoriaId === undefined || auditoriaId === null) return null;


         try {
             // Usar transacciones separadas para lectura es más simple
             const auditoria = await this.get('auditorias', auditoriaId);
             if (!auditoria) {
                  console.warn(`[DBManager] Auditoría ${auditoriaId} no encontrada.`);
                  return null;
              }


             const incidencias = await this.getByIndex('incidencias', 'auditoria_id', auditoriaId);
             console.log(`[DBManager] Encontradas ${incidencias.length} incidencias para auditoría ${auditoriaId}`);


             // Obtener fotos para cada incidencia
             for (const inc of incidencias) {
                  inc.fotos = await this.getByIndex('fotos', 'incidencia_id', inc.id);
              }


             auditoria.incidencias = incidencias; // Anidar incidencias
             return auditoria;


         } catch (error) {
             console.error(`[DBManager] Error obteniendo auditoría completa ${auditoriaId}:`, error);
             throw error; // Relanzar
         }
     }

    /**
     * Exporta toda la base de datos a un objeto JSON.
     * @returns {Promise<Object>} Objeto con cada almacén como propiedad.
     */
    async exportarBaseDatos() {
         console.log("[DBManager] Exportando toda la base de datos...");
         if (!this.db) throw new Error('DB no inicializada');
         const data = {};
         try {
              // Usar transacción de solo lectura para todos los almacenes
              const transaction = this.db.transaction(this.stores, 'readonly');
              const promises = this.stores.map(storeName => {
                   return new Promise((resolve, reject) => {
                        const store = transaction.objectStore(storeName);
                        const request = store.getAll();
                        request.onsuccess = (event) => {
                             data[storeName] = event.target.result || [];
                             resolve();
                         };
                        request.onerror = (event) => {
                             console.error(`[DBManager] Error exportando ${storeName}:`, event.target.error);
                             reject(event.target.error);
                         };
                    });
               });


              await Promise.all(promises); // Esperar a que se lean todos los almacenes
              console.log("[DBManager] Exportación de datos completada.");
              return data;


         } catch (error) {
             console.error('[DBManager] Error durante exportarBaseDatos:', error);
             throw error;
         }
     }


    /**
     * Importa datos desde un objeto JSON, reemplazando el contenido actual.
     * @param {Object} data Objeto con datos (formato igual al de exportarBaseDatos).
     * @returns {Promise<void>}
     */
    async importarBaseDatos(data) {
         console.log("[DBManager] Iniciando importación de base de datos...");
         if (!this.db) throw new Error('DB no inicializada');
         if (!data || typeof data !== 'object') throw new Error('Datos de importación inválidos');


         // Abrir transacción de escritura para TODOS los almacenes
         const transaction = this.db.transaction(this.stores, 'readwrite');
         const promises = [];


         return new Promise(async (resolve, reject) => {
              transaction.onerror = (event) => { console.error("[DBManager] Error en transacción importarBaseDatos:", event.target.error); reject(event.target.error); };
              transaction.onabort = (event) => { console.error("[DBManager] Transacción importarBaseDatos abortada:", event.target.error); reject(event.target.error || new Error("Transacción abortada")); };
              transaction.oncomplete = () => { console.log("[DBManager] Transacción importarBaseDatos completada."); resolve(); };


              try {
                   // 1. Limpiar todos los almacenes existentes DENTRO de la transacción
                   console.log("[DBManager] Limpiando almacenes existentes...");
                   this.stores.forEach(storeName => {
                        if (data[storeName] !== undefined) { // Solo limpiar si hay datos para importar en ese store
                             const store = transaction.objectStore(storeName);
                             promises.push(new Promise((res, rej) => {
                                  const reqClear = store.clear();
                                  reqClear.onsuccess = () => res();
                                  // onerror se maneja a nivel de transacción
                              }));
                         }
                    });
                   await Promise.all(promises); // Esperar a que terminen los clear
                   console.log("[DBManager] Almacenes limpiados.");


                   // 2. Añadir los nuevos datos DENTRO de la misma transacción
                    console.log("[DBManager] Añadiendo nuevos datos...");
                    const addPromises = [];
                    this.stores.forEach(storeName => {
                        if (data[storeName] && Array.isArray(data[storeName])) {
                             console.log(`[DBManager] Importando ${data[storeName].length} registros a ${storeName}...`);
                             const store = transaction.objectStore(storeName);
                             data[storeName].forEach(item => {
                                 // Usar add puede dar error si la key ya existe (aunque no debería pasar tras clear)
                                 // Usar put es más seguro para sobrescribir/insertar.
                                  addPromises.push(this._putInTransaction(store, item));
                              });
                         } else if (data[storeName] !== undefined) {
                              console.warn(`[DBManager] Datos para ${storeName} en importación no es un array.`);
                          }
                    });
                    await Promise.all(addPromises); // Esperar a que se registren todas las operaciones de add/put
                    console.log("[DBManager] Nuevos datos añadidos a la transacción.");


                   // La transacción se completará automáticamente si todo va bien.


              } catch (error) {
                   console.error("[DBManager] Error dentro de la lógica de importarBaseDatos:", error);
                   if (transaction.abort) transaction.abort();
                   reject(error);
               }
         });
     }

    /**
     * Exporta solo las incidencias predefinidas.
     * @returns {Promise<Array>}
     */
    async exportarIncidenciasPredefinidas() {
         return this.getAll('incidencias_predefinidas');
     }

    /**
     * Importa incidencias predefinidas, evitando duplicados exactos.
     * @param {Array} incidencias Array de {bloque, descripcion, medida_correctora}
     * @returns {Promise<void>}
     */
    async importarIncidenciasPredefinidas(incidencias) {
         console.log(`[DBManager] Importando ${incidencias.length} incidencias predefinidas...`);
         if (!this.db) throw new Error('DB no inicializada');
         if (!Array.isArray(incidencias)) throw new Error('Datos inválidos para importar incidencias');


         const transaction = this.db.transaction(['incidencias_predefinidas'], 'readwrite');
         const store = transaction.objectStore('incidencias_predefinidas');
         const promises = [];
         let countAdded = 0;
         let countSkipped = 0;


         // Cargar existentes para chequeo (hacerlo antes o aceptar posible condición de carrera leve)
         const existentes = await this.getAll('incidencias_predefinidas');
         const uniqueExisting = new Set(existentes.map(e => `${e.bloque}|${e.descripcion}|${e.medida_correctora}`));


         return new Promise((resolve, reject) => {
              transaction.onerror = (event) => { console.error("[DBManager] Error en transacción importIncidencias:", event.target.error); reject(event.target.error); };
              transaction.onabort = (event) => { console.error("[DBManager] Transacción importIncidencias abortada:", event.target.error); reject(event.target.error || new Error("Transacción abortada")); };
              transaction.oncomplete = () => { console.log(`[DBManager] Importación incidencias predefinidas completada. Añadidas: ${countAdded}, Omitidas: ${countSkipped}`); resolve(); };


              incidencias.forEach(inc => {
                  const key = `${inc.bloque}|${inc.descripcion}|${inc.medida_correctora}`;
                  if (!uniqueExisting.has(key)) {
                       const dataToAdd = {
                           bloque: inc.bloque,
                           descripcion: inc.descripcion,
                           medida_correctora: inc.medida_correctora
                       };
                       promises.push(
                            this._addInTransaction(store, dataToAdd).then(() => countAdded++)
                        );
                       uniqueExisting.add(key); // Añadir al set para evitar duplicados dentro del mismo lote de importación
                   } else {
                       countSkipped++;
                   }
              });


              // Esperar a que se registren todas las operaciones de add (opcional)
              // Promise.all(promises).catch(reject); // Si alguna falla, rechazar, aunque oncomplete/onerror lo harán.
         });
     }

}

// Crear instancia global
window.dbManager = new DBManager();