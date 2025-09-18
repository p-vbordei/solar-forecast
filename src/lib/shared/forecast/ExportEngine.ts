/**
 * Unified export engine for forecast data
 * Eliminates duplicated export functionality across services
 * Supports CSV, Excel, and PDF formats with consistent formatting
 */

import ExcelJS from 'exceljs';
import type { ExportData, ExportFormat, ForecastData } from './types';

export class ForecastExportEngine {
    /**
     * Export forecast data to specified format
     * Single method that replaces all duplicated export logic
     */
    static async exportData(data: ExportData, format: ExportFormat): Promise<Buffer> {
        switch (format) {
            case 'csv':
                return this.exportToCSV(data);
            case 'excel':
                return this.exportToExcel(data);
            case 'pdf':
                return this.exportToPDF(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export to CSV format
     * Comprehensive CSV generation with all forecast data
     */
    private static async exportToCSV(data: ExportData): Promise<Buffer> {
        const lines: string[] = [];

        // Header with metadata
        lines.push('# Solar Forecast Export Report');
        lines.push(`# Location: ${data.metadata.locationName} (${data.metadata.locationId})`);
        lines.push(`# Period: ${data.metadata.startDate} to ${data.metadata.endDate}`);
        lines.push(`# Interval: ${data.metadata.interval}`);
        lines.push(`# Generated: ${data.metadata.generatedAt}`);

        if (data.metadata.accuracy) {
            lines.push(`# Accuracy: ${data.metadata.accuracy.accuracy}% (MAPE: ${data.metadata.accuracy.mape}%)`);
            lines.push(`# R²: ${data.metadata.accuracy.r2}, RMSE: ${data.metadata.accuracy.rmse}`);
            lines.push(`# Sample Count: ${data.metadata.accuracy.sample_count}`);
        }

        lines.push(''); // Empty line separator

        // CSV Header
        const headers = [
            'Timestamp',
            'Forecast (MW)',
            'Actual (MW)',
            'Energy (MWh)',
            'Capacity Factor (%)',
            'Confidence (%)',
            'Confidence Lower (MW)',
            'Confidence Upper (MW)',
            'Q25 (MW)',
            'Q75 (MW)',
            'Temperature (°C)',
            'GHI (W/m²)',
            'DNI (W/m²)',
            'Cloud Cover (%)',
            'Wind Speed (m/s)'
        ];
        lines.push(headers.join(','));

        // Data rows
        for (const row of data.forecast) {
            const values = [
                row.timestamp,
                this.formatNumber(row.forecast, 3),
                this.formatNumber(row.actual, 3),
                this.formatNumber(row.energy, 3),
                this.formatNumber(row.capacity_factor ? row.capacity_factor * 100 : null, 1),
                this.formatNumber(row.confidence ? row.confidence * 100 : null, 1),
                this.formatNumber(row.confidence_lower, 3),
                this.formatNumber(row.confidence_upper, 3),
                this.formatNumber(row.confidence_q25, 3),
                this.formatNumber(row.confidence_q75, 3),
                this.formatNumber(row.temperature, 1),
                this.formatNumber(row.ghi, 0),
                this.formatNumber(row.dni, 0),
                this.formatNumber(row.cloud_cover, 1),
                this.formatNumber(row.wind_speed, 1)
            ];
            lines.push(values.join(','));
        }

        return Buffer.from(lines.join('\n'), 'utf-8');
    }

    /**
     * Export to Excel format
     * Professional Excel workbook with multiple sheets and formatting
     */
    private static async exportToExcel(data: ExportData): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();

        // Set workbook properties
        workbook.creator = 'Solar Forecast System';
        workbook.lastModifiedBy = 'Solar Forecast System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        this.createSummarySheet(summarySheet, data);

        // Forecast Data Sheet
        const forecastSheet = workbook.addWorksheet('Forecast Data');
        this.createForecastDataSheet(forecastSheet, data);

        // Accuracy Metrics Sheet (if available)
        if (data.metadata.accuracy) {
            const accuracySheet = workbook.addWorksheet('Accuracy Metrics');
            this.createAccuracySheet(accuracySheet, data);
        }

        // Weather Data Sheet (if available)
        if (data.weather && data.weather.length > 0) {
            const weatherSheet = workbook.addWorksheet('Weather Data');
            this.createWeatherSheet(weatherSheet, data);
        }

        // Generate buffer
        return await workbook.xlsx.writeBuffer() as Buffer;
    }

    /**
     * Export to PDF format
     * Simple text-based PDF for basic reporting
     */
    private static async exportToPDF(data: ExportData): Promise<Buffer> {
        // For now, create a comprehensive text report
        // In production, you might want to use a proper PDF library like PDFKit
        const lines: string[] = [];

        lines.push('SOLAR FORECAST ANALYSIS REPORT');
        lines.push('================================');
        lines.push('');
        lines.push(`Location: ${data.metadata.locationName}`);
        lines.push(`Location ID: ${data.metadata.locationId}`);
        lines.push(`Report Period: ${data.metadata.startDate} to ${data.metadata.endDate}`);
        lines.push(`Forecast Interval: ${data.metadata.interval}`);
        lines.push(`Generated: ${data.metadata.generatedAt}`);
        lines.push('');

        if (data.metadata.accuracy) {
            lines.push('ACCURACY METRICS');
            lines.push('================');
            lines.push(`Overall Accuracy: ${data.metadata.accuracy.accuracy}%`);
            lines.push(`Mean Absolute Percentage Error (MAPE): ${data.metadata.accuracy.mape}%`);
            lines.push(`Root Mean Square Error (RMSE): ${data.metadata.accuracy.rmse}`);
            lines.push(`Mean Absolute Error (MAE): ${data.metadata.accuracy.mae}`);
            lines.push(`R-squared (R²): ${data.metadata.accuracy.r2}`);
            lines.push(`Forecast Skill Score: ${data.metadata.accuracy.skill_score || 'N/A'}`);
            lines.push(`Sample Count: ${data.metadata.accuracy.sample_count}`);
            lines.push(`Confidence Score: ${(data.metadata.accuracy.confidence_score * 100).toFixed(1)}%`);
            lines.push('');
        }

        lines.push('FORECAST SUMMARY');
        lines.push('================');
        lines.push(`Total Forecast Points: ${data.forecast.length}`);

        if (data.forecast.length > 0) {
            const forecasts = data.forecast.map(f => f.forecast).filter(f => f != null);
            const actuals = data.forecast.map(f => f.actual).filter(f => f != null);

            if (forecasts.length > 0) {
                lines.push(`Forecast Range: ${Math.min(...forecasts).toFixed(2)} - ${Math.max(...forecasts).toFixed(2)} MW`);
                lines.push(`Average Forecast: ${(forecasts.reduce((a, b) => a + b, 0) / forecasts.length).toFixed(2)} MW`);
            }

            if (actuals.length > 0) {
                lines.push(`Actual Range: ${Math.min(...actuals).toFixed(2)} - ${Math.max(...actuals).toFixed(2)} MW`);
                lines.push(`Average Actual: ${(actuals.reduce((a, b) => a + b, 0) / actuals.length).toFixed(2)} MW`);
            }
        }

        lines.push('');
        lines.push('DETAILED FORECAST DATA');
        lines.push('======================');
        lines.push('Timestamp\t\t\tForecast(MW)\tActual(MW)\tConfidence');
        lines.push('----------------------------------------------------------------');

        for (const row of data.forecast.slice(0, 50)) { // Limit to first 50 rows for PDF
            const timestamp = new Date(row.timestamp).toISOString().replace('T', ' ').slice(0, 19);
            const forecast = this.formatNumber(row.forecast, 2);
            const actual = this.formatNumber(row.actual, 2);
            const confidence = this.formatNumber(row.confidence ? row.confidence * 100 : null, 1);

            lines.push(`${timestamp}\t${forecast}\t\t${actual}\t\t${confidence}%`);
        }

        if (data.forecast.length > 50) {
            lines.push(`... and ${data.forecast.length - 50} more rows`);
        }

        lines.push('');
        lines.push('Generated by Solar Forecast System');

        // Convert to buffer (in production, use a proper PDF library)
        return Buffer.from(lines.join('\n'), 'utf-8');
    }

    /**
     * Create summary sheet for Excel export
     */
    private static createSummarySheet(sheet: ExcelJS.Worksheet, data: ExportData): void {
        // Title
        sheet.mergeCells('A1:D1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'Solar Forecast Analysis Report';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        // Metadata
        let row = 3;
        sheet.getCell(`A${row}`).value = 'Location:';
        sheet.getCell(`B${row}`).value = data.metadata.locationName;
        row++;

        sheet.getCell(`A${row}`).value = 'Location ID:';
        sheet.getCell(`B${row}`).value = data.metadata.locationId;
        row++;

        sheet.getCell(`A${row}`).value = 'Period:';
        sheet.getCell(`B${row}`).value = `${data.metadata.startDate} to ${data.metadata.endDate}`;
        row++;

        sheet.getCell(`A${row}`).value = 'Interval:';
        sheet.getCell(`B${row}`).value = data.metadata.interval;
        row++;

        sheet.getCell(`A${row}`).value = 'Generated:';
        sheet.getCell(`B${row}`).value = data.metadata.generatedAt;
        row += 2;

        // Accuracy metrics
        if (data.metadata.accuracy) {
            sheet.getCell(`A${row}`).value = 'Accuracy Metrics';
            sheet.getCell(`A${row}`).font = { bold: true };
            row++;

            const metrics = data.metadata.accuracy;
            sheet.getCell(`A${row}`).value = 'Overall Accuracy:';
            sheet.getCell(`B${row}`).value = `${metrics.accuracy}%`;
            row++;

            sheet.getCell(`A${row}`).value = 'MAPE:';
            sheet.getCell(`B${row}`).value = `${metrics.mape}%`;
            row++;

            sheet.getCell(`A${row}`).value = 'RMSE:';
            sheet.getCell(`B${row}`).value = metrics.rmse;
            row++;

            sheet.getCell(`A${row}`).value = 'R²:';
            sheet.getCell(`B${row}`).value = metrics.r2;
            row++;

            sheet.getCell(`A${row}`).value = 'Sample Count:';
            sheet.getCell(`B${row}`).value = metrics.sample_count;
        }

        // Auto-fit columns
        sheet.columns.forEach(column => {
            column.width = 20;
        });
    }

    /**
     * Create forecast data sheet for Excel export
     */
    private static createForecastDataSheet(sheet: ExcelJS.Worksheet, data: ExportData): void {
        // Headers
        const headers = [
            'Timestamp', 'Forecast (MW)', 'Actual (MW)', 'Energy (MWh)',
            'Capacity Factor', 'Confidence', 'Lower Bound', 'Upper Bound',
            'Q25', 'Q75', 'Temperature', 'GHI', 'DNI', 'Cloud Cover', 'Wind Speed'
        ];

        sheet.addRow(headers);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Data rows
        for (const row of data.forecast) {
            sheet.addRow([
                row.timestamp,
                row.forecast,
                row.actual,
                row.energy,
                row.capacity_factor,
                row.confidence,
                row.confidence_lower,
                row.confidence_upper,
                row.confidence_q25,
                row.confidence_q75,
                row.temperature,
                row.ghi,
                row.dni,
                row.cloud_cover,
                row.wind_speed
            ]);
        }

        // Auto-fit columns
        sheet.columns.forEach(column => {
            column.width = 15;
        });
    }

    /**
     * Create accuracy metrics sheet for Excel export
     */
    private static createAccuracySheet(sheet: ExcelJS.Worksheet, data: ExportData): void {
        if (!data.metadata.accuracy) return;

        const metrics = data.metadata.accuracy;

        sheet.addRow(['Metric', 'Value', 'Description']);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };

        sheet.addRow(['Overall Accuracy', `${metrics.accuracy}%`, 'Percentage accuracy (100 - MAPE)']);
        sheet.addRow(['MAPE', `${metrics.mape}%`, 'Mean Absolute Percentage Error']);
        sheet.addRow(['RMSE', metrics.rmse, 'Root Mean Square Error']);
        sheet.addRow(['MAE', metrics.mae, 'Mean Absolute Error']);
        sheet.addRow(['R²', metrics.r2, 'Coefficient of determination']);
        sheet.addRow(['NRMSE', metrics.nrmse || 'N/A', 'Normalized Root Mean Square Error']);
        sheet.addRow(['Skill Score', metrics.skill_score || 'N/A', 'Forecast skill vs persistence']);
        sheet.addRow(['Sample Count', metrics.sample_count, 'Number of data points']);
        sheet.addRow(['Confidence Score', metrics.confidence_score, 'Overall forecast confidence']);

        // Auto-fit columns
        sheet.columns.forEach((column, index) => {
            column.width = index === 2 ? 30 : 15;
        });
    }

    /**
     * Create weather data sheet for Excel export
     */
    private static createWeatherSheet(sheet: ExcelJS.Worksheet, data: ExportData): void {
        if (!data.weather || data.weather.length === 0) return;

        // This would be implemented based on your weather data structure
        sheet.addRow(['Weather data sheet - implementation depends on weather data structure']);
    }

    /**
     * Format number for consistent display
     */
    private static formatNumber(value: number | null | undefined, decimals: number): string {
        if (value == null || isNaN(value)) return '';
        return value.toFixed(decimals);
    }

    /**
     * Generate filename with timestamp
     */
    static generateFilename(
        locationName: string,
        format: ExportFormat,
        interval: string,
        timestamp?: string
    ): string {
        const cleanLocationName = locationName.replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = timestamp ?
            new Date(timestamp).toISOString().slice(0, 10) :
            new Date().toISOString().slice(0, 10);

        const extension = format === 'excel' ? 'xlsx' : format;

        return `forecast_${cleanLocationName}_${interval}_${dateStr}.${extension}`;
    }

    /**
     * Get MIME type for export format
     */
    static getMimeType(format: ExportFormat): string {
        switch (format) {
            case 'csv':
                return 'text/csv';
            case 'excel':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'pdf':
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }
}