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
  manageTasks: { fr: 'Gérer les tâches', ar: 'إدارة المهام' },

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

  // ---------- Checklist ----------
  circuitLabel: { fr: 'Circuit', ar: 'المسار' },
  loadingTasks: { fr: 'Chargement des tâches...', ar: 'جاري تحميل المهام...' },
  photoRequired: { fr: 'Photo requise', ar: 'الصورة مطلوبة' },
  takePhoto: { fr: 'Prendre une photo', ar: 'التقاط صورة' },
  uploading: { fr: 'Envoi en cours...', ar: 'جاري الإرسال...' },
  photoAdded: { fr: 'Photo ajoutée', ar: 'تمت إضافة الصورة' },
  photoLocalPending: { fr: 'Photo locale (en attente de sync)', ar: 'صورة محلية (بانتظار المزامنة)' },
  ncFormTitle: { fr: 'Non conformité — Action immédiate obligatoire', ar: 'عدم مطابقة — إجراء فوري إلزامي' },
  actionPlaceholder: { fr: 'Ex: nettoyage effectué, produit retiré...', ar: 'مثال: تم التنظيف، تم سحب المنتج...' },
  confirmNCButton: { fr: 'Confirmer la NC', ar: 'تأكيد عدم المطابقة' },
  savingLabel: { fr: 'Enregistrement...', ar: 'جاري الحفظ...' },
  actionRequiredAlert: { fr: "L'action immédiate est obligatoire.", ar: 'الإجراء الفوري إلزامي.' },
  photoRequiredAlert: { fr: 'Une photo est requise pour cette tâche avant de continuer.', ar: 'الصورة مطلوبة لهذه المهمة قبل المتابعة.' },
  saveErrorAlert: { fr: "Erreur lors de l'enregistrement.", ar: 'خطأ أثناء الحفظ.' },
  noCircuitAssigned: { fr: "Aucun circuit n'est associé à votre rayon pour le moment.", ar: 'لا يوجد مسار مرتبط برفكم حاليا.' },
  contactAdmin: { fr: 'Contactez votre administrateur.', ar: 'اتصل بالمسؤول.' },
  onlineStatus: { fr: 'En ligne', ar: 'متصل' },
  offlineStatus: { fr: 'Hors ligne — saisie locale activée', ar: 'غير متصل — التسجيل المحلي مفعل' },
  pendingSync: { fr: 'en attente — Sync', ar: 'بانتظار المزامنة' },
  syncing: { fr: 'Synchronisation...', ar: 'جاري المزامنة...' },
  tasksLabel: { fr: 'tâches', ar: 'مهام' },

  // ---------- Shifts (tranches horaires) ----------
  currentShift: { fr: 'Tranche en cours', ar: 'الفترة الحالية' },
  shift_MATIN: { fr: 'Matin', ar: 'صباح' },
  shift_SOIR: { fr: 'Soir', ar: 'مساء' },
  viewThisShift: { fr: 'Ce shift', ar: 'هذه الفترة' },
  viewFullDay: { fr: 'Journée', ar: 'اليوم كامل' },
  executedLabel: { fr: 'Exécutée', ar: 'منجزة' },

  // ---------- Heure cible & retard ----------
  targetTime: { fr: 'Heure cible', ar: 'الوقت المحدد' },
  lateBadge: { fr: 'En retard', ar: 'متأخرة' },
  blockedPastTime: { fr: 'Heure dépassée — enregistrement bloqué', ar: 'انتهى الوقت - التسجيل مغلق' },
  mustReportLate: { fr: 'Heure dépassée — à déclarer en écart', ar: 'انتهى الوقت - يجب التصريح بعدم المطابقة' },
} as const;

export type TranslationKey = keyof typeof translations;
export type Language = 'fr' | 'ar';
