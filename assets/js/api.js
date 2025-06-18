// --- Módulo de API ---
// Responsável por toda a comunicação com o backend.

const API_URL = 'https://iot-monitoring-backend-yzqm.onrender.com/api/v1';

/**
 * Função genérica para fazer pedidos à nossa API.
 * @param {string} endpoint - O endpoint da API (ex: '/devices').
 * @param {string} method - O método HTTP (GET, POST, PUT, DELETE).
 * @param {object|null} body - O corpo do pedido para métodos POST ou PUT.
 * @returns {Promise<any>} A resposta da API em formato JSON.
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'login.html';
        throw new Error("Usuário não autenticado.");
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { data: text };
        }

        if (!response.ok) {
            const errorMessage = data ? data.message : `Erro na API: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        // Garantir que a resposta sempre tenha a propriedade data
        if (!data || typeof data !== 'object') {
            data = { data: data };
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}
