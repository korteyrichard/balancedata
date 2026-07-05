<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Services\AgentService;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function __construct(private AgentService $agentService) {}

    public function initializePayment(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'amount' => 'required|numeric|min:1'
        ]);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email' => $request->email,
            'amount' => (int) round($request->amount * 100),
            'callback_url' => route('payment.callback'),
            'reference' => Str::random(16)
        ]);

        if ($response->successful()) {
            return redirect($response->json('data.authorization_url'));
        }

        return back()->with('error', 'Payment initialization failed');
    }

    public function handleCallback(Request $request)
    {
        $reference = $request->reference;
        
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
        ])->get("https://api.paystack.co/transaction/verify/{$reference}");

        if ($response->successful() && $response->json('data.status') === 'success') {
            $data = $response->json('data');
            
            // Check if this is an agent upgrade
            if (isset($data['metadata']['upgrade_to_agent']) && $data['metadata']['upgrade_to_agent']) {
                $user = \App\Models\User::find($data['metadata']['user_id']);
                
                if ($user) {
                    try {
                        // Get referrer from the referral relationship
                        $referrerId = null;
                        $referral = $user->referredBy;
                        if ($referral) {
                            $referrerId = $referral->referrer_id;
                        }
                        
                        $this->agentService->upgradeToAgent($user, $referrerId);
                        return redirect()->route('agent.dashboard')->with('success', 'Successfully upgraded to agent!');
                    } catch (\Exception $e) {
                        return redirect()->route('dashboard')->with('error', 'Payment successful but upgrade failed: ' . $e->getMessage());
                    }
                }
            }
            
            // Payment successful - update your database here
            return redirect()->route('payment.success');
        }

        return redirect()->route('payment.failed');
    }
}
