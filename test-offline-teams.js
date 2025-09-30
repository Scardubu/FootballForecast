// Quick test script to verify offline mode team display
console.log('🧪 Testing offline mode team display...');

// Enable offline mode
localStorage.setItem('serverStatus', 'offline');
window.isServerOffline = true;
window.dispatchEvent(new Event('serverStatusChange'));

console.log('✅ Offline mode enabled');
console.log('📱 Check the UI - team names should now display correctly instead of "Unknown Team"');
console.log('🔄 Refresh the page to see the changes take effect');

// Log current offline status
console.log('📊 Current offline status:', localStorage.getItem('serverStatus'));
console.log('🌐 Server offline flag:', window.isServerOffline);

// Test mock data availability
setTimeout(async () => {
  try {
    // Test if we can access the mock data provider
    if (window.MockDataProvider) {
      const teams = await window.MockDataProvider.getTeams();
      console.log('👥 Mock teams available:', teams.length);
      console.log('🏆 Sample teams:', teams.slice(0, 3).map(t => t.name));
    } else {
      console.log('⚠️ MockDataProvider not available on window object');
    }
  } catch (error) {
    console.error('❌ Error testing mock data:', error);
  }
}, 1000);
