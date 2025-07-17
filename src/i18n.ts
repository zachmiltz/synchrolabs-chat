import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['en', 'es', 'pt'] as const
export const defaultLocale = 'en' as const

export default getRequestConfig(async ({ locale }) => {
  // Validate locale exists and is valid
  if (!locale || !locales.includes(locale as (typeof locales)[number])) notFound()
  
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
}) 