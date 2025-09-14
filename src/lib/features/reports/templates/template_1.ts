import ExcelJS from 'exceljs';
import type { TemplateConfig, ReportData, RenderParams } from '../models/ReportTypes';
import path from 'path';

export const template1Renderer: TemplateConfig = {
    mode: 'FILE',
    dataSourceKey: 'default',
    templatePath: '/static/reports/template_1.xlsx',

    async loadTemplate(): Promise<ExcelJS.Workbook> {
        const workbook = new ExcelJS.Workbook();
        const templatePath = path.join(process.cwd(), '..', 'static', 'reports', 'template_1.xlsx');

        try {
            await workbook.xlsx.readFile(templatePath);
        } catch (error) {
            console.error('[Template1] Failed to load template file:', error);
            // If template doesn't exist, create a basic one
            const worksheet = workbook.addWorksheet('Data');

            // Add headers
            worksheet.columns = [
                { header: 'Timestamp', key: 'timestamp', width: 20 },
                { header: 'Site', key: 'site', width: 15 },
                { header: 'Qty', key: 'qty', width: 10 },
                { header: 'Price', key: 'price', width: 12 },
                { header: 'Total', key: 'total', width: 12 }
            ];

            // Style headers
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        }

        return workbook;
    },

    render(workbook: ExcelJS.Workbook, data: ReportData, params: RenderParams): void {
        const worksheet = workbook.getWorksheet('Data');
        if (!worksheet) {
            throw new Error('Worksheet "Data" not found in template');
        }

        // Clear existing data rows (keep header)
        const rowCount = worksheet.rowCount;
        for (let i = rowCount; i > 1; i--) {
            worksheet.spliceRows(i, 1);
        }

        // Add data rows
        data.rows.forEach((row, index) => {
            const rowNumber = index + 2; // Start from row 2 (after header)
            const excelRow = worksheet.getRow(rowNumber);

            // Set values
            excelRow.getCell(1).value = row.timestamp;
            excelRow.getCell(2).value = row.site;
            excelRow.getCell(3).value = row.qty;
            excelRow.getCell(4).value = row.price;

            // Set formula for Total column
            excelRow.getCell(5).value = { formula: `C${rowNumber}*D${rowNumber}` };

            // Apply formatting
            // Timestamp column - date format
            excelRow.getCell(1).numFmt = 'yyyy-mm-dd hh:mm';

            // Qty column - integer
            excelRow.getCell(3).numFmt = '#,##0';

            // Price column - decimal
            excelRow.getCell(4).numFmt = '#,##0.00';

            // Total column - decimal
            excelRow.getCell(5).numFmt = '#,##0.00';

            // Add borders
            for (let col = 1; col <= 5; col++) {
                excelRow.getCell(col).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // Add summary row
        if (data.rows.length > 0) {
            const summaryRow = worksheet.getRow(data.rows.length + 3);
            summaryRow.getCell(2).value = 'TOTAL:';
            summaryRow.getCell(2).font = { bold: true };

            // Sum formulas
            summaryRow.getCell(3).value = {
                formula: `SUM(C2:C${data.rows.length + 1})`
            };
            summaryRow.getCell(5).value = {
                formula: `SUM(E2:E${data.rows.length + 1})`
            };

            // Format summary
            summaryRow.getCell(3).numFmt = '#,##0';
            summaryRow.getCell(5).numFmt = '#,##0.00';
            summaryRow.getCell(3).font = { bold: true };
            summaryRow.getCell(5).font = { bold: true };
        }

        // Auto-fit columns (optional)
        worksheet.columns.forEach(column => {
            if (column.width) {
                column.width = Math.max(column.width, 10);
            }
        });

        // Add metadata
        worksheet.getCell('H1').value = 'Report Period:';
        worksheet.getCell('I1').value = `${params.from.toISOString()} to ${params.to.toISOString()}`;
        worksheet.getCell('H2').value = 'Timezone:';
        worksheet.getCell('I2').value = params.tz;
        worksheet.getCell('H3').value = 'Generated:';
        worksheet.getCell('I3').value = new Date();
        worksheet.getCell('I3').numFmt = 'yyyy-mm-dd hh:mm:ss';
    }
};