// ============================================================
// HyperExcellence - Dictionnaire de traduction FR / AR
// ============================================================

export const translations = {
  // ---------- Général ----------
  appName: { fr: 'HyperExcellence', ar: 'هايبر إكسلانس' },
  loading: { fr: 'Chargement...', ar: 'جاري التحميل...' },
  cancel: { fr: 'Annuler', ar: 'إلغاء' },
  save: { fr: 'Enregistrer', ar: 'حفظ' },
  back: { fr: 'Retour', ar: 'رجوع' },
  logout: { fr: 'Déconnexion', ar: 'تسجيل الخروج' },
  refresh: { fr: 'Actualiser', ar: 'تحديث' },

  // ---------- Connexion ----------
  loginTitle: { fr: 'Connexion agent', ar: 'تسجيل دخول الموظف' },
  badgeNumber: { fr: 'Numéro de badge', ar: 'رقم البطاقة' },
  pinCode: { fr: 'Code PIN', ar: 'الرمز السري' },
  loginButton: { fr: 'Se connecter', ar: 'تسجيل الدخول' },
  loggingIn: { fr: 'Connexion...', ar: 'جاري تسجيل الدخول...' },
  loginError: { fr: 'Badge ou code PIN incorrect.', ar: 'رقم البطاقة أو الرمز السري غير صحيح.' },
  fieldsRequired: { fr: 'Numéro de badge et code PIN requis.', ar: 'رقم البطاقة والرمز السري مطلوبان.' },

  // ---------- Accueil ----------
  welcome: { fr: 'Bienvenue', ar: 'مرحبا' },
  dashboard: { fr: 'Tableau de bord', ar: 'لوحة القيادة' },
  tvMode: { fr: 'Mode Écran TV / Bureau', ar: 'وضع شاشة العرض' },
  heatmap: { fr: 'Heatmap Magasin', ar: 'خريطة حرارية للمتجر' },
  photosOfDay: { fr: 'Photos du jour', ar: 'صور اليوم' },
  checklists: { fr: 'Checklists', ar: 'قوائم المراجعة' },
  nonConformites: { fr: 'Non Conformités', ar: 'حالات عدم المطابقة' },
  excelExport: { fr: 'Export Excel', ar: 'تصدير إكسل' },
  manageEmployees: { fr: 'Gérer les employés', ar: 'إدارة الموظفين' },

  // ---------- Rôles ----------
  role_ADMIN: { fr: 'Administrateur QHSE', ar: 'مسؤول الجودة والسلامة' },
  role_CHEF_SECTEUR: { fr: 'Chef de Secteur', ar: 'رئيس القطاع' },
  role_CHEF_DEPARTEMENT: { fr: 'Chef de Département', ar: 'رئيس القسم' },
  role_CHEF_RAYON: { fr: 'Chef de Rayon', ar: 'رئيس الرف' },
  role_SUPERVISEUR: { fr: 'Superviseur Commerce', ar: 'مشرف التجارة' },
  role_CHEF_SECURITE: { fr: 'Chef Sécurité', ar: 'رئيس الأمن' },
  role_ASJ: { fr: 'Agent ASJ', ar: 'عون النظافة والأمن' },
  role_CHEF_CAISSE: { fr: 'Chef de Caisse', ar: 'رئيس الصندوق' },
  role_MAITRE_METIER: { fr: 'Maître Métier', ar: 'خبير الحرفة' },
  role_EMPLOYE: { fr: 'Employé / Vendeur', ar: 'موظف / بائع' },

  // ---------- Statuts tâche ----------
  status_FAIT: { fr: 'Fait', ar: 'منجز' },
  status_NON_FAIT: { fr: 'Non fait', ar: 'غير منجز' },
  status_ECART: { fr: 'Écart', ar: 'انحراف' },
  status_NON_APPLICABLE: { fr: 'Non applicable', ar: 'غير قابل للتطبيق' },

  // ---------- Gravité ----------
  gravite_MINEURE: { fr: 'Mineure', ar: 'طفيفة' },
  gravite_MAJEURE: { fr: 'Majeure', ar: 'كبيرة' },
  gravite_CRITIQUE: { fr: 'Critique', ar: 'حرجة' },

  // ---------- Statuts NC ----------
  nc_OUVERTE: { fr: 'Ouverte', ar: 'مفتوحة' },
  nc_EN_COURS: { fr: 'En cours', ar: 'قيد المعالجة' },
  nc_CLOTUREE: { fr: 'Clôturée', ar: 'مغلقة' },

  // ---------- Sélecteur de langue ----------
  language: { fr: 'Langue', ar: 'اللغة' },
  french: { fr: 'Français', ar: 'الفرنسية' },
  arabic: { fr: 'Arabe', ar: 'العربية' },
} as const;

export type TranslationKey = keyof typeof translations;
export type Language = 'fr' | 'ar';
