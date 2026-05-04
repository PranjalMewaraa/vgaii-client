// Type declarations for the Google Maps JavaScript API web components used
// by the super-admin Place ID finder. React 19 forwards unknown attributes
// to custom elements verbatim — these declarations just stop tsc/eslint
// from complaining about props like `center`, `map-id`, and `slot`.

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmp-map": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          center?: string;
          zoom?: string | number;
          "map-id"?: string;
        },
        HTMLElement
      >;
      "gmp-place-autocomplete": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { slot?: string },
        HTMLElement
      >;
    }
  }
}
