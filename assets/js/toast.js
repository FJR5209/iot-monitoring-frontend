// --- Módulo de Toast ---
// Responsável por exibir notificações temporárias na interface.

/**
 * Exibe uma notificação toast na interface.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo do toast (success, error, warning, info).
 * @param {number} duration - A duração em milissegundos (padrão: 3000).
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `w-full rounded-lg shadow-lg transform transition-all duration-300 ease-in-out translate-y-[-100%] opacity-0`;
    
    // Configurar cores baseadas no tipo
    const colors = {
        success: {
            bg: 'bg-green-500',
            border: 'border-green-600',
            text: 'text-white',
            icon: 'text-green-100'
        },
        error: {
            bg: 'bg-red-500',
            border: 'border-red-600',
            text: 'text-white',
            icon: 'text-red-100'
        },
        warning: {
            bg: 'bg-yellow-500',
            border: 'border-yellow-600',
            text: 'text-white',
            icon: 'text-yellow-100'
        },
        info: {
            bg: 'bg-blue-500',
            border: 'border-blue-600',
            text: 'text-white',
            icon: 'text-blue-100'
        }
    };

    // Configurar ícones baseados no tipo
    const icons = {
        success: `<svg class="w-5 h-5 ${colors[type].icon} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="w-5 h-5 ${colors[type].icon} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
        warning: `<svg class="w-5 h-5 ${colors[type].icon} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
        info: `<svg class="w-5 h-5 ${colors[type].icon} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    // Configurar títulos baseados no tipo
    const titles = {
        success: 'Sucesso!',
        error: 'Erro!',
        warning: 'Atenção!',
        info: 'Informação'
    };

    toast.innerHTML = `
        <div class="flex items-start p-4 ${colors[type].bg} ${colors[type].border} border-l-4 rounded-lg shadow-lg">
            <div class="flex-shrink-0 mr-3">
                ${icons[type]}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium ${colors[type].text}">${titles[type]}</p>
                <p class="mt-1 text-sm ${colors[type].text} break-words">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
                <button class="inline-flex text-white focus:outline-none focus:text-gray-300 transition ease-in-out duration-150">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Adicionar o toast ao container
    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-100%]', 'opacity-0');
    });

    // Configurar botão de fechar
    const closeButton = toast.querySelector('button');
    closeButton.addEventListener('click', () => {
        removeToast(toast);
    });

    // Auto-remover após a duração
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Remove um toast com animação.
 * @param {HTMLElement} toast - O elemento toast a ser removido.
 */
function removeToast(toast) {
    toast.classList.add('translate-y-[-100%]', 'opacity-0');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Exportar funções auxiliares para tipos comuns
const toast = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration)
};

window.toast = toast; 