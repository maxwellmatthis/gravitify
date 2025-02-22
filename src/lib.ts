import { Engine, Render, Runner, Body, Bodies, Composite, Events, Mouse, MouseConstraint, IEngineDefinition, IChamferableBodyDefinition, IConstraintDefinition, Vector } from "matter-js";
import { toCanvas } from 'html-to-image';

const isSimpleMap = (v: any): boolean => (
    v &&
    typeof v === 'object' &&
    Object.prototype.toString.call(v) === '[object Object]'
);

/**
 * Removes all key-value-pairs where the value is `undefined` or `null`.
 * @param obj Some regular object.
 * @returns a cleansed object.
 * 
 * ## Example
 * ```ts
 * const input = {
 *     a: 1,
 *     b: "two",
 *     c: [1, 2, 3],
 *     d: new Set([1, "a", undefined]),
 *     e: new Map(),
 *     f: { a: "one", b: { some: "thing", more: { even: [2, 4, 6], not: undefined }, neither: null } },
 *     nope: undefined,
 *     inn: {
 *         innn: null
 *     },
 *     after: "hello",
 *     next: false
 * };
 * let output = emitUndefinedProps(input);
 * assert_eq(output, {
 *     a: 1,
 *     b: "two",
 *     c: [1, 2, 3],
 *     d: new Set([1, "a", undefined]),
 *     e: new Map(),
 *     f: { a: "one", b: { some: "thing", more: { even: [2, 4, 6] } } },
 *     after: "hello",
 *     next: false
 * });
 * ```
 */
const emitUndefinedProps = <T extends { [s: string]: any; }>(obj: T): Partial<T> => {
    const cleanObj: Partial<T> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (isSimpleMap(v)) {
            const innerObject = emitUndefinedProps(v as { [s: string]: any; });
            if (Object.keys(innerObject).length === 0) continue;
            Object.defineProperty(
                cleanObj,
                k,
                {
                    value: innerObject,
                    writable: true,
                    configurable: true,
                    enumerable: true
                }
            );
        } else if (v !== undefined && v !== null) {
            Object.defineProperty(
                cleanObj,
                k,
                {
                    value: v,
                    writable: true,
                    configurable: true,
                    enumerable: true
                }
            );
        }
    }
    return cleanObj;
};
// console.log(emitUndefinedProps({
//     a: 1,
//     b: "two",
//     c: [1, 2, 3],
//     d: new Set([1, "a", undefined]),
//     e: new Map(),
//     f: { a: "one", b: { some: "thing", more: { even: [2, 4, 6], not: undefined }, neither: null } },
//     nope: undefined,
//     inn: {
//         innn: null
//     },
//     after: "hello",
//     next: false
// }));

export type IsSpecialEntityFn = (e: HTMLElement) => (Promise<boolean> | boolean);

export const defaultIsSpecialEntity: IsSpecialEntityFn = (e) => {
    return e.children.length === 0;
};

export const image = async (e: HTMLElement) => {
    return (await toCanvas(e)).toDataURL(undefined, 1);
};

export const SHRINK_CLASS_IDENTIFIER = "shrink-183ba3343c62f17b";
export const DEFAULT_SHRINK_DEFINITION = "display:inline-block;margin:0;";

/**
 * A configuration object used to configure the physics
 * engine and the physical behavior of elements.
 */
export interface PhysicsOptions {
    engine: Partial<Pick<
        IEngineDefinition,
        "positionIterations" | "velocityIterations" | "enableSleeping" | "constraintIterations"
    >>,
    /** Gravity in x- and y-direction in m/s^2. */
    gravity: {
        /**
         * The gravity `x` component in `0.1*(m/s^2)`.
         * @default 1m/s^2
         */
        x: number,
        /**
         * The gravity `y` component in `0.1*(m/s^2)`.
         * @default 0m/s^2
         */
        y: number,
    },
    body: Partial<Pick<
        IChamferableBodyDefinition,
        "density" | "restitution" | "friction" | "frictionAir" | "isStatic"
    >>,
    mouse: Pick<
        IConstraintDefinition,
        "stiffness" | "damping"
    >,
}

/**
 * Brings your DOM to the canvas and applies physics - most importantly gravity - to everything.
 * @param rootElement The element to recreate in the canvas.
 * @param canvas The canvas to use for rendering. Will create a new canvas if left blank. Canvas will automatically resize to the client size of the `rootElement`)
 * @param entitySelectors An array of selectors which specifies which non-special entities are added as entities. 
 * @param isSpecialEntity A function that checks if an element should be added to the canvas as an entity. Default=All elements with zero children.
 * @param shrinkDefinition A CSS definition (format: `"a:1,b:2"`) that is applied to each element right before it is added to the canvas as an entity. This is intended to 'shrinks' and simplify the element (e.g. removing margin) so that the image and resulting physics body are of higher quality.
 * @param physicsOptions A configuration object used to configure the physics engine and the physical behavior of elements.
 * @param backgroundColor The background color of the canvas. Must be a valid CSS color (e.g. HEX (`#ffffff`), RGB (`rgb(255, 255, 255)` or keywords like `transparent`).
 * @returns A reference to the Matter.js `Matter.Engine` instance and the canvas being used.
 */
export async function gravitify(
    rootElement: HTMLElement,
    canvas: HTMLCanvasElement = document.createElement("canvas"),
    entitySelectors: string[] = ["button", "a"],
    isSpecialEntity: IsSpecialEntityFn = defaultIsSpecialEntity,
    shrinkDefinition: string = DEFAULT_SHRINK_DEFINITION,
    physicsOptions?: Partial<PhysicsOptions>,
    backgroundColor: string = "#ffffff"
) {
    const engine = Engine.create(emitUndefinedProps({
        positionIterations: physicsOptions?.engine?.positionIterations,
        velocityIterations: physicsOptions?.engine?.velocityIterations,
        constraintIterations: physicsOptions?.engine?.constraintIterations,
        gravity: {
            y: physicsOptions?.gravity?.y,
            x: physicsOptions?.gravity?.x
        },
    }));
    const rootRect = rootElement.getBoundingClientRect();
    const render = Render.create({
        engine: engine,
        canvas,
        options: {
            width: rootRect.width,
            height: rootRect.height,
            wireframes: false,
            background: backgroundColor
        }
    });
    const runner = Runner.create();

    // Add elements
    await addElementsToScene(
        engine,
        render,
        rootElement,
        entitySelectors,
        isSpecialEntity,
        shrinkDefinition,
        rootRect,
        physicsOptions
    );
    addMouseEvents(engine, render);

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, canvas };
}

/**
 * Adds all the elements and a floor to keep the elements in the canvas to the scene.
 */
async function addElementsToScene(
    engine: Engine,
    render: Render,
    rootElement: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn,
    shrinkDefinition: string,
    rootRect: DOMRect,
    physicsOptions?: Partial<PhysicsOptions>,
) {
    const width = render.options.width || 800;
    const height = render.options.height || 600;
    // TODO: handle window.resize && teleport elements that clip back into the canvas
    const opts = { isStatic: true, render: { fillStyle: "#00000000", strokeStyle: "#00000000" } };
    const floor = Bodies.rectangle(Math.floor(width / 2), height, width, 1, opts);
    const ceiling = Bodies.rectangle(Math.floor(width / 2), 0, width, 1, opts);
    const leftWall = Bodies.rectangle(0, Math.floor(height / 2), 1, height, opts);
    const rightWall = Bodies.rectangle(width, Math.floor(height / 2), 1, height, opts);
    Composite.add(engine.world, [floor, ceiling, leftWall, rightWall]);

    const style = document.createElement("style");
    style.innerHTML = `.${SHRINK_CLASS_IDENTIFIER} {${shrinkDefinition}}`;
    const body = document.querySelector("body");
    if (body) body.appendChild(style);
    else console.warn("Gravitify: Unable to add shrink style definition to body: `document.querySelector('body')` is `undefined`.");
    await addChildren(engine, rootElement, entitySelectors, isSpecialEntity, rootRect, physicsOptions);
}

/**
 * Recursively parses HTML DOM and creates sprites for 'top level' elements.
 */
async function addChildren(
    engine: Engine,
    element: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn,
    rootRect: DOMRect,
    physicsOptions?: Partial<PhysicsOptions>,
) {
    const eligibleChildren = new Set<HTMLElement>();

    for (const selector of entitySelectors) {
        for (const child of Array.from(element.querySelectorAll(`:scope > ${selector}`))) {
            eligibleChildren.add(child as HTMLElement);
        }
    }

    for (const child of (element.children as any) as HTMLElement[]) {
        if (!eligibleChildren.has(child) && !(await isSpecialEntity(child))) {
            await addChildren(engine, child, entitySelectors, isSpecialEntity, rootRect, physicsOptions);
        } else eligibleChildren.add(child);
    }

    for (const child of eligibleChildren) {
        // Ignore elements with no size because they cannot be seen
        // and cause zero division errors in the physics engine.
        const { width, height } = child.getBoundingClientRect();
        if (width === 0 || height === 0) continue;
        addEntity(engine, child, rootRect, physicsOptions);
    }
}

export async function addEntity(
    engine: Engine,
    sourceElement: HTMLElement,
    rootRect: DOMRect,
    physicsOptions?: Partial<PhysicsOptions>,
) {
    sourceElement.classList.add(SHRINK_CLASS_IDENTIFIER);
    const sourceRect = sourceElement.getBoundingClientRect();
    const createBody = async (
        x?: number,
        y?: number,
        velocity?: Vector,
        angle?: number,
        angularVelocity?: number
    ) => {
        const newBody = Bodies.rectangle(
            x || sourceRect.left - rootRect.left + Math.floor(sourceElement.clientWidth / 2),
            y || sourceRect.top - rootRect.top,
            sourceRect.width,
            sourceRect.height,
            emitUndefinedProps({
                render: {
                    sprite: {
                        texture: await image(sourceElement),
                        xScale: 0.5,
                        yScale: 0.5,
                    },
                },
                restitution: physicsOptions?.body?.restitution,
                friction: physicsOptions?.body?.friction,
                density: physicsOptions?.body?.density,
                frictionAir: physicsOptions?.body?.frictionAir,
                isStatic: physicsOptions?.body?.isStatic,
                // @ts-ignore
                sourceElement,
                // @ts-ignore
                oldDimensions: {
                    width: sourceRect.width,
                    height: sourceRect.height
                }
            }));
        if (velocity) Body.setVelocity(newBody, velocity);
        if (angle) Body.setAngle(newBody, angle);
        if (angularVelocity) Body.setAngularVelocity(newBody, angularVelocity);

        const updateTexture = async () => {
            if (newBody.render.sprite?.texture) {
                newBody.render.sprite.texture = await image(sourceElement);
            }
            // in case the texture size changes and the sprite has to be rebuilt
            if (newTextureWidth
                // @ts-ignore
                !== newBody.oldDimensions.width ||
                newTextureHeight
                // @ts-ignore
                !== newBodyd.oldDimensions.height
            ) {
                Composite.remove(engine.world, newBody);
                const { x, y } = newBody.position;
                await createBody(x, y, newBody.velocity, newBody.angle, newBody.angularVelocity);
            }
        };
        // TODO: resize actual body when image size changes
        sourceElement.addEventListener("input", updateTexture);
        sourceElement.addEventListener("change", updateTexture);
        sourceElement.addEventListener("resize", updateTexture);
        const observer = new MutationObserver(updateTexture);
        observer.observe(sourceElement, { characterData: false, childList: true, attributes: true });
        Composite.add(engine.world, newBody);
    };
    return await createBody();
}

/**
 * Adds mouse constraints and interprets mouse events.
 */
function addMouseEvents(engine: Engine, render: Render, physicsOptions?: Partial<PhysicsOptions>) {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: emitUndefinedProps({
            stiffness: physicsOptions?.mouse?.stiffness,
            damping: physicsOptions?.mouse?.damping,
            render: {
                visible: false
            }
        })
    });
    Composite.add(engine.world, mouseConstraint);

    let mousedownNotDrag = false;
    let mouseMoveCount = 0;
    let mouseBody: Body | null = null;
    Events.on(mouseConstraint, "mousedown", (_e) => {
        mousedownNotDrag = true;
        mouseMoveCount = 0;
        mouseBody = mouseConstraint.body;
    });
    Events.on(mouseConstraint, "mousemove", (_e) => {
        mouseMoveCount++;
        if (mouseMoveCount < 5) return;
        mousedownNotDrag = false;
    });
    Events.on(mouseConstraint, "mouseup", (_e) => {
        if (mousedownNotDrag && mouseBody) {
            // @ts-ignore
            const sourceElement: HTMLElement = mouseBody.sourceElement;
            sourceElement.click();
            sourceElement.focus();
        }
    });
}
