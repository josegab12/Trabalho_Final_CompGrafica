import { setupCanvas } from './canvasManager.js';
import { initializeUI } from './uiManager.js';

// Evento que dispara quando o HTML da página foi completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas(); // Prepara o canvas para desenho
    initializeUI(); // Configura todos os botões e interações do usuário
    
    // Define um estado inicial para o painel de propriedades
    document.querySelector('.prop-group.active').style.display = 'block';
});