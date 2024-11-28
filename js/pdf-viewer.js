class PDFViewer {
    constructor(container) {
        this.container = container;
        this.currentPage = 1;
        this.pdfDoc = null;
        this.scale = 1.5;
    }

    async loadPDF(pdfData) {
        try {
            // Load the PDF document
            this.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
            
            // Clear the container
            this.container.innerHTML = '';
            
            // Render all pages
            for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
                const pageContainer = document.createElement('div');
                pageContainer.className = 'pdf-page-container';
                this.container.appendChild(pageContainer);
                
                const page = await this.pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: this.scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                pageContainer.appendChild(canvas);
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }

            return true;
        } catch (error) {
            console.error('Error loading PDF:', error);
            return false;
        }
    }
}
