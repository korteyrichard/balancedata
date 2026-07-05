import React, { useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Store, User, X, Search, MessageCircle, Youtube } from 'lucide-react';

interface Agent {
    name?: string;
    phone?: string;
}

interface Shop {
    id?: number;
    name?: string;
    slug?: string;
    primary_color?: string;
    background_color?: string;
}

interface Product {
    id: number;
    product?: { name: string; network: string };
    variant?: { name: string; price: number; variant_attributes: any };
    agent_price: number;
    commission_amount: number;
}

interface ShopShowProps {
    shop: Shop;
    products: Product[];
    agent: Agent;
    trackOrderVideoUrl: string;
}

export default function Show({ shop, products, agent, trackOrderVideoUrl }: ShopShowProps) {
    const [selectedNetwork, setSelectedNetwork] = useState('MTN');
    const [email, setEmail] = useState('');
    const [beneficiaryNumber, setBeneficiaryNumber] = useState('');
    const [bundleSize, setBundleSize] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [availableSizes, setAvailableSizes] = useState<Array<{value: string, label: string, price: number}>>([]);
    const [loadingSizes, setLoadingSizes] = useState(false);
    
    const { data, setData, post, processing, errors } = useForm({
        payment_reference: '',
        beneficiary_number: ''
    });

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
            const networkProducts = products?.filter(product => {
                const productNetwork = product.product?.network?.toUpperCase();
                return productNetwork === network.toUpperCase();
            }) || [];

            const sizes = networkProducts.map(product => {
                const variant = product.variant;
                let sizeLabel = 'Unknown Size';
                let sizeValue = '';
                
                if (variant?.variant_attributes && typeof variant.variant_attributes === 'object') {
                    const attributes = variant.variant_attributes;
                    const sizeKeys = ['size', 'Size', 'SIZE', 'bundle', 'Bundle', 'BUNDLE'];
                    
                    for (const key of sizeKeys) {
                        if (attributes[key]) {
                            sizeLabel = attributes[key];
                            sizeValue = attributes[key];
                            break;
                        }
                    }
                    
                    if (!sizeValue) {
                        const values = Object.values(attributes);
                        if (values.length > 0) {
                            sizeLabel = values[0] as string;
                            sizeValue = values[0] as string;
                        }
                    }
                }
                
                return {
                    value: sizeValue,
                    label: sizeLabel,
                    price: parseFloat(product.agent_price?.toString() || '0')
                };
            }).filter(size => size.value);

            const uniqueSizes = sizes.filter((size, index, self) => 
                index === self.findIndex(s => s.value === size.value)
            );

            setAvailableSizes(uniqueSizes);
        } catch (error) {
            setAvailableSizes([]);
        } finally {
            setLoadingSizes(false);
        }
    };

    const handleNetworkChange = (networkId: string) => {
        setSelectedNetwork(networkId);
        setBundleSize('');
        fetchBundleSizes(networkId);
    };

    useEffect(() => {
        fetchBundleSizes(selectedNetwork);
    }, [products]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !beneficiaryNumber || !bundleSize) return;
        
        setLoading(true);
        
        try {
            const selectedSize = availableSizes.find(size => size.value === bundleSize);
            if (!selectedSize) {
                alert('Please select a valid bundle size');
                setLoading(false);
                return;
            }

            const matchingProduct = products?.find(product => {
                const productNetwork = product.product?.network?.toUpperCase();
                const selectedNetworkUpper = selectedNetwork.toUpperCase();
                
                if (productNetwork !== selectedNetworkUpper) return false;
                
                const variant = product.variant;
                if (!variant?.variant_attributes) return false;
                
                const attributes = variant.variant_attributes;
                if (typeof attributes === 'object') {
                    const sizeKeys = ['size', 'Size', 'SIZE', 'bundle', 'Bundle', 'BUNDLE'];
                    for (const key of sizeKeys) {
                        if (attributes[key] === bundleSize) return true;
                    }
                    const values = Object.values(attributes);
                    return values.includes(bundleSize);
                }
                return false;
            });

            if (!matchingProduct) {
                alert(`No product found for ${selectedNetwork} ${bundleSize}. Please contact the agent.`);
                setLoading(false);
                return;
            }

            const response = await fetch('/guest/payment/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    email,
                    agent_product_id: matchingProduct.id,
                    beneficiary_number: beneficiaryNumber
                })
            });
            
            const result = await response.json();
            
            if (result.status) {
                window.location.href = result.data.authorization_url;
            } else {
                alert(`Payment initialization failed: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            alert(`An error occurred: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppContact = () => {
        if (agent?.phone) {
            const whatsappUrl = `https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const handleTrackOrder = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shop.find-order', shop?.slug || ''));
    };

    return (
        <>
            <Head title={shop?.name || 'Shop'}>
                <meta property="og:title" content={shop?.name || 'Shop'} />
                <meta property="og:description" content={`Shop by ${agent?.name || 'Agent'} - Buy data bundles online`} />
                <meta property="og:image" content={`${window.location.origin}/logo.svg`} />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={shop?.name || 'Shop'} />
                <meta name="twitter:description" content={`Shop by ${agent?.name || 'Agent'} - Buy data bundles online`} />
                <meta name="twitter:image" content={`${window.location.origin}/logo.svg`} />
            </Head>
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-800 dark:via-blue-700 dark:to-indigo-800 shadow-lg">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
                    </div>
                    
                    <div className="relative container mx-auto px-4 py-5 flex justify-center">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-1.5 rounded-lg shadow-lg border border-white border-opacity-20 flex items-center justify-center w-12 h-12">
                                <span className="text-lg font-bold text-blue-900">M</span>
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white">myshop</h1>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Action Bar */}
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row justify-center gap-2 flex-wrap">
                        <Dialog open={showTrackModal} onOpenChange={setShowTrackModal}>
                            <DialogTrigger asChild>
                                <Button 
                                    className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-semibold shadow-md hover:shadow-lg transition-all text-sm"
                                >
                                    <Search className="h-4 w-4 mr-1" />
                                    Track Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
                                <DialogHeader>
                                    <DialogTitle className="text-center text-xl text-gray-900 dark:text-gray-100">Track Your Order</DialogTitle>
                                </DialogHeader>
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mb-3 mx-auto">
                                        <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        Enter your order details to check status
                                    </p>
                                </div>
                                <form onSubmit={handleTrackOrder} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Paystack Reference</label>
                                        <Input
                                            type="text"
                                            placeholder="Enter paystack reference"
                                            value={data.payment_reference}
                                            onChange={(e) => setData('payment_reference', e.target.value)}
                                            required
                                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                        />
                                        <p className="text-red-500 text-xs mt-1">This can be found in your email/gmail message</p>
                                        {errors.payment_reference && (
                                            <p className="text-red-500 text-xs mt-1">{errors.payment_reference}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Beneficiary Phone Number (10 digits)</label>
                                        <Input
                                            type="text"
                                            placeholder="Enter 10-digit phone number"
                                            value={data.beneficiary_number}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setData('beneficiary_number', value);
                                            }}
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            required
                                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                        />
                                        {data.beneficiary_number && data.beneficiary_number.length !== 10 && (
                                            <p className="text-red-500 text-xs mt-1">Phone number must be exactly 10 digits</p>
                                        )}
                                        {errors.beneficiary_number && (
                                            <p className="text-red-500 text-xs mt-1">{errors.beneficiary_number}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setShowTrackModal(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={processing || !data.payment_reference || data.beneficiary_number.length !== 10}
                                            className="flex-1 text-white"
                                            style={{ backgroundColor: shop?.primary_color || '#3B82F6' }}
                                        >
                                            <Search className="h-4 w-4 mr-2" />
                                            {processing ? 'Searching...' : 'Track Order'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                        
                        {trackOrderVideoUrl && (
                            <Button 
                                onClick={() => window.open(trackOrderVideoUrl, '_blank')}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all text-sm"
                            >
                                <Youtube className="h-4 w-4 mr-1" />
                                How to Track
                            </Button>
                        )}
                        
                        {agent?.phone && (
                            <Button 
                                onClick={handleWhatsAppContact}
                                className="bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md hover:shadow-lg transition-all text-sm"
                            >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Contact Agent
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Order Section */}
                <div className="container mx-auto px-4 py-8 pb-16">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-w-4xl mx-auto">
                        <div className="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Place Your Order</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Select network, enter your details, and choose a bundle size</p>
                        </div>

                        <div className="p-6 sm:p-8">
                            {/* Network Selection */}
                            <div className="mb-8">
                                <label className="block text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Select Network</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {networks.map((network) => (
                                        <button
                                            key={network.id}
                                            onClick={() => handleNetworkChange(network.id)}
                                            className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                                selectedNetwork === network.id
                                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-lg'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-gray-50 dark:bg-gray-700'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className={`w-14 h-14 ${network.color} rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md`}>
                                                    <img src={network.icon} alt={`${network.name} logo`} className="w-10 h-10" />
                                                </div>
                                                <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{network.name}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Order Form */}
                            <form onSubmit={handlePayment} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Email Address</label>
                                        <Input
                                            type="email"
                                            placeholder="your.email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 h-12 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Beneficiary Number</label>
                                        <Input
                                            type="text"
                                            placeholder="0240000000"
                                            value={beneficiaryNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setBeneficiaryNumber(value);
                                            }}
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            required
                                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 h-12 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        {beneficiaryNumber && beneficiaryNumber.length !== 10 && (
                                            <p className="text-red-500 text-xs mt-1">Must be exactly 10 digits</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Bundle Size</label>
                                    <Select value={bundleSize} onValueChange={setBundleSize}>
                                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 h-12 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <SelectValue placeholder={loadingSizes ? "Loading sizes..." : "Select bundle size"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSizes.map((size) => (
                                                <SelectItem key={size.value} value={size.value}>
                                                    {size.label} - ₵{size.price}
                                                </SelectItem>
                                            ))}
                                            {availableSizes.length === 0 && !loadingSizes && (
                                                <SelectItem value="no-sizes" disabled>
                                                    No sizes available for {selectedNetwork}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {bundleSize && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Amount:</span>
                                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                                ₵{availableSizes.find(size => size.value === bundleSize)?.price || 0}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    disabled={loading || !email || beneficiaryNumber.length !== 10 || !bundleSize}
                                    className={`w-full text-white py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${getNetworkButtonColors(selectedNetwork)}`}
                                >
                                    <ShoppingCart className="h-5 w-5 mr-2 inline" />
                                    {loading ? 'Processing Payment...' : 'Buy Now'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
