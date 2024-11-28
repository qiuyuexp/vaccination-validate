class PDFGenerator {
    constructor() {
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF-LIB is not loaded. Make sure you have included the library script.');
        }
        if (typeof fontkit === 'undefined') {
            throw new Error('Fontkit is not loaded. Make sure you have included the library script.');
        }
        
        this.PDFLib = PDFLib;
        this.fontKit = fontkit;

        // A4 paper constants in points (1 point = 1/72 inch)
        this.PAGE_WIDTH = 595.276;
        this.PAGE_HEIGHT = 841.890;
        this.MARGIN = 60;
        this.CONTENT_WIDTH = this.PAGE_WIDTH - (2 * this.MARGIN);
        
        // Design constants
        this.COLORS = {
            primary: PDFLib.rgb(0.1, 0.1, 0.1),
            secondary: PDFLib.rgb(0.4, 0.4, 0.4),
            accent: PDFLib.rgb(0.2, 0.4, 0.8),
            light: PDFLib.rgb(0.9, 0.9, 0.9),
            white: PDFLib.rgb(1, 1, 1)
        };
        
        // Font sizes
        this.FONTS = {
            title: 24,
            subtitle: 16,
            heading: 14,
            normal: 11,
            small: 9
        };
    }

    async generateImmunizationTranscript(data) {
        try {
            const { PDFDocument, StandardFonts } = this.PDFLib;
            const doc = await PDFDocument.create();
            
            // Embed fonts
            const baseFont = await doc.embedFont(StandardFonts.HelveticaBold);
            const regularFont = await doc.embedFont(StandardFonts.Helvetica);
            
            // Store fonts in doc for access in other methods
            doc.baseFont = baseFont;
            doc.regularFont = regularFont;
            
            // Add a blank A4 page
            const page = doc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
            
            // Calculate positions
            const titleY = this.PAGE_HEIGHT - 100;
            const subtitleY = titleY - 40;
            const headerStartY = this.PAGE_HEIGHT - 220;
            
            // Draw title and subtitle
            await this.drawImageText(
                page,
                'Immunization Record',
                (this.PAGE_WIDTH - (this.FONTS.title * 8)) / 2,
                titleY,
                this.FONTS.title,
                true
            );
            
            await this.drawImageText(
                page,
                '疫苗接种记录',
                (this.PAGE_WIDTH - (this.FONTS.subtitle * 5)) / 2,
                subtitleY,
                this.FONTS.subtitle
            );
            
            // Draw personal information section
            const personalInfo = data.personalInfo;
            const col1X = this.MARGIN;
            const col2X = this.PAGE_WIDTH / 2;
            const infoSpacing = 30;
            
            // Personal info items with labels and values
            const infoItems = [
                { label: 'Name 姓名:', value: personalInfo.name || '', y: headerStartY },
                { label: 'Gender 性别:', value: personalInfo.gender || '', y: headerStartY },
                { label: 'Birth Date 出生日期:', value: personalInfo.birthDate || '', y: headerStartY - infoSpacing },
                { label: 'Passport/ID 证件号码:', value: personalInfo.passportId || '', y: headerStartY - infoSpacing }
            ];
            
            // Draw left column items
            await this.drawInfoField(page, infoItems[0].label, infoItems[0].value, col1X, infoItems[0].y, false);
            await this.drawInfoField(page, infoItems[2].label, infoItems[2].value, col1X, infoItems[2].y, false);
            
            // Draw right column items
            await this.drawInfoField(page, infoItems[1].label, infoItems[1].value, col2X, infoItems[1].y, true);
            await this.drawInfoField(page, infoItems[3].label, infoItems[3].value, col2X, infoItems[3].y, true);
            
            // Calculate table start position after personal info
            const tableStartY = headerStartY - (infoSpacing * 2) - 40;
            
            // Draw vaccination records table
            const tableWidth = this.CONTENT_WIDTH;
            const rowHeight = 30;
            const nameColWidth = 160;
            const dateColWidth = (tableWidth - nameColWidth) / 6;
            
            // Draw table
            await this.drawEnhancedTable(
                page,
                this.MARGIN,
                tableStartY,
                tableWidth,
                data.vaccineData.length + 1,
                rowHeight,
                nameColWidth,
                dateColWidth,
                data.vaccineData
            );
            
            // Draw certification section
            const certStartY = tableStartY - (data.vaccineData.length + 2) * rowHeight - 60;
            
            // Draw certification info with underlines
            const cert = data.certification;
            await this.drawInfoField(page, '医生签名 Physician signature:', cert.physician || '', this.MARGIN, certStartY, true);
            await this.drawInfoField(page, '日期 Date:', cert.date || '', this.MARGIN, certStartY - 30, true);
            await this.drawInfoField(page, '地址 Address:', cert.address || '', this.MARGIN, certStartY - 60, true);
            
            // Draw footer
            const footerY = this.MARGIN;
            page.drawText('Generated by Immunization Record System', {
                x: this.MARGIN,
                y: footerY,
                size: this.FONTS.small,
                font: doc.regularFont,
                color: this.COLORS.secondary
            });
            
            const today = new Date().toLocaleDateString();
            page.drawText(today, {
                x: this.PAGE_WIDTH - this.MARGIN - 80,
                y: footerY,
                size: this.FONTS.small,
                font: doc.regularFont,
                color: this.COLORS.secondary
            });
            
            // Serialize the PDFDocument to bytes
            const pdfBytes = await doc.save();
            return pdfBytes;
        } catch (error) {
            console.error('Error in generateImmunizationTranscript:', error);
            throw error;
        }
    }

    async drawInfoField(page, label, value, x, y, isRightColumn = false) {
        const leftColumnLineLength = 140;  // Shorter line for left column
        const rightColumnLineLength = 180; // Longer line for right column
        const lineOffset = 5;    // Distance below the text baseline
        const LABEL_CONTENT_SPACING = 2;  // Exact 2 points spacing between label and content
        
        // Draw the label and get its width
        const labelWidth = await this.drawImageText(
            page, 
            label, 
            x, 
            y, 
            this.FONTS.normal, 
            false, 
            this.COLORS.secondary
        );
        
        // Calculate content start position with exact 2 point spacing
        const contentX = x + labelWidth + LABEL_CONTENT_SPACING;
        const lineLength = isRightColumn ? rightColumnLineLength : leftColumnLineLength;
        
        // Always draw the underline regardless of value
        page.drawLine({
            start: { x: contentX, y: y - lineOffset },
            end: { x: contentX + lineLength, y: y - lineOffset },
            thickness: 0.5,
            color: this.COLORS.secondary
        });
        
        // If value exists, draw it above the line
        if (value) {
            await this.drawImageText(
                page, 
                value, 
                contentX, 
                y, 
                this.FONTS.normal
            );
        }
    }

    async drawEnhancedTable(page, x, y, width, rows, rowHeight, nameColWidth, dateColWidth, data) {
        // Draw header text
        await this.drawImageText(
            page,
            '疫苗名称 Vaccine Name',
            x + 5,
            y - 20,
            this.FONTS.normal,
            true,
            this.COLORS.primary
        );
        
        for (let i = 0; i < 6; i++) {
            await this.drawImageText(
                page,
                `Date ${i + 1}`,
                x + nameColWidth + (i * dateColWidth) + 5,
                y - 20,
                this.FONTS.normal,
                true,
                this.COLORS.primary
            );
        }
        
        // Draw the table grid
        this.drawTableGrid(page, x, y, width, rows, rowHeight, nameColWidth, dateColWidth);
        
        // Draw data rows
        let currentY = y - rowHeight - 20;
        for (const vaccine of data) {
            // Draw vaccine name
            await this.drawImageText(
                page,
                vaccine.name,
                x + 5,
                currentY + 8,
                this.FONTS.normal
            );
            
            // Draw dates
            for (let i = 0; i < Math.min(vaccine.dates.length, 6); i++) {
                if (vaccine.dates[i]) {
                    await this.drawImageText(
                        page,
                        this.formatDate(vaccine.dates[i]),
                        x + nameColWidth + (i * dateColWidth) + 5,
                        currentY + 8,
                        this.FONTS.normal
                    );
                }
            }
            currentY -= rowHeight;
        }
    }

    drawTableGrid(page, x, y, width, rows, rowHeight, nameColWidth, dateColWidth) {
        // Draw horizontal lines
        for (let i = 0; i <= rows; i++) {
            const currentY = y - (i * rowHeight);
            page.drawLine({
                start: { x, y: currentY },
                end: { x: x + width, y: currentY },
                thickness: 0.5,
                color: this.COLORS.secondary
            });
        }
        
        // Draw vertical lines
        // First line (start)
        page.drawLine({
            start: { x, y },
            end: { x, y: y - (rows * rowHeight) },
            thickness: 0.5,
            color: this.COLORS.secondary
        });
        
        // Line after name column
        page.drawLine({
            start: { x: x + nameColWidth, y },
            end: { x: x + nameColWidth, y: y - (rows * rowHeight) },
            thickness: 0.5,
            color: this.COLORS.secondary
        });
        
        // Lines between date columns
        for (let i = 1; i < 6; i++) {
            const lineX = x + nameColWidth + (i * dateColWidth);
            page.drawLine({
                start: { x: lineX, y },
                end: { x: lineX, y: y - (rows * rowHeight) },
                thickness: 0.5,
                color: this.COLORS.secondary
            });
        }
        
        // Last line (end)
        page.drawLine({
            start: { x: x + width, y },
            end: { x: x + width, y: y - (rows * rowHeight) },
            thickness: 0.5,
            color: this.COLORS.secondary
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    async drawImageText(page, text, x, y, fontSize, isBold = false, textColor = this.COLORS.primary) {
        const font = isBold ? page.doc.baseFont : page.doc.regularFont;
        page.drawText(text, {
            x,
            y,
            size: fontSize,
            font: font,
            color: textColor
        });
        return font.widthOfTextAtSize(text, fontSize);
    }

    bytesToBlob(bytes) {
        return new Blob([bytes], { type: 'application/pdf' });
    }

    createDownloadURL(blob) {
        return URL.createObjectURL(blob);
    }

    downloadPDF(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'document.pdf';
        link.click();
    }
}

window.PDFGenerator = PDFGenerator;
