import type { FC } from 'react';
import { Box, Image } from '@commercetools/nimbus';

type LookPhotoProps = {
  src: string;
  alt: string;
  width: number | string;
  ratio: { width: number; height: number };
};

/**
 * The look photo: portrait, drawn at `width` with the file's own
 * proportions, `object-fit: cover`. `alt` is the look's name. When the file
 * cannot be loaded the neutral ground stays and the rest of the screen is
 * unaffected.
 */
export const LookPhoto: FC<LookPhotoProps> = ({ src, alt, width, ratio }) => {
  return (
    <Box
      data-look-photo=""
      width={typeof width === 'number' ? `${width}px` : width}
      flexShrink={0}
      position="relative"
      overflow="hidden"
      bg="neutral.3"
      style={{ aspectRatio: `${ratio.width} / ${ratio.height}` }}
    >
      <Image
        src={src}
        alt={alt}
        position="absolute"
        inset="0"
        width="100%"
        height="100%"
        objectFit="cover"
      />
    </Box>
  );
};
