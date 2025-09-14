import type { Workbook } from 'exceljs';

export interface GenerateReportParams {
    template: string;
    from: Date;
    to: Date;
    tz: string;
}

export interface ReportResult {
    buffer: ArrayBuffer;
    filename: string;
}

export interface ReportDataRow {
    timestamp: Date;
    site: string;
    qty: number;
    price: number;
}

export interface ReportData {
    rows: ReportDataRow[];
}

export interface DataService {
    fetch(from: Date, to: Date, tz?: string): Promise<ReportData>;
}

export interface TemplateConfig {
    mode: 'FILE' | 'CODE';
    dataSourceKey: string;
    templatePath?: string;
    loadTemplate?: () => Promise<Workbook>;
    build?: () => Workbook;
    render(workbook: Workbook, data: ReportData, params: RenderParams): void;
}

export interface RenderParams {
    from: Date;
    to: Date;
    tz: string;
}