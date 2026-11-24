export const colors = {
  primary: '#1F3A5F',
  accent: '#C9A227',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#1B1B1B',
  muted: '#6B7280',
  border: '#E5E7EB',
  danger: '#B42318',
  success: '#067647',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const today = () => new Date().toISOString().slice(0, 10);

export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
