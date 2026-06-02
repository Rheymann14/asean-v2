<?php

namespace Database\Seeders;

use App\Models\Programme;
use Illuminate\Database\Seeder;

class EventRegistrationFieldsSeeder extends Seeder
{
    public function run(): void
    {
        if (config('services.registration.welcome_dinner_enabled', false)) {
            $this->seedWelcomeDinner();
        }

        $this->seedAsemme10();
    }

    private function seedWelcomeDinner(): void
    {
        $event = $this->eventFromEnvOrTitle('WELCOME_DINNER_EVENT_ID', 'Welcome Dinner');

        if (! $event) {
            $this->command?->warn('Welcome Dinner fields were not seeded.');

            return;
        }

        $this->replaceFields($event, [
            $this->section('Welcome Dinner Preferences'),
            $this->radio('attend_welcome_dinner', 'Will you attend the Welcome Dinner?', ['Yes', 'No'], true),
            $this->radio('avail_transport_from_makati_to_peninsula', 'Will you avail transport from Makati to The Peninsula?', ['Yes', 'No']),
        ]);

        $this->command?->info("Welcome Dinner fields seeded for event #{$event->id}.");
    }

    private function seedAsemme10(): void
    {
        $event = $this->eventFromEnvOrTitle('ASEMME10_EVENT_ID', 'ASEMME10')
            ?? Programme::query()
                ->where('title', 'like', '%Asia-Europe Meeting of Ministers for Education%')
                ->first();

        if (! $event) {
            $this->command?->warn('ASEMME10 fields were not seeded.');

            return;
        }

        $fields = [
            $this->section('Consent'),
            $this->radio('data_collection_confirmation', 'I confirm that I have read and understood the data collection notice.', ['Yes'], true),
            $this->radio('data_storage_consent', 'I consent to the submitted data being collected and stored only for organising this Ministerial Meeting.', ['Yes'], true),
            $this->radio('photo_video_consent', 'I consent to photo, video, and meeting recording use for event documentation.', ['I agree to these terms and conditions'], true),
            $this->radio('registration_type', 'I would like to register...', [
                'Country Delegation',
                'Stakeholder Delegation',
                'ASEAN Secretariat',
                'European Union',
                'Other',
            ], true),

            $this->section('Country Delegation'),
            $this->text('country_delegation_country', 'Country'),
            $this->radio('country_delegation_minister_responsibility_type', 'Minister responsibility type', $this->ministerResponsibilityOptions()),
            ...$this->headFields('country_delegation', includeBadge: true, organisationLabel: 'Head ministry name', organisationKey: 'head_ministry_name', emailKey: 'head_email'),
            $this->radio('country_delegation_speech_topic', 'Speech topic related to the overall theme', $this->speechTopicOptions()),
            ...$this->delegateFields('country_delegation', 3, ['badge_name', 'ministry_or_organisation', 'job_title']),
            ...$this->delegationCommonFields('country_delegation', includeBilateral: true),

            $this->section('Stakeholder Delegation'),
            ...$this->headFields('stakeholder_delegation', includeBadge: true, organisationLabel: 'Organisation name', positionKey: 'position'),
            ...$this->delegateFields('stakeholder_delegation', 1, ['badge_name', 'job_title', 'organisation']),
            ...$this->delegationCommonFields('stakeholder_delegation', includeBilateral: false),

            $this->section('ASEAN Secretariat'),
            ...$this->headFields('asean_secretariat', includeBadge: true, includeOrganisation: false, positionKey: 'position'),
            $this->radio('asean_secretariat_speech_topic', 'Speech topic related to the overall theme', $this->speechTopicOptions()),
            ...$this->delegateFields('asean_secretariat', 2, ['job_title']),
            ...$this->delegationCommonFields('asean_secretariat', includeBilateral: true),

            $this->section('European Union'),
            ...$this->headFields('european_union', includeBadge: false, includeOrganisation: false, positionKey: 'position'),
            $this->radio('european_union_speech_topic', 'Speech topic related to the overall theme', $this->speechTopicOptions()),
            ...$this->delegateFields('european_union', 2, ['job_title']),
            ...$this->delegationCommonFields('european_union', includeBilateral: true),

            $this->section('Single Participant / Other'),
            $this->radio('single_participant_title', 'Title', $this->titleOptions()),
            $this->text('single_participant_given_name', 'Given name'),
            $this->text('single_participant_family_name', 'Family name'),
            $this->text('single_participant_organisation_name', 'Organisation name'),
            $this->text('single_participant_position', 'Position'),
            $this->email('single_participant_email', 'Email'),
            $this->textarea('single_participant_additional_comments', 'Additional comments'),
            $this->tel('single_participant_contact_mobile_number', 'Contact mobile number'),
            $this->checkbox('single_participant_social_activities', 'Social activities', $this->socialActivityOptions()),
            $this->textarea('single_participant_dietary_requirements', 'Specific dietary requirements'),
            $this->textarea('single_participant_mobility_or_special_needs', 'Reduced mobility, extra assistance, or other specific needs'),
            $this->textarea('single_participant_other_comments', 'Any other comments'),
        ];

        $this->replaceFields($event, $fields);

        $this->command?->info("ASEMME10 fields seeded for event #{$event->id}.");
    }

    private function eventFromEnvOrTitle(string $envKey, string $title): ?Programme
    {
        $eventId = env($envKey);

        return $eventId
            ? Programme::query()->find($eventId)
            : Programme::query()->where('title', 'like', "%{$title}%")->first();
    }

    private function replaceFields(Programme $event, array $fields): void
    {
        $event->registrationFields()->delete();

        foreach (array_values($fields) as $index => $field) {
            $event->registrationFields()->create([
                ...$field,
                'sort_order' => $index,
            ]);
        }
    }

    private function section(string $label): array
    {
        return $this->field(str($label)->slug('_')->toString(), $label, 'section');
    }

    private function text(string $key, string $label, bool $required = false): array
    {
        return $this->field($key, $label, 'text', isRequired: $required);
    }

    private function textarea(string $key, string $label, bool $required = false): array
    {
        return $this->field($key, $label, 'textarea', isRequired: $required);
    }

    private function email(string $key, string $label, bool $required = false): array
    {
        return $this->field($key, $label, 'email', isRequired: $required);
    }

    private function tel(string $key, string $label, bool $required = false): array
    {
        return $this->field($key, $label, 'tel', isRequired: $required);
    }

    private function radio(string $key, string $label, array $options, bool $required = false): array
    {
        return $this->field($key, $label, 'radio', $options, $required);
    }

    private function checkbox(string $key, string $label, array $options, bool $required = false): array
    {
        return $this->field($key, $label, 'checkbox', $options, $required);
    }

    private function field(string $key, string $label, string $type, array $options = [], bool $isRequired = false): array
    {
        return [
            'field_key' => $key,
            'label' => $label,
            'field_type' => $type,
            'options' => $options,
            'is_required' => $isRequired,
        ];
    }

    private function headFields(
        string $prefix,
        bool $includeBadge,
        bool $includeOrganisation = true,
        string $organisationLabel = 'Organisation name',
        string $organisationKey = 'organisation_name',
        string $positionKey = 'position',
        string $emailKey = 'email',
    ): array {
        $fields = [
            $this->radio("{$prefix}_head_title", 'Head title', $this->titleOptions()),
            $this->text("{$prefix}_head_given_name", 'Head given name'),
            $this->text("{$prefix}_head_family_name", 'Head family name'),
        ];

        if ($includeBadge) {
            $fields[] = $this->text("{$prefix}_head_badge_name", 'Head badge name');
        }

        if ($includeOrganisation) {
            $fields[] = $this->text("{$prefix}_{$organisationKey}", $organisationLabel);
        }

        if ($positionKey !== '') {
            $fields[] = $this->text("{$prefix}_{$positionKey}", 'Position');
        }

        $fields[] = $this->email("{$prefix}_{$emailKey}", 'Head email');

        return $fields;
    }

    private function delegateFields(string $prefix, int $max, array $extraKeys): array
    {
        $fields = [];

        for ($index = 1; $index <= $max; $index++) {
            $fields[] = $this->section(str($prefix)->replace('_', ' ')->title()." Delegate {$index}");
            $fields[] = $this->radio("{$prefix}_delegate_{$index}_title", "Delegate {$index} title", $this->titleOptions());
            $fields[] = $this->text("{$prefix}_delegate_{$index}_given_name", "Delegate {$index} given name");
            $fields[] = $this->text("{$prefix}_delegate_{$index}_family_name", "Delegate {$index} family name");

            foreach ($extraKeys as $key) {
                $fields[] = $this->text("{$prefix}_delegate_{$index}_{$key}", "Delegate {$index} ".str($key)->replace('_', ' ')->toString());
            }

            $fields[] = $this->email("{$prefix}_delegate_{$index}_email", "Delegate {$index} email");
        }

        return $fields;
    }

    private function delegationCommonFields(string $prefix, bool $includeBilateral): array
    {
        $fields = [
            $this->textarea("{$prefix}_additional_comments_on_delegation", 'Additional comments on delegation'),
            $this->tel("{$prefix}_contact_mobile_number", 'Contact mobile number'),
            $this->checkbox("{$prefix}_social_activities", 'Social activities', $this->socialActivityOptions()),
            $this->textarea("{$prefix}_social_activity_details", 'Who and how many will participate in the Reception and Dinner?'),
        ];

        if ($includeBilateral) {
            $fields[] = $this->radio("{$prefix}_bilateral_meeting_interest", 'Bilateral meeting interest', $this->bilateralOptions());
            $fields[] = $this->textarea("{$prefix}_bilateral_contact_emails", 'Email address(es) to add to the bilateral meetings contact list');
            $fields[] = $this->textarea("{$prefix}_bilateral_comments", 'Additional comments on bilateral meetings');
        }

        return [
            ...$fields,
            $this->textarea("{$prefix}_dietary_requirements", 'Specific dietary requirements'),
            $this->textarea("{$prefix}_mobility_or_special_needs", 'Reduced mobility, extra assistance, or other specific needs'),
            $this->textarea("{$prefix}_other_comments", 'Any other comments'),
        ];
    }

    private function titleOptions(): array
    {
        return ['Ms', 'Mr', 'Other'];
    }

    private function speechTopicOptions(): array
    {
        return [
            'Blue Economy and Green and Digital Transitions',
            'Lifelong Learning and Inclusion',
            'Mobility and Recognition',
            'No speech wanted',
        ];
    }

    private function socialActivityOptions(): array
    {
        return [
            'Networking Reception on 24 November',
            'Gala Dinner on 25 November',
            'Other',
        ];
    }

    private function bilateralOptions(): array
    {
        return [
            'Our delegation would like to have bilateral meetings and wants the email address(es) to be added to the contact list',
            'We are not interested in bilateral meetings and do not want our email address to be added to the contact list',
            'Other',
        ];
    }

    private function ministerResponsibilityOptions(): array
    {
        return [
            'Minister responsible for Higher Education',
            'Minister responsible for Education',
            'Both: Minister for Education and Higher Education',
            'Other',
        ];
    }
}
