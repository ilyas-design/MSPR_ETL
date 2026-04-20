const commonPlugins = {
  legend: {
    position: 'bottom',
    labels: {
      padding: 18,
      font: {
        size: 12,
        weight: '500',
      },
      color: '#64748b',
      usePointStyle: true,
      pointStyle: 'circle',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    padding: 12,
    titleFont: { size: 13, weight: '600' },
    bodyFont: { size: 12 },
    borderColor: 'rgba(99, 102, 241, 0.5)',
    borderWidth: 1,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
  },
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: commonPlugins,
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#e5e8f0', drawBorder: false },
      ticks: { color: '#64748b', font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11 } },
    },
  },
};

export const horizontalChartOptions = {
  ...chartOptions,
  indexAxis: 'y',
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: '#e5e8f0', drawBorder: false },
      ticks: { color: '#64748b', font: { size: 11 } },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11 } },
    },
  },
};

export const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: commonPlugins,
};

export const CHART_PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
];
