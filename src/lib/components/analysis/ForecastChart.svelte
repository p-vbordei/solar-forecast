<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  
  export let data: any[] = [];
  export let interval: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  export let showConfidenceBands = true;
  export let showActual = false;
  export let height = 400;
  export let isMockData = false;
  
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
    const forecast = data.map(d => d.forecast);
    const actual = showActual ? data.map(d => d.actual) : [];
    const upperBound = showConfidenceBands ? data.map(d => d.confidence_upper) : [];
    const lowerBound = showConfidenceBands ? data.map(d => d.confidence_lower) : [];
    
    const series: any[] = [];
    
    // Add confidence bands
    if (showConfidenceBands) {
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
    
    // Add forecast line
    series.push({
      name: 'Forecast',
      type: 'line',
      data: forecast,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: '#0FA4AF'
      },
      lineStyle: {
        width: 3,
        type: showActual ? 'dashed' : 'solid'
      },
      emphasis: {
        focus: 'series'
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
          
          params.forEach((param: any) => {
            if (param.seriesName === 'Forecast' || param.seriesName === 'Actual') {
              const value = param.value;
              const unit = ' MW';
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
                Range: ${lowerBound[idx].toFixed(2)} - ${upperBound[idx].toFixed(2)} MW
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
        name: 'Power Output (MW)',
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
</script>

<div 
  bind:this={chartContainer}
  style="height: {height}px; width: 100%;"
  class="rounded-lg"
/>