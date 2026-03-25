declare module 'svg-maps__common' {
  export type SvgMapLocation = { name: string; id: string; path: string };

  export type Map = {
    label?: string;
    viewBox: string;
    locations: SvgMapLocation[];
  };
}

