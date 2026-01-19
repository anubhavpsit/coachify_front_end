import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare namespace JSX {
  interface IntrinsicElements {
    'iconify-icon': DetailedHTMLProps<
      HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}
