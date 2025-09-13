import { drawPixel, redrawAll } from './canvasManager.js';
import { parsePoints } from './uiManager.js';

// =================================================================
// ALGORITMOS DE RASTERIZAÇÃO
// =================================================================

/**
 * Desenha uma linha entre dois pontos usando o algoritmo de Bresenham.
 * @param {number} x1 - Coordenada X do ponto inicial.
 * @param {number} y1 - Coordenada Y do ponto inicial.
 * @param {number} x2 - Coordenada X do ponto final.
 * @param {number} y2 - Coordenada Y do ponto final.
 * @param {string} color - Cor da linha.
 */
export function bresenham(x1, y1, x2, y2, color = 'red') {
    const dx = Math.abs(x2 - x1);
    const sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1);
    const sy = y1 < y2 ? 1 : -1;
    
    let error = dx + dy;

    while (true) {
        drawPixel(x1, y1, color);
        if (x1 === x2 && y1 === y2) {
            break;
        }
        
        const error2 = 2 * error;

        if (error2 >= dy) {
            error += dy;
            x1 += sx;
        }
        if (error2 <= dx) {
            error += dx;
            y1 += sy;
        }
    }
}

/**
 * Desenha um círculo usando o algoritmo do Ponto Médio.
 * @param {number} centerX - Coordenada X do centro.
 * @param {number} centerY - Coordenada Y do centro.
 * @param {number} radius - Raio do círculo.
 * @param {string} color - Cor do círculo.
 */
export function midpointCircle(centerX, centerY, radius, color = 'red') {
    let x = radius;
    let y = 0;
    let decisionParameter = 1 - x;

    while (x >= y) {
        drawPixel(centerX + x, centerY + y, color);
        drawPixel(centerX + y, centerY + x, color);
        drawPixel(centerX - y, centerY + x, color);
        drawPixel(centerX - x, centerY + y, color);
        drawPixel(centerX - x, centerY - y, color);
        drawPixel(centerX - y, centerY - x, color);
        drawPixel(centerX + y, centerY - x, color);
        drawPixel(centerX + x, centerY - y, color);

        y++;

        if (decisionParameter < 0) {
            decisionParameter += 2 * y + 1;
        } else {
            x--;
            decisionParameter += 2 * (y - x) + 1;
        }
    }
}


/**
 * Desenha uma elipse usando o algoritmo do Ponto Médio.
 * @param {number} centerX - Coordenada X do centro.
 * @param {number} centerY - Coordenada Y do centro.
 * @param {number} radiusX - Raio no eixo X.
 * @param {number} radiusY - Raio no eixo Y.
 * @param {string} color - Cor da elipse.
 */
export function midpointEllipse(centerX, centerY, radiusX, radiusY, color = 'red') {
    let x = 0;
    let y = radiusY;
    let rx2 = radiusX * radiusX;
    let ry2 = radiusY * radiusY;
    let tworx2 = 2 * rx2;
    let twory2 = 2 * ry2;
    let p;

    // Região 1
    p = Math.round(ry2 - rx2 * radiusY + 0.25 * rx2);
    while ((twory2 * x) < (twrx2 * y)) {
        drawPixel(centerX+x, centerY+y, color);
        drawPixel(centerX-x, centerY+y, color);
        drawPixel(centerX+x, centerY-y, color);
        drawPixel(centerX-x, centerY-y, color);
        x++;
        if (p < 0) {
            p += twory2 * x + ry2;
        } else {
            y--;
            p += twory2 * x - tworx2 * y + ry2;
        }
    }

    // Região 2
    p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
    while (y >= 0) {
        drawPixel(centerX+x, centerY+y, color);
        drawPixel(centerX-x, centerY+y, color);
        drawPixel(centerX+x, centerY-y, color);
        drawPixel(centerX-x, centerY-y, color);
        y--;
        if (p > 0) {
            p -= tworx2 * y + rx2;
        } else {
            x++;
            p += twory2 * x - tworx2 * y + rx2;
        }
    }
}

/**
 * Calcula e desenha uma Curva de Bézier cúbica.
 * @param {object} p0 - Ponto inicial {x, y}.
 * @param {object} p1 - Primeiro ponto de controle {x, y}.
 * @param {object} p2 - Segundo ponto de controle {x, y}.
 * @param {object} p3 - Ponto final {x, y}.
 * @param {string} color - Cor da curva.
 */
export function bezier(p0, p1, p2, p3, color = 'red') {
    const steps = 100;
    let lastPoint = p0;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = (1-t)**3 * p0.x + 3*(1-t)**2*t * p1.x + 3*(1-t)*t**2 * p2.x + t**3 * p3.x;
        const y = (1-t)**3 * p0.y + 3*(1-t)**2*t * p1.y + 3*(1-t)*t**2 * p2.y + t**3 * p3.y;
        bresenham(Math.round(lastPoint.x), Math.round(lastPoint.y), Math.round(x), Math.round(y), color);
        lastPoint = { x, y };
    }
}

/**
 * Desenha uma polilinha ou polígono conectando uma lista de pontos.
 * @param {Array<object>} points - Array de pontos {x, y}.
 * @param {string} color - Cor da figura.
 * @param {boolean} closed - Se true, conecta o último ponto ao primeiro.
 */
export function drawPolygon(points, color = 'blue', closed = true) {
    if (!points || points.length < 2) return;
    for (let i = 0; i < points.length - 1; i++) {
        bresenham(points[i].x, points[i].y, points[i+1].x, points[i+1].y, color);
    }
    if (closed && points.length > 2) {
        bresenham(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y, color);
    }
}


// =================================================================
// ALGORITMOS DE PREENCHIMENTO
// =================================================================

/**
 * Preenche um polígono usando o algoritmo de Scanline.
 * @param {Array<object>} polygon - Array de vértices do polígono.
 * @param {string} color - Cor de preenchimento.
 */
export function scanlineFill(polygon, color = 'purple') {
    if (polygon.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    polygon.forEach(p => {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    for (let y = minY; y <= maxY; y++) {
        const intersections = [];
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                const x = (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
                intersections.push(x);
            }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            if (i + 1 < intersections.length) {
                for (let x = Math.ceil(intersections[i]); x < intersections[i + 1]; x++) {
                    drawPixel(x, y, color);
                }
            }
        }
    }
}

// =================================================================
// ALGORITMOS DE TRANSFORMAÇÃO
// =================================================================
export function translate(polygon, dx, dy) { return polygon.map(point => ({ x: point.x + dx, y: point.y + dy })); }
export function scale(polygon, sx, sy, fixedPoint) { return polygon.map(point => ({ x: Math.round(fixedPoint.x + (point.x - fixedPoint.x) * sx), y: Math.round(fixedPoint.y + (point.y - fixedPoint.y) * sy) })); }
export function rotate(polygon, angle, pivot) {
    const radians = angle * Math.PI / 180;
    const cosAngle = Math.cos(radians);
    const sinAngle = Math.sin(radians);
    return polygon.map(point => ({
        x: Math.round(pivot.x + (point.x - pivot.x) * cosAngle - (point.y - pivot.y) * sinAngle),
        y: Math.round(pivot.y + (point.x - pivot.x) * sinAngle + (point.y - pivot.y) * cosAngle)
    }));
}
export function applyLiveTransformations() {
    const originalPolygon = parsePoints(document.getElementById('transform-polygon').value);
    if (!originalPolygon || originalPolygon.length === 0) return;
    const pivot = parsePoints(document.getElementById('transform-pivot').value)[0] || {x: 0, y: 0};
    const tx = parseFloat(document.getElementById('translation-tx').value) || 0;
    const ty = parseFloat(document.getElementById('translation-ty').value) || 0;
    const sx = parseFloat(document.getElementById('scale-sx').value) || 1;
    const sy = parseFloat(document.getElementById('scale-sy').value) || 1;
    const angle = parseFloat(document.getElementById('rotation-angle').value) || 0;
    let transformed = scale(originalPolygon, sx, sy, pivot);
    transformed = rotate(transformed, angle, pivot);
    transformed = translate(transformed, tx, ty);
    redrawAll(); 
    drawPolygon(transformed, 'red', true);
}


// =================================================================
// ALGORITMOS DE RECORTE (Clipping)
// =================================================================
export function cohenSutherland(p1, p2, xmin, ymin, xmax, ymax) {
    const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
    let x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    const computeCode = (x, y) => { let code = INSIDE; if (x < xmin) code |= LEFT; else if (x > xmax) code |= RIGHT; if (y < ymin) code |= BOTTOM; else if (y > ymax) code |= TOP; return code; };
    let code1 = computeCode(x1, y1), code2 = computeCode(x2, y2);
    while (true) {
        if (!(code1 | code2)) return { p1: {x: x1, y: y1}, p2: {x: x2, y: y2} };
        if (code1 & code2) return null;
        let x, y, outcode = code1 || code2;
        if (outcode & TOP) { x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1); y = ymax; }
        else if (outcode & BOTTOM) { x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1); y = ymin; }
        else if (outcode & RIGHT) { y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1); x = xmax; }
        else { y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1); x = xmin; }
        if (outcode === code1) { x1 = Math.round(x); y1 = Math.round(y); code1 = computeCode(x1, y1); }
        else { x2 = Math.round(x); y2 = Math.round(y); code2 = computeCode(x2, y2); }
    }
}

const intersect = (p1, p2, p3, p4) => {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denominator === 0) return null;
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    return { x: Math.round(p1.x + ua * (p2.x - p1.x)), y: Math.round(p1.y + ua * (p2.y - p1.y)) };
};

const clipAgainstEdge = (subjectPolygon, p1, p2) => {
    const outputList = [];
    if (subjectPolygon.length === 0) return outputList;
    let S = subjectPolygon[subjectPolygon.length - 1];
    for (const E of subjectPolygon) {
        const s_inside = (p2.x - p1.x) * (S.y - p1.y) - (p2.y - p1.y) * (S.x - p1.x) <= 0;
        const e_inside = (p2.x - p1.x) * (E.y - p1.y) - (p2.y - p1.y) * (E.x - p1.x) <= 0;
        if (s_inside && e_inside) {
            outputList.push(E);
        } else if (s_inside && !e_inside) {
            const intersection = intersect(S, E, p1, p2);
            if (intersection) outputList.push(intersection);
        } else if (!s_inside && e_inside) {
            const intersection = intersect(S, E, p1, p2);
            if (intersection) outputList.push(intersection);
            outputList.push(E);
        }
        S = E;
    }
    return outputList;
};

export function sutherlandHodgman(subjectPolygon, clipPolygon) {
    let outputList = subjectPolygon;
    outputList = clipAgainstEdge(outputList, clipPolygon[0], clipPolygon[1]);
    outputList = clipAgainstEdge(outputList, clipPolygon[1], clipPolygon[2]);
    outputList = clipAgainstEdge(outputList, clipPolygon[2], clipPolygon[3]);
    outputList = clipAgainstEdge(outputList, clipPolygon[3], clipPolygon[0]);
    return outputList;
}

// =================================================================
// ALGORITMOS DE PROJEÇÃO 3D
// =================================================================
export function projectAndDraw(type) {
    const cubeVertices = [
        {x:-5, y:-5, z:-5}, {x:5, y:-5, z:-5}, {x:5, y:5, z:-5}, {x:-5, y:5, z:-5},
        {x:-5, y:-5, z:5}, {x:5, y:-5, z:5}, {x:5, y:5, z:5}, {x:-5, y:5, z:5}
    ];
    const cubeEdges = [
        [0,1], [1,2], [2,3], [3,0], [4,5], [5,6], [6,7], [7,4],
        [0,4], [1,5], [2,6], [3,7]
    ];
    let projectedVertices = [];
    const distance = 30;
    const cavalierAngle = 45 * Math.PI / 180;
    const cabinetAngle = 45 * Math.PI / 180;

    switch(type) {
        case 'orthogonal':
            projectedVertices = cubeVertices.map(v => ({ x: v.x, y: v.y }));
            break;
        case 'perspective':
            projectedVertices = cubeVertices.map(v => ({
                x: Math.round(v.x * distance / (v.z + distance)),
                y: Math.round(v.y * distance / (v.z + distance))
            }));
            break;
        case 'cavalier':
            projectedVertices = cubeVertices.map(v => ({
                x: Math.round(v.x + v.z * Math.cos(cavalierAngle)),
                y: Math.round(v.y + v.z * Math.sin(cavalierAngle))
            }));
            break;
        case 'cabinet':
            projectedVertices = cubeVertices.map(v => ({
                x: Math.round(v.x + 0.5 * v.z * Math.cos(cabinetAngle)),
                y: Math.round(v.y + 0.5 * v.z * Math.sin(cabinetAngle))
            }));
            break;
    }
    
    cubeEdges.forEach(edge => {
        const v1 = projectedVertices[edge[0]];
        const v2 = projectedVertices[edge[1]];
        bresenham(v1.x, v1.y, v2.x, v2.y);
    });
}