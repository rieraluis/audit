/**
 * Módulo de gestión de fotos para la aplicación SAIA
 */

class PhotoManager {
    constructor() { /* ... (sin cambios) ... */ this.canvas = null; this.ctx = null; this.currentImage = null; this.currentTool = 'brush'; this.currentColor = '#ff0000'; this.currentLineWidth = 3; this.isDrawing = false; this.lastX = 0; this.lastY = 0; this.history = []; this.historyIndex = -1; this.currentIncidentCard = null; this.isSaving = false; this.saveTimeout = null; this.fileInput = null; this.fileInputListener = null; }
    init() { /* ... (sin cambios) ... */ if (this.initialized) return; this.initialized = true; console.log('[PhotoManager] Inicializando...'); document.getElementById('cancel-photo')?.addEventListener('click', () => this.closePhotoEditor()); document.getElementById('cancel-photo-btn')?.addEventListener('click', () => this.closePhotoEditor()); document.getElementById('save-photo')?.addEventListener('click', () => this.saveEditedPhoto()); /* ... resto de listeners ... */ document.getElementById('tool-brush')?.addEventListener('click', () => this.setTool('brush')); document.getElementById('tool-arrow')?.addEventListener('click', () => this.setTool('arrow')); document.getElementById('tool-circle')?.addEventListener('click', () => this.setTool('circle')); document.getElementById('tool-text')?.addEventListener('click', () => this.setTool('text')); document.getElementById('color-picker')?.addEventListener('change', (e) => { this.currentColor = e.target.value; }); document.getElementById('line-width')?.addEventListener('input', (e) => { this.currentLineWidth = parseInt(e.target.value); }); document.getElementById('undo-edit')?.addEventListener('click', () => this.undo()); document.getElementById('redo-edit')?.addEventListener('click', () => this.redo()); document.getElementById('close-zoom')?.addEventListener('click', () => { document.getElementById('photo-zoom-modal').style.display = 'none'; }); console.log('[PhotoManager] Inicializado OK.'); }
    isValidBase64(str) { /* ... (sin cambios) ... */ if (!str || typeof str !== 'string') return false; const base64Data = str.startsWith('data:image') ? str.split(',')[1] : str; if (!base64Data) return false; const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/; return base64Data.length % 4 === 0 && base64Regex.test(base64Data); }

    ensureFileInput() {
        if (!this.fileInput) {
            console.log("[PhotoManager] Creando input archivo...");
            this.fileInput = document.createElement('input'); this.fileInput.type = 'file'; this.fileInput.accept = 'image/*'; this.fileInput.style.display = 'none'; this.fileInput.id = 'hidden-photo-input'; document.body.appendChild(this.fileInput);
        }
         this.fileInput.value = null; // Resetear valor SIEMPRE
         if (this.fileInputListener) { this.fileInput.removeEventListener('change', this.fileInputListener); console.log("[PhotoManager] Listener viejo removido."); this.fileInputListener = null; }
    }

    addPhotoToIncident(incidentCard) {
        console.log("[PhotoManager] addPhotoToIncident llamado");
        if (!incidentCard) { console.error("addPhotoToIncident sin tarjeta!"); return; }
        // *** Guardar referencia a la tarjeta AHORA ***
        this.currentIncidentCard = incidentCard;
        console.log("[PhotoManager] currentIncidentCard establecido:", this.currentIncidentCard.querySelector('.incident-number')?.textContent);


        this.ensureFileInput();

        // Crear y añadir listener NUEVO
        // Usar una función nombrada o arrow function que llame a handleFileSelect
        // para asegurar que 'this' sea correcto dentro de handleFileSelect.
        this.fileInputListener = (event) => this.handleFileSelect(event);
        this.fileInput.addEventListener('change', this.fileInputListener);
         console.log("[PhotoManager] Listener añadido. Simulando clic...");
        this.fileInput.click();
    }

    handleFileSelect(event) {
         console.log("[PhotoManager] handleFileSelect ejecutado.");
         const input = event.target;
         // Remover listener inmediatamente
         if (this.fileInputListener) { input.removeEventListener('change', this.fileInputListener); console.log("[PhotoManager] Listener removido tras selección."); this.fileInputListener = null; }

         if (input.files && input.files[0]) {
             const file = input.files[0]; console.log("Procesando:", file.name); const reader = new FileReader();
             reader.onload = (ev) => {
                 const imgSrc = ev.target.result; if (imgSrc.length > 3 * 1024 * 1024) { alert("Archivo > 3MB."); return; }
                 // *** Verificar que currentIncidentCard sigue aquí ***
                 if (!this.currentIncidentCard) { console.error("Referencia a tarjeta perdida ANTES de abrir editor!"); alert("Error: Referencia incidencia perdida."); return; }
                 if (!this.isValidBase64(imgSrc)) { console.error("Base64 inválido archivo:", imgSrc.substring(0,100)); alert("Error: Archivo no parece imagen válida."); return; }
                 console.log("[PhotoManager] Abriendo editor para tarjeta:", this.currentIncidentCard.querySelector('.incident-number')?.textContent);
                 this.openPhotoEditor(imgSrc, this.currentIncidentCard); // Pasar la tarjeta al editor
             };
             reader.onerror = () => { alert("Error leyendo archivo."); };
             reader.readAsDataURL(file);
         } else { console.log("No se seleccionó archivo."); }
     }

    /**
     * Abre el editor de fotos con una imagen
     * @param {string} imgSrc URL (preferiblemente Data URI) de la imagen
     * @param {HTMLElement} incidentCardRef Referencia a la tarjeta de incidencia asociada
     */
    openPhotoEditor(imgSrc, incidentCardRef) {
        console.log("[PhotoManager] Abriendo editor...");
        // *** Guardar la referencia pasada ***
        this.currentIncidentCard = incidentCardRef;
        console.log("[PhotoManager] Editor abierto para tarjeta:", this.currentIncidentCard?.querySelector('.incident-number')?.textContent);


        const modal = document.getElementById('photo-editor-modal'); const container = document.getElementById('photo-editor-container'); if (!modal || !container) { console.error("Modal/Contenedor editor no encontrado."); return; } container.innerHTML = ''; this.canvas = document.createElement('canvas'); this.canvas.width = 800; this.canvas.height = 600; this.canvas.style.maxWidth = '100%'; this.canvas.style.maxHeight = '100%'; this.canvas.style.backgroundColor = '#eee'; container.appendChild(this.canvas); this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }); this.isSaving = false; this.history = []; this.historyIndex = -1; const img = new Image(); img.onload = () => { console.log("Imagen cargada editor..."); const hRatio = this.canvas.width / img.width; const vRatio = this.canvas.height / img.height; const ratio = Math.min(hRatio, vRatio, 1); const drawWidth = img.width * ratio; const drawHeight = img.height * ratio; const drawX = (this.canvas.width - drawWidth) / 2; const drawY = (this.canvas.height - drawHeight) / 2; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight); this.currentImage = { img, x: drawX, y: drawY, width: drawWidth, height: drawHeight }; this.saveToHistory(); console.log("Imagen dibujada."); }; img.onerror = () => { console.error("Error cargando imagen editor."); alert("Error cargando imagen."); this.closePhotoEditor(); }; img.src = imgSrc; this.setupCanvasEvents(); modal.style.display = 'block';
     }

    setupCanvasEvents() { /* ... (sin cambios) ... */ if (!this.canvas) return; this.canvas.onmousedown = null; this.canvas.onmousemove = null; this.canvas.onmouseup = null; this.canvas.onmouseleave = null; this.canvas.onmousedown = (e) => { this.isDrawing = true; const rect = this.canvas.getBoundingClientRect(); this.lastX = (e.clientX - rect.left) * (this.canvas.width / rect.width); this.lastY = (e.clientY - rect.top) * (this.canvas.height / rect.height); if (this.currentTool === 'text') { const text = prompt('Texto:'); if (text) { this.drawText(this.lastX, this.lastY, text); this.saveToHistory(); } } }; this.canvas.onmousemove = (e) => { if (!this.isDrawing) return; const rect = this.canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (this.canvas.width / rect.width); const y = (e.clientY - rect.top) * (this.canvas.height / rect.height); if (this.historyIndex >= 0 && (this.currentTool === 'arrow' || this.currentTool === 'circle')) { this.ctx.putImageData(this.history[this.historyIndex], 0, 0); } switch (this.currentTool) { case 'brush': this.drawLine(this.lastX, this.lastY, x, y); break; case 'arrow': this.drawArrow(this.lastX, this.lastY, x, y); break; case 'circle': const radius = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2)); this.drawCircle(this.lastX, this.lastY, radius); break; } if (this.currentTool === 'brush') { this.lastX = x; this.lastY = y; } }; this.canvas.onmouseup = (e) => { if (!this.isDrawing) return; if (this.currentTool === 'arrow' || this.currentTool === 'circle') { const rect = this.canvas.getBoundingClientRect(); const finalX = (e.clientX - rect.left) * (this.canvas.width / rect.width); const finalY = (e.clientY - rect.top) * (this.canvas.height / rect.height); this.ctx.putImageData(this.history[this.historyIndex], 0, 0); if (this.currentTool === 'arrow') this.drawArrow(this.lastX, this.lastY, finalX, finalY); if (this.currentTool === 'circle') { const r = Math.sqrt(Math.pow(finalX - this.lastX, 2) + Math.pow(finalY - this.lastY, 2)); this.drawCircle(this.lastX, this.lastY, r); } } this.isDrawing = false; if (this.currentTool !== 'text') { this.saveToHistory(); } }; this.canvas.onmouseleave = () => { if (this.isDrawing) { this.isDrawing = false; if (this.currentTool !== 'text' && (this.currentTool === 'arrow' || this.currentTool === 'circle') && this.historyIndex >= 0) { this.ctx.putImageData(this.history[this.historyIndex], 0, 0); } } }; }

    closePhotoEditor() {
        console.log("[PhotoManager] Cerrando editor...");
        const modal = document.getElementById('photo-editor-modal');
        if (modal) modal.style.display = 'none';
        this.currentImage = null; this.history = []; this.historyIndex = -1;
        this.canvas = null; this.ctx = null;
        // *** Resetear el flag y el botón aquí ***
        this.isSaving = false;
        const saveButton = document.getElementById('save-photo');
        if(saveButton) saveButton.disabled = false;
         // *** Resetear referencia a la tarjeta ***
         this.currentIncidentCard = null;
         console.log("[PhotoManager] Editor cerrado y estado reseteado.");
     }

    saveEditedPhoto() {
        // *** Log al inicio del clic, antes del flag ***
        console.log("[PhotoManager] Clic en Guardar Foto...");
        if (this.isSaving) { console.warn("Guardado ya en progreso."); return; }
        if (!this.canvas) { console.error("Guardar: No hay canvas."); return; }
        // *** Verificar currentIncidentCard aquí ***
         if (!this.currentIncidentCard) { console.error("Guardar: No hay tarjeta de incidencia asociada (currentIncidentCard es null)."); alert("Error: No se sabe a qué incidencia guardar la foto."); return; }
         console.log("[PhotoManager] Guardando para tarjeta:", this.currentIncidentCard.querySelector('.incident-number')?.textContent);


        this.isSaving = true; const saveButton = document.getElementById('save-photo'); if(saveButton) saveButton.disabled = true; console.log("Guardando foto editada...");
        try {
            const imgSrc = this.canvas.toDataURL('image/jpeg', 0.85);
            if (imgSrc.length > 3 * 1024 * 1024) { alert("Imagen > 3MB."); throw new Error("Imagen grande"); }
            if (!this.isValidBase64(imgSrc)) { console.error("Base64 canvas INVÁLIDO.", imgSrc.substring(0,100)); alert("Error: Formato imagen inválido."); throw new Error("Base64 canvas inválido"); }
             console.log(`Base64 generado OK, inicio: ${imgSrc.substring(0,50)}...`);
            // *** Pasar la tarjeta explícitamente ***
            this.addPhotoToIncidentCardFromData(this.currentIncidentCard, { src: imgSrc, alt: 'Foto editada' });
            console.log("Foto guardada y añadida.");
            this.closePhotoEditor(); // Cierra y resetea isSaving y currentIncidentCard
        } catch (error) {
            console.error("Error guardando foto:", error); alert("Error guardando foto.");
             // *** Asegurar reseteo en caso de error ***
             this.isSaving = false; if(saveButton) saveButton.disabled = false;
        }
    }

    // ... (resto de funciones sin cambios: addPhotoToIncidentCardFromData, showZoomModal, setTool, draw*, saveToHistory, undo, redo, resizeImage) ...
    addPhotoToIncidentCardFromData(incidentCard, photoData) { if (!incidentCard || !photoData || !photoData.src) { console.error("Faltan datos añadir foto."); return; } const photosContainer = incidentCard.querySelector('.photos-container'); if (!photosContainer) { console.error("Contenedor fotos no encontrado."); return; } const photoItem = document.createElement('div'); photoItem.className = 'photo-item'; const img = document.createElement('img'); img.src = photoData.src; img.alt = photoData.alt || 'Foto'; const actions = document.createElement('div'); actions.className = 'photo-actions'; const editBtn = document.createElement('button'); editBtn.className = 'btn-icon'; editBtn.innerHTML = '<i class="fas fa-edit"></i>'; editBtn.title = 'Editar'; editBtn.onclick = () => { this.currentIncidentCard = incidentCard; this.openPhotoEditor(img.src, incidentCard); }; const deleteBtn = document.createElement('button'); deleteBtn.className = 'btn-icon'; deleteBtn.innerHTML = '<i class="fas fa-trash"></i>'; deleteBtn.title = 'Eliminar'; deleteBtn.onclick = () => { if (confirm('¿Eliminar foto?')) photoItem.remove(); }; const zoomBtn = document.createElement('button'); zoomBtn.className = 'btn-icon'; zoomBtn.innerHTML = '<i class="fas fa-search-plus"></i>'; zoomBtn.title = 'Ampliar'; zoomBtn.onclick = () => this.showZoomModal(img.src); actions.appendChild(editBtn); actions.appendChild(deleteBtn); actions.appendChild(zoomBtn); photoItem.appendChild(img); photoItem.appendChild(actions); const addBtn = photosContainer.querySelector('.add-photo-btn'); if (addBtn) photosContainer.insertBefore(photoItem, addBtn); else photosContainer.appendChild(photoItem); console.log("Elemento foto añadido UI."); }
    showZoomModal(imgSrc) { const zoomImg = document.getElementById('zoom-image'); const modal = document.getElementById('photo-zoom-modal'); if (!zoomImg || !modal) return; zoomImg.src = imgSrc; modal.style.display = 'block'; }
    setTool(tool) { this.currentTool = tool; document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active')); const activeBtn = document.getElementById(`tool-${tool}`); if (activeBtn) activeBtn.classList.add('active'); else console.warn(`Botón ${tool} no encontrado.`); }
    drawLine(x1, y1, x2, y2) { if (!this.ctx) return; this.ctx.beginPath(); this.ctx.strokeStyle = this.currentColor; this.ctx.lineWidth = this.currentLineWidth; this.ctx.lineCap = 'round'; this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke(); }
    drawArrow(x1, y1, x2, y2) { if (!this.ctx) return; this.ctx.save(); this.ctx.beginPath(); this.ctx.strokeStyle = this.currentColor; this.ctx.lineWidth = this.currentLineWidth; this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke(); const angle = Math.atan2(y2 - y1, x2 - x1); const headLength = Math.min(15, Math.max(5, this.currentLineWidth * 3)); this.ctx.beginPath(); this.ctx.moveTo(x2, y2); this.ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6)); this.ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6)); this.ctx.closePath(); this.ctx.fillStyle = this.currentColor; this.ctx.fill(); this.ctx.restore(); }
    drawCircle(x, y, radius) { if (!this.ctx || radius <= 0) return; this.ctx.beginPath(); this.ctx.strokeStyle = this.currentColor; this.ctx.lineWidth = this.currentLineWidth; this.ctx.arc(x, y, radius, 0, 2 * Math.PI); this.ctx.stroke(); }
    drawText(x, y, text) { if (!this.ctx || !text) return; this.ctx.fillStyle = this.currentColor; const fontSize = Math.max(12, this.currentLineWidth * 5); this.ctx.font = `${fontSize}px Arial`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(text, x, y); }
    saveToHistory() { if (!this.canvas || !this.ctx) return; try { if (this.historyIndex < this.history.length - 1) { this.history = this.history.slice(0, this.historyIndex + 1); } const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height); this.history.push(imageData); this.historyIndex = this.history.length - 1; console.log(`Historial ${this.historyIndex}`); } catch (e) { console.error("Error guardando historial:", e); } }
    undo() { if (this.historyIndex > 0) { this.historyIndex--; this.ctx.putImageData(this.history[this.historyIndex], 0, 0); console.log(`Deshacer ${this.historyIndex}`); } else console.log("Nada que deshacer."); }
    redo() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.ctx.putImageData(this.history[this.historyIndex], 0, 0); console.log(`Rehacer ${this.historyIndex}`); } else console.log("Nada que rehacer."); }
    resizeImage(imgSrc, maxWidth = 600, maxHeight = 400) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { let width = img.width; let height = img.height; if (width > maxWidth || height > maxHeight) { const ratio = Math.min(maxWidth / width, maxHeight / height); width = width * ratio; height = height * ratio; } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); const resizedImgSrc = canvas.toDataURL('image/jpeg', 0.8); resolve(resizedImgSrc); }; img.onerror = (error) => reject(error); img.src = imgSrc; }); }
}
window.photoManager = new PhotoManager();