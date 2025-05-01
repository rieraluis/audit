/**
 * Módulo de exportación corregido para la aplicación SAIA
 */
class ExportManager {
    constructor() {
        this.docxLoaded = false;
        this.html2pdfLoaded = false;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('[ExportManager] Inicializando...');
        this.setupExportEvents();
        console.log('[ExportManager] Inicializado correctamente');
    }

    setupExportEvents() {
        console.log('[ExportManager] Configurando eventos de exportación...');
        
        try {
            // Configurar eventos para botones de exportación
            document.getElementById('export-word-btn')?.addEventListener('click', () => this.exportToWord());
            document.getElementById('export-pdf-btn')?.addEventListener('click', () => this.exportToPdf());
            document.getElementById('export-word-preview')?.addEventListener('click', () => this.exportToWord());
            document.getElementById('export-pdf-preview')?.addEventListener('click', () => this.exportToPdf());
            
            console.log('[ExportManager] Eventos de exportación configurados');
        } catch (error) {
            console.error('[ExportManager] Error al configurar eventos:', error);
        }
    }

    async checkAndLoadLibraries(libraries = ['docx', 'html2pdf']) {
        console.log('[ExportManager] Verificando librerías:', libraries);
        
        try {
            const loadPromises = [];
            
            if (libraries.includes('docx') && !this.docxLoaded) {
                loadPromises.push(
                    this.loadScript('https://unpkg.com/docx@7.3.0/build/index.js')
                        .then(() => {
                            if (typeof window.docx?.Document !== 'undefined') {
                                this.docxLoaded = true;
                                console.log('[ExportManager] docx.js cargado correctamente');
                            } else {
                                throw new Error('docx.js no se inicializó correctamente');
                            }
                        })
                );
            }
            
            if (libraries.includes('html2pdf') && !this.html2pdfLoaded) {
                loadPromises.push(
                    this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
                        .then(() => {
                            if (typeof window.html2pdf !== 'undefined') {
                                this.html2pdfLoaded = true;
                                console.log('[ExportManager] html2pdf.js cargado correctamente');
                            } else {
                                throw new Error('html2pdf.js no se inicializó correctamente');
                            }
                        })
                );
            }
            
            await Promise.all(loadPromises);
            console.log('[ExportManager] Todas las librerías verificadas/cargadas');
        } catch (error) {
            console.error('[ExportManager] Error al cargar librerías:', error);
            throw error;
        }
    }

    loadScript(url, maxRetries = 2) {
        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                console.log(`[ExportManager] Script ${url} ya está cargado`);
                return resolve();
            }

            let retries = 0;
            
            const tryLoad = () => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    console.log(`[ExportManager] Script ${url} cargado correctamente`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`[ExportManager] Error al cargar ${url} (intento ${retries + 1}/${maxRetries})`, error);
                    
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    
                    if (retries < maxRetries) {
                        retries++;
                        console.log(`[ExportManager] Reintentando cargar ${url}...`);
                        setTimeout(tryLoad, 1500 * retries);
                    } else {
                        reject(new Error(`No se pudo cargar ${url} después de ${maxRetries} intentos`));
                    }
                };
                
                document.head.appendChild(script);
            };
            
            tryLoad();
        });
    }

    async getImageDataAsArrayBuffer(src) {
        if (!src || typeof src !== 'string') {
            throw new Error("Fuente de imagen inválida");
        }
        
        console.log(`[ExportManager] Procesando imagen: ${src.substring(0, 50)}...`);
        
        try {
            let blob;
            
            if (src.startsWith('data:image')) {
                // Convertir Data URI a Blob
                const parts = src.split(',');
                if (parts.length < 2 || !parts[1]) {
                    throw new Error('Data URI inválido');
                }
                
                const byteString = atob(parts[1]);
                const mimeString = parts[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                
                blob = new Blob([ab], { type: mimeString });
                console.log(`[ExportManager] Convertido Data URI a Blob (${blob.size} bytes)`);
            } else {
                // Fetch como Blob directamente
                if (src.startsWith('file:///')) {
                    const fileName = src.substring(src.lastIndexOf('/') + 1);
                    src = `img/${fileName}`;
                    console.log(`[ExportManager] Usando ruta relativa: ${src}`);
                }
                
                console.log(`[ExportManager] Descargando imagen: ${src}`);
                const response = await fetch(src);
                
                if (!response.ok) {
                    throw new Error(`Error HTTP ${response.status} al descargar imagen`);
                }
                
                blob = await response.blob();
                console.log(`[ExportManager] Imagen descargada (${blob.size} bytes)`);
            }
            
            // Convertir Blob a ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();
            console.log(`[ExportManager] Imagen convertida a ArrayBuffer (${arrayBuffer.byteLength} bytes)`);
            
            return arrayBuffer;
        } catch (error) {
            console.error('[ExportManager] Error al procesar imagen:', error);
            throw error;
        }
    }

    async exportToWord() {
        console.log('[ExportManager] Iniciando exportación a Word...');
        
        try {
            // Verificar/cargar librería docx
            await this.checkAndLoadLibraries(['docx']);
            
            if (!this.docxLoaded || typeof window.docx === 'undefined') {
                throw new Error('La librería docx no está disponible');
            }
            
            // Recopilar datos del informe
            const data = this.collectReportData();
            if (!data) {
                console.log('[ExportManager] Exportación cancelada - Datos del informe incompletos');
                return;
            }
            
            // Crear documento Word usando la librería docx
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, convertInchesToTwip, Footer, PageNumber } = window.docx;
            
            // Crear contenido del documento
            const children = [];
            
            // ... (resto de la implementación de exportToWord sin cambios) ...
            
            // Crear y guardar el documento
            const doc = new Document({
                sections: [{
                    children: children,
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new TextRun("Página "),
                                        new TextRun({ children: [PageNumber.CURRENT] }),
                                        new TextRun(" de "),
                                        new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                                    ],
                                }),
                            ],
                        }),
                    },
                }],
            });
            
            // Generar y descargar el archivo
            const blob = await Packer.toBlob(doc);
            const fileName = `Informe_${data.cliente.nombre.replace(/[^a-z0-9]/gi, "_")}_${data.auditoria.fecha}.docx`;
            this.downloadBlob(blob, fileName);
            
            console.log('[ExportManager] Exportación a Word completada correctamente');
        } catch (error) {
            console.error('[ExportManager] Error al exportar a Word:', error);
            alert(`Error al exportar a Word: ${error.message}`);
        }
    }

    // ... (resto de métodos sin cambios) ...

    downloadBlob(blob, fileName) {
        console.log(`[ExportManager] Descargando archivo: ${fileName}`);
        
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // Limpiar después de la descarga
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('[ExportManager] Descarga completada y recursos liberados');
            }, 100);
        } catch (error) {
            console.error('[ExportManager] Error durante la descarga:', error);
            throw error;
        }
    }
}

// Instanciar el ExportManager
window.exportManager = new ExportManager();