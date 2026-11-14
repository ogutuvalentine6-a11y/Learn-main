// Translation dictionaries. Keys are shared across all locales.
// English is the canonical fallback — any missing key falls back to en.

export type Language = "en" | "sw" | "fr" | "zh" | "ja";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文简体", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // Navbar
  "nav.courses": "Courses",
  "nav.learn": "Learn",
  "nav.community": "Community",
  "nav.careers": "Careers",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.login": "Login",
  "nav.getStarted": "Get Started",
  "nav.search": "Search",
  "nav.notifications": "Notifications",
  "nav.dashboard": "Dashboard",
  "nav.invoices": "Invoices",
  "nav.logout": "Logout",
  "nav.toggleMenu": "Toggle menu",

  // Footer
  "footer.tagline": "Learn without limits. Built for students, instructors, and administrators — honestly, securely, and with care.",
  "footer.navigate": "Navigate",
  "footer.getStarted": "Get Started",
  "footer.founder": "Founder",
  "footer.rights": "All rights reserved",
  "footer.builtBy": "Designed & built by",

  // Homepage hero
  "home.hero.badge": "Learning without limits",
  "home.hero.title": "Learn Without Limits. Build Your Future.",
  "home.hero.subtitle": "Discover quality education, connect with experienced instructors, access learning resources, and develop the skills you need to succeed.",
  "home.hero.ctaPrimary": "Get Started",
  "home.hero.ctaSecondary": "Explore Courses",

  // Homepage sections
  "home.stats.students": "Students",
  "home.stats.courses": "Courses",
  "home.stats.instructors": "Instructors",
  "home.stats.enrollments": "Enrollments",
  "home.courses.heading": "Explore Courses",
  "home.courses.subtitle": "Real courses from the platform catalog — no placeholders.",
  "home.courses.empty": "No courses are published yet. Check back soon.",
  "home.courses.enroll": "Enroll",
  "home.courses.free": "Free",

  // Auth
  "auth.login.title": "Login",
  "auth.login.email": "Email",
  "auth.login.password": "Password",
  "auth.login.submit": "Login",
  "auth.login.noAccount": "No account?",
  "auth.login.register": "Register",
  "auth.login.failed": "Login failed",

  "auth.register.title": "Create an account",
  "auth.register.fullName": "Full Name",
  "auth.register.idNumber": "ID Number",
  "auth.register.email": "Email",
  "auth.register.phone": "Phone",
  "auth.register.location": "Location",
  "auth.register.school": "School / Institution",
  "auth.register.fieldOfStudy": "Field of Study",
  "auth.register.courseOfStudy": "Course of Study",
  "auth.register.password": "Password",
  "auth.register.submit": "Register",
  "auth.register.haveAccount": "Already registered?",
  "auth.register.login": "Login",

  // Common
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
};

const sw: Dict = {
  "nav.courses": "Kozi",
  "nav.learn": "Soma",
  "nav.community": "Jamii",
  "nav.careers": "Ajira",
  "nav.about": "Kuhusu",
  "nav.contact": "Wasiliana",
  "nav.login": "Ingia",
  "nav.getStarted": "Anza Sasa",
  "nav.search": "Tafuta",
  "nav.notifications": "Arifa",
  "nav.dashboard": "Dashibodi",
  "nav.invoices": "Ankara",
  "nav.logout": "Toka",
  "nav.toggleMenu": "Fungua menyu",

  "footer.tagline": "Soma bila kikomo. Imeundwa kwa wanafunzi, walimu, na wasimamizi — kwa uaminifu, usalama, na utunzaji.",
  "footer.navigate": "Urambazaji",
  "footer.getStarted": "Anza Sasa",
  "footer.founder": "Mwanzilishi",
  "footer.rights": "Haki zote zimehifadhiwa",
  "footer.builtBy": "Imeundwa na",

  "home.hero.badge": "Kusoma bila kikomo",
  "home.hero.title": "Soma Bila Kikomo. Jenga Mustakabali Wako.",
  "home.hero.subtitle": "Gundua elimu bora, ungana na walimu wenye uzoefu, pata rasilimali za kujifunza, na kuza ujuzi unaohitaji kufanikiwa.",
  "home.hero.ctaPrimary": "Anza Sasa",
  "home.hero.ctaSecondary": "Vinjari Kozi",

  "home.stats.students": "Wanafunzi",
  "home.stats.courses": "Kozi",
  "home.stats.instructors": "Walimu",
  "home.stats.enrollments": "Usajili",
  "home.courses.heading": "Vinjari Kozi",
  "home.courses.subtitle": "Kozi halisi kutoka katalogi ya jukwaa — hakuna mifano.",
  "home.courses.empty": "Hakuna kozi zilizochapishwa bado. Angalia tena hivi karibuni.",
  "home.courses.enroll": "Jiandikishe",
  "home.courses.free": "Bure",

  "auth.login.title": "Ingia",
  "auth.login.email": "Barua pepe",
  "auth.login.password": "Nenosiri",
  "auth.login.submit": "Ingia",
  "auth.login.noAccount": "Hakuna akaunti?",
  "auth.login.register": "Jisajili",
  "auth.login.failed": "Kuingia kumeshindikana",

  "auth.register.title": "Unda akaunti",
  "auth.register.fullName": "Jina Kamili",
  "auth.register.idNumber": "Nambari ya Kitambulisho",
  "auth.register.email": "Barua pepe",
  "auth.register.phone": "Simu",
  "auth.register.location": "Mahali",
  "auth.register.school": "Shule / Taasisi",
  "auth.register.fieldOfStudy": "Fani ya Masomo",
  "auth.register.courseOfStudy": "Kozi ya Masomo",
  "auth.register.password": "Nenosiri",
  "auth.register.submit": "Jisajili",
  "auth.register.haveAccount": "Umeshajisajili?",
  "auth.register.login": "Ingia",

  "common.loading": "Inapakia…",
  "common.error": "Hitilafu imetokea.",
  "common.save": "Hifadhi",
  "common.cancel": "Ghairi",
  "common.delete": "Futa",
  "common.edit": "Badilisha",
  "common.close": "Funga",
};

const fr: Dict = {
  "nav.courses": "Cours",
  "nav.learn": "Apprendre",
  "nav.community": "Communauté",
  "nav.careers": "Carrières",
  "nav.about": "À propos",
  "nav.contact": "Contact",
  "nav.login": "Connexion",
  "nav.getStarted": "Commencer",
  "nav.search": "Rechercher",
  "nav.notifications": "Notifications",
  "nav.dashboard": "Tableau de bord",
  "nav.invoices": "Factures",
  "nav.logout": "Déconnexion",
  "nav.toggleMenu": "Basculer le menu",

  "footer.tagline": "Apprenez sans limites. Conçu pour les étudiants, les enseignants et les administrateurs — honnêtement, en toute sécurité et avec soin.",
  "footer.navigate": "Navigation",
  "footer.getStarted": "Commencer",
  "footer.founder": "Fondateur",
  "footer.rights": "Tous droits réservés",
  "footer.builtBy": "Conçu et construit par",

  "home.hero.badge": "Apprendre sans limites",
  "home.hero.title": "Apprenez sans limites. Construisez votre avenir.",
  "home.hero.subtitle": "Découvrez une éducation de qualité, connectez-vous avec des instructeurs expérimentés, accédez à des ressources d'apprentissage et développez les compétences dont vous avez besoin pour réussir.",
  "home.hero.ctaPrimary": "Commencer",
  "home.hero.ctaSecondary": "Explorer les cours",

  "home.stats.students": "Étudiants",
  "home.stats.courses": "Cours",
  "home.stats.instructors": "Instructeurs",
  "home.stats.enrollments": "Inscriptions",
  "home.courses.heading": "Explorer les cours",
  "home.courses.subtitle": "De vrais cours du catalogue de la plateforme — pas d'espaces réservés.",
  "home.courses.empty": "Aucun cours publié pour l'instant. Revenez bientôt.",
  "home.courses.enroll": "S'inscrire",
  "home.courses.free": "Gratuit",

  "auth.login.title": "Connexion",
  "auth.login.email": "Email",
  "auth.login.password": "Mot de passe",
  "auth.login.submit": "Connexion",
  "auth.login.noAccount": "Pas de compte?",
  "auth.login.register": "S'inscrire",
  "auth.login.failed": "Échec de la connexion",

  "auth.register.title": "Créer un compte",
  "auth.register.fullName": "Nom complet",
  "auth.register.idNumber": "Numéro d'identification",
  "auth.register.email": "Email",
  "auth.register.phone": "Téléphone",
  "auth.register.location": "Localisation",
  "auth.register.school": "École / Institution",
  "auth.register.fieldOfStudy": "Domaine d'études",
  "auth.register.courseOfStudy": "Cours d'études",
  "auth.register.password": "Mot de passe",
  "auth.register.submit": "S'inscrire",
  "auth.register.haveAccount": "Déjà inscrit?",
  "auth.register.login": "Connexion",

  "common.loading": "Chargement…",
  "common.error": "Une erreur s'est produite.",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.close": "Fermer",
};

const zh: Dict = {
  "nav.courses": "课程", "nav.learn": "学习", "nav.community": "社区",
  "nav.careers": "招聘", "nav.about": "关于", "nav.contact": "联系",
  "nav.login": "登录", "nav.getStarted": "开始", "nav.logout": "退出登录",
  "home.hero.badge": "无限学习",
  "home.hero.title": "无限学习，成就未来。",
  "home.hero.subtitle": "发现优质教育，联系经验丰富的导师，获取学习资源，培养成功所需的技能。",
  "home.hero.ctaPrimary": "开始", "home.hero.ctaSecondary": "浏览课程",
  "home.stats.students": "学生", "home.stats.courses": "课程",
  "home.stats.instructors": "导师", "home.stats.enrollments": "注册",
  "home.courses.heading": "浏览课程",
  "home.courses.empty": "尚未发布课程。请稍后再来。",
  "auth.login.title": "登录", "auth.login.email": "电子邮件",
  "auth.login.password": "密码", "auth.login.submit": "登录",
  "auth.register.title": "创建账号", "auth.register.fullName": "全名",
  "common.loading": "加载中…", "common.save": "保存", "common.cancel": "取消",
};

const ja: Dict = {
  "nav.courses": "コース", "nav.learn": "学ぶ", "nav.community": "コミュニティ",
  "nav.careers": "キャリア", "nav.about": "概要", "nav.contact": "お問い合わせ",
  "nav.login": "ログイン", "nav.getStarted": "始める", "nav.logout": "ログアウト",
  "home.hero.badge": "限界なく学ぶ",
  "home.hero.title": "限界なく学び、未来を築く。",
  "home.hero.subtitle": "質の高い教育を見つけ、経験豊富な講師とつながり、学習リソースにアクセスし、成功に必要なスキルを開発しましょう。",
  "home.hero.ctaPrimary": "始める", "home.hero.ctaSecondary": "コースを見る",
  "home.stats.students": "学生", "home.stats.courses": "コース",
  "home.stats.instructors": "講師", "home.stats.enrollments": "登録",
  "home.courses.heading": "コースを見る",
  "home.courses.empty": "公開されているコースはまだありません。後でもう一度ご確認ください。",
  "auth.login.title": "ログイン", "auth.login.email": "メール",
  "auth.login.password": "パスワード", "auth.login.submit": "ログイン",
  "auth.register.title": "アカウントを作成", "auth.register.fullName": "氏名",
  "common.loading": "読み込み中…", "common.save": "保存", "common.cancel": "キャンセル",
};

export const DICTIONARIES: Record<Language, Dict> = { en, sw, fr, zh, ja };

/** All translation keys — used by the coverage test. */
export const ALL_KEYS = Object.keys(en);

export function translate(
  language: Language,
  key: string,
  fallback: string = "en" as Language,
): string {
  const dict = DICTIONARIES[language] || DICTIONARIES.en;
  return dict[key] || DICTIONARIES[fallback as Language][key] || key;
}
