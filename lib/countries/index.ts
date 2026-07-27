export interface Country {
    code: string;
    name: string;
    aliases?: string[];
  }
  
  export const POPULAR_COUNTRIES: Country[] = [
    { code: 'US', name: 'United States', aliases: ['USA', 'America'] },
    { code: 'GB', name: 'United Kingdom', aliases: ['UK', 'Britain', 'England'] },
    { code: 'CA', name: 'Canada' },
    { code: 'AE', name: 'United Arab Emirates', aliases: ['UAE', 'Dubai'] },
  ];
  
  export const ALL_COUNTRIES: Country[] = [
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CN', name: 'China' },
    { code: 'DE', name: 'Germany' },
    { code: 'IN', name: 'India' },
    { code: 'JP', name: 'Japan' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'UK', name: 'United Kingdom', aliases: ['GB', 'Great Britain'] },
    { code: 'US', name: 'United States', aliases: ['USA'] },
  ];