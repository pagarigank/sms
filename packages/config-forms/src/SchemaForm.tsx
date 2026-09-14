import React from 'react';
import type { SchemaFormField, SchemaFormProps } from './types';

export function SchemaForm({ fields, initialData, onSubmit, onCancel, isLoading, submitLabel = 'Save', cancelLabel = 'Cancel' }: SchemaFormProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>(initialData || {});

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={field.disabled}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'boolean' ? (
            <input
              type="checkbox"
              checked={formData[field.key] || false}
              onChange={(e) => handleChange(field.key, e.target.checked)}
              disabled={field.disabled}
            />
          ) : (
            <input
              type={field.type === 'currency' ? 'number' : field.type}
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={field.disabled}
              required={field.required}
            />
          )}
        </div>
      ))}
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
            {cancelLabel}
          </button>
        )}
        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
