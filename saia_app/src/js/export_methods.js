/**
 * Métodos de exportación mejorados para la aplicación SAIA
 */

/**
 * Exporta el informe a Word
 * @param {boolean} fromPreview Si la exportación se realiza desde la vista previa
 */
async function exportToWord(fromPreview = false) {
    try {
        console.log('Iniciando exportación a Word...');
        
        // Verificar que docx esté disponible
        if (typeof window.docx === 'undefined') {
            console.error('La biblioteca docx no está disponible');
            await this.checkAndLoadLibraries();
            
            if (typeof window.docx === 'undefined') {
                throw new Error('No se pudo cargar la biblioteca docx');
            }
        }
        
        // Obtener datos del informe
        const data = window.appManager.collectReportData();
        console.log('Datos del informe recopilados:', data);
        
        // Generar nombre de archivo
        const fileName = `Informe_${data.cliente.nombre.replace(/\s+/g, '_')}_${data.auditoria.fecha}.docx`;
        
        // Crear documento
        const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, Packer } = window.docx;
        
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Encabezado con logos
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${data.auditoria.tipoVisita}`,
                                bold: true,
                                size: 36
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: {
                            after: 200
                        }
                    }),
                    
                    // Datos del cliente
                    new Paragraph({
                        text: data.cliente.nombre,
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            after: 100
                        }
                    }),
                    
                    new Paragraph({
                        text: data.cliente.direccion,
                        spacing: {
                            after: 200
                        }
                    }),
                    
                    // Datos de la auditoría
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'Fecha: ',
                                bold: true
                            }),
                            new TextRun({
                                text: new Date(data.auditoria.fecha).toLocaleDateString()
                            })
                        ],
                        spacing: {
                            after: 100
                        }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'Turno: ',
                                bold: true
                            }),
                            new TextRun({
                                text: data.auditoria.turno
                            })
                        ],
                        spacing: {
                            after: 100
                        }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'Persona de contacto: ',
                                bold: true
                            }),
                            new TextRun({
                                text: data.auditoria.contacto
                            })
                        ],
                        spacing: {
                            after: 100
                        }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'Auditor: ',
                                bold: true
                            }),
                            new TextRun({
                                text: data.auditoria.auditor
                            })
                        ],
                        spacing: {
                            after: 300
                        }
                    })
                ]
            }]
        });
        
        // Añadir introducción si existe
        if (data.auditoria.introduccion) {
            doc.addSection({
                properties: {},
                children: [
                    new Paragraph({
                        text: 'Introducción',
                        heading: HeadingLevel.HEADING_1,
                        spacing: {
                            after: 200
                        }
                    }),
                    
                    new Paragraph({
                        text: data.auditoria.introduccion,
                        spacing: {
                            after: 300
                        }
                    })
                ]
            });
        }
        
        // Generar documento
        const buffer = await Packer.toBlob(doc);
        
        // Descargar archivo
        const link = document.createElement('a');
        link.href = URL.createObjectURL(buffer);
        link.download = fileName;
        link.click();
        
        console.log('Exportación a Word completada');
    } catch (error) {
        console.error('Error al exportar a Word:', error);
        alert(`Error al exportar a Word: ${error.message || 'Error desconocido'}`);
    }
}

/**
 * Exporta el informe a PDF
 * @param {boolean} fromPreview Si la exportación se realiza desde la vista previa
 */
async function exportToPdf(fromPreview = false) {
    try {
        console.log('Iniciando exportación a PDF...');
        
        // Verificar que html2pdf esté disponible
        if (typeof window.html2pdf === 'undefined') {
            console.error('La biblioteca html2pdf no está disponible');
            await this.checkAndLoadLibraries();
            
            if (typeof window.html2pdf === 'undefined') {
                throw new Error('No se pudo cargar la biblioteca html2pdf');
            }
        }
        
        // Obtener datos del informe
        const data = window.appManager.collectReportData();
        console.log('Datos del informe recopilados:', data);
        
        // Generar nombre de archivo
        const fileName = `Informe_${data.cliente.nombre.replace(/\s+/g, '_')}_${data.auditoria.fecha}.pdf`;
        
        // Generar vista previa del informe
        const reportContainer = await this.generateReportPreview(data);
        
        // Configuración de html2pdf
        const options = {
            margin: 10,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Añadir al DOM temporalmente para la conversión
        document.body.appendChild(reportContainer);
        reportContainer.style.position = 'absolute';
        reportContainer.style.left = '-9999px';
        
        // Generar PDF
        await html2pdf().from(reportContainer).set(options).save();
        
        // Eliminar del DOM
        document.body.removeChild(reportContainer);
        
        console.log('Exportación a PDF completada');
    } catch (error) {
        console.error('Error al exportar a PDF:', error);
        alert(`Error al exportar a PDF: ${error.message || 'Error desconocido'}`);
    }
}
