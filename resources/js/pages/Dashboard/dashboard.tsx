import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';


interface Order {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  network: string;
  expiry: string;
  product_type: 'customer_products' | 'agent_product';
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: string;
  beneficiary_number: string;
  product: {
    name: string;
    price: number;
    network: string;
    expiry: string;
  };
}

interface Alert {
  id: number;
  title: string | null;
  message: string;
  is_active: boolean;
}

interface DashboardProps extends PageProps {
  cartCount: number;
  cartItems: CartItem[];
  walletBalance: number;
  totalSales: number;
  todaySales: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  products: Product[];
  activeAlert: Alert | null;
  flash?: {
    success?: string;
    error?: string;
    show_upgrade_prompt?: boolean;
  };
}

export default function Dashboard({ auth }: DashboardProps) {
  const { cartCount, cartItems, walletBalance: initialWalletBalance, totalSales, todaySales, pendingOrders, processingOrders, completedOrders, products, activeAlert, flash } = usePage<DashboardProps>().props;
  const { toast } = useToast();

  const [walletBalance, setWalletBalance] = useState<number>(Number(initialWalletBalance) ?? 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Place Order states
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [orderType, setOrderType] = useState<'excel' | 'bulk' | 'single'>('single');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bundleSize, setBundleSize] = useState('');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<Array<{value: string, label: string, price: number}>>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAlert, setShowAlert] = useState(!!activeAlert);
  const [errorAlert, setErrorAlert] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const showErrorAlert = (message: string) => {
    setErrorAlert({show: true, message});
  };

  const hideErrorAlert = () => {
    setErrorAlert({show: false, message: ''});
  };

  // Filter products based on user role
  const filteredProducts = products?.filter(product => {
    if (auth.user.role === 'customer') {
      return product.product_type === 'customer_products';
    } else if (auth.user.role === 'agent' || auth.user.role === 'admin') {
      return product.product_type === 'agent_product';
    }
    return false;
  }) || [];

  const networks = [
    { id: 'MTN', name: 'MTN', icon: '/mtnlogo.jpeg', color: 'bg-yellow-500' },
    { id: 'TELECEL', name: 'Telecel', icon: '/telecellogo.png', color: 'bg-red-500' },
    { id: 'ISHARE', name: 'Ishare', icon: '/atlogo.png', color: 'bg-blue-500' },
    { id: 'BIGTIME', name: 'Bigtime', icon: '/atlogo.png', color: 'bg-purple-500' }
  ];

  const getNetworkButtonColors = (networkId: string) => {
    switch (networkId) {
      case 'MTN': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'TELECEL': return 'bg-red-500 hover:bg-red-600';
      case 'ISHARE': return 'bg-blue-500 hover:bg-blue-600';
      case 'BIGTIME': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const fetchBundleSizes = async (network: string) => {
    setLoadingSizes(true);
    try {
      const response = await fetch(`/api/bundle-sizes?network=${network}`);
      const data = await response.json();
      if (data.success) {
        setAvailableSizes(data.sizes);
      } else {
        setAvailableSizes([]);
      }
    } catch (error) {
      console.error('Error fetching bundle sizes:', error);
      setAvailableSizes([]);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleNetworkChange = (networkId: string) => {
    setSelectedNetwork(networkId);
    setBundleSize(''); // Reset bundle size when network changes
    fetchBundleSizes(networkId);
  };

  // Fetch initial bundle sizes for default network
  useEffect(() => {
    fetchBundleSizes(selectedNetwork);
  }, []);

  // Handle flash messages
  useEffect(() => {
    if (flash?.success) {
      toast({
        title: "Success!",
        description: flash.success,
        variant: "default",
      });
    }
    if (flash?.error) {
      toast({
        title: "Error",
        description: flash.error,
        variant: "destructive",
      });
    }
  }, [flash, toast]);

  const handleProcessExcel = async () => {
    if (!excelFile) return;
    
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('network', selectedNetwork);
    
    try {
      const response = await fetch('/process-excel-to-cart', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setExcelFile(null);
        alert(data.message || 'Excel file processed successfully');
        router.reload();
      } else {
        showErrorAlert(data.message || 'Failed to process Excel file');
      }
    } catch (error) {
      showErrorAlert('Error processing Excel file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessBulk = async () => {
    if (!bulkNumbers.trim()) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/process-bulk-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          numbers: bulkNumbers,
          network: selectedNetwork
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setBulkNumbers('');
        alert(data.message || 'Bulk numbers processed successfully');
        router.reload();
      } else {
        showErrorAlert(data.message || 'Failed to process bulk numbers');
      }
    } catch (error) {
      showErrorAlert('Error processing bulk numbers');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSingle = () => {
    if (!phoneNumber || !bundleSize) return;
    
    // Check if phone number already exists in cart
    const existingCartItem = cartItems.find(item => item.beneficiary_number === phoneNumber);
    
    if (existingCartItem) {
      showErrorAlert('This phone number is already in your cart');
      return;
    }
    
    router.post(route('add.to.cart'), {
      network: selectedNetwork,
      quantity: bundleSize,
      beneficiary_number: phoneNumber,
    }, {
      onSuccess: () => {
        setPhoneNumber('');
        setBundleSize('');
      },
      onError: (errors) => {
        // Handle validation errors from backend
        if (errors.error) {
          showErrorAlert(errors.error);
        } else {
          console.error('Error adding to cart:', errors);
          showErrorAlert('Failed to add item to cart. Please try again.');
        }
      }
    });
  };

  const handleRemoveFromCart = (cartId: number) => {
    router.delete(route('remove.from.cart', cartId));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || 
          file.type === 'application/csv' ||
          file.name.endsWith('.csv')) {
        setExcelFile(file);
      } else {
        alert('Please select a valid CSV file (.csv)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('File selected:', file.name, file.type);
      
      if (file.type === 'text/csv' || 
          file.type === 'application/csv' ||
          file.name.endsWith('.csv')) {
        setExcelFile(file);
        console.log('CSV file accepted:', file.name);
      } else {
        alert('Please select a valid CSV file (.csv)');
        e.target.value = ''; // Reset the input
      }
    }
  };

  return (
    <DashboardLayout
      user={auth.user}
      header={<h2 className="font-display font-bold text-2xl text-gray-800 leading-tight">Dashboard</h2>}
    >
      <Head title="Dashboard">
        <meta property="og:title" content="BalancedData - Buy Data Bundles Online" />
        <meta property="og:description" content="Buy affordable data bundles for MTN, Telecel, Ishare, and Bigtime networks in Ghana" />
        <meta property="og:image" content={`${window.location.origin}/logo.svg`} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BalancedData - Buy Data Bundles Online" />
        <meta name="twitter:description" content="Buy affordable data bundles for MTN, Telecel, Ishare, and Bigtime networks in Ghana" />
        <meta name="twitter:image" content={`${window.location.origin}/logo.svg`} />
      </Head>

      {/* Error Alert Popup */}
      {errorAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 relative border-2 border-red-200 dark:border-red-600">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{errorAlert.message}</p>
            <div className="flex justify-end">
              <button
                onClick={hideErrorAlert}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Popup */}
      {activeAlert && showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 relative border-2 border-blue-200 dark:border-gray-600 transform transition-all duration-300 scale-100">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <button
              className="absolute top-4 right-4 w-8 h-8 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center transition-colors duration-200 shadow-sm"
              onClick={() => setShowAlert(false)}
              aria-label="Close alert"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="pt-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                {activeAlert.title || '📢 Important Notice'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                {activeAlert.message}
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAlert(false)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs relative border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add to Wallet</h3>
            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsAdding(true);
                setAddError(null);
                try {
                  const response = await fetch('/dashboard/wallet/add', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json',
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ amount: addAmount }),
                  });
                  const data = await response.json();
                  if (data.success && data.payment_url) {
                    // Redirect to Paystack payment page
                    window.location.href = data.payment_url;
                  } else {
                    setAddError(data.message || 'Failed to initialize payment.');
                  }
                } catch (err) {
                  setAddError('Error initializing payment.');
                } finally {
                  setIsAdding(false);
                }
              }}
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="rounded px-2 py-2 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Amount"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                required
                disabled={isAdding}
                autoFocus
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                disabled={isAdding || !addAmount}
              >
                {isAdding ? 'Processing...' : 'Top Up'}
              </button>
              {addError && <p className="text-red-500 text-xs mt-1">{addError}</p>}
            </form>
          </div>
        </div>
      )}

      <div className="py-6 sm:py-8 lg:py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Welcome Message */}
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-500">
            <h1 className="text-xl font-display font-bold text-gray-900 mb-2">Welcome back, {auth.user.name}</h1>
            <p className="font-sans text-xs text-gray-600">Manage your data business efficiently. Contact admin for API access.</p>
          </div>

          {/* Upgrade Prompt for Referred Users */}
          {flash?.show_upgrade_prompt && auth.user.role === 'customer' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Icon name="Users" className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Ready to Upgrade?</h3>
                    <p className="text-blue-700 dark:text-blue-300">You were referred by an agent. Upgrade now to start earning commissions!</p>
                  </div>
                </div>
                <Link
                  href={route('upgrade.agent.show')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}

          {/* General Become an Agent Button */}
          {auth.user.role === 'customer' && !flash?.show_upgrade_prompt && (
            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Icon name="Store" className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Become an Agent</h3>
                    <p className="text-emerald-700 dark:text-emerald-300">Start your own store and earn commissions on every sale!</p>
                  </div>
                </div>
                <Link
                  href={route('upgrade.agent.show')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
          )}


          {/* Stats Cards Section */}
          <div className="mb-8 sm:mb-10">
            <h2 className="text-lg font-display font-bold text-gray-800 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Wallet Balance Card - Featured */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-sans text-xs font-medium opacity-90 mb-1">Wallet Balance</p>
                    <p className="text-lg font-display font-bold">GHS {walletBalance.toFixed(2)}</p>
                  </div>
                  <button
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all duration-200"
                    onClick={() => setShowAddModal(true)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6H6" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 w-full bg-white text-emerald-600 font-display font-semibold py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  Top Up
                </button>
              </div>
              
              {/* Total Sales Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-blue-900">Total Sales</h3>
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-display font-bold text-blue-600">GHS {totalSales.toFixed(2)}</p>
                <p className="text-xs font-sans text-blue-600/60 mt-1">All-time</p>
              </div>

              {/* Today's Sales Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-amber-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-amber-900">Today's Sales</h3>
                  <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-display font-bold text-amber-600">GHS {todaySales.toFixed(2)}</p>
                <p className="text-xs font-sans text-amber-600/60 mt-1">Today</p>
              </div>

              {/* Pending Orders Card */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-red-900">Pending</h3>
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-display font-bold text-red-600">{pendingOrders}</p>
                <p className="text-xs font-sans text-red-600/60 mt-1">Orders</p>
              </div>

              {/* Processing Orders Card */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-purple-900">Processing</h3>
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-display font-bold text-purple-600">{processingOrders}</p>
                <p className="text-xs font-sans text-purple-600/60 mt-1">Orders</p>
              </div>

              {/* Completed Orders Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-green-900">Completed</h3>
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-display font-bold text-green-600">{completedOrders}</p>
                <p className="text-xs font-sans text-green-600/60 mt-1">Orders</p>
              </div>
            </div>
          </div>



          {/* Place Order Section */}
          <div className="bg-white rounded-xl shadow-lg border-t-4 border-green-500 overflow-hidden">
            <div className="px-6 py-6 border-b-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-display font-bold text-green-900">Place Order</h3>
            </div>

            <div className="p-6">
              {/* Network Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkChange(network.id)}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedNetwork === network.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${network.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                        <img src={network.icon} alt={`${network.name} logo`} className="text-white text-lg sm:text-xl" />
                      </div>
                      <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">{network.name}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Order Type Selection */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setOrderType('excel')}
                  className={`flex-1 p-3 rounded-lg border transition-all duration-200 ${
                    orderType === 'excel'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon name="FileText" className="h-5 w-5 inline mr-2" />
                  CSV
                </button>
                <button
                  onClick={() => setOrderType('bulk')}
                  className={`flex-1 p-3 rounded-lg border transition-all duration-200 ${
                    orderType === 'bulk'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon name="Package" className="h-5 w-5 inline mr-2" />
                  Bulk
                </button>
                <button
                  onClick={() => setOrderType('single')}
                  className={`flex-1 p-3 rounded-lg border transition-all duration-200 ${
                    orderType === 'single'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon name="Plus" className="h-5 w-5 inline mr-2" />
                  Single
                </button>
              </div>

              {/* Order Form */}
              {orderType === 'excel' && (
                <div className="space-y-4">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-blue-500 text-4xl mb-4">📊</div>
                    <div className="text-gray-600 dark:text-gray-400 mb-4">
                      {isDragOver ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label 
                      htmlFor="excel-upload" 
                      className="cursor-pointer inline-block px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors mb-4"
                    >
                      Choose File
                    </label>
                    {excelFile && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                        ✅ Selected: {excelFile.name} ({(excelFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Supported format: .csv only
                    </div>
                  </div>
                  <button
                    onClick={handleProcessExcel}
                    disabled={!excelFile || isProcessing}
                    style={{
                      backgroundColor: selectedNetwork === 'MTN' ? '#FFFF00' : selectedNetwork === 'TELECEL' ? '#FF0000' : '#0000FF',
                      color: selectedNetwork === 'MTN' ? 'black' : 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: !excelFile || isProcessing ? 'not-allowed' : 'pointer',
                      opacity: !excelFile || isProcessing ? 0.5 : 1
                    }}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : 'Process & Add to Cart'}
                  </button>
                </div>
              )}

              {orderType === 'bulk' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Numbers (Phone Size)</label>
                    <Textarea
                      placeholder="0241234567 5&#10;0558765432 10&#10;0501234567 3"
                      value={bulkNumbers}
                      onChange={(e) => setBulkNumbers(e.target.value)}
                      rows={6}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={handleProcessBulk}
                    disabled={!bulkNumbers.trim() || isProcessing}
                    style={{
                      backgroundColor: selectedNetwork === 'MTN' ? '#FFFF00' : selectedNetwork === 'TELECEL' ? '#FF0000' : '#0000FF',
                      color: selectedNetwork === 'MTN' ? 'black' : 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: !bulkNumbers.trim() || isProcessing ? 'not-allowed' : 'pointer',
                      opacity: !bulkNumbers.trim() || isProcessing ? 0.5 : 1
                    }}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : 'Add Bulk to Cart'}
                  </button>
                </div>
              )}

              {orderType === 'single' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="0240000000"
                      value={phoneNumber}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 10);
                        setPhoneNumber(cleaned);
                      }}
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                    />
                    {phoneNumber && phoneNumber.length !== 10 && (
                      <p className="text-red-500 text-xs mt-1">Phone number must be exactly 10 digits</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bundle Size (GB)</label>
                    <Select value={bundleSize} onValueChange={setBundleSize}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSizes ? "Loading sizes..." : "Select size"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label} - GHS {size.price}
                          </SelectItem>
                        ))}
                        {availableSizes.length === 0 && !loadingSizes && (
                          <SelectItem value="no-sizes" disabled>
                            No sizes available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={handleAddSingle}
                    disabled={!phoneNumber || phoneNumber.length !== 10 || !bundleSize || isProcessing}
                    style={{
                      backgroundColor: selectedNetwork === 'MTN' ? '#FFFF00' : selectedNetwork === 'TELECEL' ? '#FF0000' : '#0000FF',
                      color: selectedNetwork === 'MTN' ? 'black' : 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: !phoneNumber || phoneNumber.length !== 10 || !bundleSize || isProcessing ? 'not-allowed' : 'pointer',
                      opacity: !phoneNumber || phoneNumber.length !== 10 || !bundleSize || isProcessing ? 0.5 : 1
                    }}
                    className="w-full"
                  >
                    Add to Cart
                  </button>
                </div>
              )}
            </div>
          </div>

         

          {/* CART ITEM SECTION....................................................... */}
          {/* CART ITEM SECTION....................................................... */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="ShoppingCart" className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cart Items</h3>
                </div>
                <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {cartCount} items
                </span>
              </div>
            </div>

            <div className="p-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="ShoppingCart" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.product.network === 'MTN' ? 'bg-yellow-500' :
                          item.product.network === 'TELECEL' ? 'bg-red-500' :
                          item.product.network === 'ISHARE' ? 'bg-blue-500' :
                          item.product.network === 'BIGTIME' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}>
                          <span className="text-white text-xs font-bold">{item.product.network.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{item.beneficiary_number}</div>
                          <div className="text-sm text-gray-500">{item.quantity} - {item.product.network}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-orange-600">GHS {Number(item.product.price || 0).toFixed(2)}</span>
                        <button 
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Icon name="Trash2" className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Subtotal:</span>
                      <span className="text-xl font-bold">GHS {cartItems.reduce((sum, item) => sum + Number(item.product.price || 0), 0).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => router.visit('/checkout')}
                      style={{
                        backgroundColor: selectedNetwork === 'MTN' ? '#FFFF00' : selectedNetwork === 'TELECEL' ? '#FF0000' : '#0000FF',
                        color: selectedNetwork === 'MTN' ? 'black' : 'white',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Make Payment ( GHS {cartItems.reduce((sum, item) => sum + Number(item.product.price || 0), 0).toFixed(2)} )
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </DashboardLayout>
  );
}
