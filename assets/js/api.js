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
        throw new Error("Utilizador não autenticado.");
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

        const contentType = response.headers.get("content-type");
        const data = contentType && contentType.includes("application/json") ? await response.json() : null;

        if (!response.ok) {
            throw new Error(data ? data.message : `Erro na API: ${response.statusText}`);
        }
        return data;
    } catch (error) {
        console.error(`Falha no pedido da API para ${endpoint}:`, error);
        throw error;
    }
}
