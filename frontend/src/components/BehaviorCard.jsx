import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, Eye, Download, Trash2, AlertTriangle, Award, 
  MessageCircle, File
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import API_URL from "../config/api";

// Types de comportement avec leurs styles
const BEHAVIOR_TYPES = {
  sanction: { 
    label: 'Sanction', 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-500' 
  },
  warning: { 
    label: 'Avertissement', 
    icon: AlertTriangle, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-500' 
  },
  dismissal: { 
    label: 'Lettre de renvoi', 
    icon: FileText, 
    color: 'text-red-700', 
    bgColor: 'bg-red-100', 
    borderColor: 'border-red-600' 
  },
  note: { 
    label: 'Note disciplinaire', 
    icon: MessageCircle, 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-500' 
  },
  praise: { 
    label: 'Félicitations', 
    icon: Award, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-500' 
  },
  positive: { 
    label: 'Positif', 
    icon: Award, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-500' 
  },
  negative: { 
    label: 'Négatif', 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-500' 
  },
  other: { 
    label: 'Autre', 
    icon: File, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-500' 
  }
};

const BehaviorCard = ({ 
  behavior, 
  showEmployeeName = false, 
  canDelete = false, 
  onDelete = null 
}) => {
  const typeInfo = BEHAVIOR_TYPES[behavior.type] || BEHAVIOR_TYPES.other;
  const Icon = typeInfo.icon;
  const hasDocument = behavior.file_url || (behavior.document_urls && behavior.document_urls.length > 0);
  const documentUrl = behavior.file_url || (behavior.document_urls && behavior.document_urls[0]);

  const getDocUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // Pour le preview dans le navigateur, on utilise l'endpoint de preview
    return `${API_URL}/api/preview${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const getDownloadUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // Pour le téléchargement, on utilise l'URL directe
    return `${API_URL}${url.startsWith('/api/') ? '' : '/api'}${url}`;
  };

  return (
    <Card className={`border-l-4 ${typeInfo.borderColor} hover:shadow-lg transition-shadow`}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${typeInfo.bgColor}`}>
                <Icon className={`h-5 w-5 ${typeInfo.color}`} />
              </div>
              <div>
                <Badge variant="outline" className={typeInfo.color}>
                  {typeInfo.label}
                </Badge>
              </div>
            </div>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => onDelete(behavior)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Employee/Date Info */}
          <div>
            {showEmployeeName && behavior.employee_name && (
              <p className="font-semibold text-foreground">{behavior.employee_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(behavior.date), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>

          {/* Note */}
          <p className="text-sm text-foreground line-clamp-3">
            {behavior.note}
          </p>

          {/* Document Section */}
          {hasDocument && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-primary truncate">
                    {behavior.file_name || 'Document joint'}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <a 
                    href={getDocUrl(documentUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      title="Voir le document"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </a>
                  <a 
                    href={getDownloadUrl(documentUrl)} 
                    download
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      title="Télécharger"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {behavior.created_by_name && `Par ${behavior.created_by_name} • `}
            {format(new Date(behavior.created_at || behavior.date), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BehaviorCard;
