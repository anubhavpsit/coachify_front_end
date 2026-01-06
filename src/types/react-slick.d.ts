declare module 'react-slick' {
  import type * as React from 'react';

  export interface Settings {
    dots?: boolean;
    arrows?: boolean;
    infinite?: boolean;
    speed?: number;
    slidesToShow?: number;
    slidesToScroll?: number;
    autoplay?: boolean;
    [key: string]: unknown;
  }

  export default class Slider extends React.Component<Settings> {}
}

