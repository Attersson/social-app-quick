import { useState, useEffect } from 'react';
import Breadcrumb from './Breadcrumb';

interface PerformanceMetric {
  operation: string;
  executionTime: number;
  timestamp: number;
  result: string;
  details?: Record<string, unknown>;
}

/**
 * Simple in-memory storage for performance metrics
 * This is for development use only, not persisted between page reloads
 */
const performanceMetrics: PerformanceMetric[] = [];

/**
 * Register a performance metric that can be displayed in the dashboard
 */
export function registerPerformanceMetric(metric: PerformanceMetric): void {
  // Keep only the last 100 metrics to prevent memory issues
  if (performanceMetrics.length >= 100) {
    performanceMetrics.shift();
  }
  performanceMetrics.push(metric);
}

/**
 * Component that displays performance metrics in a dashboard
 */
export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const isProduction = !import.meta.env.DEV;
  
  // Load metrics on mount and when refresh is clicked
  useEffect(() => {
    // Copy the metrics so we don't directly modify the shared array
    const sortedMetrics = [...performanceMetrics].sort((a, b) => b.timestamp - a.timestamp);
    setMetrics(sortedMetrics);
  }, [refreshCounter]);
  
  // Filter metrics based on search
  const filteredMetrics = metrics.filter(metric => 
    filter === '' || metric.operation.toLowerCase().includes(filter.toLowerCase())
  );
  
  // Group metrics by operation for aggregation
  const groupedMetrics: Record<string, { count: number, totalTime: number, avgTime: number, minTime: number, maxTime: number }> = {};
  
  filteredMetrics.forEach(metric => {
    if (!groupedMetrics[metric.operation]) {
      groupedMetrics[metric.operation] = { 
        count: 0, 
        totalTime: 0, 
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }
    
    const group = groupedMetrics[metric.operation];
    group.count++;
    group.totalTime += metric.executionTime;
    group.minTime = Math.min(group.minTime, metric.executionTime);
    group.maxTime = Math.max(group.maxTime, metric.executionTime);
    group.avgTime = group.totalTime / group.count;
  });
  
  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Performance Dashboard' }]} />
      
      <div className="bg-white shadow rounded-lg p-6">
        {isProduction && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Warning:</strong> This dashboard is displaying live performance data in a production environment. 
                  It may contain sensitive information about your application architecture and performance. 
                  Consider implementing additional authentication and authorization controls.
                </p>
              </div>
            </div>
          </div>
        )}
      
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Performance Metrics</h1>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Filter operations..."
              className="border px-3 py-2 rounded"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button 
              onClick={() => setRefreshCounter(prev => prev + 1)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Statistics Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-gray-600 text-sm font-medium">Total Operations</p>
              <p className="text-2xl font-bold text-blue-700">{filteredMetrics.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <p className="text-gray-600 text-sm font-medium">Unique Operation Types</p>
              <p className="text-2xl font-bold text-purple-700">{Object.keys(groupedMetrics).length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <p className="text-gray-600 text-sm font-medium">Average Time (ms)</p>
              <p className="text-2xl font-bold text-green-700">
                {filteredMetrics.length > 0 
                  ? (filteredMetrics.reduce((sum, m) => sum + m.executionTime, 0) / filteredMetrics.length).toFixed(2) 
                  : '0.00'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Operations Summary Table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Operations Summary</h2>
          {Object.keys(groupedMetrics).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time (ms)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Time (ms)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Time (ms)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedMetrics)
                    .sort((a, b) => b[1].totalTime - a[1].totalTime)
                    .map(([operation, stats]) => (
                      <tr key={operation} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{operation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.avgTime.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.minTime.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.maxTime.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No operations recorded yet. Use the application to generate metrics.</p>
          )}
        </div>
        
        {/* Recent Operations List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Operations</h2>
          {filteredMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (ms)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMetrics.slice(0, 20).map((metric, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{metric.operation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{metric.executionTime.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{metric.result}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {metric.details ? JSON.stringify(metric.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMetrics.length > 20 && (
                <p className="text-right text-gray-500 text-sm mt-2">
                  Showing 20 of {filteredMetrics.length} operations
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No operations matching the filter.</p>
          )}
        </div>
      </div>
    </div>
  );
} 