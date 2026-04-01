import React, { useState, useEffect } from 'react';
import { getRagDataset } from '../services/api';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DatasetPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchDataset();
  }, []);

  const fetchDataset = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getRagDataset('problems', 100);
      setData(res.data.results || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load vector database dataset.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDifficultyColor = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return '#00b8a3';
    if (d === 'medium') return '#ffc01e';
    if (d === 'hard') return '#ff375f';
    return '#ffc01e';
  };

  return (
    <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#eff2f699', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif', padding: '0' }}>
      {/* Navbar */}
      <div style={{ height: '50px', backgroundColor: '#282828', display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Vector DB Problemset
        </div>
        <div style={{ flex: 1 }}></div>
        <Link to="/" style={{ color: '#eff2f699', textDecoration: 'none', fontSize: '14px' }}>Back to Setup</Link>
      </div>

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: '#282828', padding: '16px 20px', borderRadius: '8px', flex: '1', minWidth: '250px' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#fff' }}>Dataset Viewer</h2>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
              Browse coding questions exactly as they appear in your local Qdrant Vector database. LLM verification formats them into a strictly structured format used for the interview IDE.
              Browse coding questions loaded from MongoDB dataset import (greengerong/leetcode).
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#282828', borderRadius: '8px', overflow: 'hidden' }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#3a1f1f', color: '#ffb4b4', borderBottom: '1px solid #5a2f2f', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 150px', padding: '12px 16px', borderBottom: '1px solid #333', fontSize: '14px', color: '#eff2f699' }}>
            <div>Status</div>
            <div>Title</div>
            <div>Verification</div>
            <div>Difficulty</div>
            <div style={{ textAlign: 'center' }}>Action</div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>Loading problems from vector database...</div>
          ) : data.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>No problems found in collection.</div>
          ) : (
            <div>
              {data.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const difficulty = item.difficulty || 'Medium';

                return (
                  <React.Fragment key={item.id}>
                    {/* Row */}
                    <div 
                      onClick={() => toggleRow(item.id)}
                      style={{ 
                        display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 150px', 
                        padding: '14px 16px', borderBottom: '1px solid #333', 
                        fontSize: '14px', alignItems: 'center',
                        backgroundColor: index % 2 === 0 ? '#282828' : '#2A2A2A',
                        cursor: 'pointer', transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => Object.assign(e.currentTarget.style, {backgroundColor: '#333'})}
                      onMouseOut={(e) => Object.assign(e.currentTarget.style, {backgroundColor: index % 2 === 0 ? '#282828' : '#2A2A2A'})}
                    >
                      <div style={{ paddingLeft: '8px' }}>
                        <span style={{ color: '#00b8a3' }}>●</span>
                      </div>
                      <div style={{ color: '#fff', fontWeight: '500' }}>
                        {item.title || item.questionId || `Problem ${index + 1}`}
                      </div>
                      <div>
                        <span style={{ color: '#00b8a3', fontSize: '13px' }}>Mongo Loaded</span>
                      </div>
                      <div style={{ color: getDifficultyColor(difficulty) }}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#0a84ff', fontSize: '13px' }}>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div style={{ backgroundColor: '#1e1e1e', padding: '24px', borderBottom: '1px solid #333' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <div style={{ flex: 1, color: '#fff' }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Problem Description</div>
                            <div className="lc-problem-body" style={{ fontSize: '14px', lineHeight: '1.6', color: '#eff2f6bf' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.questionText}</ReactMarkdown>
                            </div>
                          </div>

                          {(
                            <div style={{ width: '350px' }}>
                              <div style={{ backgroundColor: '#282828', borderRadius: '8px', padding: '16px', border: '1px solid #333' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>Dataset Coding Config</div>
                                
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>C++ Signature</div>
                                  <div style={{ backgroundColor: '#1e1e1e', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#dcdcaa', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                    {item.coding?.cppSignature}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', color: '#4ade80', fontWeight: 'bold' }}>{item.coding?.visibleTestCases?.length || 0}</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>Visible Cases</div>
                                  </div>
                                  <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', color: '#f87171', fontWeight: 'bold' }}>{item.coding?.hiddenTestCases?.length || 0}</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>Hidden Cases</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetPage;

