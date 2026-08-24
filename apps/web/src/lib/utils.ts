import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePlate(plate: string): string {
  if (!plate) return plate;
  const clean = plate.replace(/\s+/g, '').toUpperCase();
  const m = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return plate.trim().replace(/\s+/g, ' ').toUpperCase();
}
