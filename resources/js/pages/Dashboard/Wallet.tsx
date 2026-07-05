import React,{useState} from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, router,usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { User } from '@/types';
import { CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: number;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  status: string;
  type: string;
  description: string;
  reference: string;
  created_at: string;
}

interface WalletPageProps extends PageProps {
  auth: {
    user: User & {
      wallet_balance: number;
    };
  };
  transactions: {
    data: Transaction[];
    current_page: number;
    last_page: number;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
  };
  pendingTransactions: Transaction[];
  verifyTopupVideoUrl: string;
}

export default function Wallet({ auth, transactions, pendingTransactions, verifyTopupVideoUrl }: WalletPageProps) {
     
  const { walletBalance: initialWalletBalance } = usePage<PageProps>().props;

  const [walletBalance, setWalletBalance] = useState(initialWalletBalance ?? 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [verifyingTransactions, setVerifyingTransactions] = useState<Set<number>>(new Set());

  const handleTopUp = () => {
    router.visit('/dashboard/wallet/add');
  };

  const handleVerifyPayment = async (transactionId: number, reference: string) => {
    setVerifyingTransactions(prev => new Set(prev).add(transactionId));
    
    try {
      const response = await fetch('/dashboard/wallet/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ reference }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        router.reload();
      } else {
        alert(data.message || 'Verification failed');
      }
    } catch (error) {
      alert('Error verifying payment: ' + error.message);
    } finally {
      setVerifyingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const user = auth.user;

  return (
    <DashboardLayout
      user={auth.user}
      header={
        <h2 className="font-display font-bold text-2xl text-gray-800 leading-tight">
          Wallet Management
        </h2>
      }
    >
      <Head title="Wallet" />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Add to Wallet</h3>
            </div>
            <form
              className="flex flex-col gap-4"
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount (GHS)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  required
                  disabled={isAdding}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                disabled={isAdding || !addAmount}
              >
                {isAdding ? 'Processing...' : 'Top Up Now'}
              </button>
              {addError && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{addError}</p>}
            </form>
          </div>
        </div>
      )}
    
      <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-800 dark:via-blue-700 dark:to-indigo-800 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-blue-100 text-xs font-medium mb-1">Current Balance</p>
                <p className="text-lg sm:text-xl font-bold mb-0.5">
                  GHS {auth.user.wallet_balance}
                </p>
                <p className="text-blue-100 text-xs">Available for transactions</p>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-all duration-200 shadow-md text-sm hover:shadow-lg"
                >
                  + Top Up
                </button>
                {verifyTopupVideoUrl && (
                  <a
                    href={verifyTopupVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-bold transition-all duration-200 text-sm backdrop-blur-sm text-center"
                  >
                    How to Verify
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 sm:px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transaction History
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All your wallet transactions</p>
          </div>

          <div className="w-full overflow-x-auto">
            {transactions.data.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-semibold">No transactions yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start by topping up your wallet</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">#{tx.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                        GHS {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">
                        <span className={`inline-flex items-center gap-1 ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {tx.status === 'pending' ? (
                          <button
                            onClick={() => handleVerifyPayment(tx.id, tx.reference)}
                            disabled={verifyingTransactions.has(tx.id)}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors duration-200"
                          >
                            {verifyingTransactions.has(tx.id) ? 'Verifying...' : 'Verify'}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
