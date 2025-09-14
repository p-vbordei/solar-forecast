import { initializeWeatherSync } from '$lib/server/jobs/weather-sync';

// Initialize weather synchronization system on server start
initializeWeatherSync();

console.log('✅ SvelteKit server started with weather sync scheduler');