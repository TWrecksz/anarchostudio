import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import { getTagFromComponentProps } from "@webstudio-is/sdk/runtime";

const defaultTag = "div";

type Props = ComponentProps<typeof defaultTag> & {
  tag?: string;
};

export const Box = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag: legacyTag, ...props }, ref) => {
    const tag = getTagFromComponentProps(props) ?? legacyTag ?? defaultTag;
    return createElement(tag, { ...props, ref });
  }
);

Box.displayName = "Box";
