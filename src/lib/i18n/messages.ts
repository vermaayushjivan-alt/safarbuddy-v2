// MOBILE-02: UI strings for the app shell (bottom tab bar + side menu).
// Page content (hotel names, descriptions, prices, policies) is NOT
// translated here — only the navigation shell. Add a key to BOTH
// languages when adding a new shell string.

export type Lang = 'en' | 'hi';

export const LANG_STORAGE_KEY = 'sb_lang';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

const en = {
  tabHome: 'Home',
  tabPackages: 'Packages',
  tabSearch: 'Search hotels',
  tabBookings: 'Bookings',
  tabAccount: 'Account',
  tabLogin: 'Login',
  tabs: 'Mobile tabs',

  menu: 'Menu',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  welcome: 'Welcome to SafarBuddy',
  welcomeSub: 'Login to see your bookings and offers.',
  login: 'Login',
  register: 'Register',
  myAccountFallback: 'My Account',

  secExplore: 'Explore',
  secAccount: 'My Account',
  secSettings: 'Settings',
  secHelp: 'Help & Support',
  secAbout: 'About & Legal',

  hotels: 'Hotels',
  destinations: 'Destinations',
  holidayPackages: 'Holiday Packages',
  offers: 'Offers',
  listProperty: 'List Your Property',

  dashboard: 'Dashboard',
  myBookings: 'My Bookings',
  myProfile: 'My Profile',
  referEarn: 'Refer & Earn',
  myProperty: 'My Property',
  vendorDashboard: 'Vendor Dashboard',
  adminPanel: 'Admin Panel',

  language: 'Language',
  languageNote: 'Applies to the app menu and tabs. Page content stays in English for now.',
  installApp: 'Install SafarBuddy app',
  installIosHint: 'Tap the Share button in your browser, then "Add to Home Screen".',
  shareApp: 'Share SafarBuddy',
  shareText: 'Book hotels, resorts, homestays and holiday packages with SafarBuddy.',

  contactUs: 'Contact Us',
  callUs: 'Call us',
  emailUs: 'Email us',

  aboutUs: 'About Us',
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  refund: 'Cancellation & Refund Policy',

  logout: 'Logout',
};

export type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  tabHome: 'होम',
  tabPackages: 'पैकेज',
  tabSearch: 'होटल खोजें',
  tabBookings: 'बुकिंग',
  tabAccount: 'अकाउंट',
  tabLogin: 'लॉगिन',
  tabs: 'मोबाइल टैब',

  menu: 'मेन्यू',
  openMenu: 'मेन्यू खोलें',
  closeMenu: 'मेन्यू बंद करें',
  welcome: 'SafarBuddy में आपका स्वागत है',
  welcomeSub: 'अपनी बुकिंग और ऑफ़र देखने के लिए लॉगिन करें।',
  login: 'लॉगिन',
  register: 'रजिस्टर',
  myAccountFallback: 'मेरा अकाउंट',

  secExplore: 'एक्सप्लोर करें',
  secAccount: 'मेरा अकाउंट',
  secSettings: 'सेटिंग्स',
  secHelp: 'सहायता',
  secAbout: 'जानकारी और नीतियाँ',

  hotels: 'होटल',
  destinations: 'डेस्टिनेशन',
  holidayPackages: 'हॉलिडे पैकेज',
  offers: 'ऑफ़र',
  listProperty: 'अपनी प्रॉपर्टी जोड़ें',

  dashboard: 'डैशबोर्ड',
  myBookings: 'मेरी बुकिंग',
  myProfile: 'मेरी प्रोफ़ाइल',
  referEarn: 'रेफ़र करें और कमाएँ',
  myProperty: 'मेरी प्रॉपर्टी',
  vendorDashboard: 'वेंडर डैशबोर्ड',
  adminPanel: 'एडमिन पैनल',

  language: 'भाषा',
  languageNote: 'यह ऐप मेन्यू और टैब पर लागू होता है। पेज की सामग्री अभी अंग्रेज़ी में रहेगी।',
  installApp: 'SafarBuddy ऐप इंस्टॉल करें',
  installIosHint: 'ब्राउज़र में Share बटन दबाएँ, फिर "Add to Home Screen" चुनें।',
  shareApp: 'SafarBuddy शेयर करें',
  shareText: 'SafarBuddy पर होटल, रिसॉर्ट, होमस्टे और हॉलिडे पैकेज बुक करें।',

  contactUs: 'संपर्क करें',
  callUs: 'कॉल करें',
  emailUs: 'ईमेल करें',

  aboutUs: 'हमारे बारे में',
  privacy: 'प्राइवेसी पॉलिसी',
  terms: 'नियम और शर्तें',
  refund: 'कैंसलेशन और रिफ़ंड पॉलिसी',

  logout: 'लॉग आउट',
};

export const messages: Record<Lang, Record<MessageKey, string>> = { en, hi };
