<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For Inertia requests, always redirect to login (don't return null)
        if ($request->expectsJson() && $request->header('X-Inertia')) {
            return route('login');
        }
        
        return $request->expectsJson() ? null : route('login');
    }
    
    /**
     * Handle an unauthenticated user.
     */
    protected function unauthenticated($request, array $guards)
    {
        // For Inertia requests, redirect to login
        if ($request->header('X-Inertia')) {
            return redirect()->route('login');
        }
        
        parent::unauthenticated($request, $guards);
    }
}