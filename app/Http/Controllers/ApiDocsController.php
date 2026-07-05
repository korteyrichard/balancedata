<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Product;

class ApiDocsController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        if ($user->role === 'customer') {
            $productType = 'customer_product';
        } elseif ($user->role === 'dealer') {
            $productType = 'dealer_product';
        } else {
            $productType = 'agent_product';
        }
        
        $products = Product::where('product_type', $productType)
            ->select('id', 'network')
            ->orderBy('network')
            ->get();
        
        return Inertia::render('Dashboard/ApiDocs', [
            'appUrl' => config('app.url'),
            'products' => $products,
        ]);
    }
}
