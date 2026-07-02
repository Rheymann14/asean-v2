<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'contact_number',
        'password',
        'country_id',
        'user_type_id',
        'other_user_type',
        'honorific_title',
        'honorific_other',
        'given_name',
        'middle_name',
        'family_name',
        'suffix',
        'sex_assigned_at_birth',
        'organization_name',
        'position_title',
        'contact_country_code',
        'ip_affiliation',
        'ip_group_name',
        'dietary_allergies',
        'dietary_other',
        'accessibility_needs',
        'accessibility_other',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
        'emergency_contact_email',
        'is_active',
        'consent_contact_sharing',
        'consent_photo_video',
        'attend_welcome_dinner',
        'avail_transport_from_makati_to_peninsula',
        'has_food_restrictions',
        'food_restrictions',
        'profile_photo_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'consent_contact_sharing' => 'boolean',
            'consent_photo_video' => 'boolean',
            'attend_welcome_dinner' => 'boolean',
            'avail_transport_from_makati_to_peninsula' => 'boolean',
            'has_food_restrictions' => 'boolean',
            'food_restrictions' => 'array',
            'ip_affiliation' => 'boolean',
            'accessibility_needs' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($user) {
            if (empty($user->display_id)) {
                // Nice human-readable ID
                $user->display_id = 'ASEAN-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4));
            }

            if (empty($user->qr_token)) {
                $user->qr_token = (string) Str::uuid();
            }
        });
    }

    /**
     * Value encoded into the participant QR code.
     *
     * Returning participants from the previous event keep their original
     * encrypted qr_payload (so already-issued/printed QRs stay identical),
     * while new users have no payload and get the short bare qr_token —
     * a low-density QR that scans much faster. The scanner resolves both.
     */
    public function getQrScanValueAttribute(): string
    {
        return (string) ($this->qr_payload ?: $this->qr_token);
    }

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function userType()
    {
        return $this->belongsTo(UserType::class);
    }

    public function issuances()
    {
        return $this->hasMany(Issuance::class);
    }

    public function joinedProgrammes(): BelongsToMany
    {
        return $this->belongsToMany(Programme::class, 'participant_programmes')->withTimestamps();
    }

    public function tableAssignments(): HasMany
    {
        return $this->hasMany(ParticipantTableAssignment::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function registrationFieldResponses(): HasMany
    {
        return $this->hasMany(RegistrationFieldResponse::class);
    }
}
