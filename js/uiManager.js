/**
 * @file Gerencia toda a lógica da interface do usuário (UI),
 * como eventos de clique, interações do mouse e atualização do painel de propriedades.
 */

import { state, setClickMode, addInputPoint, clearInputPoints, setTransforming, addObject, replaceObject, clearObjects } from './state.js';
import { clearCanvas, redrawAll, canvasToGrid } from './canvasManager.js';
import * as alg from './algorithms.js';

// Estado auxiliar para recorte
let clippingWindowPoints = [];
let isSelectingClippingWindow = false;
let isSelectingClipLine = false;
let isSelectingClipPolygon = false;
let clipLinePoints = [];
let clipPolygonPoints = [];

function startClipLineSelection() {
    isSelectingClipLine = true;
    clipLinePoints = [];
    updateStatus('Clique nos dois pontos da linha de recorte.');
}

function startClipPolygonSelection() {
    isSelectingClipPolygon = true;
    clipPolygonPoints = [];
    updateStatus('Clique para adicionar vértices do polígono. Clique com o botão direito para finalizar.');
}

function startClippingWindowSelection() {
    isSelectingClippingWindow = true;
    clippingWindowPoints = [];
    updateStatus('Clique em dois pontos para definir a janela de recorte.');
}

// Função utilitária que só este módulo precisa
export function parsePoints(text) {
    if (!text) return [];
    const p = text.split(/[, ]+/).filter(i => i.trim() !== '');
    const pts = [];
    for (let i = 0; i < p.length; i += 2) {
        pts.push({ x: parseInt(p[i], 10), y: parseInt(p[i + 1], 10) });
    }
    return pts;
}

const canvas = document.getElementById('mainCanvas');
const statusBar = document.getElementById('status-bar');

function updateStatus(message) {
    statusBar.textContent = message;
}

function finalizeMouseInput(message, rearm = false) {
    updateStatus(message);
    const lastMode = state.clickMode.split('_')[0];
    setClickMode('none');
    clearInputPoints();
    document.getElementById('finalize-polygon-btn').style.display = 'none';
    if (rearm && lastMode !== 'polygon') {
        startMouseInput(lastMode);
    }
}

function cancelMouseInput(silent = false) {
    const wasActive = state.clickMode !== 'none';
    const message = wasActive ? 'Ação do mouse cancelada.' : statusBar.textContent;
    finalizeMouseInput(silent ? statusBar.textContent : message);
    if (!state.isTransforming) {
        redrawAll();
    }
}

function startMouseInput(mode) {
    setClickMode(mode + '_p1');
    clearInputPoints();
    setTransforming(mode === 'transform');
    if (state.isTransforming) alg.applyLiveTransformations();
    if (mode !== 'clipping' && mode !== 'projection' && mode !== 'transform') redrawAll();

    switch (mode) {
        case 'line': updateStatus("Clique no Ponto 1 da reta."); break;
        case 'circle': updateStatus("Clique no CENTRO do círculo."); break;
        case 'polygon':
            document.getElementById('polygon-points').value = "";
            document.getElementById('finalize-polygon-btn').style.display = 'block';
            updateStatus("Clique para adicionar vértices. Pressione 'Finalizar' quando terminar.");
            break;
        case 'bezier': updateStatus("Clique para definir P0 (ponto inicial)."); break;
        case 'seed': updateStatus("Clique no ponto inicial para o preenchimento."); break;
        case 'transform': updateStatus("Ajuste os valores de transformação no painel."); break;
        case 'clipping': updateStatus("Ajuste os valores e clique para recortar."); break;
        case 'projection': updateStatus("Selecione um tipo de projeção para desenhar."); break;
    }
}

function addAllEventListeners() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    const propGroups = document.querySelectorAll('.prop-group');
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tool = button.dataset.tool;
            const isAlreadyActive = button.classList.contains('active');
            toolButtons.forEach(btn => btn.classList.remove('active'));
            cancelMouseInput(true);
            setTransforming(false);
            redrawAll();
            if (isAlreadyActive) {
                propGroups.forEach(group => group.style.display = 'none');
                document.getElementById('none-props').style.display = 'block';
                updateStatus('Selecione uma ferramenta na barra à esquerda.');
            } else {
                button.classList.add('active');
                propGroups.forEach(group => {
                    group.style.display = (group.id === `${tool}-props`) ? 'block' : 'none';
                });
                startMouseInput(tool);
            }
        });
    });

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const gridPoint = canvasToGrid(event.clientX - rect.left, event.clientY - rect.top);

        if (isSelectingClippingWindow) {
            clippingWindowPoints.push(gridPoint);
            if (clippingWindowPoints.length === 2) {
                const [p1, p2] = clippingWindowPoints;
                document.getElementById('clip-window').value = `${Math.min(p1.x,p2.x)},${Math.min(p1.y,p2.y)},${Math.max(p1.x,p2.x)},${Math.max(p1.y,p2.y)}`;
                isSelectingClippingWindow = false;
            }
            return;
        }
        if (isSelectingClipLine) {
            clipLinePoints.push(gridPoint);
            if (clipLinePoints.length === 2) {
                document.getElementById('clip-line').value = `${clipLinePoints[0].x},${clipLinePoints[0].y},${clipLinePoints[1].x},${clipLinePoints[1].y}`;
                isSelectingClipLine = false;
            }
            return;
        }
        if (isSelectingClipPolygon) {
            clipPolygonPoints.push(gridPoint);
            document.getElementById('clip-polygon').value = clipPolygonPoints.map(p => `${p.x},${p.y}`).join(', ');
            return;
        }

        if (state.clickMode === 'none') return;
        addInputPoint(gridPoint);
        const currentPoints = state.inputPoints;
        if (state.clickMode.startsWith('line')) {
            if (currentPoints.length === 1) {
                document.getElementById('bresenham-p1').value = `${gridPoint.x}, ${gridPoint.y}`;
                setClickMode('line_preview');
                updateStatus("Clique no Ponto 2 da reta.");
            } else {
                document.getElementById('bresenham-p2').value = `${gridPoint.x}, ${gridPoint.y}`;
                runBresenham();
                finalizeMouseInput("Reta desenhada. Desenhe a próxima.", true);
            }
        } else if (state.clickMode.startsWith('circle')) {
            if (currentPoints.length === 1) {
                document.getElementById('circle-center').value = `${gridPoint.x}, ${gridPoint.y}`;
                setClickMode('circle_preview');
                updateStatus("Clique na BORDA para definir o raio.");
            } else {
                const radius = Math.round(Math.sqrt((currentPoints[1].x - currentPoints[0].x) ** 2 + (currentPoints[1].y - currentPoints[0].y) ** 2));
                document.getElementById('circle-radius-x').value = radius;
                runCircle();
                finalizeMouseInput("Círculo desenhado. Desenhe o próximo.", true);
            }
        } else if (state.clickMode.startsWith('polygon')) {
            document.getElementById('polygon-points').value = currentPoints.map(p => `${p.x}, ${p.y}`).join(", ");
        } else if (state.clickMode.startsWith('bezier')) {
            const messages = ["Definido P0...", "Definido P1...", "Definido P2...", "Curva desenhada."];
            document.getElementById('bezier-points').value = currentPoints.map(p => `${p.x}, ${p.y}`).join(", ");
            updateStatus(messages[currentPoints.length - 1]);
            if (currentPoints.length === 4) {
                runBezier();
                finalizeMouseInput("Curva desenhada. Desenhe a próxima.", true);
            }
        } else if (state.clickMode.startsWith('seed')) {
            document.getElementById('fill-seed').value = `${gridPoint.x}, ${gridPoint.y}`;
            finalizeMouseInput(`Semente definida em (${gridPoint.x}, ${gridPoint.y}).`);
        }
    });

    canvas.addEventListener('contextmenu', (event) => {
        if (isSelectingClipPolygon) {
            event.preventDefault();
            isSelectingClipPolygon = false;
            updateStatus('Polígono de recorte definido. Clique para recortar.');
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        redrawAll(); // Redesenha a base (objetos salvos no estado)

        const rect = canvas.getBoundingClientRect();
        const gridPoint = canvasToGrid(event.clientX - rect.left, event.clientY - rect.top);

        // --- Desenha Previews de Recorte ---
        // Janela
        if (isSelectingClippingWindow && clippingWindowPoints.length === 1) {
            const p1 = clippingWindowPoints[0];
            const rectPoints = [{ x: p1.x, y: p1.y }, { x: gridPoint.x, y: p1.y }, { x: gridPoint.x, y: gridPoint.y }, { x: p1.x, y: gridPoint.y }];
            alg.drawPolygon(rectPoints, 'black', true);
        } else if (clippingWindowPoints.length === 2) {
            const [p1, p2] = clippingWindowPoints;
            const rect = [{ x: p1.x, y: p1.y }, { x: p2.x, y: p1.y }, { x: p2.x, y: p2.y }, { x: p1.x, y: p2.y }];
            alg.drawPolygon(rect, 'black', true);
        }
        // Linha
        if (isSelectingClipLine && clipLinePoints.length === 1) {
            alg.bresenham(clipLinePoints[0].x, clipLinePoints[0].y, gridPoint.x, gridPoint.y, 'purple');
        } else if (clipLinePoints.length === 2) {
            alg.bresenham(clipLinePoints[0].x, clipLinePoints[0].y, clipLinePoints[1].x, clipLinePoints[1].y, 'purple');
        }
        // Polígono
        if (isSelectingClipPolygon) {
            alg.drawPolygon([...clipPolygonPoints, gridPoint], 'purple', false);
        } else if (clipPolygonPoints.length > 0) {
            alg.drawPolygon(clipPolygonPoints, 'purple', true);
        }

        // --- Desenha Previews de Ferramentas Ativas ---
        if (state.clickMode && (state.clickMode.includes('preview') || state.clickMode.startsWith('polygon'))) {
            if (state.clickMode.startsWith('polygon') && state.inputPoints.length === 0) return;
            if (state.clickMode === 'line_preview') {
                alg.bresenham(state.inputPoints[0].x, state.inputPoints[0].y, gridPoint.x, gridPoint.y, '#aaa');
            } else if (state.clickMode === 'circle_preview') {
                const r = Math.round(Math.sqrt((gridPoint.x - state.inputPoints[0].x) ** 2 + (gridPoint.y - state.inputPoints[0].y) ** 2));
                alg.midpointCircle(state.inputPoints[0].x, state.inputPoints[0].y, r, '#aaa');
            } else if (state.clickMode.startsWith('polygon')) {
                alg.drawPolygon(state.inputPoints, 'purple', false);
                alg.bresenham(state.inputPoints[state.inputPoints.length - 1].x, state.inputPoints[state.inputPoints.length - 1].y, gridPoint.x, gridPoint.y, '#aaa');
            }
        }
    });

    document.getElementById('define-clip-window-btn').addEventListener('click', startClippingWindowSelection);
    document.getElementById('define-clip-line-btn').addEventListener('click', startClipLineSelection);
    document.getElementById('define-clip-polygon-btn').addEventListener('click', startClipPolygonSelection);

    document.getElementById('clear-canvas-btn').addEventListener('click', () => {
        clearCanvas();
        clippingWindowPoints = [];
        clipLinePoints = [];
        clipPolygonPoints = [];
    });
    document.getElementById('draw-line-btn').addEventListener('click', runBresenham);
    document.getElementById('draw-circle-btn').addEventListener('click', runCircle);
    document.getElementById('draw-ellipse-btn').addEventListener('click', runEllipse);
    document.getElementById('draw-bezier-btn').addEventListener('click', runBezier);
    document.getElementById('finalize-polygon-btn').addEventListener('click', runAndFinalizePolygon);
    document.getElementById('define-seed-btn').addEventListener('click', () => startMouseInput('seed'));
    document.getElementById('fill-scanline-btn').addEventListener('click', runScanlineFill);
    document.getElementById('fill-recursive-btn').addEventListener('click', runRecursiveFill);
    document.getElementById('clip-line-btn').addEventListener('click', runLineClipping);
    document.getElementById('clip-polygon-btn').addEventListener('click', runPolygonClipping);
    document.getElementById('finalize-transform-btn').addEventListener('click', finalizeTransformation);
    document.querySelectorAll('#projection-props button').forEach(button => {
        button.addEventListener('click', () => runProjection(button.dataset.projection));
    });
    const transformInputs = ['transform-polygon', 'transform-pivot', 'translation-tx', 'translation-ty', 'scale-sx', 'scale-sy', 'rotation-angle'];
    transformInputs.forEach(id => document.getElementById(id).addEventListener('input', () => { if (state.isTransforming) { alg.applyLiveTransformations(); } }));
}

function runBresenham() { const p1=parsePoints(document.getElementById('bresenham-p1').value)[0],p2=parsePoints(document.getElementById('bresenham-p2').value)[0]; if(!p1||!p2)return; addObject({type:'line',p1,p2,color:'red'}); redrawAll(); }
function runCircle() { const c=parsePoints(document.getElementById('circle-center').value)[0],r=parseInt(document.getElementById('circle-radius-x').value); if(!c||isNaN(r))return; addObject({type:'circle',center:c,radius:r,color:'red'}); redrawAll(); }
function runEllipse() { const c=parsePoints(document.getElementById('circle-center').value)[0],rx=parseInt(document.getElementById('circle-radius-x').value),ry=parseInt(document.getElementById('circle-radius-y').value); if(!c||isNaN(rx)||isNaN(ry))return; addObject({type:'ellipse',center:c,rx,ry,color:'red'}); redrawAll(); }
function runBezier() { const p=parsePoints(document.getElementById('bezier-points').value); if(p.length!==4){alert('Bézier precisa de 4 pontos.');return;} addObject({type:'bezier',p,color:'red'}); redrawAll(); }
function runPolygon() { const p=parsePoints(document.getElementById('polygon-points').value); if(p.length<2)return; addObject({type:'polygon',points:p,color:'blue'}); redrawAll(); }
function runAndFinalizePolygon() { runPolygon(); finalizeMouseInput('Polígono desenhado.'); }
function runScanlineFill() { const p = parsePoints(document.getElementById('polygon-points').value); if (p.length < 3) return; setTimeout(() => { import('./canvasManager.js').then(mod => { mod.scanlineFillAnimated(p, 'purple'); }); }, 100); }
function runRecursiveFill() { const seed = parsePoints(document.getElementById('fill-seed').value)[0]; if (!seed) return; setTimeout(() => { import('./canvasManager.js').then(mod => { mod.floodFillRecursive(seed.x, seed.y, 'green'); }); }, 100); }

function runLineClipping() {
    clearCanvas();
    const wCoords = document.getElementById('clip-window').value.split(',').map(Number);
    if (wCoords.length < 4) return;
    const [xmin, ymin, xmax, ymax] = wCoords;
    const wPoly = [{ x: xmin, y: ymin }, { x: xmax, y: ymin }, { x: xmax, y: ymax }, { x: xmin, y: ymax }];
    addObject({ type: 'polygon', points: wPoly, color: 'black' });

    const linePoints = parsePoints(document.getElementById('clip-line').value);
    if (linePoints.length < 2) return;
    const p1 = linePoints[0], p2 = linePoints[1];
    addObject({ type: 'line', p1: p1, p2: p2, color: '#aaa' });

    const clippedLine = alg.cohenSutherland(p1, p2, xmin, ymin, xmax, ymax);
    if (clippedLine) {
        addObject({ type: 'line', p1: clippedLine.p1, p2: clippedLine.p2, color: 'lime' });
    }
    redrawAll();
}

function runPolygonClipping() {
    clearCanvas();
    const wCoords = document.getElementById('clip-window').value.split(',').map(Number);
    if (wCoords.length < 4) return;
    const [xmin, ymin, xmax, ymax] = wCoords;
    // Ordem horária para o algoritmo funcionar corretamente
    const clipPoly = [{ x: xmin, y: ymax }, { x: xmax, y: ymax }, { x: xmax, y: ymin }, { x: xmin, y: ymin }];
    addObject({ type: 'polygon', points: clipPoly, color: 'black' });

    const subjectPolygon = parsePoints(document.getElementById('clip-polygon').value);
    if (subjectPolygon.length < 3) return;
    addObject({ type: 'polygon', points: subjectPolygon, color: '#aaa' });

    const clippedPolygon = alg.sutherlandHodgman(subjectPolygon, clipPoly);
    if (clippedPolygon && clippedPolygon.length > 2) {
    
        addObject({ type: 'polygon', points: clippedPolygon, color: 'lime' });
    }
    redrawAll();
}

function runProjection(type) { clearCanvas(); alg.projectAndDraw(type); }

function finalizeTransformation() {
    const originalPolygon = parsePoints(document.getElementById('transform-polygon').value);
    if (!originalPolygon || originalPolygon.length === 0) return;
    const pivot = parsePoints(document.getElementById('transform-pivot').value)[0] || {x: 0, y: 0};
    const tx = parseFloat(document.getElementById('translation-tx').value) || 0;
    const ty = parseFloat(document.getElementById('translation-ty').value) || 0;
    const sx = parseFloat(document.getElementById('scale-sx').value) || 1;
    const sy = parseFloat(document.getElementById('scale-sy').value) || 1;
    const angle = parseFloat(document.getElementById('rotation-angle').value) || 0;
    let transformed = alg.scale(originalPolygon, sx, sy, pivot);
    transformed = alg.rotate(transformed, angle, pivot);
    transformed = alg.translate(transformed, tx, ty);
    if (!replaceObject(originalPolygon, transformed)) {
        addObject({type: 'polygon', points: transformed, color: 'blue'});
    }
    document.getElementById('transform-polygon').value = transformed.map(p => `${p.x}, ${p.y}`).join(', ');
    document.getElementById('translation-tx').value = 0; document.getElementById('translation-ty').value = 0;
    document.getElementById('scale-sx').value = 1; document.getElementById('scale-sy').value = 1;
    document.getElementById('rotation-angle').value = 0;
    setTransforming(false);
    redrawAll();
}

export function initializeUI() {
    const clipWindowInput = document.getElementById('clip-window');
    if (clipWindowInput) {
        clipWindowInput.value = '-10,-10,10,10';
    }
    addAllEventListeners();
}