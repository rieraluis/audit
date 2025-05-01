/**
 * Método para verificar y crear almacenes faltantes
 * @returns {Promise} Promesa que se resuelve cuando se han verificado los almacenes
 */
verificarAlmacenes() {
  return new Promise((resolve, reject) => {
    try {
      // Verificar si los almacenes necesarios existen
      const almacenesNecesarios = [
        'clientes', 
        'auditorias', 
        'incidencias', 
        'fotos', 
        'incidencias_predefinidas', 
        'legislacion', 
        'traducciones', 
        'configuracion'
      ];
      
      // Verificar si es necesario actualizar la base de datos
      let necesitaActualizacion = false;
      
      for (const almacen of almacenesNecesarios) {
        if (!this.db.objectStoreNames.contains(almacen)) {
          console.log(`Almacén ${almacen} no encontrado, se necesita actualización`);
          necesitaActualizacion = true;
          break;
        }
      }
      
      if (necesitaActualizacion) {
        // Cerrar la conexión actual
        this.db.close();
        
        // Incrementar la versión y volver a abrir
        this.dbVersion++;
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Crear los almacenes faltantes
          for (const almacen of almacenesNecesarios) {
            if (!db.objectStoreNames.contains(almacen)) {
              console.log(`Creando almacén ${almacen}`);
              
              switch (almacen) {
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
                  const incidenciasPredefinidas = db.createObjectStore('incidencias_predefinidas', { keyPath: 'id', autoIncrement: true });
                  incidenciasPredefinidas.createIndex('bloque', 'bloque', { unique: false });
                  incidenciasPredefinidas.createIndex('descripcion', 'descripcion', { unique: false });
                  break;
                  
                case 'legislacion':
                  const legislacionStore = db.createObjectStore('legislacion', { keyPath: 'id', autoIncrement: true });
                  legislacionStore.createIndex('idioma', 'idioma', { unique: false });
                  legislacionStore.createIndex('orden', 'orden', { unique: false });
                  break;
                  
                case 'traducciones':
                  const traduccionesStore = db.createObjectStore('traducciones', { keyPath: 'id', autoIncrement: true });
                  traduccionesStore.createIndex('idioma', 'idioma', { unique: false });
                  traduccionesStore.createIndex('clave', 'clave', { unique: false });
                  break;
                  
                case 'configuracion':
                  db.createObjectStore('configuracion', { keyPath: 'id' });
                  break;
              }
            }
          }
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          console.log('Base de datos actualizada con almacenes faltantes');
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Error al actualizar la base de datos:', event.target.error);
          reject(event.target.error);
        };
      } else {
        // No se necesita actualización
        resolve();
      }
    } catch (error) {
      console.error('Error al verificar almacenes:', error);
      reject(error);
    }
  });
}
