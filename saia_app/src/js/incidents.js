/**
 * Módulo de gestión de incidencias corregido para la aplicación SAIA
 */
class IncidentsManager {
    constructor() {
        this.currentBlock = 1;
        this.incidentCounter = 1;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('[IncidentsManager] Inicializando...');
        
        try {
            // Configurar eventos
            this.setupEventListeners();
            console.log('[IncidentsManager] Eventos configurados correctamente');
        } catch (error) {
            console.error('[IncidentsManager] Error durante la inicialización:', error);
        }
    }

    setupEventListeners() {
        console.log('[IncidentsManager] Configurando listeners de eventos...');
        
        try {
            // Eventos para botones de añadir incidencias
            document.getElementById('add-infrastructure-incident')?.addEventListener('click', () => {
                this.showSelectPredefinedIncidentModal(1);
            });
            
            document.getElementById('add-good-practices-incident')?.addEventListener('click', () => {
                this.showSelectPredefinedIncidentModal(2);
            });
            
            document.getElementById('add-self-controls-incident')?.addEventListener('click', () => {
                this.showSelectPredefinedIncidentModal(3);
            });
            
            // Eventos para el modal de selección de incidencias
            document.getElementById('cancel-select-predefined')?.addEventListener('click', () => {
                this.closeSelectPredefinedIncidentModal();
            });
            
            document.getElementById('cancel-select-predefined-btn')?.addEventListener('click', () => {
                this.closeSelectPredefinedIncidentModal();
            });
            
            document.getElementById('create-new-incident')?.addEventListener('click', () => {
                this.closeSelectPredefinedIncidentModal();
                this.addNewIncident(this.currentBlock);
            });
            
            // Eventos para la base de datos de incidencias
            document.getElementById('add-predefined-incident-btn')?.addEventListener('click', () => {
                this.showAddPredefinedIncidentModal();
            });
            
            // ... (otros event listeners) ...
            
            console.log('[IncidentsManager] Todos los listeners configurados');
        } catch (error) {
            console.error('[IncidentsManager] Error al configurar listeners:', error);
            throw error;
        }
    }

    // ... (resto de métodos sin cambios, pero asegurarse de que todos tengan manejo de errores) ...

    async loadFrequentIncidents(searchText = "") {
        console.log(`[IncidentsManager] Cargando incidencias frecuentes (filtro: "${searchText}")`);
        
        try {
            const incidencias = await window.dbManager.getAll("incidencias_predefinidas");
            const tableBody = document.getElementById("frequent-incidents-table-body");
            
            if (!tableBody) {
                throw new Error('Elemento frequent-incidents-table-body no encontrado');
            }
            
            // Limpiar tabla
            tableBody.innerHTML = '';
            
            // Filtrar si hay texto de búsqueda
            const searchLower = searchText.toLowerCase();
            const filteredIncidencias = searchText 
                ? incidencias.filter(inc => 
                    inc.descripcion.toLowerCase().includes(searchLower) || 
                    inc.medida_correctora.toLowerCase().includes(searchLower))
                : incidencias;
            
            // Mostrar resultados
            if (filteredIncidencias.length === 0) {
                const noResultsMsg = searchText 
                    ? "No se encontraron coincidencias" 
                    : "No hay incidencias frecuentes registradas";
                
                tableBody.innerHTML = `<tr><td colspan="3" class="no-results">${noResultsMsg}</td></tr>`;
                return;
            }
            
            // Ordenar por descripción
            filteredIncidencias.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
            
            // Mapear categorías
            const categoryMap = {
                1: "Infraestructura",
                2: "Buenas Prácticas",
                3: "Autocontroles"
            };
            
            // Llenar la tabla
            filteredIncidencias.forEach(inc => {
                const row = tableBody.insertRow();
                
                // Descripción
                const descCell = row.insertCell();
                descCell.textContent = inc.descripcion;
                
                // Medida correctora
                const measureCell = row.insertCell();
                measureCell.textContent = inc.medida_correctora;
                
                // Categoría
                const categoryCell = row.insertCell();
                categoryCell.textContent = categoryMap[inc.bloque] || `Bloque ${inc.bloque}`;
            });
            
            console.log(`[IncidentsManager] Mostrando ${filteredIncidencias.length} incidencias frecuentes`);
        } catch (error) {
            console.error('[IncidentsManager] Error al cargar incidencias frecuentes:', error);
            alert('Error al cargar incidencias frecuentes. Consulte la consola para más detalles.');
        }
    }

    // ... (resto de métodos sin cambios) ...
}

// El manager se instancia desde app.js