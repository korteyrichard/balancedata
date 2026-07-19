<?php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\Commission;
use App\Models\ReferralCommission;
use App\Models\Order;
use App\Models\Setting;
use App\Models\UserShop;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    public function withdrawals(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        $query = Withdrawal::with('agent.shop')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->whereHas('agent', function ($q) use ($request) {
                $q->where('email', 'like', '%' . $request->search . '%');
            });
        }

        $withdrawals = $query->paginate(50)->appends($request->query());

        return inertia('Admin/Withdrawals', [
            'withdrawals' => $withdrawals,
            'filters' => ['search' => $request->search]
        ]);
    }

    public function processWithdrawal(Request $request, Withdrawal $withdrawal)
    {
        $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string'
        ]);

        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        if ($withdrawal->status !== 'pending') {
            return redirect()->back()->with('error', 'Withdrawal already processed');
        }

        if ($request->action === 'approve') {
            $totalToDeduct = $withdrawal->amount;
            
            $this->markCommissionsAsWithdrawn($withdrawal->agent_id, $totalToDeduct);

            $withdrawal->update([
                'status' => 'approved',
                'notes' => $request->notes,
                'processed_at' => now()
            ]);

            return redirect()->back()->with('success', 'Withdrawal approved successfully. Agent will receive ₵' . number_format($withdrawal->net_amount, 2));
        } else {
            $withdrawal->update([
                'status' => 'rejected',
                'notes' => $request->notes,
                'processed_at' => now()
            ]);

            return redirect()->back()->with('success', 'Withdrawal rejected successfully.');
        }
    }

    private function markCommissionsAsWithdrawn(int $agentId, float $totalAmount): void
    {
        $remainingAmount = $totalAmount;
        
        \Log::info("Starting withdrawal process", [
            'agent_id' => $agentId,
            'total_amount' => $totalAmount,
            'remaining_amount' => $remainingAmount
        ]);
        
        $commissions = Commission::where('agent_id', $agentId)
            ->where('status', 'available')
            ->whereRaw('(commission_amount * quantity) > withdrawn_amount')
            ->orderBy('created_at', 'asc')
            ->get();
            
        \Log::info("Available commissions", [
            'count' => $commissions->count(),
            'total_available' => $commissions->sum(function($c) { 
                return ($c->commission_amount * $c->quantity) - $c->withdrawn_amount; 
            })
        ]);
            
        foreach ($commissions as $commission) {
            if ($remainingAmount <= 0) {
                \Log::info("Stopping - no remaining amount");
                break;
            }
            
            $commissionTotal = $commission->commission_amount * $commission->quantity;
            $availableFromCommission = $commissionTotal - $commission->withdrawn_amount;
            
            \Log::info("Processing commission", [
                'commission_id' => $commission->id,
                'commission_total' => $commissionTotal,
                'already_withdrawn' => $commission->withdrawn_amount,
                'available_from_commission' => $availableFromCommission,
                'remaining_amount' => $remainingAmount
            ]);
            
            if ($availableFromCommission <= $remainingAmount) {
                $commission->update([
                    'withdrawn_amount' => $commission->withdrawn_amount + $availableFromCommission,
                    'status' => $commission->withdrawn_amount + $availableFromCommission >= $commissionTotal ? 'withdrawn' : 'available'
                ]);
                $remainingAmount -= $availableFromCommission;
                \Log::info("Took all available from commission", [
                    'commission_id' => $commission->id,
                    'taken' => $availableFromCommission,
                    'remaining_amount' => $remainingAmount
                ]);
            } else {
                $commission->update([
                    'withdrawn_amount' => $commission->withdrawn_amount + $remainingAmount
                ]);
                \Log::info("Took partial amount from commission", [
                    'commission_id' => $commission->id,
                    'taken' => $remainingAmount,
                    'new_withdrawn_amount' => $commission->withdrawn_amount + $remainingAmount
                ]);
                $remainingAmount = 0;
            }
        }
        
        if ($remainingAmount > 0) {
            \Log::info("Processing referral commissions", ['remaining_amount' => $remainingAmount]);
            
            $referralCommissions = ReferralCommission::where('referrer_id', $agentId)
                ->where('status', 'available')
                ->whereRaw('referral_amount > withdrawn_amount')
                ->orderBy('created_at', 'asc')
                ->get();
                
            foreach ($referralCommissions as $referralCommission) {
                if ($remainingAmount <= 0) break;
                
                $availableFromReferral = $referralCommission->referral_amount - $referralCommission->withdrawn_amount;
                
                if ($availableFromReferral <= $remainingAmount) {
                    $referralCommission->update([
                        'withdrawn_amount' => $referralCommission->withdrawn_amount + $availableFromReferral,
                        'status' => $referralCommission->withdrawn_amount + $availableFromReferral >= $referralCommission->referral_amount ? 'withdrawn' : 'available'
                    ]);
                    $remainingAmount -= $availableFromReferral;
                    \Log::info("Took all available from referral commission", [
                        'referral_commission_id' => $referralCommission->id,
                        'taken' => $availableFromReferral,
                        'remaining_amount' => $remainingAmount
                    ]);
                } else {
                    $referralCommission->update([
                        'withdrawn_amount' => $referralCommission->withdrawn_amount + $remainingAmount
                    ]);
                    \Log::info("Took partial amount from referral commission", [
                        'referral_commission_id' => $referralCommission->id,
                        'taken' => $remainingAmount
                    ]);
                    $remainingAmount = 0;
                }
            }
        }
        
        \Log::info("Withdrawal process completed", ['final_remaining_amount' => $remainingAmount]);
    }

    public function agents(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        $search = $request->get('search');
        
        $storeOwnersQuery = \App\Models\User::whereHas('shop')
            ->with(['shop', 'commissions', 'withdrawals'])
            ->withCount(['commissions', 'withdrawals']);
            
        $adminsQuery = \App\Models\User::where('role', 'admin')
            ->whereDoesntHave('shop')
            ->with(['shop', 'commissions', 'withdrawals'])
            ->withCount(['commissions', 'withdrawals']);
            
        if ($search) {
            $storeOwnersQuery->where('email', 'like', '%' . $search . '%');
            $adminsQuery->where('email', 'like', '%' . $search . '%');
        }
        
        $storeOwners = $storeOwnersQuery->latest()->get();
        $admins = $adminsQuery->latest()->get();
        
        $allUsers = $storeOwners->concat($admins)->map(function ($user) {
            // Shop commissions
            $totalCommissions = $user->commissions->sum(function ($commission) {
                return $commission->commission_amount * $commission->quantity;
            });
            $availableCommissions = $user->commissions->where('status', 'available')->sum(function ($commission) {
                return ($commission->commission_amount * $commission->quantity) - ($commission->withdrawn_amount ?? 0);
            });
            
            // Referral commissions
            $referralCommissions = ReferralCommission::where('referrer_id', $user->id)->get();
            $totalReferrals = $referralCommissions->sum('referral_amount');
            $availableReferrals = $referralCommissions->where('status', 'available')->sum(function ($rc) {
                return $rc->referral_amount - ($rc->withdrawn_amount ?? 0);
            });
            
            $totalWithdrawals = $user->withdrawals->sum('amount');
            $pendingWithdrawals = $user->withdrawals->where('status', 'pending')->sum('amount');

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'agent_shop' => $user->shop ? [
                    'name' => $user->shop->name,
                    'slug' => $user->shop->slug,
                    'is_active' => $user->shop->is_active,
                ] : null,
                'stats' => [
                    'total_commissions' => (float) ($totalCommissions + $totalReferrals),
                    'available_commissions' => (float) ($availableCommissions + $availableReferrals),
                    'total_withdrawals' => (float) $totalWithdrawals,
                    'pending_withdrawals' => (float) $pendingWithdrawals,
                    'commissions_count' => $user->commissions_count,
                    'withdrawals_count' => $user->withdrawals_count,
                ]
            ];
        });
        
        $perPage = 50;
        $currentPage = $request->get('page', 1);
        $total = $allUsers->count();
        $offset = ($currentPage - 1) * $perPage;
        $items = $allUsers->slice($offset, $perPage)->values();
        
        $paginatedUsers = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $currentPage,
            [
                'path' => $request->url(),
                'pageName' => 'page',
            ]
        );
        
        $paginatedUsers->appends($request->query());

        $totalStores = \App\Models\UserShop::count();
        $activeStores = \App\Models\UserShop::where('is_active', true)->count();
        $totalStoreOwners = \App\Models\User::whereHas('shop')->count();
        $totalAdmins = \App\Models\User::where('role', 'admin')->count();
        
        $overallStats = [
            'total_agents' => $totalStoreOwners,
            'total_admins' => $totalAdmins,
            'agents_with_shops' => $activeStores,
            'total_agent_earnings' => $allUsers->sum('stats.total_commissions'),
            'total_pending_withdrawals' => $allUsers->sum('stats.pending_withdrawals'),
        ];

        return inertia('Admin/Agents', [
            'agents' => $paginatedUsers,
            'stats' => $overallStats,
            'filters' => [
                'search' => $search,
            ]
        ]);
    }

    public function commissions(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        $query = \App\Models\Commission::with(['agent.shop', 'product', 'order'])
            ->latest();

        if ($request->filled('search')) {
            $query->whereHas('agent', function ($q) use ($request) {
                $q->where('email', 'like', '%' . $request->search . '%');
            });
        }

        $commissions = $query->paginate(50)->appends($request->query());

        $stats = [
            'total_commissions' => (float) \App\Models\Commission::sum(\Illuminate\Support\Facades\DB::raw('commission_amount * quantity')),
            'pending_commissions' => (float) \App\Models\Commission::where('status', 'pending')
                ->sum(\Illuminate\Support\Facades\DB::raw('commission_amount * quantity')),
            'available_commissions' => (float) \App\Models\Commission::where('status', 'available')
                ->sum(\Illuminate\Support\Facades\DB::raw('commission_amount * quantity')),
            'withdrawn_commissions' => (float) \App\Models\Commission::where('status', 'withdrawn')
                ->sum(\Illuminate\Support\Facades\DB::raw('commission_amount * quantity')),
            'total_referral_commissions' => (float) \App\Models\ReferralCommission::sum('referral_amount'),
            'available_referral_commissions' => (float) \App\Models\ReferralCommission::where('status', 'available')
                ->sum('referral_amount'),
        ];

        return inertia('Admin/Commissions', [
            'commissions' => $commissions,
            'stats' => $stats,
            'filters' => ['search' => $request->search]
        ]);
    }

    public function settings()
    {
        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        $settings = [
            'minimum_withdrawal_amount' => Setting::get('minimum_withdrawal_amount', 10),
            'minimum_wallet_withdrawal_amount' => Setting::get('minimum_wallet_withdrawal_amount', 5),
            'referral_commission_amount' => Setting::get('referral_commission_amount', 5),
            'agent_upgrade_fee' => Setting::get('agent_upgrade_fee', 30),
            'track_order_video_url' => Setting::get('track_order_video_url', ''),
            'verify_topup_video_url' => Setting::get('verify_topup_video_url', ''),
            'whatsapp_community_link' => Setting::get('whatsapp_community_link', ''),
            'whatsapp_contact_link' => Setting::get('whatsapp_contact_link', ''),
            'telegram_channel_link' => Setting::get('telegram_channel_link', ''),
            'order_pusher_enabled' => Setting::get('order_pusher_enabled', false),
        ];

        return inertia('Admin/Settings', [
            'settings' => $settings
        ]);
    }

    public function updateSettings(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return redirect()->route('home')->with('error', 'Access denied');
        }

        $request->validate([
            'minimum_withdrawal_amount' => 'required|numeric|min:1',
            'minimum_wallet_withdrawal_amount' => 'required|numeric|min:1',
            'referral_commission_amount' => 'required|numeric|min:0',
            'agent_upgrade_fee' => 'required|numeric|min:0',
            'track_order_video_url' => 'nullable|url',
            'verify_topup_video_url' => 'nullable|url',
            'whatsapp_community_link' => 'nullable|url',
            'whatsapp_contact_link' => 'nullable|url',
            'telegram_channel_link' => 'nullable|url',
        ]);

        Setting::set('minimum_withdrawal_amount', $request->minimum_withdrawal_amount);
        Setting::set('minimum_wallet_withdrawal_amount', $request->minimum_wallet_withdrawal_amount);
        Setting::set('referral_commission_amount', $request->referral_commission_amount);
        Setting::set('agent_upgrade_fee', $request->agent_upgrade_fee);
        Setting::set('track_order_video_url', $request->track_order_video_url);
        Setting::set('verify_topup_video_url', $request->verify_topup_video_url);
        Setting::set('whatsapp_community_link', $request->whatsapp_community_link);
        Setting::set('whatsapp_contact_link', $request->whatsapp_contact_link);
        Setting::set('telegram_channel_link', $request->telegram_channel_link);
        Setting::set('order_pusher_enabled', $request->has('order_pusher_enabled') && $request->order_pusher_enabled);

        return redirect()->back()->with('success', 'Store management settings updated successfully');
    }
}
