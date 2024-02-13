import { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint } from "matter-js";
import { toCanvas } from 'html-to-image';

type Listener = (this: Element, ev: Event) => any;

export function enableCustomEventListeners() {
    const nativeAddEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function (type: keyof ElementEventMap, listener: Listener, options?: boolean | AddEventListenerOptions | undefined) {
        if (type.toLowerCase() === "click") {
            let listeners = this["clickEventListeners"] as Set<Listener>;
            if (!listeners) listeners = this["clickEventListeners"] = new Set<Listener>();
            listeners.add(listener);
            console.log(this, listeners);
        }
        nativeAddEventListener(type, listener, options);
    };
    const nativeRemoveEventListener = Element.prototype.removeEventListener;
    Element.prototype.removeEventListener = function (type: keyof ElementEventMap, listener: Listener, options?: boolean | AddEventListenerOptions | undefined) {
        const listeners = this["clickEventListeners"] as Set<Listener>;
        if (listeners) listeners.delete(listener);
        console.log(this, listeners);
        nativeRemoveEventListener(type, listener);
    };
}

/**
 * Recursively parses HTML DOM and creates sprites for top level elements.
 */
async function addChildren(engine: Engine, render: Render, element: HTMLElement) {
    console.log("elem", element);
    for (const child of (element.children as any) as HTMLElement[]) {
        if (child.children.length !== 0 && child.nodeName.toLowerCase() !== "button") addChildren(engine, render, child);
        else if (child.clientWidth === 0 || child.clientHeight === 0) continue;
        else {
            child.classList.add("shrink");
            const newBody = Bodies.rectangle(
                child.offsetLeft + Math.floor(child.clientWidth / 2),
                child.offsetTop,
                child.clientWidth,
                child.clientHeight,
                {
                    render: {
                        sprite: {
                            texture: (await toCanvas(child)).toDataURL(),
                            xScale: 0.5,
                            yScale: 0.5,
                        },
                    },
                    restitution: 0.6,
                    friction: 0.1
                }
            );
            // newBody["domEvents"] = {};
            Composite.add(engine.world, newBody);
        }
    }
}

/**
 * Adds all the elements and a floor to keep the elements in the canvas to the scene.
 */
async function addElementsToScene(engine: Engine, render: Render, rootElement: HTMLElement) {
    // TODO: handle window.resize && teleport elements that clip back into the canvas
    const floor = Bodies.rectangle(Math.floor(render.options.width / 2), render.options.height, render.options.width, 1, { isStatic: true });
    const ceiling = Bodies.rectangle(Math.floor(render.options.width / 2), 0, render.options.width, 1, { isStatic: true });
    const leftWall = Bodies.rectangle(0, Math.floor(render.options.height / 2), 1, render.options.height, { isStatic: true });
    const rightWall = Bodies.rectangle(render.options.width, Math.floor(render.options.height / 2), 1, render.options.height, { isStatic: true });
    Composite.add(engine.world, [floor, ceiling, leftWall, rightWall]);
    await addChildren(engine, render, rootElement);
}

/**
 * Adds mouse constraints and interprets mouse events.
 */
function addMouseEvents(engine: Engine, render: Render, runner: Runner) {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false
            }
        }
    });
    Composite.add(engine.world, mouseConstraint);
    // Events.on(runner, "tick", (event) => {
    //     if (mouseConstraint.body) {
    //         // Composite.remove(engine.world, mouseConstraint.body);
    //     }
    // });
}

/**
 * Brings your DOM to the canvas and applies physics - most importantly gravity - to everything.
 * @param rootElement The element to recreate in the canvas.
 * @param canvas The canvas to use for rendering. Will create a new canvas if left blank. Canvas will automatically resize to the client size of the `rootElement`)
 * @returns A bunch of useful stuff.
 */
export async function gravitify(rootElement: HTMLElement, canvas: HTMLCanvasElement = document.createElement("canvas")) {
    const engine = Engine.create({ positionIterations: 6 * 1.5, velocityIterations: 4 * 1.5 });
    const render = Render.create({
        engine: engine,
        canvas,
        options: {
            width: rootElement.clientWidth,
            height: rootElement.clientHeight + 200,
            wireframes: false,
            background: "#fff"
        }
    });
    const runner = Runner.create();

    // Add stuff
    await addElementsToScene(engine, render, rootElement);
    addMouseEvents(engine, render, runner);

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, render, canvas };
}
