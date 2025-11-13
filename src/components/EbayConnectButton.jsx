import React from 'react';

const EBAY_CONNECT_URL = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/ebay/connect`;

export default function EbayConnectButton({ isConnected }) {
  return (
    <div style={{ margin: '2rem 0' }}>
      {isConnected ? (
        <button disabled style={{ background: '#ccc', color: '#333', padding: '0.75rem 2rem', borderRadius: 6 }}>
          eBay Connected
        </button>
      ) : (
        <a href={EBAY_CONNECT_URL}>
          <button style={{ background: '#0064d2', color: '#fff', padding: '0.75rem 2rem', borderRadius: 6 }}>
            Connect your eBay Account
          </button>
        </a>
      )}
    </div>
  );
}
