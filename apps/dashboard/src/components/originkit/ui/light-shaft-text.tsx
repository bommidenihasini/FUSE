// @ts-nocheck
"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

interface FontProps {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    letterSpacing?: number | string
}

interface LineProps {
    density: number
    width: number
    softness: number
    depth: number
    overshoot: number
    flicker: number
}

interface Props {
    text: string
    font: FontProps
    background: string
    textColor: string
    lineColor: string
    speed: number
    offsetY: number
    interactive: boolean
    pointerIntensity: number
    lines: Partial<LineProps>
    style?: React.CSSProperties
}

interface Resolved {
    text: string
    font: FontProps
    background: string
    textColor: string
    lineColor: string
    speed: number
    offsetY: number
    interactive: boolean
    pointerIntensity: number
    lines: LineProps
}

const DEFAULT_TEXT = "bolt"
const DEFAULT_FONT: FontProps = {
    fontFamily: "Inter",
    fontWeight: 800,
    fontSize: 480,
}
const DEFAULT_LINES: LineProps = {
    density: 88,
    width: 45,
    softness: 18,
    depth: 16,
    overshoot: 30,
    flicker: 70,
}

const MIN_W = 1200
const MIN_H = 800

const AIR = 0.075
const AIR_TOP_BIAS = 0.72
const GRAIN = 0.35

const GLOW_STEPS = 64

const REF_GLOW_RATE = 0.55

const ESCAPE_FADE_LO = 0.45
const ESCAPE_FADE_HI = 0.95

const ESCAPE_LEVEL = 0.45

const DPR_CAP = 2

const glsl = (n: number) => n.toFixed(6)

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v))

const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback

const colorCache = new Map<string, [number, number, number]>()

function resolveRgb(
    color: string,
    host: HTMLElement | null
): [number, number, number] {
    const hit = colorCache.get(color)
    if (hit) return hit
    let out: [number, number, number] = [1, 1, 1]
    if (typeof document !== "undefined") {
        const probe = document.createElement("span")
        probe.style.color = color
        probe.style.position = "absolute"
        probe.style.pointerEvents = "none"
        probe.style.visibility = "hidden"
        ;(host || document.body || document.documentElement).appendChild(probe)
        const computed = getComputedStyle(probe).color
        probe.remove()
        const m = computed.match(/-?[\d.]+/g)
        if (m && m.length >= 3)
            out = [
                clamp(parseFloat(m[0]) / 255, 0, 1),
                clamp(parseFloat(m[1]) / 255, 0, 1),
                clamp(parseFloat(m[2]) / 255, 0, 1),
            ]
    }
    colorCache.set(color, out)
    return out
}

function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) =>
            name.startsWith("'") ||
            name.startsWith('"') ||
            /^[a-z-]+$/i.test(name)
                ? name
                : `"${name.replace(/"/g, '\\"')}"`
        )
        .join(", ")
}

function parseFontSize(value: number | string | undefined): number {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
        const n = parseFloat(value)
        if (!isNaN(n)) return value.includes("rem") ? n * 16 : n
    }
    return 480
}

function parseTracking(
    value: number | string | undefined,
    fontSize: number
): number {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
        const n = parseFloat(value)
        if (Number.isFinite(n)) {
            if (value.endsWith("em")) return n * fontSize
            if (value.endsWith("%")) return (n / 100) * fontSize
            return n
        }
    }
    return 0
}

interface FontSpec {
    family: string
    weight: number | string
    style: string
    fontSize: number
    tracking: number
}

function fontSpec(font: FontProps): FontSpec {
    const fontSize = parseFontSize(font?.fontSize)
    return {
        family: quoteFamily(
            font?.fontFamily ||
                "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
        ),
        weight: font?.fontWeight || 800,
        style: font?.fontStyle || "normal",
        fontSize,
        tracking: parseTracking(font?.letterSpacing, fontSize),
    }
}

function fontShorthand(font: FontProps, scale = 1): string {
    const { style, weight, fontSize, family } = fontSpec(font)
    return `${style} ${weight} ${Math.round(fontSize * scale)}px ${family}`
}

const oneLine = (text: string) =>
    (text || DEFAULT_TEXT).replace(/\s*\n\s*/g, " ").trim() || DEFAULT_TEXT

const EDGE_ALPHA = 100

interface Source {
    canvas: HTMLCanvasElement

    top: Uint8Array
}

function rasterise(p: Resolved, w: number, h: number, dpr: number): Source {
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const top = new Uint8Array(w * 4)
    for (let i = 0; i < w; i += 1) {
        top[i * 4] = 255
        top[i * 4 + 1] = 255
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return { canvas, top }

    const { family, weight, style, fontSize, tracking } = fontSpec(p.font)
    ctx.font = `${style} ${weight} ${fontSize * dpr}px ${family}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff"
    if ("letterSpacing" in ctx)
        (
            ctx as CanvasRenderingContext2D & { letterSpacing: string }
        ).letterSpacing = `${tracking * dpr}px`

    ctx.fillText(oneLine(p.text), w * 0.5, h * 0.5 + (p.offsetY / 100) * h)

    const data = ctx.getImageData(0, 0, w, h).data
    for (let x = 0; x < w; x += 1) {
        for (let y = 0; y < h; y += 1) {
            if (data[(y * w + x) * 4 + 3] >= EDGE_ALPHA) {
                const v = Math.floor((y / h) * 65535)
                top[x * 4] = (v >> 8) & 255
                top[x * 4 + 1] = v & 255
                break
            }
        }
        for (let y = h - 1; y >= 0; y -= 1) {
            if (data[(y * w + x) * 4 + 3] >= EDGE_ALPHA) {
                const v = Math.min(65535, Math.ceil(((y + 1) / h) * 65535))
                top[x * 4 + 2] = (v >> 8) & 255
                top[x * 4 + 3] = v & 255
                break
            }
        }
    }
    return { canvas, top }
}

const VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uGlyph;
uniform sampler2D uTop;
uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uBg;
uniform vec3  uInk;
uniform vec3  uRay;
uniform float uPitch;
uniform float uHalf;
uniform float uSoft;
uniform float uDepth;
uniform float uOvershoot;
uniform float uFloor;
uniform float uAir;
uniform float uGrain;
uniform vec2  uPointer;
uniform float uPointerActive;
uniform float uPointerRadius;
uniform float uPointerStrength;

const float STEPS = ${glsl(GLOW_STEPS)};
const float ESCAPE_LEVEL = ${glsl(ESCAPE_LEVEL)};
const float ESCAPE_FADE_LO = ${glsl(ESCAPE_FADE_LO)};
const float ESCAPE_FADE_HI = ${glsl(ESCAPE_FADE_HI)};
const float AIR_TOP_BIAS = ${glsl(AIR_TOP_BIAS)};

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

float vnoise(float id, float x, float wrap) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(vec2(id, mod(i, wrap)));
    float b = hash21(vec2(id, mod(i + 1.0, wrap)));
    return mix(a, b, f);
}

float glowAt(float id, float t) {
    float n = 0.62 * vnoise(id, t, STEPS) +
              0.38 * vnoise(id + 131.0, t * 2.0, STEPS * 2.0);
    n = pow(clamp(n, 0.0, 1.0), 1.25);

    float amp = 0.87 + 0.13 * hash11(id + 41.7);
    return amp * mix(uFloor, 1.0, n);
}

void main() {
    float sy = 1.0 - vUv.y;

    float cover = texture(uGlyph, vec2(vUv.x, sy)).a;

    vec4 packed = texture(uTop, vec2(vUv.x, 0.5));
    float top = (packed.r * 65280.0 + packed.g * 255.0) / 65535.0;
    float bot = (packed.b * 65280.0 + packed.a * 255.0) / 65535.0;

    float outPx = (max(0.0, top - sy) + max(0.0, sy - bot)) * uResolution.y;

    float u = vUv.x * uResolution.x / uPitch;
    float ci = floor(u);
    float comb = 0.0;
    float escape = 0.0;

    for (int k = -1; k <= 1; k++) {
        float id = ci + float(k);
        float d = abs(u - (id + 0.5)) * uPitch;

        float hw = uHalf * (0.72 + 0.56 * hash11(id + 9.13));
        float e = max(hw * uSoft, 0.6);

        float s = min(1.0, uPitch / max(hw + e, 1e-4));
        hw *= s;
        e *= s;

        float lineX = (id + 0.5) * uPitch;
        float pointerPx = length(vec2(lineX, sy * uResolution.y) -
            vec2(uPointer.x * uResolution.x, uPointer.y * uResolution.y));
        float pointerBoost = uPointerActive * uPointerStrength *
            exp(-(pointerPx * pointerPx) / (2.0 * uPointerRadius * uPointerRadius));
        float glow = clamp(glowAt(id, uTime) + pointerBoost, 0.0, 1.6);
        float prof = 1.0 - smoothstep(hw - e, hw + e, d);
        comb = max(comb, prof * glow);

        float len = uOvershoot * pow(hash11(id + 57.3), 1.6);

        float tip = max(len * 0.15, 1.5);
        float body = 1.0 - smoothstep(len - tip, len, outPx);

        float fade = smoothstep(ESCAPE_FADE_LO, ESCAPE_FADE_HI, glow);
        escape = max(escape, prof * ESCAPE_LEVEL * fade * body);
    }

    float belowPx = max(0.0, sy - top) * uResolution.y;
    float inside = exp(-belowPx / max(uDepth, 1.0));

    float hasGlyph = step(top, 0.999);
    escape *= hasGlyph;

    float air = uAir * comb * comb * (1.0 - AIR_TOP_BIAS * sy);

    float inBand = step(top, sy) * step(sy, bot);
    float lit = inBand * cover * inside * comb +
        (1.0 - inBand) * max(escape, air);

    lit *= 1.0 - uGrain * (1.0 - hash21(gl_FragCoord.xy));

    vec3 col = mix(uBg, uInk, cover) + uRay * lit;
    fragColor = vec4(col, 1.0);
}`

function compile(
    gl: WebGL2RenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("LightShaftText:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

const UNIFORMS = [
    "uGlyph",
    "uTop",
    "uResolution",
    "uTime",
    "uBg",
    "uInk",
    "uRay",
    "uPitch",
    "uHalf",
    "uSoft",
    "uDepth",
    "uOvershoot",
    "uFloor",
    "uAir",
    "uGrain",
    "uPointer",
    "uPointerActive",
    "uPointerRadius",
    "uPointerStrength",
] as const

type UniformName = (typeof UNIFORMS)[number]

export default function LightShaftText(props: Partial<Props>) {
    const {
        text = "FLICKER",
        font = {"fontFamily":"Inter","variant":"Regular","fontWeight":800,"fontSize":"320px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"} as FontProps,
        background = "#000000",
        textColor = "#000000",
        lineColor = "#FFFFFF",
        speed = 50,
        offsetY = 0,
        interactive = true,
        pointerIntensity = 6,
        lines = {"density":170,"width":24,"softness":91,"depth":13,"overshoot":35,"flicker":100},
        style,
    } = props

    const resolved: Resolved = useMemo(
        () => ({
            text,
            font: font || DEFAULT_FONT,
            background,
            textColor,
            lineColor,
            speed: clamp(num(speed, 50), 0, 100),
            offsetY: clamp(num(offsetY, 22), -100, 100),
            interactive: typeof interactive === "boolean" ? interactive : true,
            pointerIntensity: clamp(num(pointerIntensity, 60), 0, 100),
            lines: {
                density: clamp(
                    num(lines.density, DEFAULT_LINES.density),
                    4,
                    300
                ),
                width: clamp(num(lines.width, DEFAULT_LINES.width), 1, 100),
                softness: clamp(
                    num(lines.softness, DEFAULT_LINES.softness),
                    0,
                    100
                ),
                depth: clamp(num(lines.depth, DEFAULT_LINES.depth), 1, 100),
                overshoot: clamp(
                    num(lines.overshoot, DEFAULT_LINES.overshoot),
                    0,
                    100
                ),
                flicker: clamp(
                    num(lines.flicker, DEFAULT_LINES.flicker),
                    0,
                    100
                ),
            },
        }),
        [
            text,
            font,
            background,
            textColor,
            lineColor,
            speed,
            offsetY,
            interactive,
            pointerIntensity,
            lines.density,
            lines.width,
            lines.softness,
            lines.depth,
            lines.overshoot,
            lines.flicker,
        ]
    )

    const isStatic = false

    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const propsRef = useRef<Resolved>(resolved)
    propsRef.current = resolved
    const dirtyRef = useRef(true)

    const fontKey = fontShorthand(resolved.font)
    const rasterKey = `${oneLine(resolved.text)}|${fontKey}|${resolved.offsetY}`

    useEffect(() => {
        dirtyRef.current = true
    }, [rasterKey])

    useEffect(() => {
        if (isStatic) return
        const fonts = typeof document !== "undefined" ? document.fonts : null
        if (!fonts) return
        let cancelled = false
        const redraw = () => {
            if (!cancelled) dirtyRef.current = true
        }
        fonts.load(fontShorthand(propsRef.current.font)).then(redraw, redraw)
        fonts.ready.then(redraw, redraw)
        return () => {
            cancelled = true
        }
    }, [isStatic, fontKey])

    useEffect(() => {
        if (isStatic) return
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
        })
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
        if (!vs || !fs) return
        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn("LightShaftText:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const loc = {} as Record<UniformName, WebGLUniformLocation | null>
        for (const name of UNIFORMS)
            loc[name] = gl.getUniformLocation(program, name)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const aPosition = gl.getAttribLocation(program, "aPosition")
        gl.enableVertexAttribArray(aPosition)
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

        const makeTexture = () => {
            const tex = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            return tex
        }
        const glyphTex = makeTexture()
        const topTex = makeTexture()
        gl.bindTexture(gl.TEXTURE_2D, topTex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        gl.uniform1i(loc.uGlyph, 0)
        gl.uniform1i(loc.uTop, 1)
        gl.uniform1f(loc.uAir, AIR)
        gl.uniform1f(loc.uGrain, GRAIN)

        const pointer = { x: 0.5, y: 0.5, targetActive: 0, active: 0 }
        const setPointer = (clientX: number, clientY: number) => {
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            pointer.x = clamp((clientX - rect.left) / rect.width, 0, 1)
            pointer.y = clamp((clientY - rect.top) / rect.height, 0, 1)
            pointer.targetActive = 1
        }
        const onPointerMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY)
        const onPointerLeave = () => {
            pointer.targetActive = 0
        }
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerleave", onPointerLeave)

        let bufW = 0
        let bufH = 0
        let dpr = 1
        let clock = 0
        let last = -1
        let frame = 0

        const draw = (now: number) => {
            frame = requestAnimationFrame(draw)
            const p = propsRef.current

            const cssW = Math.max(1, root.clientWidth || MIN_W)
            const cssH = Math.max(1, root.clientHeight || MIN_H)
            const nextDpr = Math.min(
                DPR_CAP,
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
            )
            const w = Math.max(1, Math.round(cssW * nextDpr))
            const h = Math.max(1, Math.round(cssH * nextDpr))
            if (w !== bufW || h !== bufH || nextDpr !== dpr) {
                bufW = w
                bufH = h
                dpr = nextDpr
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
                dirtyRef.current = true
            }

            if (dirtyRef.current) {
                dirtyRef.current = false
                const source = rasterise(p, bufW, bufH, dpr)
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, glyphTex)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    source.canvas
                )
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, topTex)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    bufW,
                    1,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    source.top
                )
            }

            const dt = last < 0 ? 0 : clamp((now - last) / 1000, 0, 0.05)
            last = now
            clock =
                (clock + dt * (p.speed / 50) * REF_GLOW_RATE) % GLOW_STEPS

            const activeTarget = p.interactive ? pointer.targetActive : 0
            pointer.active += (activeTarget - pointer.active) * clamp(dt * 6, 0, 1)

            const host = rootRef.current
            const bg = resolveRgb(p.background, host)
            const ink = resolveRgb(p.textColor, host)
            const ray = resolveRgb(p.lineColor, host)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, glyphTex)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, topTex)

            const pitch = bufW / p.lines.density
            gl.uniform2f(loc.uResolution, bufW, bufH)
            gl.uniform1f(loc.uTime, clock)
            gl.uniform3f(loc.uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(loc.uInk, ink[0], ink[1], ink[2])
            gl.uniform3f(loc.uRay, ray[0], ray[1], ray[2])
            gl.uniform1f(loc.uPitch, pitch)

            gl.uniform1f(loc.uHalf, pitch * (p.lines.width / 100) * 0.5)
            gl.uniform1f(loc.uSoft, p.lines.softness / 100)
            gl.uniform1f(loc.uDepth, (p.lines.depth / 100) * bufH)
            gl.uniform1f(loc.uOvershoot, (p.lines.overshoot / 100) * bufH)

            gl.uniform1f(loc.uFloor, 1 - (p.lines.flicker / 100) * 0.85)
            gl.uniform2f(loc.uPointer, pointer.x, pointer.y)
            gl.uniform1f(loc.uPointerActive, pointer.active)
            gl.uniform1f(loc.uPointerRadius, bufH * 0.22)
            gl.uniform1f(loc.uPointerStrength, p.pointerIntensity / 60)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        frame = requestAnimationFrame(draw)
        return () => {
            cancelAnimationFrame(frame)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerleave", onPointerLeave)
        }
    }, [isStatic])

    const label = oneLine(resolved.text)

    if (isStatic)
        return <StaticShaftText {...resolved} label={label} style={style} />

    return (
        <div
            ref={rootRef}
            aria-label={label}
            role="img"
            style={{
                minWidth: MIN_W,
                minHeight: MIN_H,
                background,
                ...style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

function StaticShaftText(
    p: Resolved & { label: string; style?: React.CSSProperties }
) {
    const { family, weight, style: fontStyle, fontSize } = fontSpec(p.font)
    const cy = MIN_H * 0.5 + (p.offsetY / 100) * MIN_H
    const top = cy - fontSize * 0.42
    const pitch = MIN_W / p.lines.density
    const id = React.useId().replace(/[^a-zA-Z0-9]/g, "")

    const strokes: { x: number; w: number; a: number }[] = []
    for (let i = 0; i < p.lines.density + 2; i += 1) {
        const h2 = (((Math.sin(i * 78.233) * 12345.6789) % 1) + 1) % 1
        const h3 = (((Math.sin(i * 39.425) * 24634.6345) % 1) + 1) % 1
        strokes.push({
            x: (i - 1 + 0.5) * pitch,
            w: pitch * (p.lines.width / 100) * (0.72 + 0.56 * h2),
            a: 0.35 + 0.65 * h3,
        })
    }

    return (
        <div
            aria-label={p.label}
            role="img"
            style={{
                minWidth: MIN_W,
                minHeight: MIN_H,
                background: p.background,
                ...p.style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <svg
                viewBox={`0 0 ${MIN_W} ${MIN_H}`}
                preserveAspectRatio="xMidYMid slice"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            >
                <defs>
                    <linearGradient
                        id={`fade${id}`}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        y1={top}
                        x2={0}
                        y2={top + (p.lines.depth / 100) * MIN_H * 2.2}
                    >
                        <stop
                            offset="0"
                            stopColor={p.lineColor}
                            stopOpacity="1"
                        />
                        <stop
                            offset="1"
                            stopColor={p.lineColor}
                            stopOpacity="0"
                        />
                    </linearGradient>
                    <clipPath id={`clip${id}`}>
                        <text
                            x={MIN_W * 0.5}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontFamily={family}
                            fontWeight={weight}
                            fontStyle={fontStyle}
                            fontSize={fontSize}
                        >
                            {p.label}
                        </text>
                    </clipPath>
                </defs>
                <rect width={MIN_W} height={MIN_H} fill={p.background} />
                <g opacity={AIR * 2}>
                    {strokes.map((b, i) => (
                        <rect
                            key={`air${i}`}
                            x={b.x - b.w * 0.5}
                            y={0}
                            width={b.w}
                            height={top}
                            fill={p.lineColor}
                            opacity={b.a}
                        />
                    ))}
                </g>
                <text
                    x={MIN_W * 0.5}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily={family}
                    fontWeight={weight}
                    fontStyle={fontStyle}
                    fontSize={fontSize}
                    fill={p.textColor}
                >
                    {p.label}
                </text>
                <g clipPath={`url(#clip${id})`}>
                    {strokes.map((b, i) => (
                        <rect
                            key={`lit${i}`}
                            x={b.x - b.w * 0.5}
                            y={top}
                            width={b.w}
                            height={MIN_H - top}
                            fill={`url(#fade${id})`}
                            opacity={b.a}
                        />
                    ))}
                </g>
            </svg>
        </div>
    )
}

LightShaftText.displayName = "Light Shaft Text"