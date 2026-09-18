'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@sms/utils';

interface FormStepperProps {
  steps: { id: string; label: string; icon?: React.ElementType | undefined }[];
  currentStep: number;
}

export function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <div className="relative mb-12 mt-8 animate-in fade-in duration-700 delay-100">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
      <div
        className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
      <div className="relative z-10 flex justify-between">
        {steps.map((config, index) => {
          const Icon = config.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={config.id} className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300',
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : isCurrent
                      ? 'bg-background border-primary text-primary shadow-lg shadow-primary/20 scale-110'
                      : 'bg-background border-border text-muted-foreground',
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : Icon ? <Icon className="w-5 h-5" /> : null}
              </div>
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
