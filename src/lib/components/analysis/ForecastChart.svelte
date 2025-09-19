<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  export let data: any[] = [];
  export let interval: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  export let showConfidenceBands = true;
  export let showActual = false;
  export let height = 400;
  export let isMockData = false;
  export let displayMode: 'power' | 'energy' = 'power';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  
  function initChart() {
    if (!chartContainer) return;
    
    chart = echarts.init(chartContainer);
    updateChart();
  }
  
  function updateChart() {
    if (!chart || !data || data.length === 0) return;

    const timestamps = data.map(d => d.timestamp);

    // Choose between power (MW) and energy (MWh) based on display mode
    const forecast = displayMode === 'power'
      ? data.map(d => d.forecast)
      : data.map(d => d.energy || 0);

    const actual = showActual
      ? (displayMode === 'power'
        ? data.map(d => d.actual)
        : data.map(d => d.actual_energy || 0))
      : [];

    // For confidence bands, use the proper energy confidence if available
    // Otherwise calculate from power confidence bands
    const upperBound = showConfidenceBands
      ? (displayMode === 'power'
        ? data.map(d => d.confidence_upper || d.forecast)
        : data.map(d => {
            // For energy display, calculate energy confidence from power confidence
            if (d.energy_confidence_upper !== undefined) {
              return d.energy_confidence_upper;
            }
            // If not available, calculate from power confidence
            const upperPower = d.confidence_upper || d.forecast;
            const scaleFactor = getEnergyScaleFactor(interval);
            return upperPower * scaleFactor;
          }))
      : [];

    const lowerBound = showConfidenceBands
      ? (displayMode === 'power'
        ? data.map(d => d.confidence_lower || d.forecast)
        : data.map(d => {
            if (d.energy_confidence_lower !== undefined) {
              return d.energy_confidence_lower;
            }
            const lowerPower = d.confidence_lower || d.forecast;
            const scaleFactor = getEnergyScaleFactor(interval);
            return lowerPower * scaleFactor;
          }))
      : [];

    // Helper function to get energy scale factor
    function getEnergyScaleFactor(interval: string): number {
      switch (interval) {
        case '15min': return 0.25;  // 15 minutes = 0.25 hours
        case 'hourly': return 1;     // 1 hour
        case 'daily': return 24;     // 24 hours for single day reading
        case 'weekly': return 168;   // 168 hours for single week reading
        default: return 1;
      }
    }
    
    const series: any[] = [];
    
    // Add confidence bands (only show for line charts, not bar charts)
    if (showConfidenceBands && displayMode === 'power') {
      series.push({
        name: 'Confidence Range',
        type: 'line',
        data: upperBound,
        lineStyle: { opacity: 0 },
        stack: 'confidence',
        symbol: 'none',
        areaStyle: {
          color: 'rgba(15, 164, 175, 0.1)'
        },
        silent: true
      });

      series.push({
        name: 'Lower Bound',
        type: 'line',
        data: lowerBound,
        lineStyle: { opacity: 0 },
        stack: 'confidence',
        stackStrategy: 'positive',
        symbol: 'none',
        areaStyle: {
          color: '#003135'
        },
        silent: true
      });
    }
    
    // Add forecast - bar chart for energy, line chart for power
    series.push({
      name: 'Forecast',
      type: displayMode === 'energy' ? 'bar' : 'line',
      data: forecast,
      smooth: displayMode === 'power' ? true : false,
      symbol: displayMode === 'power' ? 'circle' : 'none',
      symbolSize: 6,
      itemStyle: {
        color: displayMode === 'energy'
          ? 'rgba(15, 164, 175, 0.8)'  // Semi-transparent cyan for bars
          : '#0FA4AF'  // Solid cyan for line
      },
      lineStyle: displayMode === 'power' ? {
        width: 3,
        type: showActual ? 'dashed' : 'solid'
      } : undefined,
      barWidth: '60%',
      emphasis: {
        focus: 'series',
        itemStyle: displayMode === 'energy' ? {
          color: 'rgba(15, 164, 175, 1)'  // Full opacity on hover
        } : undefined
      }
    });
    
    // Add actual line if available
    if (showActual && actual.some(v => v !== null && v !== undefined)) {
      series.push({
        name: 'Actual',
        type: 'line',
        data: actual,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#AFDDE5'
        },
        lineStyle: {
          width: 3
        },
        emphasis: {
          focus: 'series'
        }
      });
    }
    
    const option = {
      backgroundColor: 'transparent',
      graphic: isMockData ? [{
        type: 'group',
        right: 20,
        top: 20,
        children: [{
          type: 'rect',
          shape: {
            width: 100,
            height: 28
          },
          style: {
            fill: 'rgba(234, 88, 12, 0.2)',
            stroke: 'rgba(234, 88, 12, 0.5)',
            lineWidth: 1
          }
        }, {
          type: 'text',
          style: {
            text: '⚠️ Mock Data',
            font: '12px sans-serif',
            fill: '#EA580C',
            x: 50,
            y: 14,
            textAlign: 'center',
            textVerticalAlign: 'middle'
          }
        }]
      }] : [],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#024950'
          }
        },
        backgroundColor: 'rgba(2, 73, 80, 0.95)',
        borderColor: '#0FA4AF',
        textStyle: {
          color: '#AFDDE5'
        },
        formatter: (params: any) => {
          let html = `<div style="font-weight: 600; margin-bottom: 4px; color: #AFDDE5">${params[0].axisValue}</div>`;

          const unit = displayMode === 'power' ? ' MW' : ' MWh';

          params.forEach((param: any) => {
            if (param.seriesName === 'Forecast' || param.seriesName === 'Actual') {
              const value = param.value;
              html += `<div style="margin: 2px 0; color: #AFDDE5">
                ${param.marker} ${param.seriesName}:
                <strong style="color: #0FA4AF">${value?.toFixed(2) || 'N/A'}${unit}</strong>
              </div>`;
            }
          });

          if (showConfidenceBands && params[0]?.dataIndex !== undefined) {
            const idx = params[0].dataIndex;
            if (upperBound[idx] && lowerBound[idx]) {
              html += `<div style="margin: 2px 0; color: #AFDDE5; opacity: 0.8">
                Range: ${lowerBound[idx].toFixed(2)} - ${upperBound[idx].toFixed(2)}${unit}
              </div>`;
            }
          }

          return html;
        }
      },
      legend: {
        data: series.filter(s => !s.silent).map(s => s.name),
        bottom: 0,
        textStyle: {
          color: '#AFDDE5'
        },
        inactiveColor: '#024950'
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '15%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#0FA4AF'
          }
        },
        axisLabel: {
          color: '#AFDDE5',
          formatter: (value: string) => {
            const date = new Date(value);
            if (interval === 'weekly') {
              return `Week ${Math.ceil(date.getDate() / 7)}`;
            } else if (interval === 'daily') {
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (interval === 'hourly') {
              return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else {
              return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
          },
          rotate: 45
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: displayMode === 'power' ? 'Power Output (MW)' : 'Energy (MWh)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#AFDDE5',
          fontSize: 14
        },
        axisLine: {
          lineStyle: {
            color: '#0FA4AF'
          }
        },
        axisLabel: {
          color: '#AFDDE5'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(175, 221, 229, 0.1)',
            type: 'dashed'
          }
        }
      },
      series: series,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          filterMode: 'none'
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 40,
          backgroundColor: 'rgba(2, 73, 80, 0.3)',
          fillerColor: 'rgba(15, 164, 175, 0.3)',
          borderColor: '#0FA4AF',
          handleStyle: {
            color: '#0FA4AF'
          },
          textStyle: {
            color: '#AFDDE5'
          },
          filterMode: 'none'
        }
      ]
    };
    
    chart.setOption(option);
  }
  
  function handleResize() {
    chart?.resize();
  }
  
  onMount(() => {
    initChart();
    window.addEventListener('resize', handleResize);
  });
  
  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
    chart?.dispose();
  });
  
  $: if (chart && data) {
    updateChart();
  }

  $: if (chart && displayMode) {
    updateChart();
  }
</script>

<div 
  bind:this={chartContainer}
  style="height: {height}px; width: 100%;"
  class="rounded-lg"
/>