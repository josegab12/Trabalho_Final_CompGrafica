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