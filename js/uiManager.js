/**
 * @file Gerencia toda a lógica da interface do usuário (UI),
 * como eventos de clique, interações do mouse e atualização do painel de propriedades.
 */

import { state, setClickMode, addInputPoint, clearInputPoints, setTransforming, addObject, replaceObject } from './state.js';
import { clearCanvas, redrawAll, canvasToGrid, clearForDemo } from './canvasManager.js';
import * as alg from './algorithms.js';

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


function finalizeMouseInput(message, rearm = false) { updateStatus(message); const lastMode=state.clickMode.split('_')[0]; setClickMode('none'); clearInputPoints(); document.getElementById('finalize-polygon-btn').style.display='none'; if(rearm && lastMode!=='polygon'){startMouseInput(lastMode);} }
function cancelMouseInput(silent = false) { const wasActive = state.clickMode !== 'none'; const message = wasActive ? 'Ação do mouse cancelada.' : statusBar.textContent; finalizeMouseInput(silent ? statusBar.textContent : message); if (!state.isTransforming) { redrawAll(); } }
function startMouseInput(mode) {
    setClickMode(mode + '_p1');
    clearInputPoints();
    setTransforming(mode === 'transform');
    if (state.isTransforming) alg.applyLiveTransformations();

    if (mode !== 'clipping' && mode !== 'projection' && mode !== 'transform') {
        redrawAll();
    }

    switch (mode) {
        case 'line': updateStatus("Clique no Ponto 1 da reta."); break;
        case 'circle': updateStatus("Clique no CENTRO do círculo."); break;
        case 'polygon': document.getElementById('polygon-points').value = ""; document.getElementById('finalize-polygon-btn').style.display = 'block'; updateStatus("Clique para adicionar vértices. Pressione 'Finalizar' quando terminar."); break;
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
        if (state.clickMode === 'none') return;
        const rect = canvas.getBoundingClientRect();
        const gridPoint = canvasToGrid(event.clientX - rect.left, event.clientY - rect.top);
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

    canvas.addEventListener('mousemove', (event) => {
        if (!state.clickMode.includes('preview') && !state.clickMode.startsWith('polygon')) return;
        if (state.clickMode.startsWith('polygon') && state.inputPoints.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const gridPoint = canvasToGrid(event.clientX - rect.left, event.clientY - rect.top);
        redrawAll();
        if (state.clickMode === 'line_preview') {
            alg.bresenham(state.inputPoints[0].x, state.inputPoints[0].y, gridPoint.x, gridPoint.y, '#aaa');
        } else if (state.clickMode === 'circle_preview') {
            const r = Math.round(Math.sqrt((gridPoint.x - state.inputPoints[0].x) ** 2 + (gridPoint.y - state.inputPoints[0].y) ** 2));
            alg.midpointCircle(state.inputPoints[0].x, state.inputPoints[0].y, r, '#aaa');
        } else if (state.clickMode.startsWith('polygon')) {
            alg.drawPolygon(state.inputPoints, 'purple', false);
            alg.bresenham(state.inputPoints[state.inputPoints.length - 1].x, state.inputPoints[state.inputPoints.length - 1].y, gridPoint.x, gridPoint.y, '#aaa');
        }
    });

    document.getElementById('clear-canvas-btn').addEventListener('click', clearCanvas);
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
function runScanlineFill() { const p=parsePoints(document.getElementById('polygon-points').value); if(p.length<3)return; addObject({type:'scanline',points:p,color:'purple'}); redrawAll(); }
function runRecursiveFill() { const seed=parsePoints(document.getElementById('fill-seed').value)[0]; if(!seed)return; setTimeout(()=>{alg.floodFill(seed.x,seed.y,'green');},100); }
function runLineClipping() { clearForDemo(); const wCoords=document.getElementById('clip-window').value.split(',').map(Number); const [xmin,ymin,xmax,ymax]=wCoords; const wPoly=[{x:xmin,y:ymin},{x:xmax,y:ymin},{x:xmax,y:ymax},{x:xmin,y:ymax}]; alg.drawPolygon(wPoly,'black'); const linePoints=parsePoints(document.getElementById('clip-line').value); if(linePoints.length%2!==0){alert("A entrada de linha deve ter pares de pontos.");return;} const p1=linePoints[0],p2=linePoints[1]; alg.bresenham(p1.x,p1.y,p2.x,p2.y,'#aaa'); const clippedLine=alg.cohenSutherland(p1,p2,xmin,ymin,xmax,ymax); if(clippedLine){alg.bresenham(clippedLine.p1.x,clippedLine.p1.y,clippedLine.p2.x,clippedLine.p2.y,'lime');} }
function runPolygonClipping() { clearForDemo(); const wCoords=document.getElementById('clip-window').value.split(',').map(Number); const [xmin,ymin,xmax,ymax]=wCoords; const clipPoly=[{x:xmin,y:ymin},{x:xmax,y:ymin},{x:xmax,y:ymax},{x:xmin,y:ymax}]; alg.drawPolygon(clipPoly,'black'); const subjectPolygon=parsePoints(document.getElementById('clip-polygon').value); if(subjectPolygon.length<3){alert("O polígono de entrada precisa de pelo menos 3 vértices.");return;} alg.drawPolygon(subjectPolygon,'#aaa'); const clippedPolygon=alg.sutherlandHodgman(subjectPolygon,clipPoly); if(clippedPolygon.length>0){alg.drawPolygon(clippedPolygon,'green',true);} }
function runProjection(type) { clearForDemo(); alg.projectAndDraw(type); }
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
    addAllEventListeners();
}