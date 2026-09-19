import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { drawStone } from '../ui/drawStone';

interface Props {
  hex: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single stone drawn with `drawStone` (the same faceted rhinestone as the
 * app icon and the board itself), for the places that used to show a plain
 * rounded-square `View` instead - the tray pile and the airborne strip in
 * hand. Its own tiny `Canvas`, since those are ordinary React elements laid
 * out by flexbox, not part of the board's own single baked Picture.
 */
export function StoneIcon({ hex, size, style }: Props) {
  const picture = useMemo(
    () => createPicture((canvas) => drawStone(canvas, 0, 0, size, hex), Skia.XYWHRect(0, 0, size, size)),
    [hex, size]
  );

  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Picture picture={picture} />
    </Canvas>
  );
}

export default StoneIcon;
