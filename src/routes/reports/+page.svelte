<script lang="ts">
  import { onMount } from 'svelte';
  import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
  import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
  import SunIcon from '$lib/components/icons/SunIcon.svelte';
  import BoltIcon from '$lib/components/icons/BoltIcon.svelte';
  import ExclamationTriangleIcon from '$lib/components/icons/ExclamationTriangleIcon.svelte';
  import CurrencyDollarIcon from '$lib/components/icons/CurrencyDollarIcon.svelte';
  import ShieldCheckIcon from '$lib/components/icons/ShieldCheckIcon.svelte';
  import MapPinIcon from '$lib/components/icons/MapPinIcon.svelte';
  import CloudIcon from '$lib/components/icons/CloudIcon.svelte';

  let selectedReport = '';
  let selectedLocation = '';
  let selectedPlant = '';
  let selectedFormat = 'pdf';
  let showExplanation = false;
  let locations: any[] = [];
  let plants: any[] = [];
  let dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };

  const reportTypes = [
    {
      id: 'production-summary',
      name: 'Production Summary',
      description: 'Overview of solar power generation across all locations',
      icon: SunIcon,
      category: 'Production',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'dateRange']
    },
    {
      id: 'efficiency-analysis',
      name: 'Efficiency Analysis',
      description: 'Panel efficiency and performance metrics analysis',
      icon: BoltIcon,
      category: 'Performance',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'plant', 'dateRange']
    },
    {
      id: 'forecast-accuracy',
      name: 'Forecast Accuracy',
      description: 'Comparison of forecasted vs actual production',
      icon: ChartBarIcon,
      category: 'Analytics',
      formats: ['pdf', 'excel'],
      filters: ['location', 'dateRange']
    },
    {
      id: 'maintenance-report',
      name: 'Maintenance Report',
      description: 'Maintenance activities and system downtime analysis',
      icon: ExclamationTriangleIcon,
      category: 'Maintenance',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'plant', 'dateRange']
    },
    {
      id: 'financial-summary',
      name: 'Financial Summary',
      description: 'Revenue analysis and cost-benefit breakdown',
      icon: CurrencyDollarIcon,
      category: 'Financial',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'dateRange']
    },
    {
      id: 'compliance-report',
      name: 'Compliance Report',
      description: 'Regulatory compliance and certification status',
      icon: ShieldCheckIcon,
      category: 'Compliance',
      formats: ['pdf', 'excel'],
      filters: ['location', 'dateRange']
    },
    {
      id: 'weather-impact',
      name: 'Weather Impact Analysis',
      description: 'Weather conditions impact on production',
      icon: CloudIcon,
      category: 'Analytics',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'dateRange']
    },
    {
      id: 'location-comparison',
      name: 'Location Comparison',
      description: 'Comparative analysis across different locations',
      icon: MapPinIcon,
      category: 'Analytics',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['dateRange']
    }
  ];

  const reportCategories = [
    { id: 'all', name: 'All Reports', icon: ChartBarIcon },
    { id: 'Production', name: 'Production', icon: SunIcon },
    { id: 'Performance', name: 'Performance', icon: BoltIcon },
    { id: 'Analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'Maintenance', name: 'Maintenance', icon: ExclamationTriangleIcon },
    { id: 'Financial', name: 'Financial', icon: CurrencyDollarIcon },
    { id: 'Compliance', name: 'Compliance', icon: ShieldCheckIcon }
  ];

  let selectedCategory = 'all';
  let filteredReportTypes = reportTypes;
  let recentReports: any[] = [];
  let isLoading = false;

  async function generateReport() {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    if (!dateRange.start || !dateRange.end) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(dateRange.start) > new Date(dateRange.end)) {
      alert('Start date must be before end date');
      return;
    }

    isLoading = true;
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType: selectedReport,
          startDate: dateRange.start,
          endDate: dateRange.end,
          format: selectedFormat,
          locationId: selectedLocation || null,
          plantId: selectedPlant || null,
          filters: {
            location: selectedLocation,
            plant: selectedPlant
          }
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        alert(`Error generating report: ${errorResult.error || 'Unknown error'}`);
        return;
      }

      if (selectedFormat === 'pdf') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport}_${dateRange.start}_to_${dateRange.end}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert(`PDF report "${selectedReport}" generated and downloaded successfully!`);
      } else {
        const result = await response.json();
        
        if (result.success) {
          alert(`Report "${selectedReport}" generated successfully! Contains ${result.data?.summary?.totalRecords || 0} records.`);
        } else {
          alert(`Error generating report: ${result.error || 'Unknown error'}`);
        }
      }
      
      await loadRecentReports();
    } catch (error) {
      alert(`Error generating report: ${error}`);
    } finally {
      isLoading = false;
    }
  }

  async function downloadReport(report: any) {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType: report.reportType,
          startDate: report.period.startDate,
          endDate: report.period.endDate,
          format: report.format
        })
      });

      if (response.ok) {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `${report.reportType}_${new Date().toISOString().split('T')[0]}.${report.format}`;

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        alert(`Error downloading report: ${error.error}`);
      }
    } catch (error) {
      alert(`Error downloading report: ${error}`);
    }
  }

  async function loadRecentReports() {
    try {
      const response = await fetch('/api/reports/recent');
      const result = await response.json();
      
      if (result.success) {
        recentReports = result.data;
      }
    } catch (error) {
      console.error('Error loading recent reports:', error);
    }
  }

  async function loadLocations() {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      if (result.success) {
        locations = result.data;
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      locations = [];
    }
  }

  async function loadPlants() {
    try {
      const response = await fetch('/api/plants');
      const result = await response.json();
      if (result.success) {
        plants = result.data;
      }
    } catch (error) {
      console.error('Error loading plants:', error);
      plants = [];
    }
  }

  function selectReportType(reportId: string) {
    selectedReport = reportId;
    const report = reportTypes.find(r => r.id === reportId);
    if (report && !report.filters.includes('location')) {
      selectedLocation = '';
    }
    if (report && !report.filters.includes('plant')) {
      selectedPlant = '';
    }
  }

  function filterReportsByCategory(category: string) {
    selectedCategory = category;
    if (category === 'all') {
      filteredReportTypes = reportTypes;
    } else {
      filteredReportTypes = reportTypes.filter(report => report.category === category);
    }
    selectedReport = '';
  }

  function generateQuickReport(reportType: string, period: 'daily' | 'weekly' | 'monthly') {
    const today = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    dateRange.start = startDate.toISOString().split('T')[0];
    dateRange.end = today.toISOString().split('T')[0];
    selectedReport = reportType;
    generateReport();
  }

  onMount(() => {
    Promise.all([
      loadRecentReports(),
      loadLocations(),
      loadPlants()
    ]);
  });
</script>

<div class="space-y-6">

  <!-- Collapsible Explanation -->
  <div class="card-glass mb-8">
    <button 
      on:click={() => showExplanation = !showExplanation}
      class="flex items-center justify-between w-full text-left"
    >
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
          <DocumentTextIcon class="w-4 h-4 text-dark-petrol" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">Understanding Solar Production Reports</h3>
          <p class="text-sm text-soft-blue/80">Click to learn about report types and analytics capabilities</p>
        </div>
      </div>
      <div class="transform transition-transform duration-200 {showExplanation ? 'rotate-180' : 'rotate-0'}">
        <svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </button>
    
    {#if showExplanation}
      <div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-4 animate-slide-down">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Purpose Section -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
              <span>Analytics & Reporting</span>
            </h4>
            <p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
              The Reports module provides comprehensive analytics for solar power production, efficiency metrics, and financial performance.
              Generate detailed analysis of energy generation, forecast accuracy, and maintenance insights with automated data compilation.
            </p>
            <div class="bg-cyan/20 rounded-lg p-3 border border-cyan/30">
              <p class="text-xs text-soft-blue/70">
                <strong class="text-cyan">Real-time Analytics:</strong> All reports are generated from live production data 
                with automatic calculations, ensuring accuracy for decision-making and compliance.
              </p>
            </div>
          </div>

          <!-- Report Categories -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
              <span>Available Report Types</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Production Reports:</strong> Energy generation and capacity utilization</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Performance Reports:</strong> Panel efficiency and system optimization</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Analytics Reports:</strong> Forecast accuracy and weather impact analysis</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Maintenance Reports:</strong> System health and downtime tracking</p>
              </div>
            </div>
          </div>

          <!-- Report Features -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">3</span>
              <span>Report Features & Formats</span>
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-cyan"><strong>PDF Reports:</strong></span>
                <span class="text-soft-blue/80">Professional formatted documents</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Excel Export:</strong></span>
                <span class="text-soft-blue/80">Data analysis and manipulation</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>CSV Export:</strong></span>
                <span class="text-soft-blue/80">System integration and import</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Scheduled Reports:</strong></span>
                <span class="text-soft-blue/80">Automated daily/weekly/monthly</span>
              </div>
            </div>
          </div>

          <!-- Use Cases -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">4</span>
              <span>Business Applications</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Performance Monitoring:</strong> Track production efficiency KPIs</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Regulatory Compliance:</strong> Environmental and grid compliance reports</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Investment Analysis:</strong> ROI and financial performance metrics</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Maintenance Planning:</strong> Predictive maintenance scheduling</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Report Tools -->
        <div class="bg-teal-dark/30 rounded-xl p-4 border border-cyan/20">
          <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
            <ChartBarIcon class="w-4 h-4 text-cyan" />
            <span>Report Generation Tools</span>
          </h5>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div class="text-soft-blue/80">• <strong class="text-white">Custom Date Ranges:</strong> Flexible time period selection</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Location Filters:</strong> Specific location or consolidated views</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Format Options:</strong> PDF, Excel, CSV export formats</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Email Delivery:</strong> Automatic distribution to stakeholders</div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Report Categories Filter -->
  <div class="card-glass mb-6">
    <h2 class="text-xl font-semibold text-white mb-4">Report Categories</h2>
    <div class="flex flex-wrap gap-2">
      {#each reportCategories as category}
        <button
          on:click={() => filterReportsByCategory(category.id)}
          class="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 {
            selectedCategory === category.id 
              ? 'bg-cyan text-dark-petrol border-cyan' 
              : 'bg-transparent text-soft-blue border-cyan/30 hover:border-cyan/50 hover:bg-teal-dark/30'
          }"
        >
          <svelte:component this={category.icon} className="w-5 h-5" />
          <span class="text-sm font-medium">{category.name}</span>
          <span class="text-xs bg-dark-petrol px-2 py-1 rounded-full">
            {category.id === 'all' ? reportTypes.length : reportTypes.filter(r => r.category === category.id).length}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Report Generation Section -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Report Selection -->
    <div class="lg:col-span-2">
      <div class="card-glass">
        <h2 class="text-xl font-semibold text-white mb-4">Select Report Type</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each filteredReportTypes as report}
            <button
              on:click={() => selectReportType(report.id)}
              class="text-left p-4 rounded-lg border transition-all duration-200 {
                selectedReport === report.id 
                  ? 'bg-cyan/20 border-cyan shadow-lg shadow-cyan/20' 
                  : 'bg-teal-dark/30 border-cyan/30 hover:border-cyan/50 hover:bg-teal-dark/50'
              }"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-cyan/20 rounded-lg flex items-center justify-center">
                  <svelte:component this={report.icon} className="w-5 h-5 text-cyan" />
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-white mb-1">{report.name}</h3>
                  <p class="text-sm text-soft-blue">{report.description}</p>
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="text-xs bg-dark-petrol px-2 py-1 rounded-full text-cyan">{report.category}</span>
                    <div class="flex space-x-1">
                      {#each report.formats as format}
                        <span class="text-xs bg-teal-dark px-2 py-1 rounded text-soft-blue">{format.toUpperCase()}</span>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Report Configuration -->
    <div>
      <div class="card-glass">
        <h2 class="text-xl font-semibold text-white mb-4">Report Configuration</h2>
        
        <!-- Date Range -->
        <div class="space-y-4 mb-6">
          <div>
            <label for="start-date" class="label">Start Date</label>
            <input
              id="start-date"
              type="date"
              bind:value={dateRange.start}
              class="input"
            />
          </div>
          
          <div>
            <label for="end-date" class="label">End Date</label>
            <input
              id="end-date"
              type="date"
              bind:value={dateRange.end}
              class="input"
            />
          </div>
        </div>

        <!-- Location Filter -->
        {#if selectedReport && reportTypes.find(r => r.id === selectedReport)?.filters.includes('location')}
          <div class="mb-4">
            <label for="location" class="label">Location (Optional)</label>
            <select
              id="location"
              bind:value={selectedLocation}
              class="select"
            >
              <option value="">All Locations</option>
              {#each locations as location}
                <option value={location.id}>{location.name} - {location.city}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Plant Filter -->
        {#if selectedReport && reportTypes.find(r => r.id === selectedReport)?.filters.includes('plant')}
          <div class="mb-4">
            <label for="plant" class="label">Plant (Optional)</label>
            <select
              id="plant"
              bind:value={selectedPlant}
              class="select"
            >
              <option value="">All Plants</option>
              {#each plants as plant}
                <option value={plant.id}>{plant.name} - {plant.capacity} MW</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Format Selection -->
        {#if selectedReport}
          <div class="mb-6">
            <label class="label">Output Format</label>
            <div class="grid grid-cols-3 gap-2 mt-2">
              {#each reportTypes.find(r => r.id === selectedReport)?.formats || [] as format}
                <button
                  on:click={() => selectedFormat = format}
                  class="p-2 rounded-lg border text-sm transition-all duration-200 {
                    selectedFormat === format 
                      ? 'bg-cyan text-dark-petrol border-cyan' 
                      : 'bg-transparent text-soft-blue border-cyan/30 hover:border-cyan/50'
                  }"
                >
                  {format.toUpperCase()}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Generate Button -->
        <button
          on:click={generateReport}
          class="btn btn-primary w-full"
          disabled={!selectedReport || !dateRange.start || !dateRange.end || isLoading}
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-dark-petrol" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating {selectedFormat.toUpperCase()} Report...
          {:else}
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Generate {selectedFormat.toUpperCase()} Report
          {/if}
        </button>

        <!-- Selected Report Info -->
        {#if selectedReport}
          <div class="mt-4 p-3 bg-teal-dark/50 border border-cyan/30 rounded-lg">
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-6 h-6 bg-cyan/20 rounded flex items-center justify-center">
                <svelte:component this={reportTypes.find(r => r.id === selectedReport)?.icon} className="w-4 h-4 text-cyan" />
              </div>
              <span class="font-medium text-white">{reportTypes.find(r => r.id === selectedReport)?.name}</span>
            </div>
            <p class="text-sm text-soft-blue">
              {reportTypes.find(r => r.id === selectedReport)?.description}
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>


  <!-- Recent Reports -->
  <div class="card-glass">
    <h2 class="text-xl font-semibold text-white mb-4">Recent Reports</h2>
    
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Report Type</th>
            <th>Date Generated</th>
            <th>Status</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if recentReports.length === 0}
            <tr>
              <td colspan="5" class="text-center py-8 text-soft-blue/60">
                No recent reports available
              </td>
            </tr>
          {:else}
            {#each recentReports as report}
              <tr class="hover:bg-glass-white transition-colors">
                <td class="font-medium">{report.name}</td>
                <td>{report.displayDate}</td>
                <td>
                  <span class="{report.status === 'completed' ? 'status-active' : report.status === 'generating' ? 'status-warning' : 'status-critical'}">
                    {report.status === 'completed' ? 'Completed' : report.status === 'generating' ? 'Generating' : 'Failed'}
                  </span>
                </td>
                <td>{report.displayFileSize}</td>
                <td>
                  {#if report.status === 'completed'}
                    <button
                      on:click={() => downloadReport(report)}
                      class="text-cyan hover:text-soft-blue font-medium"
                    >
                      Download
                    </button>
                  {:else if report.status === 'generating'}
                    <span class="text-soft-blue">Processing...</span>
                  {:else}
                    <span class="text-alert-red">Failed</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="card-glass">
      <button 
        on:click={() => generateQuickReport('production-summary', 'daily')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Daily Production</h3>
            <p class="text-sm text-soft-blue">Generate daily production report</p>
          </div>
          <SunIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>
    
    <div class="card-glass">
      <button 
        on:click={() => generateQuickReport('efficiency-analysis', 'weekly')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Weekly Efficiency</h3>
            <p class="text-sm text-soft-blue">Generate weekly efficiency report</p>
          </div>
          <BoltIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>
    
    <div class="card-glass">
      <button 
        on:click={() => generateQuickReport('financial-summary', 'monthly')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Monthly Financial</h3>
            <p class="text-sm text-soft-blue">Generate monthly financial analysis</p>
          </div>
          <CurrencyDollarIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>

    <div class="card-glass">
      <button 
        on:click={() => generateQuickReport('compliance-report', 'monthly')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Compliance</h3>
            <p class="text-sm text-soft-blue">Generate compliance report</p>
          </div>
          <ShieldCheckIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>
  </div>
</div>