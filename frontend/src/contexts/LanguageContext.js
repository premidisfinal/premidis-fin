import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    communication: "Communication",
    administration: "Gestion Administrative",
    timeManagement: "Gestion du Temps",
    performance: "Performances",
    rules: "Règlement Intérieur",
    payroll: "Rémunérations",
    settings: "Paramètres",
    logout: "Déconnexion",
    
    // Auth
    login: "Connexion",
    register: "Inscription",
    email: "Email",
    password: "Mot de passe",
    firstName: "Prénom",
    lastName: "Nom",
    department: "Département",
    forgotPassword: "Mot de passe oublié ?",
    noAccount: "Pas de compte ?",
    hasAccount: "Déjà un compte ?",
    createAccount: "Créer un compte",
    
    // Dashboard
    welcome: "Bienvenue",
    totalEmployees: "Total Employés",
    pendingLeaves: "Congés en attente",
    announcements: "Annonces",
    unreadMessages: "Messages non lus",
    
    // Modules
    chat: "Discussions",
    officialComm: "Communications officielles",
    employeeFiles: "Dossiers du personnel",
    contracts: "Contrats",
    benefits: "Avantages",
    attendance: "Présences",
    absences: "Absences",
    leaves: "Congés",
    objectives: "Objectifs",
    evaluations: "Évaluations",
    promotions: "Promotions",
    sanctions: "Sanctions",
    regulations: "Règlements",
    compliance: "Conformité",
    payslips: "Fiches de paie",
    baseSalary: "Salaire de base",
    bonuses: "Primes",
    deductions: "Retenues",
    
    // Actions
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    search: "Rechercher",
    filter: "Filtrer",
    export: "Exporter",
    submit: "Soumettre",
    approve: "Approuver",
    reject: "Rejeter",
    
    // Status
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    active: "Actif",
    inactive: "Inactif",
    
    // Leave types
    annual: "Congé annuel",
    sick: "Congé maladie",
    maternity: "Congé maternité",
    paternity: "Congé paternité",
    unpaid: "Congé sans solde",
    exceptional: "Autorisation exceptionnelle",
    public: "Jour férié",
    
    // Departments
    marketing: "Marketing",
    comptabilite: "Comptabilité",
    administration_dept: "Administration",
    ressources_humaines: "Ressources Humaines",
    juridique: "Juridique",
    nettoyage: "Nettoyage",
    securite: "Sécurité",
    
    // Voice AI
    voiceAssistant: "Assistant vocal",
    listening: "Écoute en cours...",
    processing: "Traitement...",
    speak: "Parlez maintenant",
    
    // Misc
    noData: "Aucune donnée",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    selectLanguage: "Choisir la langue"
  },
  en: {
    dashboard: "Dashboard",
    communication: "Communication",
    administration: "Administrative Management",
    timeManagement: "Time Management",
    performance: "Performance",
    rules: "Internal Rules",
    payroll: "Payroll",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    firstName: "First Name",
    lastName: "Last Name",
    department: "Department",
    forgotPassword: "Forgot password?",
    noAccount: "No account?",
    hasAccount: "Already have an account?",
    createAccount: "Create account",
    welcome: "Welcome",
    totalEmployees: "Total Employees",
    pendingLeaves: "Pending Leaves",
    announcements: "Announcements",
    unreadMessages: "Unread Messages",
    chat: "Chat",
    officialComm: "Official Communications",
    employeeFiles: "Employee Files",
    contracts: "Contracts",
    benefits: "Benefits",
    attendance: "Attendance",
    absences: "Absences",
    leaves: "Leaves",
    objectives: "Objectives",
    evaluations: "Evaluations",
    promotions: "Promotions",
    sanctions: "Sanctions",
    regulations: "Regulations",
    compliance: "Compliance",
    payslips: "Payslips",
    baseSalary: "Base Salary",
    bonuses: "Bonuses",
    deductions: "Deductions",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    export: "Export",
    submit: "Submit",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    active: "Active",
    inactive: "Inactive",
    annual: "Annual Leave",
    sick: "Sick Leave",
    maternity: "Maternity Leave",
    paternity: "Paternity Leave",
    unpaid: "Unpaid Leave",
    exceptional: "Exceptional Authorization",
    public: "Public Holiday",
    marketing: "Marketing",
    comptabilite: "Accounting",
    administration_dept: "Administration",
    ressources_humaines: "Human Resources",
    juridique: "Legal",
    nettoyage: "Cleaning",
    securite: "Security",
    voiceAssistant: "Voice Assistant",
    listening: "Listening...",
    processing: "Processing...",
    speak: "Speak now",
    noData: "No data",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    selectLanguage: "Select language"
  },
  sw: {
    dashboard: "Dashibodi",
    communication: "Mawasiliano",
    administration: "Usimamizi wa Utawala",
    timeManagement: "Usimamizi wa Muda",
    performance: "Utendaji",
    rules: "Kanuni za Ndani",
    payroll: "Malipo",
    settings: "Mipangilio",
    logout: "Ondoka",
    login: "Ingia",
    register: "Jisajili",
    email: "Barua pepe",
    password: "Nenosiri",
    firstName: "Jina la kwanza",
    lastName: "Jina la mwisho",
    department: "Idara",
    welcome: "Karibu",
    totalEmployees: "Jumla ya Wafanyakazi",
    pendingLeaves: "Likizo zinazosubiri",
    announcements: "Matangazo",
    unreadMessages: "Ujumbe usiosomwa",
    chat: "Gumzo",
    leaves: "Likizo",
    payslips: "Stakabadhi za Mshahara",
    save: "Hifadhi",
    cancel: "Ghairi",
    delete: "Futa",
    edit: "Hariri",
    add: "Ongeza",
    search: "Tafuta",
    pending: "Inasubiri",
    approved: "Imekubaliwa",
    rejected: "Imekataliwa",
    voiceAssistant: "Msaidizi wa Sauti",
    listening: "Inasikiliza...",
    noData: "Hakuna data",
    loading: "Inapakia..."
  },
  hi: {
    dashboard: "डैशबोर्ड",
    communication: "संचार",
    administration: "प्रशासनिक प्रबंधन",
    timeManagement: "समय प्रबंधन",
    performance: "प्रदर्शन",
    rules: "आंतरिक नियम",
    payroll: "वेतन",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    login: "लॉग इन",
    register: "पंजीकरण",
    email: "ईमेल",
    password: "पासवर्ड",
    firstName: "पहला नाम",
    lastName: "अंतिम नाम",
    department: "विभाग",
    welcome: "स्वागत है",
    totalEmployees: "कुल कर्मचारी",
    pendingLeaves: "लंबित छुट्टियां",
    announcements: "घोषणाएं",
    unreadMessages: "अपठित संदेश",
    chat: "चैट",
    leaves: "छुट्टियां",
    payslips: "वेतन पर्ची",
    save: "सहेजें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    edit: "संपादित करें",
    add: "जोड़ें",
    search: "खोजें",
    pending: "लंबित",
    approved: "स्वीकृत",
    rejected: "अस्वीकृत",
    voiceAssistant: "वॉइस असिस्टेंट",
    listening: "सुन रहा है...",
    noData: "कोई डेटा नहीं",
    loading: "लोड हो रहा है..."
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'fr');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    // Get translation for current language
    const translation = translations[language]?.[key];
    
    // If translation exists, return it
    if (translation) {
      return translation;
    }
    
    // Fallback: try French
    if (language !== 'fr' && translations.fr?.[key]) {
      return translations.fr[key];
    }
    
    // Fallback: try English
    if (language !== 'en' && translations.en?.[key]) {
      return translations.en[key];
    }
    
    // If no translation found, return the key formatted nicely
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      t,
      availableLanguages: [
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
      ]
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
