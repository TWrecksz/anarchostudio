import {
  StyleValue,
  toValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import {
  Grid,
  IconButton,
  Label,
  Separator,
  Tooltip,
  ScrollArea,
  theme,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { AnimationKeyframe } from "@webstudio-is/sdk";
import { Fragment, useMemo, useRef, useState } from "react";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { useIds } from "~/shared/form-utils";
import { calcOffsets, findInsertionIndex, moveItem } from "./keyframe-helpers";
import { CssEditor } from "~/builder/shared/css-editor";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

const unitOptions = [
  {
    id: "%" as const,
    label: "%",
    type: "unit" as const,
  },
];

const OffsetInput = ({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: number | undefined;
  placeholder: number;
  onChange: (value: number | undefined) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      id={id}
      placeholder={
        value === undefined
          ? `auto (${Math.round(placeholder * 1000) / 10}%)`
          : "auto"
      }
      getOptions={() => []}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      styleSource="default"
      /* same as offset has 0 - 100% */
      property={"font-stretch"}
      value={
        value !== undefined
          ? {
              type: "unit",
              value: Math.round(value * 1000) / 10,
              unit: "%",
            }
          : undefined
      }
      onChange={(styleValue) => {
        if (styleValue === undefined) {
          setIntermediateValue(styleValue);
          return;
        }

        const clampedStyleValue = { ...styleValue };
        if (
          clampedStyleValue.type === "unit" &&
          clampedStyleValue.unit === "%"
        ) {
          clampedStyleValue.value = Math.min(
            100,
            Math.max(0, clampedStyleValue.value)
          );
        }

        setIntermediateValue(clampedStyleValue);
      }}
      onHighlight={(_styleValue) => {
        /* @todo: think about preview */
      }}
      onChangeComplete={(event) => {
        setIntermediateValue(undefined);

        if (event.value.type === "unit" && event.value.unit === "%") {
          onChange(Math.min(100, Math.max(0, event.value.value)) / 100);
          return;
        }

        setIntermediateValue({
          type: "invalid",
          value: toValue(event.value),
        });
      }}
      onAbort={() => {
        /* @todo: allow to change some ephemeral property to see the result in action */
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        onChange(undefined);
      }}
    />
  );
};

const Keyframe = ({
  value,
  offsetPlaceholder,
  onChange,
}: {
  value: AnimationKeyframe;
  offsetPlaceholder: number;
  onChange: (
    value: AnimationKeyframe | undefined,
    isEphemeral: boolean
  ) => void;
}) => {
  const ids = useIds(["offset"]);
  const declarations: Array<ComputedStyleDecl> = useMemo(
    () =>
      (Object.keys(value.styles) as Array<CssProperty>).map((property) => {
        const styleValue = value.styles[property];
        return {
          property,
          source: { name: "local" },
          cascadedValue: styleValue,
          computedValue: styleValue,
          usedValue: styleValue,
        };
      }),
    [value.styles]
  );

  return (
    <>
      <Grid
        gap={1}
        align={"center"}
        css={{
          gridTemplateColumns: "1fr 1fr auto",
          paddingInline: theme.panel.paddingInline,
        }}
      >
        <Label htmlFor={ids.offset}>Offset</Label>
        <OffsetInput
          id={ids.offset}
          value={value.offset}
          placeholder={offsetPlaceholder}
          onChange={(offset) => {
            onChange({ ...value, offset }, false);
          }}
        />
        <Tooltip content="Remove keyframe">
          <IconButton onClick={() => onChange(undefined, false)}>
            <MinusIcon />
          </IconButton>
        </Tooltip>
      </Grid>
      <Grid>
        <CssEditor
          showSearch={false}
          showAddStyleInput
          propertiesPosition="top"
          virtualize={false}
          declarations={declarations}
          onAddDeclarations={(addedStyleMap) => {
            const styles = { ...value.styles };
            for (const [property, value] of addedStyleMap) {
              styles[property] = value;
            }
            onChange({ ...value, styles }, false);
          }}
          onDeleteProperty={(property, options = {}) => {
            if (options.isEphemeral === true) {
              return;
            }
            const styles = { ...value.styles };
            delete styles[property];
            onChange({ ...value, styles }, false);
          }}
          onSetProperty={(property) => {
            return (newValue, options) => {
              const styles = { ...value.styles, [property]: newValue };
              onChange({ ...value, styles }, options?.isEphemeral ?? false);
            };
          }}
          onDeleteAllDeclarations={() => {
            onChange({ ...value, styles: {} }, false);
          }}
        />
      </Grid>
    </>
  );
};

export const Keyframes = ({
  value: keyframes,
  onChange,
}: {
  value: AnimationKeyframe[];
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: AnimationKeyframe[], isEphemeral: boolean) => void);
}) => {
  // To preserve focus on children swap
  const keyRefs = useRef(
    Array.from({ length: keyframes.length }, (_, index) => index)
  );

  if (keyframes.length !== keyRefs.current.length) {
    keyRefs.current = Array.from(
      { length: keyframes.length },
      (_, index) => index
    );
  }

  const offsets = calcOffsets(keyframes);

  return (
    <Grid gap={1}>
      <SectionTitle
        collapsible={false}
        suffix={
          <SectionTitleButton
            tabIndex={0}
            prefix={<PlusIcon />}
            onClick={() => {
              onChange(
                [...keyframes, { offset: undefined, styles: {} }],
                false
              );
              keyRefs.current = [...keyRefs.current, keyframes.length];
            }}
          />
        }
      >
        <SectionTitleLabel>Keyframes</SectionTitleLabel>
      </SectionTitle>
      <ScrollArea>
        <Grid gap={2}>
          {keyframes.map((value, index) => (
            <Fragment key={keyRefs.current[index]}>
              {index > 0 && <Separator />}
              <Keyframe
                key={keyRefs.current[index]}
                value={value}
                offsetPlaceholder={offsets[index]}
                onChange={(newValue, isEphemeral) => {
                  if (newValue === undefined && isEphemeral) {
                    onChange(undefined, true);
                    return;
                  }

                  if (newValue === undefined) {
                    const newValues = [...keyframes];
                    newValues.splice(index, 1);
                    onChange(newValues, isEphemeral);
                    return;
                  }

                  let newValues = [...keyframes];
                  newValues[index] = newValue;

                  const { offset } = newValue;
                  if (offset === undefined) {
                    onChange(newValues, isEphemeral);
                    return;
                  }

                  const insertionIndex = findInsertionIndex(newValues, index);
                  newValues = moveItem(newValues, index, insertionIndex);
                  keyRefs.current = moveItem(
                    keyRefs.current,
                    index,
                    insertionIndex
                  );

                  onChange(newValues, isEphemeral);
                }}
              />
            </Fragment>
          ))}
        </Grid>
      </ScrollArea>
    </Grid>
  );
};
