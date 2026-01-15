import { useState, useEffect, useCallback } from 'react';
import { getLocale, setLocale, t, addLocaleListener, Locale, getSupportedLocales } from '@/lib/i18n';

/**
 * React Hook for i18n
 * 提供国际化功能，支持语言切换和自动重新渲染
 */
export const useI18n = () => {
    const [locale, setLocaleState] = useState<Locale>(getLocale);

    useEffect(() => {
        // 监听语言变化
        const removeListener = addLocaleListener(() => {
            setLocaleState(getLocale());
        });
        return removeListener;
    }, []);

    const changeLocale = useCallback((newLocale: Locale) => {
        setLocale(newLocale);
        setLocaleState(newLocale);
    }, []);

    return {
        locale,
        setLocale: changeLocale,
        t,
        supportedLocales: getSupportedLocales(),
    };
};

export default useI18n;
