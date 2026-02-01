export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android',
    'webos',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'mobile'
  ];
  
  return mobileKeywords.some(keyword => userAgent.includes(keyword));
}

export type Platform = 'mobile' | 'desktop';

export function getPlatform(): Platform {
  return isMobile() ? 'mobile' : 'desktop';
}
