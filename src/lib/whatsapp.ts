export const whatsappNumber = import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '5511978538445';

export function whatsappLink(number: string | undefined, message: string): string | undefined {
  const digits = number?.replace(/[\s()+-]/g, '') || '';
  if (!/^[1-9]\d{7,14}$/.test(digits)) return undefined;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
