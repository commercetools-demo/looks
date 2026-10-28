import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Box, Heading, Stack, Text } from '@commercetools/nimbus';
import messages from './messages';
import { ShopPreview, type ShopPreviewProps } from './shop-preview';

/** The preview in a card with its title and the caption in the UI language. */
export const PreviewPanel: FC<ShopPreviewProps> = (props) => {
  const intl = useIntl();
  return (
    <Box
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="300"
      bg="neutral.1"
      p="400"
    >
      <Stack gap="300">
        <Stack gap="0">
          <Heading as="h3" size="sm">
            {intl.formatMessage(messages.title)}
          </Heading>
          <Text fontSize="300" color="neutral.11">
            {intl.formatMessage(messages.caption)}
          </Text>
        </Stack>
        <ShopPreview {...props} />
      </Stack>
    </Box>
  );
};
