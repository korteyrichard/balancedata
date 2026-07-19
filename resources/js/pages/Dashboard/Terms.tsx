import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Head } from '@inertiajs/react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Props {
    auth: {
        user: User;
    };
}

export default function Terms({ auth }: Props) {
    return (
        <DashboardLayout user={auth.user} header="Terms & Conditions">
            <Head title="Terms & Conditions" />

            <div className="max-w-4xl mx-auto py-10 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Important Terms & Conditions</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Please read carefully before using our services</p>

                {/* Complaint Reporting Policy */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">1. Complaint Reporting Policy</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        All complaints must be reported within 24 hours of the transaction. Failure to report issues within this timeframe means we cannot provide assistance or refunds. This policy ensures timely resolution and proper investigation of any problems.
                    </p>
                </div>

                {/* Multiple Orders Restriction */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">2. Multiple Orders Restriction</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Do not place multiple orders for the same phone number. Our system prevents duplicate transactions to the same number. If you attempt to place multiple orders for the same number, you will lose your money as the system does not allow such transactions.
                    </p>
                </div>

                {/* Important Notice */}
                <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 p-6 rounded">
                    <h3 className="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-100">Important Notice</h3>
                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                        By using our services, you acknowledge that you have read, understood, and agree to these terms and conditions. These policies are in place to ensure fair usage and protect both our customers and our service integrity.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
