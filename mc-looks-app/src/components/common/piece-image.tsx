import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Box, Flex, Image, Text } from '@commercetools/nimbus';
import messages from './messages';

type PieceImageProps = {
  src: string | undefined;
  width?: number | string;
};

/**
 * A product image the way shop tiles show it: 4:5, `object-fit: cover`,
 * never letterboxed, on a neutral ground. `width` is the drawn width; the
 * height follows from the ratio. Without an image the ground carries
 * "Bild folgt". Decorative: the name next to it names the piece.
 */
export const PieceImage: FC<PieceImageProps> = ({ src, width = '100%' }) => {
  const intl = useIntl();
  return (
    <Box
      width={typeof width === 'number' ? `${width}px` : width}
      flexShrink={0}
      position="relative"
      overflow="hidden"
      bg="neutral.3"
      style={{ aspectRatio: '4 / 5' }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          position="absolute"
          inset="0"
          width="100%"
          height="100%"
          objectFit="cover"
        />
      ) : (
        <Flex
          position="absolute"
          inset="0"
          alignItems="center"
          justifyContent="center"
          p="100"
        >
          <Text fontSize="300" color="neutral.11" textAlign="center">
            {intl.formatMessage(messages.imageMissing)}
          </Text>
        </Flex>
      )}
    </Box>
  );
};
