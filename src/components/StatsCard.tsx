import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
  valueColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  buttonText,
  onButtonClick,
  className,
  valueColor = "text-gray-900"
}) => {
  return (
    <Card className={cn("border-0 shadow-md hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="w-4 h-4 text-gray-500">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-2xl font-bold", valueColor)}>
              {value}
            </div>
            {trend && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
                {trend.label && ` ${trend.label}`}
              </span>
            )}
          </div>
          
          {subtitle && (
            <p className="text-xs text-gray-500">
              {subtitle}
            </p>
          )}
          
          {buttonText && onButtonClick && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full hover:bg-gray-50 transition-colors"
                onClick={onButtonClick}
              >
                {buttonText}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard; 