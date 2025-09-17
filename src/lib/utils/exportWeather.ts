import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface WeatherExportData {
  timestamp: string;
  ghi?: number;
  dni?: number;
  dhi?: number;
  gti?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  cloudCover?: number;
  pressure?: number;
  visibility?: number;
  [key: string]: any;
}

export interface ExportOptions {
  locationName: string;
  locationId: string;
  timeRange: string;
  timezone: string;
  selectedParameters: string[];
  parameterDetails: Record<string, { name: string; unit: string }>;
  includeAllData?: boolean; // Option to export all available parameters
  allParameters?: string[]; // List of all available parameters
}

/**
 * Export weather data to CSV format
 */
export function exportToCSV(
  data: WeatherExportData[],
  options: ExportOptions,
): void {
  // Determine which parameters to export
  const parametersToExport =
    options.includeAllData && options.allParameters
      ? options.allParameters
      : options.selectedParameters;

  // Create header row
  const headers = ["Timestamp"];
  parametersToExport.forEach((param) => {
    const details = options.parameterDetails[param];
    if (details) {
      headers.push(`${details.name} (${details.unit})`);
    } else if (options.includeAllData) {
      // For parameters without details, use the raw parameter name
      headers.push(param);
    }
  });

  // Create data rows
  const rows = data.map((row) => {
    const rowData = [row.timestamp];
    parametersToExport.forEach((param) => {
      const value = row[param];
      rowData.push(
        value !== undefined && value !== null
          ? typeof value === "number"
            ? value.toFixed(2)
            : value.toString()
          : "",
      );
    });
    return rowData;
  });

  // Add metadata rows at the top
  const metadata = [
    [`Solar Forecast - Weather Parameters Export`],
    [`Location: ${options.locationName} (${options.locationId})`],
    [`Time Range: ${options.timeRange}`],
    [`Timezone: ${options.timezone}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [], // Empty row
    headers,
  ];

  // Combine metadata and data
  const csvContent = [...metadata, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const cellStr = String(cell);
          if (
            cellStr.includes(",") ||
            cellStr.includes('"') ||
            cellStr.includes("\n")
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(","),
    )
    .join("\n");

  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `weather_data_${options.locationId}_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export weather data to Excel format
 */
export function exportToExcel(
  data: WeatherExportData[],
  options: ExportOptions,
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Determine which parameters to export
  const parametersToExport =
    options.includeAllData && options.allParameters
      ? options.allParameters
      : options.selectedParameters;

  // Create headers
  const headers = ["Timestamp"];
  parametersToExport.forEach((param) => {
    const details = options.parameterDetails[param];
    if (details) {
      headers.push(`${details.name} (${details.unit})`);
    } else if (options.includeAllData) {
      headers.push(param);
    }
  });

  // Create data rows
  const rows = data.map((row) => {
    const rowData: any = { Timestamp: row.timestamp };
    parametersToExport.forEach((param) => {
      const details = options.parameterDetails[param];
      const headerName = details ? `${details.name} (${details.unit})` : param;
      const value = row[param];

      if (value !== undefined && value !== null) {
        rowData[headerName] =
          typeof value === "number" ? parseFloat(value.toFixed(2)) : value;
      } else {
        rowData[headerName] = null;
      }
    });
    return rowData;
  });

  // Create main data sheet
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Adjust column widths
  const colWidths = headers.map((header) => ({
    wch: Math.max(header.length, 15),
  }));
  ws["!cols"] = colWidths;

  // Add sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Weather Data");

  // Create metadata sheet
  const metadataRows = [
    {
      Field: "Report Title",
      Value: "Solar Forecast - Weather Parameters Export",
    },
    {
      Field: "Location",
      Value: `${options.locationName} (${options.locationId})`,
    },
    { Field: "Time Range", Value: options.timeRange },
    { Field: "Timezone", Value: options.timezone },
    { Field: "Generated", Value: new Date().toLocaleString() },
    { Field: "Total Records", Value: data.length },
    { Field: "Parameters", Value: options.selectedParameters.join(", ") },
  ];

  const metadataSheet = XLSX.utils.json_to_sheet(metadataRows);
  metadataSheet["!cols"] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, metadataSheet, "Metadata");

  // Create summary statistics sheet
  const summaryRows: any[] = [];
  parametersToExport.forEach((param) => {
    const details = options.parameterDetails[param];
    const values = data
      .map((row) => row[param])
      .filter(
        (v) => v !== undefined && v !== null && typeof v === "number",
      ) as number[];

    if (values.length > 0) {
      summaryRows.push({
        Parameter: details?.name || param,
        Unit: details?.unit || "-",
        Min: Math.min(...values).toFixed(2),
        Max: Math.max(...values).toFixed(2),
        Average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        Count: values.length,
      });
    }
  });

  if (summaryRows.length > 0) {
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary Statistics");
  }

  // Write file
  XLSX.writeFile(
    wb,
    `weather_data_${options.locationId}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

/**
 * Export weather data and chart to PDF format
 */
export async function exportToPDF(
  data: WeatherExportData[],
  options: ExportOptions,
  chartElement?: HTMLElement,
): Promise<void> {
  const pdf = new jsPDF("landscape", "mm", "a4");

  // Add title and metadata
  pdf.setFontSize(16);
  pdf.text("Solar Forecast - Weather Parameters Report", 14, 15);

  pdf.setFontSize(10);
  pdf.text(`Location: ${options.locationName} (${options.locationId})`, 14, 22);
  pdf.text(`Time Range: ${options.timeRange}`, 14, 27);
  pdf.text(`Timezone: ${options.timezone}`, 14, 32);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

  let yPosition = 45;

  // Add chart if provided
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: "#003135",
        scale: 2,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 270;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 14, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;

      // Add new page if needed
      if (yPosition > 180) {
        pdf.addPage();
        yPosition = 15;
      }
    } catch (error) {
      console.error("Error capturing chart:", error);
    }
  }

  // Add summary statistics
  pdf.setFontSize(12);
  pdf.text("Summary Statistics", 14, yPosition);
  yPosition += 8;

  // Determine which parameters to export
  const parametersToExport =
    options.includeAllData && options.allParameters
      ? options.allParameters
      : options.selectedParameters;

  const summaryData: any[] = [];
  parametersToExport.forEach((param) => {
    const details = options.parameterDetails[param];
    const values = data
      .map((row) => row[param])
      .filter(
        (v) => v !== undefined && v !== null && typeof v === "number",
      ) as number[];

    if (values.length > 0) {
      summaryData.push([
        details?.name || param,
        details?.unit || "-",
        Math.min(...values).toFixed(2),
        Math.max(...values).toFixed(2),
        (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      ]);
    }
  });

  if (summaryData.length > 0) {
    pdf.autoTable({
      head: [["Parameter", "Unit", "Min", "Max", "Average"]],
      body: summaryData,
      startY: yPosition,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 164, 175] },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 10;
  }

  // Add data table (limited rows for PDF)
  if (yPosition > 160) {
    pdf.addPage();
    yPosition = 15;
  }

  pdf.setFontSize(12);
  pdf.text("Weather Data (First 50 records)", 14, yPosition);
  yPosition += 8;

  // Prepare table headers
  const tableHeaders = ["Timestamp"];
  options.selectedParameters.forEach((param) => {
    const details = options.parameterDetails[param];
    if (details) {
      tableHeaders.push(`${details.name}\n(${details.unit})`);
    }
  });

  // Prepare table data (limit to 50 rows for PDF)
  const tableData = data.slice(0, 50).map((row) => {
    const rowData = [row.timestamp];
    options.selectedParameters.forEach((param) => {
      const value = row[param];
      rowData.push(
        value !== undefined && value !== null ? value.toFixed(2) : "-",
      );
    });
    return rowData;
  });

  pdf.autoTable({
    head: [tableHeaders],
    body: tableData,
    startY: yPosition,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [15, 164, 175],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 30 }, // Timestamp column
    },
  });

  // Add footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, 280, 200, { align: "right" });
  }

  // Save PDF
  pdf.save(
    `weather_report_${options.locationId}_${new Date().toISOString().split("T")[0]}.pdf`,
  );
}

/**
 * Transform chart data to export format
 */
export function transformChartDataForExport(
  chartData: { labels: string[]; datasets: any[] },
  parameterMapping: Record<string, string>,
): WeatherExportData[] {
  const result: WeatherExportData[] = [];

  // Create reverse mapping from dataset labels to parameter keys
  const labelToParamKey: Record<string, string> = {
    // Solar radiation mappings
    "Global Horizontal Irradiance (GHI)": "shortwave_radiation",
    "Direct Normal Irradiance (DNI)": "direct_radiation",
    "Diffuse Horizontal Irradiance (DHI)": "diffuse_radiation",
    "Global Tilted Irradiance (GTI)": "global_tilted_irradiance",
    "Sunshine Duration": "sunshine_duration",
    "UV Index": "uv_index",
    "Solar Radiation": "shortwave_radiation", // API returns this label

    // Atmospheric conditions mappings
    "Air Temperature": "temperature_2m",
    Temperature: "temperature_2m", // API returns this label
    "Relative Humidity": "relative_humidity_2m",
    Humidity: "relative_humidity_2m", // API returns this label
    "Surface Pressure": "surface_pressure",
    "Dew Point": "dew_point_2m",
    Visibility: "visibility",

    // Wind conditions mappings
    "Wind Speed (10m)": "wind_speed_10m",
    "Wind Speed (100m)": "wind_speed_100m",
    "Wind Speed": "wind_speed_10m", // API returns this label
    "Wind Direction (10m)": "wind_direction_10m",
    "Wind Gusts": "wind_gusts_10m",

    // Cloud & precipitation mappings
    "Total Cloud Cover": "cloud_cover",
    "Cloud Coverage": "cloud_cover", // API returns this label
    "Low Cloud Cover": "cloud_cover_low",
    "Mid Cloud Cover": "cloud_cover_mid",
    "High Cloud Cover": "cloud_cover_high",
    Precipitation: "precipitation",
    Rain: "rain",

    // Direct API mappings for DNI/DHI
    "Direct Normal Irradiance": "direct_radiation",
    "Diffuse Horizontal Irradiance": "diffuse_radiation",
  };

  // Create a row for each timestamp
  chartData.labels.forEach((timestamp, index) => {
    const row: WeatherExportData = { timestamp };

    // Add data from each dataset
    chartData.datasets.forEach((dataset) => {
      // Try to find parameter key by exact label match first
      let paramKey = labelToParamKey[dataset.label];

      // If no exact match, try to find by mapping
      if (!paramKey) {
        paramKey = Object.entries(parameterMapping).find(
          ([key, value]) =>
            dataset.label.toLowerCase().includes(value.toLowerCase()) ||
            dataset.label.toLowerCase().includes(key.toLowerCase()),
        )?.[0];
      }

      if (paramKey && dataset.data[index] !== undefined) {
        row[paramKey] = dataset.data[index];
      }
    });

    result.push(row);
  });

  return result;
}
