export interface SchemaFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'currency' | 'file' | 'relation' | 'boolean';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export interface SchemaFormProps {
  fields: SchemaFormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}
