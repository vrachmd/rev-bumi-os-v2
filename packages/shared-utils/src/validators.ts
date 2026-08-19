export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isPhoneValid(phone: string): boolean {
  const phoneRegex = /^[0-9+\-\s]{8,20}$/
  return phoneRegex.test(phone)
}

export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isRequiredText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}