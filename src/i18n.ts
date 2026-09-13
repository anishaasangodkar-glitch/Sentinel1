import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: { translation: { dashboard: 'Dashboard', analyze: 'Analyze', incidents: 'Incidents', intelligence: 'Risk intelligence', support: 'Support', insights: 'Insights', settings: 'Settings', workspace: 'Workspace', search: 'Search incidents', privacyOn: 'Privacy mode on', demoOn: 'Demo mode on', paused: 'Sentinel paused', resume: 'Click to resume analysis', pause: 'Click to pause analysis', anonymous: 'Anonymous session', signIn: 'Sign in to save' } },
  hi: { translation: { dashboard: 'डैशबोर्ड', analyze: 'विश्लेषण', incidents: 'घटनाएँ', intelligence: 'जोखिम जानकारी', support: 'सहायता', insights: 'अंतर्दृष्टि', settings: 'सेटिंग्स', workspace: 'वर्कस्पेस', search: 'घटनाएँ खोजें', privacyOn: 'गोपनीयता मोड चालू', demoOn: 'डेमो मोड चालू', paused: 'Sentinel रुका हुआ है', resume: 'विश्लेषण फिर शुरू करने के लिए क्लिक करें', pause: 'विश्लेषण रोकने के लिए क्लिक करें', anonymous: 'अनाम सत्र', signIn: 'सहेजने के लिए साइन इन करें' } },
}

void i18n.use(initReactI18next).init({ resources, lng: localStorage.getItem('sentinel-language') || 'en', fallbackLng: 'en', interpolation: { escapeValue: false } })
export default i18n
