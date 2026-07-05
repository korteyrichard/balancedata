import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import React from 'react';
import { PageProps } from '@/types';

interface CartProduct {
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

// Fix: Add index signature to make it compatible with PageProps constraint
interface CartPageProps extends Record<string, unknown> {
  cartItems: CartProduct[];
}

export default function Cart() {
  const { cartItems, auth } = usePage<PageProps<CartPageProps>>().props;

  const handleRemove = (cartId: number) => {
    router.delete(route('remove.from.cart', cartId));
  };

  const total = cartItems.reduce((sum, item) => sum + Number(item.product?.price || 0), 0);

  return (
    <DashboardLayout
      user={auth.user}
      header={
        <h2 className="font-display font-bold text-2xl text-gray-800 leading-tight">
          Shopping Cart
        </h2>
      }
    >
      <Head title="Cart" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50 py-6 sm:py-10 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-t-4 border-green-500">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-6 sm:px-8 lg:px-10 py-8 sm:py-10">
              <h3 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
                Shopping Cart
              </h3>
              {cartItems.length > 0 && (
                <p className="font-sans text-green-50 text-sm">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} ready for checkout
                </p>
              )}
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {cartItems.length === 0 ? (
                <div className="text-center py-16 sm:py-20">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2H20a1 1 0 0 1 .9 1.5l-3 5a1 1 0 0 1-.9.5H9.85l-.65 3.5H21v2H7a1 1 0 0 1-1-1V4H2V2z"/>
                    </svg>
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 mb-3">
                    Your cart is empty
                  </h4>
                  <p className="text-gray-500 font-sans text-lg mb-8">
                    Add data bundles to get started
                  </p>
                  <Button 
                    onClick={() => router.visit('/dashboard')}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-display font-bold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 inline-block"
                  >
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-5 sm:space-y-6">
                  {cartItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-5 sm:p-7 shadow-md border-2 border-green-100 hover:shadow-lg hover:border-green-300 transition-all duration-200"
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                          <h4 className="font-display font-bold text-lg text-gray-900 mb-3">
                            {item.product?.name}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-sans">{item.quantity}GB</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-sans">{item.product?.network}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-sans">{item.product?.expiry}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-sans">{item.beneficiary_number}</span>
                            </div>
                          </div>
                          </div>
                            <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRemove(item.id)}
                            className="ml-2"
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                          <div className="flex items-center gap-2">
                          <span className="font-sans text-sm text-gray-600">Price:</span>
                            <span className="font-display font-bold text-lg text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                              GHS {item.product?.price || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-display font-bold text-xl text-gray-900 mb-3">
                            {item.product?.name}
                          </h4>
                          <div className="flex flex-wrap gap-4 text-sm font-sans text-gray-700">
                            <div className="flex items-center gap-2">
                              <span>{item.quantity}GB</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{item.product?.network}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{item.product?.expiry}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{item.beneficiary_number}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="font-sans text-sm text-gray-500 mb-1">Data Size</div>
                            <div className="font-display font-bold text-lg text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                              {item.quantity}GB
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-sans text-sm text-gray-500 mb-1">Price</div>
                            <div className="font-display font-bold text-2xl text-green-600">
                              GHS {item.product?.price || 0}
                            </div>
                          </div>
                          
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRemove(item.id)}
                            className="ml-2"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total and Checkout Section */}
                  <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 sm:p-8 mt-8 border-2 border-green-300 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                      <div className="text-center sm:text-left">
                        <div className="font-sans text-sm text-gray-600 mb-2">
                          Total Amount
                        </div>
                        <div className="text-4xl sm:text-5xl font-display font-bold text-green-600">
                          GHS {total}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          onClick={() => router.visit('/dashboard')}
                          className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-green-400 hover:bg-green-50 transition-colors duration-200 font-display font-bold"
                        >
                          Add More Items
                        </Button>
                        
                        <Button 
                          onClick={() => router.visit('/checkout')}
                          className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-display font-bold px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                        >
                          Proceed to Checkout
                        </Button>
                      </div>
                    </div>
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