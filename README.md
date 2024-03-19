# gravity.js

Brings HTML nodes and their JavaScript functionality to the canvas and applies physics to everything using matter.js.

<!-- ## Installation and Setup

```bash
# install public package from NPM
npm install @maxwellmatthis/gravitify.js
``` -->

## Usage

The `gravitify` function is the main function of the library. It converts a DOM root element and its children into a 2D physics scene by creating or resizing a canvas to the same size as the root element and adding all 'top level elements' as entities. 'Top level element' means buttons, text, inputs and so on. These elements can be defined by their css selectors and a function.

```ts
import { gravitify } from "@maxwellmatthis/gravitify.js";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const main = document.querySelector("main") as HTMLElement;

// default usage
gravitify(main, canvas);

// with entity elements specified by their css selectors and a function
gravitify(main, canvas, ["#super-specific", "button", "a"], (e) => {
    return e.children.length === 0;
});
```

## Tests

For testing purposes there is a Parcel and TypeScript project in the [test](./test) directory.

```bash
# install all dependencies
npm i

# start the parcel development server for the test page
npm run dev
```
