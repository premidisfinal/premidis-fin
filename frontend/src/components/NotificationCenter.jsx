import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { 
  Bell, MessageSquare, Calendar, FileText, 
  CheckCircle, AlertCircle, Info, X, Check
} from 'lucide-react';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationCenter = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch messages
      const messagesRes = await axios.get(`${API_URL}/api/communication/messages`);
      const messages = messagesRes.data.messages || [];
      
      // Fetch announcements
      const announcementsRes = await axios.get(`${API_URL}/api/communication/announcements`);
      const announcements = announcementsRes.data.announcements || [];
      
      // Fetch leaves (for admin)
      let leaves = [];
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        const leavesRes = await axios.get(`${API_URL}/api/leaves`, { params: { status: 'pending' } });
        leaves = leavesRes.data.leaves || [];
      }

      // Combine and format notifications
      const notifs = [
        ...messages
          .filter(m => m.receiver_id === user?.id && !m.read)
          .slice(0, 5)
          .map(m => ({
            id: `msg-${m.id}`,
            type: 'message',
            title: 'Nouveau message',
            content: `De ${m.sender_name}: ${m.content.substring(0, 50)}...`,
            timestamp: m.created_at,
            icon: MessageSquare,
            color: 'text-blue-500',
            read: m.read
          })),
        ...announcements
          .slice(0, 3)
          .map(a => ({
            id: `ann-${a.id}`,
            type: 'announcement',
            title: a.title,
            content: a.content.substring(0, 60) + '...',
            timestamp: a.created_at,
            icon: a.priority === 'high' ? AlertCircle : Info,
            color: a.priority === 'high' ? 'text-red-500' : 'text-primary',
            read: false,
            priority: a.priority
          })),
        ...leaves
          .slice(0, 5)
          .map(l => ({
            id: `leave-${l.id}`,
            type: 'leave',
            title: 'Demande de congé',
            content: `${l.employee_name} demande un congé du ${l.start_date} au ${l.end_date}`,
            timestamp: l.created_at,
            icon: Calendar,
            color: 'text-yellow-500',
            read: false
          }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = (notifId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getTimeAgo = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="notifications-btn"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-medium animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est à jour'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 opacity-30 mb-4" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                    data-testid={`notification-${notif.id}`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 p-2 rounded-full bg-muted ${notif.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getTimeAgo(notif.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full text-sm" onClick={() => setOpen(false)}>
            Voir toutes les notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
