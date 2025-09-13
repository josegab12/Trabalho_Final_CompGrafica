// Preenchimento de varredura animado
export function scanlineFillAnimated(poly, color = 'purple', delay = 10) {
    if (poly.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    poly.forEach(p => {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    function fillRow(y) {
        if (y > maxY) return;
        const ints = [];
        for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                const x = (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
                ints.push(x);
            }
        }
        ints.sort((a, b) => a - b);
        for (let i = 0; i < ints.length; i += 2) {
            if (i + 1 < ints.length) {
                for (let x = Math.ceil(ints[i]); x < ints[i + 1]; x++) {
                    drawPixel(x, y, color);
                }
            }
        }
        setTimeout(() => fillRow(y + 1), delay);
    }
    fillRow(minY);
}
// Adiciona preenchimento recursivo animado (verde)
export function floodFillRecursive(x, y, fillColor = 'green', delay = 10) {
    function getPixelColor(x, y) {
        const c = gridToCanvas(x, y);
        const p = ctx.getImageData(c.x + gridSize / 2, c.y + gridSize / 2, 1, 1).data;
        return `rgba(${p[0]},${p[1]},${p[2]},${p[3]})`;
    }

    const startColor = getPixelColor(x, y);

    // Obter cor de preenchimento em RGBA
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = fillColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const p = tempCtx.getImageData(0, 0, 1, 1).data;
    const fillRgba = `rgba(${p[0]},${p[1]},${p[2]},${p[3]})`;

    if (startColor === fillRgba) return;

    const visited = new Set();
    function fill(x, y) {
        const key = `${x},${y}`;
        if (visited.has(key)) return;
        if (getPixelColor(x, y) !== startColor) return;
        drawPixel(x, y, fillColor);
        visited.add(key);
        setTimeout(() => {
            fill(x + 1, y);
            fill(x - 1, y);
            fill(x, y + 1);
            fill(x, y - 1);
        }, delay);
    }
    fill(x, y);
}
import { state } from './state.js';
import * as alg from './algorithms.js';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const canvasSize = 600, gridSize = 20, numCells = canvasSize / gridSize, center = numCells / 2;

export function setupCanvas() {
    clearCanvas();
}

export function gridToCanvas(x, y) { return { x: (x + center) * gridSize, y: (-y + center) * gridSize }; }
export function canvasToGrid(canvasX, canvasY) { return { x: Math.round(canvasX / gridSize - center), y: Math.round(center - canvasY / gridSize) }; }

export function drawPixel(x, y, color = 'red') {
    const c = gridToCanvas(x, y);
    ctx.fillStyle = color;
    ctx.fillRect(c.x, c.y, gridSize - 1, gridSize - 1);
}

function drawGrid() {
    ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1;
    for (let i = 0; i <= numCells; i++) {
        ctx.beginPath(); ctx.moveTo(i * gridSize, 0); ctx.lineTo(i * gridSize, canvasSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * gridSize); ctx.lineTo(canvasSize, i * gridSize); ctx.stroke();
    }
    ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(center * gridSize, 0); ctx.lineTo(center * gridSize, canvasSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, center * gridSize); ctx.lineTo(canvasSize, center * gridSize); ctx.stroke();
}

export function redrawAll() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    drawGrid();
    state.drawnObjects.forEach(obj => {
        switch(obj.type) {
            case 'line': alg.bresenham(obj.p1.x, obj.p1.y, obj.p2.x, obj.p2.y, obj.color); break;
            case 'circle': alg.midpointCircle(obj.center.x, obj.center.y, obj.radius, obj.color); break;
            case 'ellipse': alg.midpointEllipse(obj.center.x, obj.center.y, obj.rx, obj.ry, obj.color); break;
            case 'bezier': alg.bezier(obj.p[0], obj.p[1], obj.p[2], obj.p[3], obj.color); break;
            case 'polygon': alg.drawPolygon(obj.points, obj.color, true); break;
            case 'scanline': alg.scanlineFill(obj.points, obj.color); alg.drawPolygon(obj.points, 'blue', true); break;
        }
    });
    if (state.isTransforming) {
        alg.applyLiveTransformations();
    }
}

export function clearCanvas() {
    state.drawnObjects = [];
    redrawAll();
}

export function clearForDemo() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    drawGrid();
}