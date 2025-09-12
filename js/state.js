// Memória central da aplicação
export let state = {
    drawnObjects: [],
    clickMode: 'none',
    inputPoints: [],
    isTransforming: false,
};

// Funções para modificar o estado de forma segura
export function addObject(obj) {
    state.drawnObjects.push(obj);
}

export function clearObjects() {
    state.drawnObjects = [];
}

export function setClickMode(mode) {
    state.clickMode = mode;
}

export function addInputPoint(point) {
    state.inputPoints.push(point);
}

export function clearInputPoints() {
    state.inputPoints = [];
}

export function setTransforming(status) {
    state.isTransforming = status;
}

// Função auxiliar para comparar arrays de pontos
function arePointArraysEqual(points1, points2) {
    if (!points1 || !points2 || points1.length !== points2.length) return false;
    for (let i = 0; i < points1.length; i++) {
        if (points1[i].x !== points2[i].x || points1[i].y !== points2[i].y) return false;
    }
    return true;
}

export function replaceObject(originalPoints, newPoints) {
    for (let i = 0; i < state.drawnObjects.length; i++) {
        if (state.drawnObjects[i].type === 'polygon' && arePointArraysEqual(state.drawnObjects[i].points, originalPoints)) {
            state.drawnObjects[i].points = newPoints;
            return true; // Sucesso
        }
    }
    return false; // Não encontrou
}