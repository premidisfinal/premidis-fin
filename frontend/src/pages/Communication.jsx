import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Separator } from '../components/ui/separator';
import { 
  MessageSquare, Bell, Plus, Send, Search, Loader2, 
  AlertCircle, Info, CheckCircle2, User, Users, Hash, Building2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Communication = () => {
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'discussions');
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  // Department groups
  const departments = [
    { id: 'general', name: 'Général', icon: Hash },
    { id: 'marketing', name: 'Marketing', icon: Building2 },
    { id: 'comptabilite', name: 'Comptabilité', icon: Building2 },
    { id: 'administration', name: 'Administration', icon: Building2 },
    { id: 'ressources_humaines', name: 'Ressources Humaines', icon: Building2 },
    { id: 'juridique', name: 'Juridique', icon: Building2 },
    { id: 'nettoyage', name: 'Nettoyage', icon: Building2 },
    { id: 'securite', name: 'Sécurité', icon: Building2 },
    { id: 'chauffeur', name: 'Chauffeur', icon: Building2 },
    { id: 'technicien', name: 'Technicien', icon: Building2 }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [announcementsRes, messagesRes, contactsRes] = await Promise.all([
        axios.get(`${API_URL}/api/communication/announcements`),
        axios.get(`${API_URL}/api/communication/messages`),
        axios.get(`${API_URL}/api/communication/contacts`)
      ]);
      
      setAnnouncements(announcementsRes.data.announcements || []);
      setMessages(messagesRes.data.messages || []);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
      fetchData();
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
      fetchData();
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
    
    return (
      <Badge className={styles[priority] || styles.normal}>
        {priority === 'high' ? 'Urgent' : priority === 'low' ? 'Faible' : 'Normal'}
      </Badge>
    );
  };

  const filteredContacts = contacts.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group contacts by department
  const contactsByDepartment = contacts.reduce((acc, contact) => {
    const dept = contact.department || 'other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(contact);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="communication-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('communication')}</h1>
            <p className="text-muted-foreground">Discussions et communications officielles</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="discussions" className="flex items-center gap-2" data-testid="tab-discussions">
              <MessageSquare className="h-4 w-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="repertoire" className="flex items-center gap-2" data-testid="tab-repertoire">
              <Users className="h-4 w-4" />
              Répertoire
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2" data-testid="tab-announcements">
              <Bell className="h-4 w-4" />
              Annonces
            </TabsTrigger>
          </TabsList>

          {/* DISCUSSIONS TAB */}
          <TabsContent value="discussions" className="mt-6">
            <div className="grid gap-4 md:grid-cols-4 h-[700px]">
              {/* Groups & Contacts Sidebar */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Groupes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {departments.slice(0, 5).map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => {
                          setSelectedGroup(dept.id);
                          setSelectedContact(null);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedGroup === dept.id && !selectedContact
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <dept.icon className="h-4 w-4" />
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </CardContent>
                
                <Separator />
                
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Messages directs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[350px]">
                    {filteredContacts.slice(0, 10).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          setSelectedGroup(null);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedContact?.id === contact.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={contact.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contact.first_name} {contact.last_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="md:col-span-3 flex flex-col">
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
                    
                    <ScrollArea className="flex-1 p-4" style={{ height: '450px' }}>
                      <div className="space-y-4">
                        {getConversation(selectedContact.id).length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            Aucun message. Commencez la conversation !
                          </p>
                        ) : (
                          getConversation(selectedContact.id).map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`
                                  max-w-[80%] rounded-2xl px-4 py-3
                                  ${msg.sender_id === user.id 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                  }
                                `}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-muted/30">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Écrivez votre message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="min-h-[60px] max-h-[120px] resize-none"
                          data-testid="message-input"
                        />
                        <Button onClick={handleSendMessage} className="h-auto" data-testid="send-message-btn">
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : selectedGroup ? (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Hash className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                      <h3 className="font-semibold text-lg mb-2">
                        Groupe {departments.find(d => d.id === selectedGroup)?.name}
                      </h3>
                      <p className="text-muted-foreground">
                        Les discussions de groupe seront disponibles prochainement
                      </p>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez une conversation</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* REPERTOIRE TAB */}
          <TabsContent value="repertoire" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Répertoire des utilisateurs</CardTitle>
                    <CardDescription>{contacts.length} utilisateurs</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedContact(contact);
                        setActiveTab('discussions');
                      }}
                      data-testid={`contact-card-${contact.id}`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {contact.first_name?.[0]}{contact.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.position || 'Employé'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {contact.department?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANNOUNCEMENTS TAB */}
          <TabsContent value="announcements" className="mt-6 space-y-4">
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
                      <Input
                        placeholder="Titre de l'annonce"
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                        required
                      />
                      <Textarea
                        placeholder="Contenu de l'annonce..."
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                        rows={5}
                        required
                      />
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
                      <Button type="submit" className="w-full">
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
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune annonce pour le moment</p>
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id} className="hover:shadow-md transition-shadow">
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Communication;
