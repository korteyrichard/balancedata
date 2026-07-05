import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [scrolled, setScrolled] = useState(false);
    const [navOpen, setNavOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setNavOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            <Head title="BalancedData - Premium Data Services">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </Head>
            
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 font-sans">
                {/* Navigation */}
                <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                    scrolled 
                        ? 'bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50' 
                        : 'bg-transparent'
                }`}>
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div>
                                <img src='/balancedata.jpg' alt="BalancedData" className="h-12 w-auto object-contain" />
                            </div>
                            
                            <button
                                className="lg:hidden text-white p-2"
                                onClick={() => setNavOpen(!navOpen)}
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            
                            <div className="hidden lg:flex space-x-6">
                                {auth.user ? (
                                    <Link
                                        href={auth.user.role === 'admin' ? route('admin.dashboard') : route('dashboard')}
                                        className="px-8 py-3 bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors duration-200"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="px-8 py-3 bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors duration-200"
                                        >
                                            Get Started
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="px-8 py-3 border border-white text-white font-semibold hover:bg-white hover:text-slate-900 transition-colors duration-200"
                                        >
                                            Login
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {navOpen && (
                            <div className="lg:hidden pb-6">
                                <div className="flex flex-col space-y-4">
                                    {auth.user ? (
                                        <Link
                                            href={auth.user.role === 'admin' ? route('admin.dashboard') : route('dashboard')}
                                            className="px-8 py-3 bg-green-600 text-white font-semibold text-center hover:bg-green-700 transition-colors duration-200"
                                            onClick={() => setNavOpen(false)}
                                        >
                                            Dashboard
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={route('register')}
                                                className="px-8 py-3 bg-green-600 text-white font-semibold text-center hover:bg-green-700 transition-colors duration-200"
                                                onClick={() => setNavOpen(false)}
                                            >
                                                Get Started
                                            </Link>
                                            <Link
                                                href={route('login')}
                                                className="px-8 py-3 border border-white text-white font-semibold text-center hover:bg-white hover:text-slate-900 transition-colors duration-200"
                                                onClick={() => setNavOpen(false)}
                                            >
                                                Login
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="min-h-screen flex items-center justify-center px-6 lg:px-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20"></div>
                    
                    <div className="max-w-5xl mx-auto text-center relative z-10 pt-20">
                        <h1 className="text-5xl lg:text-7xl font-display font-bold text-white mb-8 leading-tight">
                            Buy Data. Sell Data.
                            <span className="block text-green-400">Make Profit.</span>
                        </h1>
                        
                        <p className="text-xl lg:text-2xl font-sans text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                            Affordable, reliable data bundles for personal use or reselling.
                            <br />
                            Trusted nationwide across Ghana.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            {auth.user ? (
                                <Link
                                    href={auth.user.role === 'admin' ? route('admin.dashboard') : route('dashboard')}
                                    className="px-12 py-4 bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors duration-200"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('register')}
                                        className="px-12 py-4 bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors duration-200"
                                    >
                                        Start Today
                                    </Link>
                                    <Link
                                        href={route('login')}
                                        className="px-12 py-4 border-2 border-white text-white font-bold text-lg hover:bg-white hover:text-slate-900 transition-colors duration-200"
                                    >
                                        Login
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
