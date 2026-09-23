import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, params) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key, params = {}) => {
    let str = translations[language]?.[key] || translations['en']?.[key] || key;
    Object.keys(params).forEach((k) => {
      str = str.replace(`{${k}}`, params[k]);
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
