import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;

export const wp = (widthPercent: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * widthPercent) / 100);
};

export const hp = (heightPercent: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
};

export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export const getDeviceType = (): DeviceType => {
  const dim = Dimensions.get('window');
  const width = Math.min(dim.width, dim.height);

  if (Platform.OS === 'web') {
    if (dim.width >= 1024) return 'desktop';
    if (dim.width >= 768) return 'tablet';
    return 'phone';
  }

  if (width >= 768) return 'tablet';
  return 'phone';
};

export const isSmallScreen = (): boolean => SCREEN_WIDTH < 375;
export const isTablet = (): boolean => getDeviceType() === 'tablet';
export const isDesktop = (): boolean => getDeviceType() === 'desktop';
export const isWeb = (): boolean => Platform.OS === 'web';

export const getNumColumns = (): number => {
  const type = getDeviceType();
  if (type === 'desktop') return 3;
  if (type === 'tablet') return 2;
  return 1;
};

export const getContentMaxWidth = (): number | undefined => {
  if (isDesktop()) return 1200;
  if (isTablet()) return 900;
  return undefined;
};

export const getGridItemWidth = (numColumns: number, gap: number = 16): number => {
  const maxWidth = getContentMaxWidth() || SCREEN_WIDTH;
  const totalGap = gap * (numColumns + 1);
  return (maxWidth - totalGap) / numColumns;
};
