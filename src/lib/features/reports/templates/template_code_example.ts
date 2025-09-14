import ExcelJS from 'exceljs';
import type { TemplateConfig, ReportData, RenderParams } from '../models/ReportTypes';

export const templateCodeExampleRenderer: TemplateConfig = {
    mode: 'CODE',
    dataSourceKey: 'default',

    build(): ExcelJS.Workbook {
        const workbook = new ExcelJS.Workbook();

        // Set workbook properties
        workbook.creator = 'Solar Forecast Platform';
        workbook.lastModifiedBy = 'Report Generator';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Add main data worksheet
        const worksheet = workbook.addWorksheet('Report Data', {
            properties: {
                tabColor: { argb: 'FF00FF00' },
                defaultRowHeight: 18
            },
            views: [
                { state: 'frozen', xSplit: 0, ySplit: 1 } // Freeze header row
            ]
        });

        // Define columns with styling
        worksheet.columns = [
            {
                header: 'Timestamp',
                key: 'timestamp',
                width: 22,
                style: {
                    numFmt: 'yyyy-mm-dd hh:mm:ss'
                }
            },
            {
                header: 'Site',
                key: 'site',
                width: 20,
                style: {
                    alignment: { horizontal: 'left' }
                }
            },
            {
                header: 'Quantity',
                key: 'qty',
                width: 12,
                style: {
                    numFmt: '#,##0',
                    alignment: { horizontal: 'right' }
                }
            },
            {
                header: 'Unit Price',
                key: 'price',
                width: 14,
                style: {
                    numFmt: '€#,##0.00',
                    alignment: { horizontal: 'right' }
                }
            },
            {
                header: 'Total Value',
                key: 'total',
                width: 16,
                style: {
                    numFmt: '€#,##0.00',
                    alignment: { horizontal: 'right' }
                }
            },
            {
                header: 'Status',
                key: 'status',
                width: 12,
                style: {
                    alignment: { horizontal: 'center' }
                }
            }
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
            size: 11
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0FA4AF' } // Using cyan from brand colors
        };
        headerRow.alignment = {
            vertical: 'middle',
            horizontal: 'center'
        };
        headerRow.height = 25;

        // Apply borders to header
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'medium' },
                left: { style: 'thin' },
                bottom: { style: 'medium' },
                right: { style: 'thin' }
            };
        });

        // Add a summary worksheet
        const summarySheet = workbook.addWorksheet('Summary', {
            properties: {
                tabColor: { argb: 'FF0000FF' }
            }
        });

        // Setup summary sheet structure
        summarySheet.columns = [
            { key: 'metric', width: 25 },
            { key: 'value', width: 20 }
        ];

        return workbook;
    },

    render(workbook: ExcelJS.Workbook, data: ReportData, params: RenderParams): void {
        const worksheet = workbook.getWorksheet('Report Data');
        const summarySheet = workbook.getWorksheet('Summary');

        if (!worksheet || !summarySheet) {
            throw new Error('Required worksheets not found');
        }

        // Clear existing data (except header)
        const rowCount = worksheet.rowCount;
        if (rowCount > 1) {
            worksheet.spliceRows(2, rowCount - 1);
        }

        // Add data rows with alternating colors
        data.rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const excelRow = worksheet.addRow({
                timestamp: row.timestamp,
                site: row.site,
                qty: row.qty,
                price: row.price,
                total: { formula: `C${rowNumber}*D${rowNumber}` },
                status: row.qty > 100 ? 'HIGH' : row.qty > 50 ? 'MEDIUM' : 'LOW'
            });

            // Apply alternating row colors
            if (index % 2 === 0) {
                excelRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                };
            }

            // Apply conditional formatting for status
            const statusCell = excelRow.getCell('status');
            const statusValue = statusCell.value as string;

            if (statusValue === 'HIGH') {
                statusCell.font = { color: { argb: 'FF00AA00' }, bold: true };
            } else if (statusValue === 'MEDIUM') {
                statusCell.font = { color: { argb: 'FFAA6600' }, bold: true };
            } else {
                statusCell.font = { color: { argb: 'FFAA0000' } };
            }

            // Add borders
            excelRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Add totals row
        if (data.rows.length > 0) {
            const lastDataRow = data.rows.length + 1;

            // Add empty row for spacing
            worksheet.addRow([]);

            // Add totals row
            const totalsRow = worksheet.addRow({
                timestamp: null,
                site: 'TOTAL',
                qty: { formula: `SUM(C2:C${lastDataRow})` },
                price: { formula: `AVERAGE(D2:D${lastDataRow})` },
                total: { formula: `SUM(E2:E${lastDataRow})` },
                status: ''
            });

            // Style totals row
            totalsRow.font = { bold: true, size: 12 };
            totalsRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCCCCCC' }
            };

            totalsRow.eachCell((cell, colNumber) => {
                if (colNumber <= 5) {
                    cell.border = {
                        top: { style: 'double' },
                        bottom: { style: 'double' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });
        }

        // Enable auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: `F${worksheet.rowCount}`
        };

        // Populate summary sheet
        const summaryData = [
            ['Report Information', ''],
            ['', ''],
            ['Template', 'CODE Mode Example'],
            ['Generated At', new Date()],
            ['Report Period', `${params.from.toISOString()} to ${params.to.toISOString()}`],
            ['Timezone', params.tz],
            ['', ''],
            ['Data Summary', ''],
            ['Total Records', data.rows.length],
            ['Unique Sites', [...new Set(data.rows.map(r => r.site))].length],
            ['Total Quantity', { formula: `SUM('Report Data'!C:C)` }],
            ['Total Value', { formula: `SUM('Report Data'!E:E)` }],
            ['Average Price', { formula: `AVERAGE('Report Data'!D:D)` }]
        ];

        summaryData.forEach((rowData, index) => {
            const row = summarySheet.addRow(rowData);

            // Style section headers
            if (rowData[0] === 'Report Information' || rowData[0] === 'Data Summary') {
                row.font = { bold: true, size: 14 };
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF024950' } // Using teal-dark from brand
                };
                row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }

            // Format dates
            if (rowData[0] === 'Generated At') {
                row.getCell(2).numFmt = 'yyyy-mm-dd hh:mm:ss';
            }

            // Format numbers
            if (['Total Quantity', 'Total Value', 'Average Price'].includes(rowData[0] as string)) {
                if (rowData[0] === 'Total Quantity') {
                    row.getCell(2).numFmt = '#,##0';
                } else {
                    row.getCell(2).numFmt = '€#,##0.00';
                }
            }
        });

        // Adjust column widths in summary
        summarySheet.getColumn(1).width = 25;
        summarySheet.getColumn(2).width = 40;

        // Add chart data preparation (for future enhancement)
        // Note: ExcelJS doesn't support creating charts, but we can prepare data
        // in a format that makes it easy to add charts manually in Excel
    }
};