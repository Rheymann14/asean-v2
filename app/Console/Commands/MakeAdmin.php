<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserType;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class MakeAdmin extends Command
{
    protected $signature = 'make:admin';

    protected $description = 'Create an admin (CHED) account interactively';

    public function handle(): int
    {
        $this->info('Creating admin account...');
        $this->newLine();

        $name = $this->ask('Full name');

        $email = $this->askValidEmail();
        if ($email === null) {
            return self::FAILURE;
        }

        $password = $this->askValidPassword();
        if ($password === null) {
            return self::FAILURE;
        }

        $adminType = UserType::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'is_active' => true, 'sequence_order' => 0],
        );

        $user = User::create([
            'name'              => $name,
            'email'             => $email,
            'password'          => Hash::make($password),
            'user_type_id'      => $adminType->id,
            'is_active'         => true,
            'email_verified_at' => now(),
        ]);

        $this->newLine();
        $this->info('Admin account created successfully.');
        $this->table(
            ['Field', 'Value'],
            [
                ['Name',       $user->name],
                ['Email',      $user->email],
                ['Display ID', $user->display_id],
                ['Role',       $adminType->name],
            ]
        );

        return self::SUCCESS;
    }

    private function askValidEmail(): ?string
    {
        for ($attempts = 0; $attempts < 3; $attempts++) {
            $email = $this->ask('Email address');

            $validation = Validator::make(
                ['email' => $email],
                ['email' => 'required|email|unique:users,email'],
            );

            if ($validation->passes()) {
                return $email;
            }

            $this->error($validation->errors()->first('email'));
        }

        $this->error('Too many invalid attempts.');
        return null;
    }

    private function askValidPassword(): ?string
    {
        for ($attempts = 0; $attempts < 3; $attempts++) {
            $password = $this->secret('Password (min 8 characters)');
            $confirm  = $this->secret('Confirm password');

            if ($password !== $confirm) {
                $this->error('Passwords do not match.');
                continue;
            }

            $validation = Validator::make(
                ['password' => $password],
                ['password' => 'required|min:8'],
            );

            if ($validation->passes()) {
                return $password;
            }

            $this->error($validation->errors()->first('password'));
        }

        $this->error('Too many invalid attempts.');
        return null;
    }
}
