import React from 'react';

// Minimal test component to debug the blank screen
function TestApp() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ffffff',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#000000' }}>SabiScore Debug Mode</h1>
      <p style={{ color: '#666666' }}>If you can see this, the basic React app is working.</p>
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        marginTop: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>React is rendering: ✅</li>
          <li>CSS is loading: ✅</li>
          <li>JavaScript is executing: ✅</li>
          <li>Time: {new Date().toLocaleString()}</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;
