// Offline Mode Testing Utility
// This utility helps developers test offline mode functionality

export class OfflineModeTester {
  private static originalServerStatus: string | null = null;
  private static originalServerOffline: boolean | undefined = undefined;

  /**
   * Enable offline mode for testing
   */
  static enableOfflineMode(): void {
    // Store original values
    this.originalServerStatus = localStorage.getItem('serverStatus');
    this.originalServerOffline = window.isServerOffline;

    // Set offline mode
    localStorage.setItem('serverStatus', 'offline');
    window.isServerOffline = true;

    // Dispatch event to notify components
    window.dispatchEvent(new Event('serverStatusChange'));

    console.log('🔌 Offline mode enabled for testing');
    console.log('📱 Components will now use mock data');
    console.log('💡 Use OfflineModeTester.disableOfflineMode() to restore online mode');
  }

  /**
   * Disable offline mode and restore online mode
   */
  static disableOfflineMode(): void {
    // Restore original values
    if (this.originalServerStatus !== null) {
      localStorage.setItem('serverStatus', this.originalServerStatus);
    } else {
      localStorage.removeItem('serverStatus');
    }
    
    window.isServerOffline = this.originalServerOffline;

    // Dispatch event to notify components
    window.dispatchEvent(new Event('serverStatusChange'));

    console.log('🌐 Online mode restored');
    console.log('📡 Components will now use real API data');
  }

  /**
   * Toggle between online and offline modes
   */
  static toggleOfflineMode(): void {
    const isCurrentlyOffline = localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
    
    if (isCurrentlyOffline) {
      this.disableOfflineMode();
    } else {
      this.enableOfflineMode();
    }
  }

  /**
   * Check current offline status
   */
  static isOfflineMode(): boolean {
    return localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
  }

  /**
   * Get current mode status for display
   */
  static getCurrentModeStatus(): { mode: 'online' | 'offline'; description: string } {
    const isOffline = this.isOfflineMode();
    return {
      mode: isOffline ? 'offline' : 'online',
      description: isOffline 
        ? 'Using mock data - Server unavailable or offline mode enabled'
        : 'Using real API data - Server connected'
    };
  }

  /**
   * Test all offline functionality
   */
  static async testOfflineFunctionality(): Promise<void> {
    console.log('🧪 Starting offline mode functionality test...');
    
    // Test 1: Enable offline mode
    console.log('Test 1: Enabling offline mode...');
    this.enableOfflineMode();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check if components respond to offline mode
    console.log('Test 2: Checking component response...');
    const status = this.getCurrentModeStatus();
    console.log(`Current mode: ${status.mode} - ${status.description}`);
    
    // Test 3: Simulate server status change
    console.log('Test 3: Testing server status change events...');
    window.dispatchEvent(new Event('serverStatusChange'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 4: Restore online mode
    console.log('Test 4: Restoring online mode...');
    this.disableOfflineMode();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Offline mode functionality test completed');
    console.log('💡 Check the UI for offline indicators and mock data usage');
  }
}

// Make it available globally for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).OfflineModeTester = OfflineModeTester;
}

// Development helper functions
export const devHelpers = {
  /**
   * Quick function to enable offline mode
   */
  goOffline: () => OfflineModeTester.enableOfflineMode(),
  
  /**
   * Quick function to go back online
   */
  goOnline: () => OfflineModeTester.disableOfflineMode(),
  
  /**
   * Quick function to toggle mode
   */
  toggle: () => OfflineModeTester.toggleOfflineMode(),
  
  /**
   * Quick function to check status
   */
  status: () => {
    const status = OfflineModeTester.getCurrentModeStatus();
    console.log(`🔍 Current mode: ${status.mode}`);
    console.log(`📝 Description: ${status.description}`);
    return status;
  },
  
  /**
   * Run comprehensive test
   */
  test: () => OfflineModeTester.testOfflineFunctionality()
};

// Make dev helpers available globally
if (typeof window !== 'undefined') {
  (window as any).offlineTest = devHelpers;
}
