<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'has_food_restrictions' => ['nullable', 'boolean'],
            'food_restrictions' => ['nullable', 'array'],
            'food_restrictions.*' => ['string', 'max:255'],
            'dietary_allergies' => ['nullable', 'string', 'max:255'],
            'dietary_other' => ['nullable', 'string', 'max:255'],
            'accessibility_needs' => ['nullable', 'array'],
            'accessibility_needs.*' => ['string', 'max:255'],
            'accessibility_other' => ['nullable', 'string', 'max:255'],
        ];
    }
}
