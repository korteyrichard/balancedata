import React from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { PageProps, User } from '@/types';

interface AdminDashboardProps extends PageProps {
  stats: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalTransactions: number;
    todayUsers: number;
    todayOrders: number;
    todayTransactions: number;
  };
  orderPusherEnabled: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: { value: number; isPositive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-l-4 border-blue-500',
    green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-l-4 border-green-500',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-l-4 border-purple-500',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-l-4 border-orange-500',
    red: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-l-4 border-red-500',
  };

  const iconColors = {
    blue: 'bg-blue-200 dark:bg-blue-700/40 text-blue-600 dark:text-blue-300',
    green: 'bg-green-200 dark:bg-green-700/40 text-green-600 dark:text-green-300',
    purple: 'bg-purple-200 dark:bg-purple-700/40 text-purple-600 dark:text-purple-300',
    orange: 'bg-orange-200 dark:bg-orange-700/40 text-orange-600 dark:text-orange-300',
    red: 'bg-red-200 dark:bg-red-700/40 text-red-600 dark:text-red-300',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  orderPusherEnabled,
}) => {
  const { auth } = usePage<AdminDashboardProps>().props;

  const toggleOrderPusher = () => {
    router.post(route('admin.toggle.order.pusher'), {
      enabled: !orderPusherEnabled
    });
  };

  return (
    <AdminLayout
      user={auth?.user}
      header={<h2 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>}
    >
      <Head title="Admin Dashboard" />

      <div className="p-6 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 rounded-xl p-8 text-white shadow-lg">
          <h3 className="text-2xl font-bold mb-2">Welcome back, {auth?.user?.name}!</h3>
          <p className="text-blue-100">Monitor your business metrics and system performance</p>
        </div>

        {/* Overall Summary Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Overall Summary</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete overview of your platform</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
              title="Total Users" 
              value={stats.totalUsers}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 006-6V4a6 6 0 00-6-6H6a6 6 0 000 12z" />
                </svg>
              }
              color="blue"
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard 
              title="Total Products" 
              value={stats.totalProducts}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              color="green"
              trend={{ value: 5, isPositive: false }}
            />
            <StatCard 
              title="Total Orders" 
              value={stats.totalOrders}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              color="purple"
              trend={{ value: 8, isPositive: true }}
            />
            <StatCard 
              title="Total Transactions" 
              value={stats.totalTransactions}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="orange"
              trend={{ value: 15, isPositive: true }}
            />
          </div>
        </section>

        {/* Today's Statistics Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Statistics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time data for today</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard 
              title="New Users Today" 
              value={stats.todayUsers}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              color="blue"
            />
            <StatCard 
              title="Orders Today" 
              value={stats.todayOrders}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              color="green"
            />
            <StatCard 
              title="Transactions Today" 
              value={stats.todayTransactions}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              color="purple"
            />
          </div>
        </section>

        {/* System Controls Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">System Controls</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage system settings and services</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Order Pusher Service */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Order Pusher Service</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {orderPusherEnabled ? (
                      <span className="flex items-center mt-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Order pusher service is active
                      </span>
                    ) : (
                      <span className="flex items-center mt-1">
                        <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Order pusher service is disabled
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={toggleOrderPusher}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    orderPusherEnabled 
                      ? 'bg-green-600 focus:ring-green-500' 
                      : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-500'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                      orderPusherEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
