<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\WelcomeNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWelcomeNotifications implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 2;

    public function __construct(public int $userId) {}

    public function handle(WelcomeNotificationService $notifications): void
    {
        $user = User::query()->find($this->userId);

        if (! $user) {
            return;
        }

        $notifications->sendNow($user);
    }
}
