import { Asset } from 'expo-asset';
import { ALL_PARTNER_IMAGE_MODULES } from '../config/partnerAssets';

/**
 * パートナー立ち絵24枚を起動時にデコードまで先読みする。
 * 画面表示直後の「真っ先に絵が出ない」を大幅に抑える。
 */
export async function preloadPartnerImages(): Promise<void> {
  try {
    await Asset.loadAsync(ALL_PARTNER_IMAGE_MODULES as unknown as number[]);
  } catch (e) {
    if (__DEV__) console.warn('[preloadPartnerImages]', e);
  }
}
