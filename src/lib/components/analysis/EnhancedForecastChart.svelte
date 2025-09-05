<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  
  export let data: any[] = [];
  export let weatherData: any[] = [];
  export let historicalData: any[] = [];
  export let interval: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  export let showConfidenceBands = true;
  export let showActual = false;
  export let showWeather = false;
  export let showHistorical = false;
  export let showMeasured = false;
  export let chartType: 'production' | 'weather' | 'comparison' = 'production';
  export let height = 400;
  
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
    let option: any = {};
    
    if (chartType === 'production') {
      option = createProductionChart(timestamps);
    } else if (chartType === 'weather') {
      option = createWeatherChart(timestamps);
    } else if (chartType === 'comparison') {
      option = createComparisonChart(timestamps);
    }
    
    chart.setOption(option, true);
  }
  
  function createProductionChart(timestamps: string[]) {
    const forecast = data.map(d => d.forecast);
    const actual = showActual ? data.map(d => d.actual) : [];
    const measured = showMeasured ? data.map(d => d.measured) : [];
    const upperBound = showConfidenceBands ? data.map(d => d.confidence_upper) : [];
    const lowerBound = showConfidenceBands ? data.map(d => d.confidence_lower) : [];
    const historical = showHistorical && historicalData.length > 0 
      ? historicalData.map(d => d.production) : [];
    
    const series: any[] = [];
    
    // Add confidence bands
    if (showConfidenceBands && upperBound.length > 0 && lowerBound.length > 0) {
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
    
    // Add historical data
    if (showHistorical && historical.length > 0) {
      series.push({
        name: 'Historical Production',
        type: 'line',
        data: historical,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: {
          color: '#EA580C'
        },
        lineStyle: {
          width: 2,
          type: 'dotted'
        },
        emphasis: {
          focus: 'series'
        }
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
        type: showActual || showMeasured ? 'dashed' : 'solid'
      },
      emphasis: {
        focus: 'series'
      }
    });
    
    // Add actual line if available
    if (showActual && actual.some(v => v !== null && v !== undefined)) {
      series.push({
        name: 'Actual Production',
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
    
    // Add measured line if available
    if (showMeasured && measured.some(v => v !== null && v !== undefined)) {
      series.push({
        name: 'Measured Production',
        type: 'line',
        data: measured,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 6,
        itemStyle: {
          color: '#DC2626'
        },
        lineStyle: {
          width: 3
        },
        emphasis: {
          focus: 'series'
        }
      });
    }
    
    return {
      backgroundColor: 'transparent',
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
            if (!param.seriesName.includes('Bound') && !param.seriesName.includes('Range')) {
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
                Confidence: ${lowerBound[idx].toFixed(2)} - ${upperBound[idx].toFixed(2)} MW
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
          formatter: (value: string) => formatTimestamp(value),
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
  }
  
  function createWeatherChart(timestamps: string[]) {
    const series: any[] = [];
    
    if (weatherData.length > 0) {
      // Solar irradiance (left axis)
      series.push({
        name: 'GHI (W/m²)',
        type: 'line',
        yAxisIndex: 0,
        data: weatherData.map(d => d.ghi),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: {
          color: '#EA580C'
        },
        lineStyle: {
          width: 2
        }
      });
      
      series.push({
        name: 'DNI (W/m²)',
        type: 'line',
        yAxisIndex: 0,
        data: weatherData.map(d => d.dni),
        smooth: true,
        symbol: 'triangle',
        symbolSize: 4,
        itemStyle: {
          color: '#DC2626'
        },
        lineStyle: {
          width: 2,
          type: 'dashed'
        }
      });
      
      // Temperature (right axis)
      series.push({
        name: 'Temperature (°C)',
        type: 'line',
        yAxisIndex: 1,
        data: weatherData.map(d => d.temperature),
        smooth: true,
        symbol: 'diamond',
        symbolSize: 4,
        itemStyle: {
          color: '#0FA4AF'
        },
        lineStyle: {
          width: 2
        }
      });
      
      // Cloud cover (right axis)
      series.push({
        name: 'Cloud Cover (%)',
        type: 'line',
        yAxisIndex: 1,
        data: weatherData.map(d => d.cloud_cover),
        smooth: true,
        symbol: 'square',
        symbolSize: 4,
        itemStyle: {
          color: '#AFDDE5'
        },
        lineStyle: {
          width: 2,
          type: 'dotted'
        }
      });
    }
    
    return {
      backgroundColor: 'transparent',
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
        }
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        textStyle: {
          color: '#AFDDE5'
        }
      },
      grid: {
        left: '3%',
        right: '10%',
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
          formatter: (value: string) => formatTimestamp(value),
          rotate: 45
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Irradiance (W/m²)',
          position: 'left',
          nameTextStyle: {
            color: '#AFDDE5'
          },
          axisLine: {
            lineStyle: {
              color: '#EA580C'
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
        {
          type: 'value',
          name: 'Temperature (°C) / Cloud (%)',
          position: 'right',
          nameTextStyle: {
            color: '#AFDDE5'
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
            show: false
          }
        }
      ],
      series: series,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
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
          }
        }
      ]
    };
  }
  
  function createComparisonChart(timestamps: string[]) {
    const series: any[] = [];
    
    // Production data (left axis)
    const forecast = data.map(d => d.forecast);
    const actual = showActual ? data.map(d => d.actual) : [];
    const measured = showMeasured ? data.map(d => d.measured) : [];
    
    series.push({
      name: 'Forecast',
      type: 'line',
      yAxisIndex: 0,
      data: forecast,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: '#0FA4AF'
      },
      lineStyle: {
        width: 3
      }
    });
    
    if (showActual && actual.length > 0) {
      series.push({
        name: 'Actual',
        type: 'line',
        yAxisIndex: 0,
        data: actual,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#AFDDE5'
        },
        lineStyle: {
          width: 3
        }
      });
    }
    
    if (showMeasured && measured.length > 0) {
      series.push({
        name: 'Measured',
        type: 'line',
        yAxisIndex: 0,
        data: measured,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 6,
        itemStyle: {
          color: '#DC2626'
        },
        lineStyle: {
          width: 3
        }
      });
    }
    
    // Weather data (right axis)
    if (showWeather && weatherData.length > 0) {
      series.push({
        name: 'GHI',
        type: 'line',
        yAxisIndex: 1,
        data: weatherData.map(d => d.ghi),
        smooth: true,
        symbol: 'triangle',
        symbolSize: 4,
        itemStyle: {
          color: '#EA580C'
        },
        lineStyle: {
          width: 2,
          type: 'dashed'
        }
      });
    }
    
    return {
      backgroundColor: 'transparent',
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
        }
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 0,
        textStyle: {
          color: '#AFDDE5'
        }
      },
      grid: {
        left: '3%',
        right: '10%',
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
          formatter: (value: string) => formatTimestamp(value),
          rotate: 45
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Power Output (MW)',
          position: 'left',
          nameTextStyle: {
            color: '#AFDDE5'
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
        {
          type: 'value',
          name: 'Irradiance (W/m²)',
          position: 'right',
          nameTextStyle: {
            color: '#AFDDE5'
          },
          axisLine: {
            lineStyle: {
              color: '#EA580C'
            }
          },
          axisLabel: {
            color: '#AFDDE5'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: series,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
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
          }
        }
      ]
    };
  }
  
  function formatTimestamp(value: string) {
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