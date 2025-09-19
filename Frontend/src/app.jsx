import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [transactionData, setTransactionData] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = 'http://localhost:8080';

  // Fetch pending transactions
  const fetchPendingTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/pending`);
      const data = await response.json();
      setPendingTransactions(data || []);
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      setMessage('Error fetching pending transactions');
    }
  };

  // Fetch blockchain
  const fetchBlockchain = async () => {
    try {
      const response = await fetch(`${API_BASE}/blocks`);
      const data = await response.json();
      setBlockchain(data || []);
    } catch (error) {
      console.error('Error fetching blockchain:', error);
      setMessage('Error fetching blockchain');
    }
  };

  // Add transaction
  const addTransaction = async (e) => {
    e.preventDefault();
    if (!transactionData.trim()) {
      setMessage('Please enter transaction data');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: transactionData }),
      });

      if (response.ok) {
        setMessage('Transaction added successfully!');
        setTransactionData('');
        fetchPendingTransactions();
      } else {
        setMessage('Error adding transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setMessage('Error adding transaction');
    }
    setLoading(false);
  };

  // Mine block
  const mineBlock = async () => {
    setLoading(true);
    setMessage('Mining block... This may take a moment.');
    try {
      const response = await fetch(`${API_BASE}/mine`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage('Block mined successfully!');
        fetchPendingTransactions();
        fetchBlockchain();
      } else {
        setMessage('Error mining block');
      }
    } catch (error) {
      console.error('Error mining block:', error);
      setMessage('Error mining block');
    }
    setLoading(false);
  };

  // Search transactions
  const searchTransactions = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setMessage('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data || []);
      setMessage(`Found ${data?.length || 0} matching transactions`);
    } catch (error) {
      console.error('Error searching transactions:', error);
      setMessage('Error searching transactions');
      setSearchResults([]);
    }
    setLoading(false);
  };

  // Load initial data
  useEffect(() => {
    fetchPendingTransactions();
    fetchBlockchain();
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Salman Ahmed Blockchain</h1>
      </header>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="container">
        {/* Add Transaction Section */}
        <section className="section">
          <h2>Add Transaction</h2>
          <form onSubmit={addTransaction} className="transaction-form">
            <input
              type="text"
              value={transactionData}
              onChange={(e) => setTransactionData(e.target.value)}
              placeholder="Enter transaction data..."
              className="input"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </form>
        </section>

        {/* Pending Transactions Section */}
        <section className="section">
          <h2>Pending Transactions ({pendingTransactions.length})</h2>
          <div className="transactions-list">
            {pendingTransactions.length === 0 ? (
              <p className="no-data">No pending transactions</p>
            ) : (
              pendingTransactions.map((transaction, index) => (
                <div key={index} className="transaction-item">
                  {transaction}
                </div>
              ))
            )}
          </div>
          <button onClick={mineBlock} className="btn btn-success" disabled={loading || pendingTransactions.length === 0}>
            {loading ? 'Mining...' : 'Mine Block'}
          </button>
        </section>

        {/* Search Section */}
        <section className="section">
          <h2>Search Transactions</h2>
          <form onSubmit={searchTransactions} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for transactions..."
              className="input"
              disabled={loading}
            />
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results:</h3>
              {searchResults.map((result, index) => (
                <div key={index} className="search-result">
                  <strong>Block {result.block_index}:</strong> {result.transaction}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Blockchain Section */}
        <section className="section">
          <h2>View Blockchain ({blockchain.length} blocks)</h2>
          <button onClick={fetchBlockchain} className="btn btn-secondary">
            Refresh Blockchain
          </button>
          <div className="blockchain">
            {blockchain.length === 0 ? (
              <p className="no-data">No blocks in blockchain</p>
            ) : (
              blockchain.map((block, index) => (
                <div key={index} className="block">
                  <div className="block-header">
                    <h3>Block #{block.index}</h3>
                    <span className="timestamp">
                      {new Date(block.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="block-details">
                    <div className="detail-row">
                      <strong>Hash:</strong> 
                      <code className="hash">{block.hash}</code>
                    </div>
                    <div className="detail-row">
                      <strong>Previous Hash:</strong> 
                      <code className="hash">{block.prev_hash}</code>
                    </div>
                    <div className="detail-row">
                      <strong>Merkle Root:</strong> 
                      <code className="hash">{block.merkle_root}</code>
                    </div>
                    <div className="detail-row">
                      <strong>Nonce:</strong> {block.nonce}
                    </div>
                    <div className="detail-row">
                      <strong>Transactions ({block.transactions?.length || 0}):</strong>
                      <div className="transactions">
                        {block.transactions && block.transactions.length > 0 ? (
                          block.transactions.map((tx, txIndex) => (
                            <div key={txIndex} className="transaction">
                              {tx}
                            </div>
                          ))
                        ) : (
                          <span className="no-transactions">No transactions</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;