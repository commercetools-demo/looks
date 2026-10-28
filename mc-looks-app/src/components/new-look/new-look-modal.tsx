/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Flex,
  ModalPage,
  Stack,
  Steps,
  toast,
} from '@commercetools/nimbus';
import {
  LookKeyTakenError,
  SaveStepError,
  planMatches,
  runSave,
  saveNewLook,
  type SavePlan,
  type SaveProgress,
} from '../../domain/save-look';
import { lookPriceKeys, sumListPrices } from '../../domain/prices';
import { livePriceMap } from '../../domain/pieces';
import { localized } from '../../domain/format';
import { deriveLookKey, keySourceName, lookObjectKey } from '../../domain/keys';
import { omitEmptyTranslations } from '../../domain/names';
import { takenLookKeys } from '../../domain/look-rows';
import type { LocalizedValue, Money, NewLook, Piece } from '../../domain/types';
import {
  validateLook,
  type ValidationError,
  type ValidationField,
} from '../../domain/validate';
import {
  useCanManage,
  useCurrencies,
  useDataLocale,
  useLookApi,
} from '../../hooks/context';
import { describeError } from '../common/describe-error';
import type { PriceMode, PriceTableState } from '../common/set-price-table';
import { percentOf, priceFromPercent } from '../../domain/price-table';
import commonMessages from '../common/messages';
import { BasicsStep } from './basics-step';
import messages from './messages';
import { PiecesStep } from './pieces-step';
import { ReviewStep } from './review-step';
import { SetPriceStep } from './set-price-step';
import { parseCents } from './set-price';
import { useValidationText } from './use-validation-text';

const STEP_FIELDS: ValidationField[][] = [
  ['label', 'key'],
  ['pieces'],
  ['setPrice'],
  ['label', 'key', 'pieces', 'setPrice'],
];
const LAST_STEP = STEP_FIELDS.length - 1;
/** The step in the URL (`/new/pieces`); the first step is plain `/new`. */
const STEP_SLUGS = ['basics', 'pieces', 'price', 'review'];
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

type NewLookModalProps = {
  basePath: string;
  onSaved: () => void;
};

/**
 * "Neuer Look": names, pieces, set price, review and save. The
 * state lives here so it survives moving back and forth. A failed save is
 * resumed from where it stopped while the input still matches its plan.
 */
export const NewLookModal: FC<NewLookModalProps> = ({ basePath, onSaved }) => {
  const intl = useIntl();
  const api = useLookApi();
  const history = useHistory();
  const currencies = useCurrencies();
  const dataLocale = useDataLocale();
  const canManage = useCanManage();
  const describeValidation = useValidationText();

  const location = useLocation();
  const { step: stepSlug } = useParams<{ step?: string }>();
  // The step lives in the URL so back and forward walk through the steps. The
  // entered data lives in this component, so a step is only open once it was
  // reached here; any other address (a reload, a pasted link) shows step 1.
  const [reached, setReached] = useState(0);
  const urlStep = Math.max(0, STEP_SLUGS.indexOf(stepSlug ?? ''));
  const step = Math.min(urlStep, reached);
  const stepUrl = (index: number) => ({
    pathname:
      index === 0 ? `${basePath}/new` : `${basePath}/new/${STEP_SLUGS[index]}`,
    search: location.search,
  });
  const goToStep = (index: number) => {
    setReached((current) => Math.max(current, index));
    history.push(stepUrl(index));
  };
  useEffect(() => {
    if (urlStep > reached) history.replace(stepUrl(reached));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStep, reached]);
  const [label, setLabel] = useState<LocalizedValue>({});
  const [description, setDescription] = useState<LocalizedValue>({});
  // The key the user typed; `undefined` while the suggestion is used.
  const [customKey, setCustomKey] = useState<string | undefined>();
  // Keys of existing looks, to suggest a free key and flag a taken one early.
  const [takenKeys, setTakenKeys] = useState<Set<string>>(new Set());
  // The key was taken by someone else while saving.
  const [keyRace, setKeyRace] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [priceTexts, setPriceTexts] = useState<Record<string, string>>({});
  const [priceModes, setPriceModes] = useState<Record<string, PriceMode>>({});
  const onPriceChange = useCallback((next: PriceTableState) => {
    setPriceTexts(next.texts);
    setPriceModes(next.modes);
  }, []);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [activate, setActivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchLookObjects(), api.fetchCartDiscounts()]).then(
      ([objects, discounts]) => {
        if (!cancelled) setTakenKeys(takenLookKeys(objects, discounts));
      },
      // Without the list the save still refuses a taken key.
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  const suggestedKey = useMemo(() => {
    const source = keySourceName(omitEmptyTranslations(label));
    return source ? deriveLookKey(source, takenKeys) : '';
  }, [label, takenKeys]);
  const chosenKey = customKey?.trim();
  const keyValue = customKey ?? suggestedKey;
  const keyTaken =
    keyRace || (chosenKey !== undefined && takenKeys.has(chosenKey));

  const close = () => history.push(basePath);
  const isDisabled = !canManage;

  const livePrices = useMemo(() => livePriceMap(pieces), [pieces]);
  // Price cells (currency and country) the pieces have a price in.
  const priceKeys = useMemo(
    () =>
      lookPriceKeys(
        pieces.map((piece) => piece.id),
        livePrices,
        currencies
      ),
    [pieces, livePrices, currencies]
  );
  const sum = useMemo(
    () =>
      sumListPrices(
        pieces.map((piece) => piece.id),
        livePrices,
        priceKeys
      ),
    [pieces, livePrices, priceKeys]
  );
  // Rows exist where every piece has a price; a row with an empty set price
  // gets no discount.
  const cells = priceKeys.filter((key) => sum[key] !== undefined);
  const filled = cells.filter((key) => (priceTexts[key] ?? '').trim() !== '');
  const parsed = Object.fromEntries(
    filled.map((key) => [key, parseCents(priceTexts[key])])
  );
  // Rows last edited as a percentage get a relative discount: the percentage
  // is the row's (one decimal) and the price follows from it.
  const savingPercent: Record<string, number> = {};
  const cents: Money = Object.fromEntries(
    filled.flatMap((key) => {
      const typed = parsed[key];
      if (typed === undefined) return [];
      const percent =
        priceModes[key] === 'percent' ? percentOf(sum[key], typed) : undefined;
      if (percent === undefined) return [[key, typed]];
      savingPercent[key] = percent;
      return [[key, priceFromPercent(sum[key], percent)]];
    })
  );

  function newLook(): NewLook {
    return {
      ...(chosenKey !== undefined ? { key: chosenKey } : {}),
      label: omitEmptyTranslations(label),
      ...(Object.keys(omitEmptyTranslations(description)).length > 0
        ? { description: omitEmptyTranslations(description) }
        : {}),
      componentProductIds: pieces.map((piece) => piece.id),
      setPrice: cents,
      ...(Object.keys(savingPercent).length > 0 ? { savingPercent } : {}),
      sum,
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
  for (const key of filled) {
    const text = (priceTexts[key] ?? '').trim();
    if (text && parsed[key] === undefined) {
      amountErrors[key] = intl.formatMessage(messages.errorAmountFormat, {
        currency: key,
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
    const relevant = validateLook(newLook(), livePrices, priceKeys).filter(
      (error) => STEP_FIELDS[forStep].includes(error.field)
    );
    setErrors(relevant);
    if (keyTaken && STEP_FIELDS[forStep].includes('key')) return false;
    return (
      relevant.length === 0 &&
      (forStep < 2 || Object.keys(amountErrors).length === 0)
    );
  }

  async function next() {
    if (!validate(step)) return;
    setErrors([]);
    goToStep(step + 1);
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
      const name = localized(omitEmptyTranslations(label), dataLocale) ?? '';
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
      if (error instanceof LookKeyTakenError && chosenKey !== undefined) {
        // The chosen key was taken meanwhile: back to the field, nothing was written.
        setKeyRace(true);
        goToStep(0);
        return;
      }
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

  return (
    <ModalPage.Root isOpen onClose={close}>
      <ModalPage.TopBar
        previousPathLabel={intl.formatMessage(commonMessages.appTitle)}
        currentPathLabel={intl.formatMessage(messages.newLook)}
      />
      <ModalPage.Header>
        {/* Not ModalPage.Subtitle: it renders a <p>, which cannot hold the
          steps' <div>s. The stack keeps the steps underneath the title. */}
        <Stack gap="400" width="full">
          <ModalPage.Title>
            {intl.formatMessage(messages.newLook)}
          </ModalPage.Title>
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
        </Stack>
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

          <Stack gap="600" minWidth={0}>
            {step === 0 && (
              <BasicsStep
                label={label}
                onLabelChange={setLabel}
                description={description}
                onDescriptionChange={setDescription}
                nameError={firstFor('label')}
                keyValue={keyValue}
                keyIsCustom={customKey !== undefined}
                onKeyChange={(key) => {
                  setCustomKey(key);
                  setKeyRace(false);
                }}
                onKeyReset={() => {
                  setCustomKey(undefined);
                  setKeyRace(false);
                }}
                keyError={
                  firstFor('key') ??
                  (keyTaken
                    ? intl.formatMessage(messages.errorKeyTaken)
                    : undefined)
                }
                isDisabled={isDisabled}
              />
            )}
            {step === 1 && (
              <PiecesStep
                pieces={pieces}
                onPiecesChange={(next) => {
                  setPieces(next);
                  // Prices start at the sums of the new pieces.
                  setPriceTexts({});
                  setPriceModes({});
                }}
                errors={messagesFor(['pieces'])}
                isDisabled={isDisabled}
              />
            )}
            {step === 2 && (
              <SetPriceStep
                pieces={pieces}
                texts={priceTexts}
                modes={priceModes}
                onChange={onPriceChange}
                errors={setPriceErrors}
                generalErrors={errors
                  .filter(
                    (error) => error.field === 'setPrice' && !error.currency
                  )
                  .map(describe)}
                isDisabled={isDisabled}
              />
            )}
            {step === LAST_STEP && (
              <ReviewStep
                name={omitEmptyTranslations(label)}
                description={omitEmptyTranslations(description)}
                fullKey={lookObjectKey(chosenKey ?? suggestedKey)}
                pieces={pieces}
                sum={sum}
                setPrice={cents}
                savingPercent={savingPercent}
                activate={activate}
                onActivateChange={setActivate}
                isDisabled={isDisabled}
              />
            )}
          </Stack>

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
        <Flex gap={'200'} justifyContent={'flex-end'} width={'full'}>
          <Button variant="ghost" onPress={close}>
            {intl.formatMessage(messages.cancel)}
          </Button>
          {step > 0 && (
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => {
                setErrors([]);
                goToStep(step - 1);
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
};
