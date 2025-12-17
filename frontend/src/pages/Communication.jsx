import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  MessageSquare, Bell, Plus, Send, Search, Loader2, 
  AlertCircle, Info, CheckCircle2, User 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Communication = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchMessages();
    fetchContacts();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/communication/announcements`);
      setAnnouncements(response.data.announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/communication/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/communication/contacts`);
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await axios.post(`${API_URL}/api/communication/messages`, {
        receiver_id: selectedContact.id,
        content: newMessage
      });
      setNewMessage('');
      fetchMessages();
      toast.success('Message envoyé');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/communication/announcements`, announcementForm);
      setAnnouncementDialog(false);
      setAnnouncementForm({ title: '', content: '', priority: 'normal' });
      fetchAnnouncements();
      toast.success('Annonce publiée');
    } catch (error) {
      toast.error('Erreur lors de la publication');
    }
  };

  const getConversation = (contactId) => {
    return messages.filter(
      m => (m.sender_id === contactId || m.receiver_id === contactId)
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    const icons = {
      high: AlertCircle,
      normal: Info,
      low: CheckCircle2
    };
    const Icon = icons[priority] || icons.normal;
    
    return (
      <Badge className={`${styles[priority] || styles.normal} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {priority === 'high' ? 'Urgent' : priority === 'low' ? 'Faible' : 'Normal'}
      </Badge>
    );
  };

  const filteredContacts = contacts.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="communication-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('communication')}</h1>
            <p className="text-muted-foreground">Discussions et annonces officielles</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('announcements')}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('chat')}
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            {isAdmin() && (
              <div className="flex justify-end">
                <Dialog open={announcementDialog} onOpenChange={setAnnouncementDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="new-announcement-btn">
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle annonce
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer une annonce</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          placeholder="Titre de l'annonce"
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                          required
                          data-testid="announcement-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Contenu de l'annonce..."
                          value={announcementForm.content}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                          rows={5}
                          required
                          data-testid="announcement-content"
                        />
                      </div>
                      <div className="flex gap-2">
                        {['low', 'normal', 'high'].map((p) => (
                          <Button
                            key={p}
                            type="button"
                            variant={announcementForm.priority === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAnnouncementForm({ ...announcementForm, priority: p })}
                          >
                            {p === 'high' ? 'Urgent' : p === 'low' ? 'Faible' : 'Normal'}
                          </Button>
                        ))}
                      </div>
                      <Button type="submit" className="w-full" data-testid="publish-announcement">
                        Publier l'annonce
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : announcements.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune annonce pour le moment</p>
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id} className="hover:shadow-md transition-shadow" data-testid={`announcement-${announcement.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Par {announcement.author_name} • {format(new Date(announcement.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground/90 whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <div className="grid gap-4 md:grid-cols-3 h-[600px]">
              {/* Contacts List */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="contact-search"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`
                          flex items-center gap-3 p-4 cursor-pointer transition-colors border-b
                          ${selectedContact?.id === contact.id ? 'bg-muted' : 'hover:bg-muted/50'}
                        `}
                        data-testid={`contact-${contact.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate capitalize">
                            {contact.department?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="md:col-span-2 flex flex-col">
                {selectedContact ? (
                  <>
                    <CardHeader className="border-b py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedContact.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {selectedContact.first_name} {selectedContact.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedContact.department?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {getConversation(selectedContact.id).map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`
                                max-w-[70%] rounded-2xl px-4 py-2
                                ${msg.sender_id === user.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                                }
                              `}
                            >
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Écrivez votre message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          data-testid="message-input"
                        />
                        <Button onClick={handleSendMessage} data-testid="send-message-btn">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez un contact pour commencer</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Communication;
