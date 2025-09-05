<script lang="ts">
  import { onMount } from 'svelte';
  import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
  import SunIcon from '$lib/components/icons/SunIcon.svelte';
  import BoltIcon from '$lib/components/icons/BoltIcon.svelte';
  import TrendingUpIcon from '$lib/components/icons/TrendingUpIcon.svelte';
  import ClockIcon from '$lib/components/icons/ClockIcon.svelte';
  import MapPinIcon from '$lib/components/icons/MapPinIcon.svelte';
  import CloudIcon from '$lib/components/icons/CloudIcon.svelte';
  import CogIcon from '$lib/components/icons/CogIcon.svelte';
  import CurrencyDollarIcon from '$lib/components/icons/CurrencyDollarIcon.svelte';
  import ShieldCheckIcon from '$lib/components/icons/ShieldCheckIcon.svelte';
  import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
  import MailIcon from '$lib/components/icons/MailIcon.svelte';

  let selectedReport = '';
  let selectedLocations: string[] = [];
  let selectedPlant = '';
  let selectedFormat = 'pdf';
  let selectedAggregation = '1h';
  let selectedTimezone = 'UTC';
  let locationDisplay = 'individual'; // 'individual' or 'aggregated'
  let showExplanation = false;
  let locations: any[] = [];
  let plants: any[] = [];
  let selectedScheduleReport = '';
  let scheduleFrequency = 'daily';
  let scheduleTime = '06:00';
  let scheduleStartDate = new Date().toISOString().split('T')[0];
  let emailList: string[] = [];
  let newEmail = '';
  let showScheduledReports = false;
  let showEmailConfig = false;
  let scheduledReports: any[] = [];
  let locationSearchQuery = '';
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
      filters: ['location', 'dateRange', 'aggregation', 'timezone']
    },
    {
      id: 'forecast-accuracy',
      name: 'Forecast Accuracy',
      description: 'Comparison of forecasted vs actual production',
      icon: TrendingUpIcon,
      category: 'Analytics',
      formats: ['pdf', 'excel'],
      filters: ['location', 'dateRange', 'aggregation', 'timezone']
    },
    {
      id: 'forecast-d1-d5',
      name: 'Forecast: D+1/+5',
      description: 'Short-term forecast for the next 1 to 5 days using historical forecasts from current month',
      icon: CloudIcon,
      category: 'Forecast',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'aggregation', 'timezone']
    },
    {
      id: 'forecast-monthly-continued',
      name: 'Forecast: Monthly Continued',
      description: 'Extended monthly forecast using historical data from month start to present, projecting next 5 days',
      icon: ClockIcon,
      category: 'Forecast',
      formats: ['pdf', 'excel', 'csv'],
      filters: ['location', 'aggregation', 'timezone']
    }
  ];

  const reportCategories = [
    { id: 'all', name: 'All Reports', icon: DocumentTextIcon },
    { id: 'Production', name: 'Production', icon: SunIcon },
    { id: 'Analytics', name: 'Analytics', icon: TrendingUpIcon },
    { id: 'Forecast', name: 'Forecast', icon: CloudIcon }
  ];

  const aggregationLevels = [
    { id: '15min', name: '15 Minutes', description: 'High resolution data points' },
    { id: '1h', name: '1 Hour', description: 'Hourly aggregated data' },
    { id: '1day', name: '1 Day', description: 'Daily aggregated data' },
    { id: '1week', name: '1 Week', description: 'Weekly aggregated data' },
    { id: '1month', name: '1 Month', description: 'Monthly aggregated data' }
  ];

  const timezones = [
    { id: 'UTC', name: 'UTC', description: 'Coordinated Universal Time' },
    { id: 'Europe/London', name: 'London (GMT/BST)', description: 'Greenwich Mean Time' },
    { id: 'Europe/Paris', name: 'Paris (CET/CEST)', description: 'Central European Time' },
    { id: 'Europe/Berlin', name: 'Berlin (CET/CEST)', description: 'Central European Time' },
    { id: 'Europe/Rome', name: 'Rome (CET/CEST)', description: 'Central European Time' },
    { id: 'Europe/Madrid', name: 'Madrid (CET/CEST)', description: 'Central European Time' },
    { id: 'Europe/Bucharest', name: 'Bucharest (EET/EEST)', description: 'Eastern European Time' },
    { id: 'America/New_York', name: 'New York (EST/EDT)', description: 'Eastern Time' },
    { id: 'America/Chicago', name: 'Chicago (CST/CDT)', description: 'Central Time' },
    { id: 'America/Denver', name: 'Denver (MST/MDT)', description: 'Mountain Time' },
    { id: 'America/Los_Angeles', name: 'Los Angeles (PST/PDT)', description: 'Pacific Time' },
    { id: 'Asia/Tokyo', name: 'Tokyo (JST)', description: 'Japan Standard Time' },
    { id: 'Asia/Shanghai', name: 'Shanghai (CST)', description: 'China Standard Time' },
    { id: 'Australia/Sydney', name: 'Sydney (AEST/AEDT)', description: 'Australian Eastern Time' }
  ];

  let selectedCategory = 'all';
  let filteredReportTypes = reportTypes;
  let recentReports: any[] = [];
  let isLoading = false;
  let shouldScheduleAfterGenerate = false;

  async function generateReport(options = { scheduleAfter: false }) {
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
          aggregation: selectedAggregation,
          timezone: selectedTimezone,
          locationIds: selectedLocations.length > 0 ? selectedLocations : null,
          locationDisplay: locationDisplay,
          plantId: selectedPlant || null,
          filters: {
            locations: selectedLocations,
            locationDisplay: locationDisplay,
            plant: selectedPlant,
            aggregation: selectedAggregation,
            timezone: selectedTimezone
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
      
      // If user wants to schedule the report after generating, trigger the schedule function
      if (options.scheduleAfter && scheduleFrequency && scheduleTime && scheduleStartDate) {
        await scheduleReport();
      }
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
          format: report.format,
          aggregation: report.aggregation || '1h',
          timezone: report.timezone || 'UTC'
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
      selectedLocations = [];
      locationSearchQuery = '';
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

  function addEmail() {
    if (newEmail.trim() && !emailList.includes(newEmail.trim())) {
      emailList = [...emailList, newEmail.trim()];
      newEmail = '';
    }
  }

  function removeEmail(email: string) {
    emailList = emailList.filter(e => e !== email);
  }

  function getScheduleDescription(): string {
    if (!scheduleStartDate || !scheduleTime || !scheduleFrequency) {
      return '';
    }

    const startDate = new Date(scheduleStartDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    switch (scheduleFrequency) {
      case 'daily':
        return `Daily at ${scheduleTime} starting ${startDate.toLocaleDateString()}`;
      case 'weekly':
        const dayName = dayNames[startDate.getDay()];
        return `Every ${dayName} at ${scheduleTime} starting ${startDate.toLocaleDateString()}`;
      case 'monthly':
        const dayOfMonth = startDate.getDate();
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
        return `Monthly on the ${dayOfMonth}${suffix} at ${scheduleTime} starting ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
      case 'quarterly':
        return `Quarterly on the ${startDate.getDate()} at ${scheduleTime} starting ${startDate.toLocaleDateString()}`;
      default:
        return '';
    }
  }

  async function saveEmailConfig() {
    try {
      const response = await fetch('/api/reports/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails: emailList })
      });

      if (response.ok) {
        alert('Email configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving email configuration: ${error.error}`);
      }
    } catch (error) {
      alert(`Error saving email configuration: ${error}`);
    }
  }

  async function scheduleReport() {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    if (!scheduleFrequency || !scheduleTime || !scheduleStartDate) {
      alert('Please configure all schedule settings (frequency, start date, and time)');
      return;
    }

    if (emailList.length === 0) {
      const confirmWithoutEmail = confirm('No email recipients configured. The scheduled report will be generated but not sent. Continue?');
      if (!confirmWithoutEmail) {
        return;
      }
    }

    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType: selectedReport,
          frequency: scheduleFrequency,
          time: scheduleTime,
          startDate: scheduleStartDate,
          format: selectedFormat,
          aggregation: selectedAggregation,
          timezone: selectedTimezone,
          locationIds: selectedLocations.length > 0 ? selectedLocations : null,
          locationDisplay: locationDisplay,
          plantId: selectedPlant || null,
          emails: emailList,
          scheduleDescription: getScheduleDescription()
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Report scheduled successfully! ${getScheduleDescription()}`);
        await loadScheduledReports();
      } else {
        const error = await response.json();
        alert(`Error scheduling report: ${error.error}`);
      }
    } catch (error) {
      alert(`Error scheduling report: ${error}`);
    }
  }

  async function loadScheduledReports() {
    try {
      const response = await fetch('/api/reports/scheduled');
      const result = await response.json();
      
      if (result.success) {
        scheduledReports = result.data;
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
    }
  }

  async function deleteScheduledReport(reportId: string) {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/scheduled/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Scheduled report deleted successfully!');
        await loadScheduledReports();
      } else {
        const error = await response.json();
        alert(`Error deleting scheduled report: ${error.error}`);
      }
    } catch (error) {
      alert(`Error deleting scheduled report: ${error}`);
    }
  }

  async function loadEmailConfig() {
    try {
      const response = await fetch('/api/reports/email-config');
      const result = await response.json();
      
      if (result.success) {
        emailList = result.data.emails || [];
      }
    } catch (error) {
      console.error('Error loading email configuration:', error);
    }
  }

  // Computed property to filter locations based on search query
  $: filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
    location.city.toLowerCase().includes(locationSearchQuery.toLowerCase())
  );

  onMount(() => {
    Promise.all([
      loadRecentReports(),
      loadLocations(),
      loadPlants(),
      loadScheduledReports(),
      loadEmailConfig()
    ]);
  });
</script>

<div class="space-y-6">

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        on:click={() => generateQuickReport('forecast-accuracy', 'weekly')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Weekly Forecast Accuracy</h3>
            <p class="text-sm text-soft-blue">Generate weekly forecast analysis</p>
          </div>
          <TrendingUpIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>

    <div class="card-glass">
      <button 
        on:click={() => selectReportType('forecast-d1-d5')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">D+1/+5 Forecast</h3>
            <p class="text-sm text-soft-blue">Next 5 days forecast report</p>
          </div>
          <CloudIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>

    <div class="card-glass">
      <button 
        on:click={() => selectReportType('forecast-monthly-continued')}
        class="w-full text-left"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Monthly Continued</h3>
            <p class="text-sm text-soft-blue">Extended monthly forecast</p>
          </div>
          <ClockIcon className="w-6 h-6 text-cyan" />
        </div>
      </button>
    </div>
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
  <div class="space-y-6 mb-6">
    <!-- Report Selection -->
    <div class="card-glass">
      <h2 class="text-xl font-semibold text-white mb-4">Select Report Type</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

    <!-- Report Configuration -->
    {#if selectedReport}
      <div class="card-glass">
        <h2 class="text-xl font-semibold text-white mb-4">Report Configuration</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Configuration Form -->
          <div class="space-y-4">
            <!-- Date Range -->
            <div class="space-y-4">
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
            {#if reportTypes.find(r => r.id === selectedReport)?.filters.includes('location')}
              <div>
                <label class="label">Locations</label>
                <div class="space-y-3">
                  <!-- Search Input -->
                  <div>
                    <input
                      type="text"
                      bind:value={locationSearchQuery}
                      placeholder="Search locations..."
                      class="input text-sm"
                    />
                  </div>
                  
                  <!-- Select All/None Controls -->
                  <div class="flex items-center justify-between">
                    <div class="flex space-x-2">
                      <button
                        type="button"
                        on:click={() => selectedLocations = filteredLocations.map(l => l.id)}
                        class="text-xs text-cyan hover:text-soft-blue font-medium"
                      >
                        Select All {locationSearchQuery ? 'Filtered' : ''}
                      </button>
                      <span class="text-xs text-soft-blue/50">•</span>
                      <button
                        type="button"
                        on:click={() => selectedLocations = []}
                        class="text-xs text-cyan hover:text-soft-blue font-medium"
                      >
                        Select None
                      </button>
                    </div>
                    <div class="text-xs text-soft-blue/70">
                      {selectedLocations.length} of {locations.length} selected
                      {#if locationSearchQuery && filteredLocations.length < locations.length}
                        ({filteredLocations.length} shown)
                      {/if}
                    </div>
                  </div>
                  
                  <!-- Location Checkboxes -->
                  <div class="bg-teal-dark/30 border border-cyan/20 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    {#if locations.length === 0}
                      <div class="text-center text-soft-blue/60 py-4">
                        No locations available
                      </div>
                    {:else if filteredLocations.length === 0}
                      <div class="text-center text-soft-blue/60 py-4">
                        <div class="text-sm">No locations match "{locationSearchQuery}"</div>
                        <button
                          type="button"
                          on:click={() => locationSearchQuery = ''}
                          class="text-xs text-cyan hover:text-soft-blue font-medium mt-2"
                        >
                          Clear search
                        </button>
                      </div>
                    {:else}
                      <div class="space-y-2">
                        {#each filteredLocations as location}
                          <label class="flex items-center space-x-3 cursor-pointer hover:bg-cyan/10 rounded p-2 transition-colors">
                            <input
                              type="checkbox"
                              bind:group={selectedLocations}
                              value={location.id}
                              class="custom-checkbox"
                            />
                            <div class="flex-1">
                              <div class="text-white text-sm font-medium">{location.name}</div>
                              <div class="text-soft-blue/70 text-xs">{location.city}</div>
                            </div>
                          </label>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Selected Locations Summary -->
                  <div class="text-xs text-soft-blue/70">
                    {#if selectedLocations.length === 0}
                      No locations selected - report will include all locations
                    {:else if selectedLocations.length === 1}
                      Report will include 1 location: 
                      <span class="text-white font-medium">
                        {locations.find(l => l.id === selectedLocations[0])?.name}
                      </span>
                    {:else if selectedLocations.length <= 3}
                      Report will include {selectedLocations.length} locations: 
                      <span class="text-white font-medium">
                        {selectedLocations.map(id => locations.find(l => l.id === id)?.name).join(', ')}
                      </span>
                    {:else}
                      Report will include {selectedLocations.length} locations: 
                      <span class="text-white font-medium">
                        {selectedLocations.slice(0, 2).map(id => locations.find(l => l.id === id)?.name).join(', ')} 
                        and {selectedLocations.length - 2} more
                      </span>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Location Display Option -->
              {#if selectedLocations.length > 1}
                <div>
                  <label class="label">Location Display</label>
                  <div class="grid grid-cols-2 gap-2 mt-2">
                    <button
                      on:click={() => locationDisplay = 'individual'}
                      class="p-2 rounded-lg border text-sm transition-all duration-200 {
                        locationDisplay === 'individual' 
                          ? 'bg-cyan text-dark-petrol border-cyan' 
                          : 'bg-transparent text-soft-blue border-cyan/30 hover:border-cyan/50'
                      }"
                    >
                      Individual
                    </button>
                    <button
                      on:click={() => locationDisplay = 'aggregated'}
                      class="p-2 rounded-lg border text-sm transition-all duration-200 {
                        locationDisplay === 'aggregated' 
                          ? 'bg-cyan text-dark-petrol border-cyan' 
                          : 'bg-transparent text-soft-blue border-cyan/30 hover:border-cyan/50'
                      }"
                    >
                      Aggregated
                    </button>
                  </div>
                  <div class="text-xs text-soft-blue/70 mt-2">
                    Individual: Show separate data for each location. Aggregated: Combine all locations into summary.
                  </div>
                </div>
              {/if}
            {/if}

            <!-- Plant Filter -->
            {#if reportTypes.find(r => r.id === selectedReport)?.filters.includes('plant')}
              <div>
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

            <!-- Aggregation Level -->
            {#if reportTypes.find(r => r.id === selectedReport)?.filters.includes('aggregation')}
              <div>
                <label for="aggregation" class="label">Data Aggregation</label>
                <select
                  id="aggregation"
                  bind:value={selectedAggregation}
                  class="select"
                >
                  {#each aggregationLevels as level}
                    <option value={level.id}>{level.name} - {level.description}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Timezone -->
            {#if reportTypes.find(r => r.id === selectedReport)?.filters.includes('timezone')}
              <div>
                <label for="timezone" class="label">Timezone</label>
                <select
                  id="timezone"
                  bind:value={selectedTimezone}
                  class="select"
                >
                  {#each timezones as timezone}
                    <option value={timezone.id}>{timezone.name} - {timezone.description}</option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>

          <!-- Output and Actions -->
          <div class="space-y-4">

            <!-- Format Selection -->
            <div>
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
            <!-- Generate Buttons -->
            <div class="space-y-2">
              <button
                on:click={() => generateReport()}
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
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Generate Report
                {/if}
              </button>
              
              {#if scheduleFrequency && scheduleTime && scheduleStartDate}
                <button
                  on:click={() => generateReport({ scheduleAfter: true })}
                  class="btn btn-secondary w-full text-sm"
                  disabled={!selectedReport || !dateRange.start || !dateRange.end || isLoading}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Generate & Schedule
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Selected Report Info -->
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
      </div>
    {/if}
  </div>

  <!-- Scheduled Reports Section -->
  <div class="card-glass">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-white flex items-center space-x-2">
        <CalendarIcon className="w-6 h-6 text-cyan" />
        <span>Scheduled Reports</span>
      </h2>
      <button
        on:click={() => showScheduledReports = !showScheduledReports}
        class="text-cyan hover:text-soft-blue font-medium"
      >
        {showScheduledReports ? 'Hide' : 'Show'} Schedule
      </button>
    </div>

    {#if showScheduledReports}
      <div class="space-y-6">
        <!-- Schedule New Report -->
        {#if selectedReport}
          <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
            <h3 class="text-lg font-semibold text-white mb-4">Schedule Current Report</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label for="schedule-frequency" class="label">Frequency</label>
                <select
                  id="schedule-frequency"
                  bind:value={scheduleFrequency}
                  class="select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              
              <div>
                <label for="schedule-start-date" class="label">Start Date</label>
                <input
                  id="schedule-start-date"
                  type="date"
                  bind:value={scheduleStartDate}
                  class="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label for="schedule-time" class="label">Time</label>
                <input
                  id="schedule-time"
                  type="time"
                  bind:value={scheduleTime}
                  class="input"
                />
              </div>
              
              <div class="flex items-end">
                <button
                  on:click={scheduleReport}
                  class="btn btn-primary w-full"
                  disabled={!selectedReport || !scheduleFrequency || !scheduleTime || !scheduleStartDate}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Report
                </button>
              </div>
            </div>
            
            <div class="mt-3 p-3 bg-cyan/10 rounded-lg border border-cyan/30">
              <p class="text-sm text-soft-blue">
                <strong class="text-white">Current Selection:</strong> {reportTypes.find(r => r.id === selectedReport)?.name}
              </p>
              {#if getScheduleDescription()}
                <p class="text-sm text-soft-blue mt-1">
                  <strong class="text-white">Schedule:</strong> {getScheduleDescription()}
                </p>
              {/if}
              <p class="text-sm text-soft-blue mt-1">
                {#if emailList.length > 0}
                  <strong class="text-white">Recipients:</strong> {emailList.length} email{emailList.length !== 1 ? 's' : ''} configured
                {:else}
                  <strong class="text-alert-orange">Warning:</strong> No email recipients configured
                {/if}
              </p>
            </div>
          </div>
        {:else}
          <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20 text-center">
            <p class="text-soft-blue">Select a report type above to schedule it</p>
          </div>
        {/if}

        <!-- Active Scheduled Reports -->
        <div>
          <h3 class="text-lg font-semibold text-white mb-4">Active Scheduled Reports</h3>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Report Type</th>
                  <th>Schedule</th>
                  <th>Next Run</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#if scheduledReports.length === 0}
                  <tr>
                    <td colspan="6" class="text-center py-8 text-soft-blue/60">
                      No scheduled reports configured
                    </td>
                  </tr>
                {:else}
                  {#each scheduledReports as report}
                    <tr class="hover:bg-glass-white transition-colors">
                      <td class="font-medium">{report.name}</td>
                      <td>
                        <div class="text-sm">
                          <div class="font-medium text-white">{report.scheduleDescription || `${report.frequency} at ${report.time}`}</div>
                          {#if report.startDate}
                            <div class="text-soft-blue/70">Started: {new Date(report.startDate).toLocaleDateString()}</div>
                          {/if}
                        </div>
                      </td>
                      <td>{report.nextRun}</td>
                      <td>{report.recipientCount} recipients</td>
                      <td>
                        <span class="status-active">Active</span>
                      </td>
                      <td>
                        <button
                          on:click={() => deleteScheduledReport(report.id)}
                          class="text-alert-red hover:text-alert-orange font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Email Service Configuration Section -->
  <div class="card-glass">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-white flex items-center space-x-2">
        <MailIcon className="w-6 h-6 text-cyan" />
        <span>E-mail Service Configuration</span>
      </h2>
      <button
        on:click={() => showEmailConfig = !showEmailConfig}
        class="text-cyan hover:text-soft-blue font-medium"
      >
        {showEmailConfig ? 'Hide' : 'Show'} Config
      </button>
    </div>

    {#if showEmailConfig}
      <div class="space-y-6">
        <!-- Add New Email -->
        <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
          <h3 class="text-lg font-semibold text-white mb-4">Manage Email Recipients</h3>
          <div class="flex gap-2">
            <input
              type="email"
              bind:value={newEmail}
              placeholder="Enter email address"
              class="input flex-1"
              on:keypress={(e) => e.key === 'Enter' && addEmail()}
            />
            <button
              on:click={addEmail}
              class="btn btn-primary"
              disabled={!newEmail.trim()}
            >
              Add Email
            </button>
          </div>
        </div>

        <!-- Email List -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">
              Configured Recipients ({emailList.length})
            </h3>
            {#if emailList.length > 0}
              <button
                on:click={saveEmailConfig}
                class="btn btn-success"
              >
                Save Configuration
              </button>
            {/if}
          </div>
          
          {#if emailList.length === 0}
            <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20 text-center">
              <p class="text-soft-blue">No email recipients configured</p>
              <p class="text-sm text-soft-blue/70 mt-2">Add email addresses above to receive scheduled reports</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {#each emailList as email}
                <div class="flex items-center justify-between bg-teal-dark/30 border border-cyan/20 rounded-lg p-3">
                  <span class="text-white text-sm">{email}</span>
                  <button
                    on:click={() => removeEmail(email)}
                    class="text-alert-red hover:text-alert-orange"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Email Service Status -->
        <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
          <h3 class="text-lg font-semibold text-white mb-3">Service Status</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-cyan rounded-full"></div>
                <span class="text-white font-medium">Email Service</span>
              </div>
              <p class="text-sm text-soft-blue/80 mt-1">Active and ready to send reports</p>
            </div>
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-cyan rounded-full"></div>
                <span class="text-white font-medium">SMTP Configuration</span>
              </div>
              <p class="text-sm text-soft-blue/80 mt-1">Configured and validated</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
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

  <!-- Understanding Solar Production Reports -->
  <div class="card-glass">
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
      <div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-6 animate-slide-down">
        <!-- Introduction Section -->
        <div class="bg-gradient-to-br from-teal-dark/40 to-dark-petrol/60 rounded-xl p-6 border border-cyan/20">
          <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
            <div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
              <TrendingUpIcon class="w-4 h-4 text-cyan" />
            </div>
            <span>Advanced Solar Analytics Platform</span>
          </h4>
          <p class="text-sm text-soft-blue/80 leading-relaxed mb-4">
            The Solar Production Reports module represents a comprehensive analytics platform designed for professional solar energy management.
            Our system processes real-time production data, weather correlations, and predictive models to deliver actionable insights 
            for operational optimization, financial planning, and grid integration strategies.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <p class="text-xs text-soft-blue/70">
                <strong class="text-cyan">Data Processing:</strong> Real-time ingestion and processing of production data from multiple 
                locations with sub-15-minute granularity, ensuring immediate availability for decision-making.
              </p>
            </div>
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <p class="text-xs text-soft-blue/70">
                <strong class="text-cyan">Predictive Analytics:</strong> Advanced forecasting models combining historical patterns, 
                weather data, and machine learning algorithms for accurate 5-day production predictions.
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Report Types Section -->
          <div class="lg:col-span-2">
            <h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
              <div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
                <DocumentTextIcon class="w-4 h-4 text-cyan" />
              </div>
              <span>Comprehensive Report Categories</span>
            </h4>
            
            <div class="space-y-4">
              <!-- Production Reports -->
              <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
                <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                  <SunIcon class="w-4 h-4 text-cyan" />
                  <span>Production Analytics</span>
                </h5>
                <p class="text-sm text-soft-blue/80 mb-3">
                  <strong class="text-white">Production Summary:</strong> Comprehensive analysis of solar power generation including capacity utilization rates, 
                  energy yield per installed MW, performance ratios, and comparative analysis across time periods and locations.
                </p>
                <div class="text-xs text-soft-blue/70 space-y-1">
                  <div>• Real-time and historical production tracking with sub-15-minute resolution</div>
                  <div>• Capacity factor calculations and performance benchmarking</div>
                  <div>• Weather correlation analysis and irradiance impact assessment</div>
                </div>
              </div>

              <!-- Analytics Reports -->
              <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
                <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                  <TrendingUpIcon class="w-4 h-4 text-cyan" />
                  <span>Forecast Analytics</span>
                </h5>
                <p class="text-sm text-soft-blue/80 mb-3">
                  <strong class="text-white">Forecast Accuracy:</strong> Statistical analysis comparing predicted versus actual production with detailed 
                  accuracy metrics including MAPE, RMSE, and confidence intervals for model validation and improvement.
                </p>
                <div class="text-xs text-soft-blue/70 space-y-1">
                  <div>• Prediction model performance evaluation with confidence bands</div>
                  <div>• Bias analysis and seasonal accuracy patterns</div>
                  <div>• Model improvement recommendations based on historical performance</div>
                </div>
              </div>

              <!-- Forecast Reports -->
              <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
                <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                  <CloudIcon class="w-4 h-4 text-cyan" />
                  <span>Advanced Forecasting</span>
                </h5>
                <div class="space-y-2 text-sm text-soft-blue/80">
                  <p><strong class="text-white">D+1/+5 Forecast:</strong> High-precision short-term forecasting using ensemble models 
                  combining historical patterns from current month with real-time weather data for next 1-5 days.</p>
                  <p><strong class="text-white">Monthly Continued:</strong> Extended forecast analysis leveraging complete monthly 
                  historical data patterns, seasonal adjustments, and meteorological forecasts for strategic planning.</p>
                </div>
                <div class="text-xs text-soft-blue/70 space-y-1 mt-3">
                  <div>• Machine learning ensemble models with multiple forecast horizons</div>
                  <div>• Weather-dependent production scenarios with confidence intervals</div>
                  <div>• Grid integration planning and energy trading optimization</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration Options -->
          <div>
            <h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
              <div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
                <CogIcon class="w-4 h-4 text-cyan" />
              </div>
              <span>Advanced Configuration</span>
            </h4>

            <!-- Data Aggregation -->
            <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20 mb-4">
              <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                <ClockIcon class="w-4 h-4 text-cyan" />
                <span>Temporal Aggregation</span>
              </h5>
              <div class="space-y-2 text-xs text-soft-blue/70">
                <div><strong class="text-cyan">15 Minutes:</strong> High-resolution analysis for intraday patterns and grid balancing</div>
                <div><strong class="text-cyan">1 Hour:</strong> Standard resolution for operational monitoring and trading</div>
                <div><strong class="text-cyan">1 Day:</strong> Daily performance summaries and trend analysis</div>
                <div><strong class="text-cyan">1 Week:</strong> Weekly patterns and maintenance impact assessment</div>
                <div><strong class="text-cyan">1 Month:</strong> Strategic planning and long-term performance evaluation</div>
              </div>
            </div>

            <!-- Location Management -->
            <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20 mb-4">
              <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                <MapPinIcon class="w-4 h-4 text-cyan" />
                <span>Multi-Location Analysis</span>
              </h5>
              <div class="space-y-2 text-xs text-soft-blue/70">
                <div><strong class="text-cyan">Individual View:</strong> Separate analysis for each location with comparative metrics</div>
                <div><strong class="text-cyan">Aggregated View:</strong> Portfolio-level analysis with consolidated performance</div>
                <div><strong class="text-cyan">Multi-Select:</strong> Choose specific locations for targeted analysis</div>
              </div>
            </div>

            <!-- Global Timezone Support -->
            <div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
              <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
                <CloudIcon class="w-4 h-4 text-cyan" />
                <span>Global Timezone Support</span>
              </h5>
              <div class="space-y-1 text-xs text-soft-blue/70">
                <div>• 14+ major global timezones</div>
                <div>• Automatic DST adjustments</div>
                <div>• Local time correlation with solar noon</div>
                <div>• Multi-region portfolio management</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Business Applications -->
        <div class="bg-gradient-to-r from-dark-petrol/60 to-teal-dark/40 rounded-xl p-6 border border-cyan/20">
          <h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
            <div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
              <BoltIcon class="w-4 h-4 text-cyan" />
            </div>
            <span>Professional Applications & Use Cases</span>
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <h6 class="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                <CogIcon class="w-3 h-3 text-cyan" />
                <span>Operations Management</span>
              </h6>
              <ul class="text-xs text-soft-blue/70 space-y-1">
                <li>• Real-time performance monitoring</li>
                <li>• Anomaly detection and alerting</li>
                <li>• Maintenance scheduling optimization</li>
                <li>• Downtime impact analysis</li>
              </ul>
            </div>
            
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <h6 class="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                <CurrencyDollarIcon class="w-3 h-3 text-cyan" />
                <span>Financial Planning</span>
              </h6>
              <ul class="text-xs text-soft-blue/70 space-y-1">
                <li>• Revenue forecasting and budgeting</li>
                <li>• Investment ROI analysis</li>
                <li>• Power purchase agreement validation</li>
                <li>• Insurance claim documentation</li>
              </ul>
            </div>
            
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <h6 class="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                <BoltIcon class="w-3 h-3 text-cyan" />
                <span>Grid Integration</span>
              </h6>
              <ul class="text-xs text-soft-blue/70 space-y-1">
                <li>• Energy trading optimization</li>
                <li>• Grid balancing contributions</li>
                <li>• Curtailment impact analysis</li>
                <li>• Ancillary services planning</li>
              </ul>
            </div>
            
            <div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
              <h6 class="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                <ShieldCheckIcon class="w-3 h-3 text-cyan" />
                <span>Regulatory Compliance</span>
              </h6>
              <ul class="text-xs text-soft-blue/70 space-y-1">
                <li>• Environmental impact reporting</li>
                <li>• Grid code compliance verification</li>
                <li>• Renewable energy certificates</li>
                <li>• Audit trail documentation</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Technical Features -->
        <div class="bg-teal-dark/30 rounded-xl p-6 border border-cyan/20">
          <h4 class="font-medium text-white mb-4 flex items-center space-x-2">
            <CogIcon class="w-5 h-5 text-cyan" />
            <span>Advanced Technical Features</span>
          </h4>
          
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">Export Formats</div>
              <div class="text-soft-blue/80 text-xs">PDF, Excel, CSV with custom templates</div>
            </div>
            
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">Data Resolution</div>
              <div class="text-soft-blue/80 text-xs">15-minute to monthly aggregation</div>
            </div>
            
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">Multi-Location</div>
              <div class="text-soft-blue/80 text-xs">Individual or aggregated views</div>
            </div>
            
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">Global Timezones</div>
              <div class="text-soft-blue/80 text-xs">14+ timezones with DST support</div>
            </div>
            
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">Real-time Data</div>
              <div class="text-soft-blue/80 text-xs">Live production monitoring</div>
            </div>
            
            <div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
              <div class="text-cyan font-medium mb-1">API Integration</div>
              <div class="text-soft-blue/80 text-xs">Automated report scheduling</div>
            </div>
          </div>
        </div>

        <!-- Best Practices -->
        <div class="bg-gradient-to-br from-cyan/10 to-teal-dark/30 rounded-xl p-6 border border-cyan/20">
          <h4 class="font-medium text-white mb-4 flex items-center space-x-2">
            <DocumentTextIcon class="w-5 h-5 text-cyan" />
            <span>Report Generation Best Practices</span>
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 class="text-white font-medium mb-2">Optimal Configuration</h5>
              <ul class="text-sm text-soft-blue/80 space-y-2">
                <li>• Use 15-minute aggregation for operational analysis and grid services</li>
                <li>• Select hourly data for energy trading and revenue optimization</li>
                <li>• Choose daily aggregation for performance trending and maintenance planning</li>
                <li>• Apply weekly/monthly views for strategic planning and stakeholder reporting</li>
              </ul>
            </div>
            
            <div>
              <h5 class="text-white font-medium mb-2">Location Strategy</h5>
              <ul class="text-sm text-soft-blue/80 space-y-2">
                <li>• Individual view: Compare performance across different geographic locations</li>
                <li>• Aggregated view: Portfolio-level analysis for consolidated reporting</li>
                <li>• Multi-select: Focus on specific regional clusters or asset groups</li>
                <li>• Timezone alignment: Ensure local time correlation for accurate analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

</div>