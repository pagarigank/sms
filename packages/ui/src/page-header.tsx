import * as React from 'react';
import { cn } from '@sms/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

function PageHeader({ className, title, description, actions, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between space-y-2', className)} {...props}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
