<template>
  <div>
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Chart, registerables } from 'chart.js';
import { Colors } from 'chart.js';

Chart.register(...registerables);
Chart.register(Colors);

// Composition API migration: props, canvas refs, and lifecycle hooks replace Options API.
const props = defineProps({
  label: { type: Array, default: () => [] },
  chartData: { type: Array, default: () => [] }
});
const attendanceChart = ref(null);
let chart;

onMounted(() => {
  chart = new Chart(attendanceChart.value, {
    type: 'bar',
    data: {
      labels: props.label,
      datasets: [{ borderWidth: 1, data: props.chartData }]
    },
    options: {
      scales: {
        y: { ticks: { stepSize: 1 } },
        x: { gridLines: { display: false } }
      },
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Attendance Chart' }
      },
      responsive: true,
      maintainAspectRatio: true
    }
  });
});

onBeforeUnmount(() => chart?.destroy());
</script>
