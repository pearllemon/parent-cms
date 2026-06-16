// Parent CMS: empty services list. Child sites populate their own services.
export interface ServiceItem {
  slug: string;
  title: string;
  excerpt?: string;
  keywords?: string[];
}
export const services: ServiceItem[] = [];
