import { Language } from '../types';

/**
 * 法的文書の公開 URL。
 * GitHub Pages デプロイ後に実際の値へ書き換えること。
 * デプロイ手順は docs/HOSTING.md を参照。
 */
const BASE_URL = 'https://poorialeo-cell.github.io/brain-detox';

export function getPrivacyPolicyUrl(language: Language): string {
  return `${BASE_URL}/privacy-${language}.html`;
}

export function getTermsOfServiceUrl(language: Language): string {
  return `${BASE_URL}/terms-${language}.html`;
}
