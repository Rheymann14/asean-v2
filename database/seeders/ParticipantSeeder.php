<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\UserType;
use Illuminate\Database\Seeder;

class ParticipantSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        
        $countries = [
            ['code' => 'BRN', 'name' => 'Brunei',       'flag' => '/asean/brunei.jpg'],
            ['code' => 'KHM', 'name' => 'Cambodia',     'flag' => '/asean/cambodia.jpg'],
            ['code' => 'IDN', 'name' => 'Indonesia',    'flag' => '/asean/indonesia.jpg'],
            ['code' => 'LAO', 'name' => 'Laos',         'flag' => '/asean/laos.jpg'],
            ['code' => 'MYS', 'name' => 'Malaysia',     'flag' => '/asean/malaysia.jpg'],
            ['code' => 'MMR', 'name' => 'Myanmar',      'flag' => '/asean/myanmar.jpg'],
            ['code' => 'PHL', 'name' => 'Philippines',  'flag' => '/asean/philippines.jpg'],
            ['code' => 'SGP', 'name' => 'Singapore',    'flag' => '/asean/singapore.jpg'],
            ['code' => 'THA', 'name' => 'Thailand',     'flag' => '/asean/thailand.jpg'],
            ['code' => 'VNM', 'name' => 'Vietnam',      'flag' => '/asean/vietnam.jpg'],
            ['code' => 'TLS', 'name' => 'Timor-Leste',  'flag' => '/asean/timor-leste.jpg'],
        ];


        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['code' => $country['code']],
                [
                    'name' => $country['name'],
                    'flag_path' => $country['flag'],
                    'is_active' => true,
                ]
            );
        }

        $userTypes = [
            'Admin',
            'CHED',
            'CHED LO',
            'Embassy Official/Representative',
            'Government Official',
            'Academic / Researcher',
            'NGO Representative',
            'Private Sector Delegate',
            'Media / Press',
            'Student / Youth Delegate',
            'Event Staff / Volunteer',
            'Other',
        ];

        foreach ($userTypes as $type) {
            UserType::updateOrCreate(
                ['name' => $type],
                [
                    'slug' => \Illuminate\Support\Str::slug($type),
                    'is_active' => true,
                ]
            );
        }
    }
}
