// Ported from Kokoro Pay v2; source commit and adaptations are recorded in docs/PROVENANCE.md.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
