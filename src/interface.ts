export enum ResultTypes {
  Success,
  LowConfidence,
  InvalidLength,
}

/**
 * Brand type to ensure CAPTCHA strings are treated as a distinct domain primitive.
 */
export type Captcha = string & { __brand: "Captcha" };

export function asCaptcha(value: string): Captcha {
  return value as Captcha;
}

export interface SolveResult {
  type: ResultTypes;
  value: Captcha;
}

export interface KindEntry {
  write_name: string;
  data_path: string;
}
