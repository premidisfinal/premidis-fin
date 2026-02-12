import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../config/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Node } from '@tiptap/core';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  FileText,
  ArrowLeft,
  Save,
  Printer,
  Eye,
  Edit,
  Trash2,
  Upload,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';

// Custom extension to preserve ALL HTML with inline styles
const PreserveHTML = Node.create({
  name: 'preserveHTML',
  
  group: 'block',
  
  content: 'inline*',
  
  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (node) => {
          // Preserve all attributes
          return {};
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },
  
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
    };
  },
});

const DocumentsModule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('library'); // 'library', 'editor', 'preview'
  const [forms, setForms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // TipTap Editor with FULL HTML preservation
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false, // Disable to use custom
      }),
      PreserveHTML,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'div'],
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] p-4',
        style: 'white-space: normal; overflow: visible;',
      },
    },
    // Essential: Don't clean pasted HTML
    editable: true,
    injectCSS: false, // Don't inject TipTap's CSS that might override styles
  });

  useEffect(() => {
    fetchForms();
    fetchDocuments();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get('/api/documents/forms');
      setForms(response.data.forms || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const initSystemForms = async () => {
    try {
      await axios.post('/api/documents/forms/init-system-forms');
      toast.success('Formes système initialisées');
      fetchForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleUseForm = (form) => {
    setSelectedForm(form);
    if (editor) {
      editor.commands.setContent(form.content);
    }
    setDocumentTitle(`Nouveau ${form.name}`);
    setCurrentDocument(null);
    setView('editor');
  };

  const handleEditDocument = async (doc) => {
    setCurrentDocument(doc);
    if (editor) {
      editor.commands.setContent(doc.content);
    }
    setDocumentTitle(doc.title);
    setSelectedForm(null);
    setView('editor');
  };

  const handleSaveDocument = async () => {
    if (!documentTitle.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    if (!editor) {
      toast.error('Éditeur non initialisé');
      return;
    }

    const content = editor.getHTML();

    try {
      if (currentDocument) {
        // Update existing
        await axios.put(`/api/documents/${currentDocument.id}`, {
          title: documentTitle,
          content: content
        });
        toast.success('Document mis à jour');
      } else {
        // Create new
        await axios.post('/api/documents', {
          form_id: selectedForm?.id,
          title: documentTitle,
          content: content
        });
        toast.success('Document enregistré');
      }
      
      fetchDocuments();
      setView('library');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handlePrint = () => {
    if (!editor) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3 { margin-top: 1em; margin-bottom: 0.5em; }
            p { margin: 0.5em 0; }
            table { width: 100%; border-collapse: collapse; margin: 1em 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${editor.getHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDeleteConfirm = async () => {
    try {
      if (itemToDelete.type === 'document') {
        await axios.delete(`/api/documents/${itemToDelete.id}`);
        toast.success('Document supprimé');
        fetchDocuments();
      } else if (itemToDelete.type === 'form') {
        await axios.delete(`/api/documents/forms/${itemToDelete.id}`);
        toast.success('Forme supprimée');
        fetchForms();
      }
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleUploadForm = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await axios.post('/api/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Create form with uploaded file as content (placeholder)
      await axios.post('/api/documents/forms', {
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: 'Forme importée',
        category: 'other',
        content: `<p>Document importé: ${file.name}</p><p>Cliquez pour modifier...</p>`,
        is_system: false
      });

      toast.success('Forme importée avec succès');
      fetchForms();
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    }
  };

  const handlePreview = (doc) => {
    setCurrentDocument(doc);
    if (editor) {
      editor.commands.setContent(doc.content);
    }
    setDocumentTitle(doc.title);
    setView('preview');
  };

  // Toolbar Component
  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <div className="border-b bg-white sticky top-16 z-40 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Headings */}
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Alignment */}
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Lists */}
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Table */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        {/* Image */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('URL de l\'image:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* LIBRARY VIEW */}
      {view === 'library' && (
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="mb-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Tableau de Bord
              </Button>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <FileText className="h-10 w-10" />
                📄 Documents
              </h1>
              <p className="text-muted-foreground mt-2">
                Bibliothèque de formes et historique des documents
              </p>
            </div>
          </div>

          {/* Zone 1: Document Forms */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📚 Formes de Documents</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initSystemForms}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Initialiser Formes Système
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('upload-form').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader une Forme
                  </Button>
                  <input
                    id="upload-form"
                    type="file"
                    accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadForm}
                    className="hidden"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {forms.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Aucune forme disponible</p>
                  <Button onClick={initSystemForms}>
                    <Plus className="h-4 w-4 mr-2" />
                    Initialiser Formes Système
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {forms.map((form) => (
                    <Card
                      key={form.id}
                      className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          {/* Icon/Thumbnail */}
                          <div className="w-24 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 flex items-center justify-center shadow-md">
                            <FileText className="h-16 w-16 text-blue-600" />
                          </div>
                          
                          {/* Form Name */}
                          <h3 className="font-semibold text-lg mb-2">{form.name}</h3>
                          <p className="text-xs text-muted-foreground mb-4">
                            {form.description || 'Aucune description'}
                          </p>
                          
                          {/* Use Button */}
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => handleUseForm(form)}
                          >
                            Utiliser
                          </Button>
                          
                          {/* Delete for non-system forms */}
                          {!form.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'form', id: form.id, name: form.name });
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone 2: Document History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">📁 Historique (Mes Documents)</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun document créé</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="w-16 h-20 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="h-8 w-8 text-gray-600" />
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{doc.title}</h4>
                            <div className="text-sm text-muted-foreground">
                              <p>Créé le: {new Date(doc.created_at).toLocaleString()}</p>
                              <p>Auteur: {doc.author_name}</p>
                              <p>Modifié le: {new Date(doc.updated_at).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(doc)}
                            >
                              <Eye className="h-4 w-4" />
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDocument(doc)}
                            >
                              <Edit className="h-4 w-4" />
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setItemToDelete({ type: 'document', id: doc.id, name: doc.title });
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDITOR VIEW */}
      {view === 'editor' && (
        <div className="min-h-screen bg-white">
          {/* Top Bar */}
          <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                onClick={() => setView('library')}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Retour
              </Button>
              
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Titre du document"
                className="max-w-md text-lg font-semibold"
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
                <Button onClick={handleSaveDocument}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>

          {/* TipTap Menu Bar */}
          <MenuBar />

          {/* TipTap Editor */}
          <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="bg-white shadow-2xl min-h-[800px] p-12 rounded-lg border">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW VIEW */}
      {view === 'preview' && currentDocument && (
        <div className="min-h-screen bg-gray-50">
          {/* Top Bar */}
          <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                onClick={() => setView('library')}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Retour
              </Button>
              
              <h2 className="text-lg font-semibold">{documentTitle}</h2>
              
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="bg-white shadow-2xl min-h-[800px] p-12 rounded-lg">
              <EditorContent editor={editor} className="pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "{itemToDelete?.name}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsModule;
