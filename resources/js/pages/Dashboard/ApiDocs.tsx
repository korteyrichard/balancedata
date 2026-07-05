import React, { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Head } from '@inertiajs/react';
import { Copy, Check, ChevronDown, Code2, Lock, Zap, BookOpen, ExternalLink } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Webhook {
    id: number;
    url: string;
    secret: string;
    is_active: boolean;
    created_at: string;
}

interface Product {
    id: number;
    network: string;
}

interface Props {
    auth: {
        user: User;
    };
    appUrl: string;
    products: Product[];
}

const CodeBlock = ({ code, language = 'json', title }: { code: string; language?: string; title?: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
            {title && (
                <div className="px-4 py-2 bg-gray-200 border-b border-gray-300 flex justify-between items-center">
                    <span className="text-xs font-mono text-gray-700">{title}</span>
                    <button
                        onClick={handleCopy}
                        className="text-gray-700 hover:text-black transition-colors"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
            )}
            <pre className="p-4 overflow-x-auto">
                <code className={`text-sm font-mono text-gray-900 language-${language}`}>
                    {code}
                </code>
            </pre>
        </div>
    );
};

const Endpoint = ({ method, path, description, params, response, example }: any) => {
    const [expanded, setExpanded] = useState(false);
    
    const methodColor = {
        GET: 'bg-blue-100 text-blue-700 border-blue-300',
        POST: 'bg-green-100 text-green-700 border-green-300',
        PUT: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        DELETE: 'bg-red-100 text-red-700 border-red-300',
    };

    return (
        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-4 flex-1 text-left">
                    <span className={`px-3 py-1 rounded font-mono font-bold text-sm border ${methodColor[method as keyof typeof methodColor]}`}>
                        {method}
                    </span>
                    <code className="text-black font-mono text-sm">{path}</code>
                    <span className="text-gray-600 text-sm ml-auto">{description}</span>
                </div>
                <ChevronDown 
                    size={20} 
                    className={`text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {expanded && (
                <div className="border-t border-gray-300 px-6 py-4 space-y-6 bg-gray-50">
                    {params && (
                        <div>
                            <h4 className="text-sm font-semibold text-black mb-3">Parameters</h4>
                            <div className="space-y-2">
                                {params.map((param: any, idx: number) => (
                                    <div key={idx} className="text-sm text-gray-900">
                                        <span className="font-mono font-semibold text-blue-700">{param.name}</span>
                                        <span className="text-gray-700"> - {param.type}</span>
                                        {param.required && <span className="text-red-700 ml-2">*required</span>}
                                        <p className="text-gray-600 text-xs mt-1">{param.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {example && (
                        <div>
                            <h4 className="text-sm font-semibold text-black mb-3">Request Example</h4>
                            <CodeBlock code={example} />
                        </div>
                    )}

                    {response && (
                        <div>
                            <h4 className="text-sm font-semibold text-black mb-3">Response</h4>
                            <CodeBlock code={response} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ApiDocs({ auth, appUrl, products }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookLoading, setWebhookLoading] = useState(false);
    const [webhookError, setWebhookError] = useState('');
    const [copiedUrl, setCopiedUrl] = useState(false);

    React.useEffect(() => {
        fetchExistingToken();
    }, []);

    React.useEffect(() => {
        if (token) {
            fetchWebhooks();
        }
    }, [token]);

    const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const fetchWebhooks = async () => {
        try {
            const res = await fetch('/api/v1/webhooks', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setWebhooks(data.webhooks);
            }
        } catch (err) { console.error(err); }
    };

    const handleAddWebhook = async (e: React.FormEvent) => {
        e.preventDefault();
        setWebhookLoading(true);
        setWebhookError('');
        try {
            const res = await fetch('/api/v1/webhooks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                body: JSON.stringify({ url: webhookUrl }),
            });
            if (res.ok) {
                const data = await res.json();
                setWebhooks([...webhooks, data.webhook]);
                setWebhookUrl('');
            } else {
                const data = await res.json();
                setWebhookError(data.message || 'Failed to add webhook');
            }
        } catch (err) {
            setWebhookError('Network error');
        } finally {
            setWebhookLoading(false);
        }
    };

    const handleDeleteWebhook = async (id: number) => {
        await fetch(`/api/v1/webhooks/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
        });
        setWebhooks(webhooks.filter(w => w.id !== id));
    };

    const fetchExistingToken = async () => {
        try {
            const response = await fetch('/api/v1/get-token', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    setToken(data.token);
                }
            }
        } catch (err) {
            console.error('Failed to fetch existing token:', err);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/v1/token/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (token) {
            try {
                const response = await fetch('/api/v1/logout-all', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                    },
                });
                const data = await response.json();
                console.log('Logout response:', data);
            } catch (err) {
                console.error('Logout failed:', err);
            }
        }
        setToken('');
        setEmail('');
        setPassword('');
        setError('');
    };

    const copyBaseUrl = () => {
        navigator.clipboard.writeText(appUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const productsResponse = JSON.stringify({ success: true, data: products }, null, 2);

    return (
        <DashboardLayout user={auth.user} header="API Documentation">
            <Head title="API Documentation" />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen size={32} />
                        <h1 className="text-4xl font-bold">API Documentation</h1>
                    </div>
                    <p className="text-blue-100 text-lg mb-6">Complete guide to integrate with our API</p>
                    
                    {/* Base URL */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                        <p className="text-sm text-white font-semibold mb-2">Base URL</p>
                        <div className="flex items-center gap-2 bg-white/10 rounded px-4 py-3 font-mono text-white text-base">
                            <span className="flex-1 break-all">{appUrl}/api/v1</span>
                            <button
                                onClick={copyBaseUrl}
                                className="ml-2 p-2 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                            >
                                {copiedUrl ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-2 bg-white rounded-lg p-4 border border-gray-300 shadow">
                            <h3 className="font-bold text-black text-sm mb-4">NAVIGATION</h3>
                            <a href="#auth" className="block text-gray-700 hover:text-black text-sm py-2 px-3 rounded hover:bg-gray-100 transition-colors">
                                <Lock size={16} className="inline mr-2" />Authentication
                            </a>
                            <a href="#orders" className="block text-gray-700 hover:text-black text-sm py-2 px-3 rounded hover:bg-gray-100 transition-colors">
                                <Zap size={16} className="inline mr-2" />Orders
                            </a>
                            <a href="#afa" className="block text-gray-700 hover:text-black text-sm py-2 px-3 rounded hover:bg-gray-100 transition-colors">
                                <Code2 size={16} className="inline mr-2" />AFA
                            </a>
                            <a href="#webhooks" className="block text-gray-700 hover:text-black text-sm py-2 px-3 rounded hover:bg-gray-100 transition-colors">
                                <ExternalLink size={16} className="inline mr-2" />Webhooks
                            </a>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Authentication Section */}
                        <div id="auth" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Lock size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black">Authentication</h2>
                            </div>

                            <div className="bg-white border border-gray-300 rounded-lg p-6 shadow">
                                <p className="text-black mb-4 font-medium">All API requests require an authentication token. Generate a token using your credentials:</p>
                                
                                {!token ? (
                                    <form onSubmit={handleLogin} className="space-y-4 max-w-md">
                                        <div>
                                            <label className="block text-sm font-medium text-black mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                placeholder="your@email.com"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-black mb-2">Password</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                        {error && <div className="text-red-700 text-sm bg-red-100 p-3 rounded">{error}</div>}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Generating...' : 'Generate Token'}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-black mb-2">Your API Token</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm text-black break-all">
                                                    {token}
                                                </div>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(token)}
                                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                                                >
                                                    <Copy size={18} className="text-black" />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>

                            <CodeBlock 
                                code={`Authorization: Bearer YOUR_API_TOKEN\nContent-Type: application/json\nAccept: application/json`}
                                title="Required Headers"
                            />
                        </div>

                        {/* Orders API */}
                        <div id="orders" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                    <Zap size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black">Orders API</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <Endpoint
                                    method="GET"
                                    path="/products"
                                    description="Get available products for your role"
                                    response={productsResponse}
                                />

                                <Endpoint
                                    method="GET"
                                    path="/normal-orders"
                                    description="Get all orders"
                                    response={`{
  "success": true,
  "data": [
    {
      "id": 123,
      "beneficiary_number": "0241234567",
      "network_id": 1,
      "size": "1GB",
      "total": "10.00",
      "status": "completed",
      "created_at": "2026-06-21T19:30:00Z"
    }
  ]
}`}
                                />

                                <Endpoint
                                    method="POST"
                                    path="/normal-orders"
                                    description="Create new order"
                                    params={[
                                        { name: 'beneficiary_number', type: 'string', required: true, description: 'Phone number (e.g., 0241234567)' },
                                        { name: 'network_id', type: 'integer', required: true, description: 'Product ID (get available IDs from /products endpoint)' },
                                        { name: 'size', type: 'string', required: true, description: 'Data size (e.g., 1GB, 500MB)' },
                                    ]}
                                    example={`{
  "beneficiary_number": "0241234567",
  "network_id": 1,
  "size": "1GB"
}`}
                                    response={`{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 124,
    "reference_id": "ORD124",
    "status": "pending",
    "created_at": "2026-06-21T19:30:00Z"
  }
}`}
                                />
                            </div>
                        </div>

                        {/* AFA API */}
                        <div id="afa" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <Code2 size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black">AFA API</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <Endpoint
                                    method="GET"
                                    path="/afa"
                                    description="Get AFA orders"
                                    response={`{
  "success": true,
  "data": [...]
}`}
                                />

                                <Endpoint
                                    method="GET"
                                    path="/afa/products"
                                    description="Get available AFA products"
                                    response={`{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Premium Package",
      "price": "50.00"
    }
  ]
}`}
                                />

                                <Endpoint
                                    method="POST"
                                    path="/afa"
                                    description="Create AFA order"
                                    params={[
                                        { name: 'afa_product_id', type: 'integer', required: true, description: 'Product ID' },
                                        { name: 'full_name', type: 'string', required: true, description: 'Full name' },
                                        { name: 'email', type: 'string', required: true, description: 'Email address' },
                                        { name: 'phone', type: 'string', required: true, description: 'Phone number' },
                                    ]}
                                    example={`{
  "afa_product_id": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "0241234567",
  "dob": "1990-01-01",
  "occupation": "Developer",
  "region": "Greater Accra"
}`}
                                    response={`{
  "success": true,
  "message": "AFA order created",
  "data": { "id": 1 }
}`}
                                />
                            </div>
                        </div>

                        {/* Webhooks */}
                        <div id="webhooks" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <ExternalLink size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black">Webhooks</h2>
                            </div>

                            <div className="bg-white border border-gray-300 rounded-lg p-6 shadow">
                                <p className="text-black mb-4 font-medium">Register webhook URLs to receive real-time updates when order status changes.</p>
                            </div>

                            {token && (
                                <>
                                    <form onSubmit={handleAddWebhook} className="bg-white border border-gray-300 rounded-lg p-6 space-y-4 shadow">
                                        <div>
                                            <label className="block text-sm font-medium text-black mb-2">Webhook URL</label>
                                            <input
                                                type="url"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                                placeholder="https://yoursite.com/api/webhook/order-status"
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        {webhookError && <div className="text-red-700 text-sm">{webhookError}</div>}
                                        <button
                                            type="submit"
                                            disabled={webhookLoading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {webhookLoading ? 'Adding...' : 'Add Webhook'}
                                        </button>
                                    </form>

                                    {webhooks.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-black">Your Webhooks</h3>
                                            {webhooks.map((wh) => (
                                                <div key={wh.id} className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-between shadow">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-black truncate">{wh.url}</p>
                                                        <p className="text-xs text-gray-600 mt-1 font-mono">{wh.secret}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteWebhook(wh.id)}
                                                        className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex-shrink-0"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-4">
                                <h3 className="font-semibold text-black">Webhook Payload</h3>
                                <CodeBlock 
                                    code={`{
  "event": "order.status_changed",
  "order_id": 123,
  "reference_id": "ORD123",
  "status": "completed",
  "beneficiary_number": "0241234567",
  "network": "MTN",
  "total": 10.00,
  "timestamp": "2026-06-21T19:30:00Z"
}`}
                                    title="Example Webhook Payload"
                                />

                                <h3 className="font-semibold text-black">Verifying Webhook Signature</h3>
                                <CodeBlock 
                                    code={`// PHP
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$expected = hash_hmac('sha256', $payload, 'YOUR_WEBHOOK_SECRET');

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

// Process webhook
$data = json_decode($payload, true);
echo json_encode(['success' => true]);`}
                                    language="php"
                                    title="Verify Signature (PHP)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
