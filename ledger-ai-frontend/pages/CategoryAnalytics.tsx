import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { CATEGORY_COLORS } from '../constants/categories';

interface CategoryStat {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface CategoryStatsResponse {
  stats: CategoryStat[];
  total_spending: number;
}

const CategoryAnalytics: React.FC = () => {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<CategoryStatsResponse>('/categories/stats/');
      setStats(response.data.stats);
      setTotalSpending(response.data.total_spending);
    } catch (error: any) {
      console.error('Failed to fetch category stats:', error);
      setError(error?.response?.data?.detail || error?.message || 'Failed to load category statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCategorize = async () => {
    if (!confirm('This will re-categorize all uncategorized transactions. Continue?')) {
      return;
    }
    
    setIsCategorizing(true);
    try {
      const response = await api.post('/transactions/bulk-categorize/', {});
      alert(response.data.message);
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Bulk categorization failed:', error);
      alert('Failed to categorize transactions');
    } finally {
      setIsCategorizing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Prepare data for pie chart
  const pieData = stats.map(stat => ({
    name: stat.category,
    value: stat.total,
    percentage: stat.percentage
  }));

  // Prepare data for bar chart
  const barData = stats.slice(0, 5).map(stat => ({
    category: stat.category,
    amount: stat.total,
    count: stat.count
  }));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isLoading && !error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-zinc-500">Loading category data...</p>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Category Analytics</h1>
          <p className="text-zinc-500 mt-1">View your spending patterns by category</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={handleBulkCategorize}
          isLoading={isCategorizing}
        >
          <RefreshCw size={16} />
          Auto-Categorize
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total Spending</p>
              <p className="text-2xl font-bold text-zinc-900">${totalSpending.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Categories Used</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Top Category</p>
              <p className="text-xl font-bold text-zinc-900">{stats[0]?.category || 'N/A'}</p>
              <p className="text-sm text-zinc-500">${stats[0]?.total.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card title="Spending Distribution">
          {stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#95A5A6'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-zinc-500 py-12">No data available</p>
          )}
        </Card>

        {/* Bar Chart */}
        <Card title="Top 5 Categories">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Bar dataKey="amount" fill="#000000" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-zinc-500 py-12">No data available</p>
          )}
        </Card>
      </div>

      {/* Detailed Table */}
      <Card title="Category Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200">
              <tr className="text-left text-sm text-zinc-500">
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Transactions</th>
                <th className="pb-3 font-medium">Total Spent</th>
                <th className="pb-3 font-medium">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr key={index} className="border-b border-zinc-100 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[stat.category] || '#95A5A6' }}
                      />
                      <span className="font-medium text-zinc-900">{stat.category}</span>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-700">{stat.count}</td>
                  <td className="py-3 text-zinc-900 font-medium">${stat.total.toFixed(2)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-200 rounded-full h-2 max-w-[100px]">
                        <div 
                          className="bg-black h-2 rounded-full" 
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-zinc-600">{stat.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}
    </div>
  );
};

export default CategoryAnalytics;
