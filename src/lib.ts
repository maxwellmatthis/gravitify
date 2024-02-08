import { use, Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint } from "matter-js";
import MatterWrap from "matter-wrap";
import { toBlob } from 'html-to-image';

function addChildren(element: HTMLElement, engine: Engine, render: Render) {
    console.log("elem", element)
    for (const child of (element.children as any) as HTMLElement[]) {
        if (child.children.length === 0 || child.children.length === 1) {
            console.log(child)
            Composite.add(
                engine.world,
                Bodies.rectangle(
                    child.offsetLeft + Math.floor(child.clientWidth / 2),
                    child.offsetTop,
                    child.clientWidth,
                    child.clientHeight,
                    {
                        render: {
                            fillStyle: '#ffffff'
                        },
                        restitution: 0.6,
                        friction: 0.1
                    }
                )
            );
        }
        else addChildren(child, engine, render);
    }
}

export function gravitify(rootElement: HTMLElement, canvas: HTMLCanvasElement) {
    const engine = Engine.create();
    const render = Render.create({
        // element: rootElement,
        engine: engine,
        canvas,
        options: {
            width: rootElement.clientWidth,
            height: rootElement.clientHeight + 200,
            wireframeBackground: '#fff',
        }
    });
    // function render() {
    //     const allBodies = engine

    //     const ctx = canvas.getContext("2d");

    //     for (var i = 0; i < bodies.length; i += 1) {
    //         var vertices = bodies[i].vertices;
    
    //         context.moveTo(vertices[0].x, vertices[0].y);
    
    //         for (var j = 1; j < vertices.length; j += 1) {
    //             context.lineTo(vertices[j].x, vertices[j].y);
    //         }
    
    //         context.lineTo(vertices[0].x, vertices[0].y);
    //     }
    //     ctx.drawImage(toBlob(document.createElement("p")), )
    // }
    const runner = Runner.create();

    // Add elements
    const floor = Bodies.rectangle(Math.floor(render.options.width / 2), render.options.height, render.options.width, 10, { isStatic: true });
    Composite.add(engine.world, floor);
    addChildren(rootElement, engine, render);

    // Add Mouse Events
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
    Events.on(runner, "tick", (event) => {
        if (mouseConstraint.body) {
            // Composite.remove(engine.world, mouseConstraint.body);
        }
    });

    // Keep objects in canvas
    use(MatterWrap);
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: render.options.width, y: render.options.height }
    });
    const allBodies = Composite.allBodies(engine.world);
    for (var i = 0; i < allBodies.length; i += 1) {
        allBodies[i].plugin.wrap = {
            min: { x: render.bounds.min.x - 100, y: render.bounds.min.y },
            max: { x: render.bounds.max.x + 100, y: render.bounds.max.y }
        };
    }

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, render };
}
