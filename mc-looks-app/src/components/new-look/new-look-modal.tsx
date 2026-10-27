import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Flex,
  Grid,
  ModalPage,
  Stack,
  Steps,
  toast,
} from '@commercetools/nimbus';
import { config } from '../../config';
import {
  SaveStepError,
  planMatches,
  runSave,
  saveNewLook,
  type SavePlan,
  type SaveProgress,
} from '../../domain/save-look';
import { sumListPrices } from '../../domain/prices';
import { livePriceMap } from '../../domain/pieces';
import type { Money, NewLook, Piece } from '../../domain/types';
import {
  validateLook,
  type ValidationError,
  type ValidationField,
} from '../../domain/validate';
import { useCanManage, useCurrencies, useLookApi } from '../../hooks/context';
import { usePhotoCheck } from '../../hooks/use-photo-check';
import { describeError } from '../common/describe-error';
import commonMessages from '../common/messages';
import { PreviewPanel } from '../shop-preview/preview-panel';
import { BasicsStep } from './basics-step';
import messages from './messages';
import { PiecesStep } from './pieces-step';
import { ReviewStep } from './review-step';
import { SetPriceStep } from './set-price-step';
import { parseCents } from './set-price';
import { useValidationText } from './use-validation-text';

const STEP_FIELDS: ValidationField[][] = [
  ['label.de', 'label.en'],
  ['pieces'],
  ['setPrice'],
  ['label.de', 'label.en', 'pieces', 'setPrice', 'image'],
];
const LAST_STEP = STEP_FIELDS.length - 1;
const STEP_TITLES = [
  messages.stepBasics,
  messages.stepPieces,
  messages.stepSetPrice,
  messages.stepReview,
];

interface Failure {
  message: string;
  step?: SaveStepError['step'];
  plan?: SavePlan;
  progress?: SaveProgress;
}

const FAILED_STEP_MESSAGES = {
  discount: messages.failedDiscount,
  object: messages.failedObject,
  activation: messages.failedActivation,
};

/**
 * "Neuer Look": names and photo, pieces, set price, review and save. The
 * state lives here so it survives moving back and forth. A failed save is
 * resumed from where it stopped while the input still matches its plan.
 */
export function NewLookModal({
  basePath,
  onSaved,
}: {
  basePath: string;
  onSaved: () => void;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const history = useHistory();
  const currencies = useCurrencies();
  const canManage = useCanManage();
  const describeValidation = useValidationText();

  const [step, setStep] = useState(0);
  const [label, setLabel] = useState({ de: '', en: '' });
  const [photoPath, setPhotoPath] = useState('');
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [priceTexts, setPriceTexts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [activate, setActivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>();

  const photo = usePhotoCheck(photoPath, config.shopOrigin);
  const close = () => history.push(basePath);
  const isDisabled = !canManage;

  const livePrices = useMemo(() => livePriceMap(pieces), [pieces]);
  const sum = useMemo(
    () =>
      sumListPrices(
        pieces.map((piece) => piece.id),
        livePrices,
        currencies
      ),
    [pieces, livePrices, currencies]
  );
  const parsed = Object.fromEntries(
    currencies.map((currency) => [
      currency,
      parseCents(priceTexts[currency] ?? ''),
    ])
  );
  const cents: Money = Object.fromEntries(
    currencies.map((currency) => [currency, parsed[currency] ?? 0])
  );

  function newLook(): NewLook {
    return {
      label: { de: label.de.trim(), en: label.en.trim() },
      componentProductIds: pieces.map((piece) => piece.id),
      setPrice: cents,
      sum,
      ...(photo.image ? { image: photo.image } : {}),
    };
  }

  const nameOf = (id: string) =>
    pieces.find((piece) => piece.id === id)?.name ?? id;
  const describe = (error: ValidationError) =>
    describeValidation(error, {
      pieceName: nameOf,
      liveSum: sum,
      pieceCount: pieces.length,
    });
  const messagesFor = (fields: ValidationField[]) => [
    ...new Set(
      errors.filter((error) => fields.includes(error.field)).map(describe)
    ),
  ];

  const firstFor = (field: ValidationField) => {
    const error = errors.find((candidate) => candidate.field === field);
    return error ? describe(error) : undefined;
  };

  const amountErrors: Record<string, string | undefined> = {};
  for (const currency of currencies) {
    const text = (priceTexts[currency] ?? '').trim();
    if (text && parsed[currency] === undefined) {
      amountErrors[currency] = intl.formatMessage(messages.errorAmountFormat, {
        currency,
      });
    }
  }
  const setPriceErrors: Record<string, string | undefined> = {
    ...amountErrors,
  };
  for (const error of errors) {
    if (
      error.field === 'setPrice' &&
      error.currency &&
      !setPriceErrors[error.currency]
    ) {
      setPriceErrors[error.currency] = describe(error);
    }
  }

  function validate(forStep: number): boolean {
    const relevant = validateLook(newLook(), livePrices, currencies).filter(
      (error) => STEP_FIELDS[forStep].includes(error.field)
    );
    setErrors(relevant);
    return (
      relevant.length === 0 &&
      (forStep < 2 || Object.keys(amountErrors).length === 0)
    );
  }

  async function next() {
    if (!validate(step)) return;
    if (step === 0) {
      const verdict = await photo.verify();
      if (!verdict.ok) {
        setPhotoError(
          intl.formatMessage(
            verdict.reason === 'invalid'
              ? messages.photoInvalid
              : messages.photoUnreachable
          )
        );
        return;
      }
    }
    setErrors([]);
    setStep((current) => current + 1);
  }

  const resumable = Boolean(
    failure?.plan && failure.progress && planMatches(failure.plan, newLook())
  );

  async function save() {
    if (!validate(LAST_STEP)) return;
    setBusy(true);
    setFailure(undefined);
    try {
      if (failure?.plan && failure.progress && resumable) {
        await runSave(api, failure.plan, failure.progress, { activate });
      } else {
        await saveNewLook(api, newLook(), { activate });
      }
      const name = label.de.trim() || label.en.trim();
      toast.success({
        title: intl.formatMessage(messages.saved),
        description: intl.formatMessage(
          activate ? messages.savedActive : messages.savedInactive,
          { name }
        ),
      });
      onSaved();
      close();
    } catch (error) {
      const stepError = error instanceof SaveStepError ? error : undefined;
      setFailure({
        message: describeError(intl, stepError ? stepError.original : error),
        step: stepError?.step,
        plan: stepError?.plan ?? failure?.plan,
        progress: stepError?.progress,
      });
    } finally {
      setBusy(false);
    }
  }

  const photoUrl = photo.status === 'ready' ? photo.url : undefined;

  return (
    <ModalPage.Root isOpen onClose={close}>
      <ModalPage.TopBar
        previousPathLabel={intl.formatMessage(commonMessages.appTitle)}
        currentPathLabel={intl.formatMessage(messages.newLook)}
      />
      <ModalPage.Header>
        <ModalPage.Title>
          {intl.formatMessage(messages.newLook)}
        </ModalPage.Title>
      </ModalPage.Header>
      <ModalPage.Content>
        <Stack gap="600">
          {!canManage && (
            <Alert.Root colorPalette="info">
              <Alert.Description>
                {intl.formatMessage(commonMessages.viewOnly)}
              </Alert.Description>
            </Alert.Root>
          )}
          <Steps.Root count={STEP_TITLES.length} step={step} linear>
            <Steps.List aria-label={intl.formatMessage(messages.stepsLabel)}>
              {STEP_TITLES.map((title, index) => (
                <Steps.Item key={title.id} index={index}>
                  <Steps.Trigger>
                    {/* The indicator recipe highlights the current step only
                        through data-state="open", which Steps sets on the
                        trigger but not on the indicator. */}
                    <Steps.Indicator
                      data-state={index === step ? 'open' : undefined}
                    >
                      <Steps.Number />
                    </Steps.Indicator>
                    <Steps.Title>{intl.formatMessage(title)}</Steps.Title>
                  </Steps.Trigger>
                  {index < STEP_TITLES.length - 1 && <Steps.Separator />}
                </Steps.Item>
              ))}
            </Steps.List>
          </Steps.Root>

          <Grid
            templateColumns="minmax(0, 3fr) minmax(0, 2fr)"
            gap="800"
            alignItems="start"
          >
            <Stack gap="600" minWidth={0}>
              {step === 0 && (
                <BasicsStep
                  label={label}
                  onLabelChange={setLabel}
                  nameErrors={{
                    de: firstFor('label.de'),
                    en: firstFor('label.en'),
                  }}
                  photoPath={photoPath}
                  onPhotoPathChange={(path) => {
                    setPhotoPath(path);
                    setPhotoError(undefined);
                  }}
                  photoError={photoError}
                  photo={photo}
                  photoAvailable={Boolean(config.shopOrigin)}
                  isDisabled={isDisabled}
                />
              )}
              {step === 1 && (
                <PiecesStep
                  pieces={pieces}
                  onPiecesChange={setPieces}
                  sum={sum}
                  errors={messagesFor(['pieces'])}
                  isDisabled={isDisabled}
                />
              )}
              {step === 2 && (
                <SetPriceStep
                  texts={priceTexts}
                  onTextsChange={setPriceTexts}
                  sum={sum}
                  cents={cents}
                  errors={setPriceErrors}
                  isDisabled={isDisabled}
                />
              )}
              {step === LAST_STEP && (
                <ReviewStep
                  name={label}
                  photoPath={photo.image?.path}
                  pieces={pieces}
                  sum={sum}
                  setPrice={cents}
                  activate={activate}
                  onActivateChange={setActivate}
                  isDisabled={isDisabled}
                />
              )}
            </Stack>
            <Box position="sticky" top="0" minWidth={0}>
              <PreviewPanel
                pieces={pieces}
                setPrice={cents}
                sum={sum}
                photoUrl={photoUrl}
                photoRatio={photo.image}
                photoAlt={label.de || label.en}
              />
            </Box>
          </Grid>

          {step === LAST_STEP && errors.length > 0 && (
            <Alert.Root colorPalette="critical">
              {messagesFor(STEP_FIELDS[LAST_STEP]).map((message) => (
                <Alert.Description key={message}>{message}</Alert.Description>
              ))}
            </Alert.Root>
          )}
          {failure && (
            <Alert.Root colorPalette="critical">
              <Alert.Title>
                {intl.formatMessage(
                  failure.progress?.discount
                    ? messages.saveFailedTitle
                    : messages.saveFailedNoneTitle
                )}
              </Alert.Title>
              {failure.step && (
                <Alert.Description>
                  {intl.formatMessage(FAILED_STEP_MESSAGES[failure.step])}
                </Alert.Description>
              )}
              <Alert.Description>{failure.message}</Alert.Description>
              <Alert.Actions>
                <Button
                  size="xs"
                  variant="outline"
                  isDisabled={busy || isDisabled}
                  onPress={() => void save()}
                >
                  {intl.formatMessage(commonMessages.retry)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          )}
        </Stack>
      </ModalPage.Content>
      <ModalPage.Footer>
        <Flex gap="200" justifyContent="flex-end" width="100%">
          <Button variant="ghost" onPress={close}>
            {intl.formatMessage(messages.cancel)}
          </Button>
          {step > 0 && (
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => {
                setErrors([]);
                setStep((current) => current - 1);
              }}
            >
              {intl.formatMessage(messages.back)}
            </Button>
          )}
          {step < LAST_STEP ? (
            <Button
              variant="solid"
              colorPalette="primary"
              onPress={() => void next()}
            >
              {intl.formatMessage(messages.next)}
            </Button>
          ) : (
            <Button
              variant="solid"
              colorPalette="primary"
              isDisabled={busy || isDisabled}
              onPress={() => void save()}
            >
              {intl.formatMessage(messages.saveLook)}
            </Button>
          )}
        </Flex>
      </ModalPage.Footer>
    </ModalPage.Root>
  );
}
