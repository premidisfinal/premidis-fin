import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronRight } from 'lucide-react';

const ModuleTile = ({ 
  title, 
  icon: Icon, 
  metric, 
  metricLabel,
  link, 
  color = 'primary',
  description,
  badge,
  badgeVariant = 'secondary'
}) => {
  const colorClasses = {
    primary: 'border-l-primary hover:shadow-primary/20',
    secondary: 'border-l-secondary hover:shadow-secondary/20',
    destructive: 'border-l-destructive hover:shadow-destructive/20',
    accent: 'border-l-accent hover:shadow-accent/20',
  };

  const iconColorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    destructive: 'bg-destructive/10 text-destructive',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <Link to={link} data-testid={`tile-${title?.toLowerCase().replace(/\s/g, '-')}`}>
      <Card className={`
        h-full border-l-4 ${colorClasses[color]}
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1
        cursor-pointer group bg-card
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`
              p-3 rounded-xl ${iconColorClasses[color]}
              transition-transform duration-300 group-hover:scale-110
            `}>
              {Icon && <Icon className="h-6 w-6" />}
            </div>
            {badge && (
              <Badge variant={badgeVariant} className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold mt-3 text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </CardHeader>
        
        <CardContent className="pb-3">
          {metric !== undefined && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{metric}</span>
              {metricLabel && (
                <span className="text-sm text-muted-foreground">{metricLabel}</span>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0">
          <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
            <span>Voir plus</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ModuleTile;
