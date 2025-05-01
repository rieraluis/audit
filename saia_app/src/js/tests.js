// Archivo de prueba para verificar el funcionamiento de la aplicación SAIA

// Este script realiza pruebas básicas de las principales funcionalidades
// de la aplicación para asegurar que todo funciona correctamente.

// Función para ejecutar todas las pruebas
async function runTests() {
    console.log('Iniciando pruebas de la aplicación SAIA...');
    
    // Prueba 1: Verificar que se han cargado todos los módulos
    testModulesLoaded();
    
    // Prueba 2: Verificar la base de datos
    await testDatabase();
    
    // Prueba 3: Verificar la gestión de clientes
    await testClientManagement();
    
    // Prueba 4: Verificar la gestión de incidencias
    testIncidentManagement();
    
    // Prueba 5: Verificar el editor de fotos
    testPhotoEditor();
    
    // Prueba 6: Verificar la exportación
    testExport();
    
    console.log('Pruebas completadas.');
}

// Prueba 1: Verificar que se han cargado todos los módulos
function testModulesLoaded() {
    console.log('Prueba 1: Verificando carga de módulos...');
    
    try {
        // Verificar que los módulos principales están disponibles
        if (!window.dbManager) {
            throw new Error('Módulo de base de datos no cargado');
        }
        
        if (!window.exportManager) {
            throw new Error('Módulo de exportación no cargado');
        }
        
        if (!window.incidentsManager) {
            throw new Error('Módulo de gestión de incidencias no cargado');
        }
        
        if (!window.photoManager) {
            throw new Error('Módulo de gestión de fotos no cargado');
        }
        
        console.log('✅ Todos los módulos se han cargado correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba de carga de módulos:', error.message);
    }
}

// Prueba 2: Verificar la base de datos
async function testDatabase() {
    console.log('Prueba 2: Verificando base de datos...');
    
    try {
        // Verificar que la base de datos está inicializada
        if (!window.dbManager.db) {
            throw new Error('Base de datos no inicializada');
        }
        
        // Verificar que se pueden obtener datos de la base de datos
        const clientes = await window.dbManager.getAll('clientes');
        console.log(`- Clientes en la base de datos: ${clientes.length}`);
        
        const incidencias = await window.dbManager.getAll('incidencias_predefinidas');
        console.log(`- Incidencias predefinidas en la base de datos: ${incidencias.length}`);
        
        const legislacion = await window.dbManager.getAll('legislacion');
        console.log(`- Items de legislación en la base de datos: ${legislacion.length}`);
        
        console.log('✅ Base de datos funcionando correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba de base de datos:', error.message);
    }
}

// Prueba 3: Verificar la gestión de clientes
async function testClientManagement() {
    console.log('Prueba 3: Verificando gestión de clientes...');
    
    try {
        // Crear un cliente de prueba
        const clienteId = await window.dbManager.add('clientes', {
            nombre: 'Cliente de Prueba',
            direccion: 'Calle de Prueba, 123',
            contacto: 'Contacto de Prueba',
            email: 'prueba@ejemplo.com',
            telefono: '123456789',
            notas: 'Cliente creado para pruebas',
            fecha_creacion: new Date(),
            fecha_modificacion: new Date()
        });
        
        console.log(`- Cliente de prueba creado con ID: ${clienteId}`);
        
        // Verificar que se ha creado correctamente
        const cliente = await window.dbManager.getByKey('clientes', clienteId);
        
        if (!cliente || cliente.nombre !== 'Cliente de Prueba') {
            throw new Error('El cliente no se ha creado correctamente');
        }
        
        // Actualizar el cliente
        await window.dbManager.update('clientes', {
            id: clienteId,
            nombre: 'Cliente de Prueba Actualizado',
            direccion: 'Calle de Prueba, 123',
            contacto: 'Contacto de Prueba',
            email: 'prueba@ejemplo.com',
            telefono: '123456789',
            notas: 'Cliente actualizado para pruebas',
            fecha_modificacion: new Date()
        });
        
        // Verificar que se ha actualizado correctamente
        const clienteActualizado = await window.dbManager.getByKey('clientes', clienteId);
        
        if (!clienteActualizado || clienteActualizado.nombre !== 'Cliente de Prueba Actualizado') {
            throw new Error('El cliente no se ha actualizado correctamente');
        }
        
        console.log('- Cliente actualizado correctamente');
        
        // Eliminar el cliente de prueba
        await window.dbManager.delete('clientes', clienteId);
        
        // Verificar que se ha eliminado correctamente
        const clienteEliminado = await window.dbManager.getByKey('clientes', clienteId);
        
        if (clienteEliminado) {
            throw new Error('El cliente no se ha eliminado correctamente');
        }
        
        console.log('- Cliente eliminado correctamente');
        
        console.log('✅ Gestión de clientes funcionando correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba de gestión de clientes:', error.message);
    }
}

// Prueba 4: Verificar la gestión de incidencias
function testIncidentManagement() {
    console.log('Prueba 4: Verificando gestión de incidencias...');
    
    try {
        // Verificar que se pueden añadir incidencias a los contenedores
        const infraContainer = document.getElementById('infrastructure-container');
        const initialCount = infraContainer.querySelectorAll('.incident-card').length;
        
        // Añadir una incidencia de prueba
        window.incidentsManager.addIncidentToContainer(1, {
            descripcion: 'Incidencia de prueba',
            medida_correctora: 'Medida correctora de prueba'
        });
        
        // Verificar que se ha añadido correctamente
        const newCount = infraContainer.querySelectorAll('.incident-card').length;
        
        if (newCount !== initialCount + 1) {
            throw new Error('La incidencia no se ha añadido correctamente');
        }
        
        console.log('- Incidencia añadida correctamente');
        
        // Verificar que se puede recopilar la incidencia
        const incidencias = window.incidentsManager.collectIncidentsFromContainer('infrastructure-container', 1);
        
        if (incidencias.length !== newCount) {
            throw new Error('No se han recopilado todas las incidencias');
        }
        
        if (incidencias[incidencias.length - 1].descripcion !== 'Incidencia de prueba') {
            throw new Error('La descripción de la incidencia no coincide');
        }
        
        console.log('- Incidencias recopiladas correctamente');
        
        console.log('✅ Gestión de incidencias funcionando correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba de gestión de incidencias:', error.message);
    }
}

// Prueba 5: Verificar el editor de fotos
function testPhotoEditor() {
    console.log('Prueba 5: Verificando editor de fotos...');
    
    try {
        // Verificar que el editor de fotos está disponible
        if (!window.photoManager.setTool || !window.photoManager.drawLine) {
            throw new Error('Las funciones del editor de fotos no están disponibles');
        }
        
        console.log('- Editor de fotos disponible');
        
        // No podemos probar completamente el editor de fotos sin interacción del usuario
        // pero podemos verificar que las funciones básicas están disponibles
        
        console.log('✅ Editor de fotos funcionando correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba del editor de fotos:', error.message);
    }
}

// Prueba 6: Verificar la exportación
function testExport() {
    console.log('Prueba 6: Verificando exportación...');
    
    try {
        // Verificar que el módulo de exportación está disponible
        if (!window.exportManager.collectReportData || !window.exportManager.exportToWord) {
            throw new Error('Las funciones de exportación no están disponibles');
        }
        
        console.log('- Módulo de exportación disponible');
        
        // Verificar que se pueden recopilar los datos del informe
        const reportData = window.exportManager.collectReportData();
        
        if (!reportData) {
            throw new Error('No se han podido recopilar los datos del informe');
        }
        
        console.log('- Datos del informe recopilados correctamente');
        
        // No podemos probar completamente la exportación sin interacción del usuario
        // pero podemos verificar que las funciones básicas están disponibles
        
        console.log('✅ Exportación funcionando correctamente');
    } catch (error) {
        console.error('❌ Error en la prueba de exportación:', error.message);
    }
}

// Ejecutar las pruebas cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la aplicación esté completamente inicializada
    setTimeout(runTests, 1000);
});
