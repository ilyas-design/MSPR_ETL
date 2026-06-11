export const macroChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      padding: 10,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#e5e8f0' },
      ticks: { color: '#64748b' },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#64748b' },
    },
  },
};

export const activityChartOptions = {
  ...macroChartOptions,
  plugins: {
    ...macroChartOptions.plugins,
    legend: { position: 'bottom', labels: { color: '#64748b' } },
  },
};

export const CHART_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
