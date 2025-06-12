// --- Módulo de UI (Interface do Utilizador) ---
// Responsável por gerar o HTML dinâmico da aplicação.

import { apiRequest } from './api.js';

let chartInstance = null;

// --- Funções Auxiliares de UI ---
function switchView(viewName) {
    document.getElementById('main-content-view').style.display = viewName === 'detail' ? 'none' : 'block';
    document.getElementById('device-detail-view').style.display = viewName === 'detail' ? 'block' : 'none';
}

function renderChart(canvas, chartData) {
    if (chartInstance) chartInstance.destroy();
    if (!canvas) return;
    const recentData = chartData.slice(-10);
    const labels = recentData.map(d => new Date(d.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    Chart.defaults.color = '#94a3b8';
    chartInstance = new Chart(canvas, { type: 'line', data: { labels, datasets: [{ label: 'Temperatura', data: recentData.map(d => d.temperature), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: 'Temperatura (°C)' }, grid: { color: 'rgba(100, 116, 139, 0.2)' } }, x: { grid: { color: 'rgba(100, 116, 139, 0.2)' } } } } });
}

function renderStats(container, stats) {
    if (!stats || stats.maxTemp === null) {
        container.innerHTML = '<p>Sem dados neste período.</p>';
        return;
    }
    container.innerHTML = `<div class="p-3 bg-red-900/50 rounded-lg text-red-300"><strong>Máxima:</strong> ${stats.maxTemp.toFixed(2)}°C</div><div class="p-3 bg-blue-900/50 rounded-lg text-blue-300"><strong>Mínima:</strong> ${stats.minTemp.toFixed(2)}°C</div><div class="p-3 bg-green-900/50 rounded-lg text-green-300"><strong>Média:</strong> ${stats.avgTemp.toFixed(2)}°C</div>`;
}

async function populateDeviceCheckboxes(assignedDeviceIds = []) {
    const listContainer = document.getElementById('device-list-checkboxes');
    const assignmentContainer = document.getElementById('device-assignment-container');
    if (!listContainer || !assignmentContainer) return;
    
    assignmentContainer.style.display = 'block';
    listContainer.innerHTML = 'A carregar...';
    
    try {
        const devices = await apiRequest('/devices');
        let checkboxesHtml = '';
        if (devices.length > 0) {
            devices.forEach(device => {
                const isChecked = assignedDeviceIds.includes(device._id);
                checkboxesHtml += `<div><input type="checkbox" id="dev-${device._id}" value="${device._id}" ${isChecked ? 'checked' : ''} class="mr-2 h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"> <label for="dev-${device._id}">${device.name}</label></div>`;
            });
        } else {
            checkboxesHtml = 'Nenhum dispositivo para vincular.';
        }
        listContainer.innerHTML = checkboxesHtml;
    } catch (e) {
        listContainer.innerHTML = `<p class="text-red-400">Erro ao carregar dispositivos.</p>`;
    }
}

function addPasswordToggleListener(formId) {
    const passwordInput = document.querySelector(`#${formId} input[type="password"]`);
    const toggleButton = document.querySelector(`#${formId} #togglePassword`);
    if (!passwordInput || !toggleButton) return;

    const eyeOpen = toggleButton.querySelector('#eye-open');
    const eyeClosed = toggleButton.querySelector('#eye-closed');

    toggleButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeOpen.classList.toggle('hidden', type === 'text');
        eyeClosed.classList.toggle('hidden', type === 'password');
    });
}

// Objeto que exporta todas as funções de renderização
export const render = {
    deviceCards: async () => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        try {
            const devices = await apiRequest('/devices');
            if (devices.length === 0) {
                mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>Nenhum dispositivo encontrado.</p></div>`;
                return;
            }
            let html = '<h3 class="text-xl font-bold mb-4 text-white">Seus Dispositivos</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
            devices.forEach(d => {
                html += `<div class="device-card border border-slate-700 rounded-lg p-4 cursor-pointer bg-slate-800 hover:bg-slate-700" data-deviceid="${d._id}" data-devicename="${d.name}"><h4 class="font-bold text-lg text-white pointer-events-none">${d.name}</h4><p class="text-sm text-slate-400 pointer-events-none">Status: <span class="font-semibold">${d.status}</span></p></div>`;
            });
            html += '</div>';
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${html}</div>`;
        } catch (e) { mainContentView.innerHTML = `<div class="text-red-400">${e.message}</div>`; }
    },
    
    deviceDetail: (deviceId, deviceName) => {
        switchView('detail');
        const deviceDetailView = document.getElementById('device-detail-view');
        deviceDetailView.innerHTML = `<button id="back-to-list-button" class="mb-4 rounded-lg bg-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-700">&larr; Voltar</button><div class="rounded-lg bg-slate-800 p-6 shadow-xl"><h3 class="text-xl font-bold text-white mb-4">${deviceName}</h3><div class="grid grid-cols-1 lg:grid-cols-4 gap-6"><div class="lg:col-span-3"><h4 class="text-lg font-semibold mb-2 text-slate-200">Últimas 10 Leituras</h4><div class="chart-container"><canvas id="temp-chart"></canvas></div></div><div class="lg:col-span-1"><h4 class="text-lg font-semibold mb-2 text-slate-200">Estatísticas (24h)</h4><div id="stats-content" class="space-y-2"><p>A carregar...</p></div></div></div></div>`;
        
        const fetchAndRender = async () => {
            const statsContent = document.getElementById('stats-content');
            const chartCanvas = document.getElementById('temp-chart');
            const endDate = new Date(), startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            try {
                const data = await apiRequest(`/dashboard/device/${deviceId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
                renderChart(chartCanvas, data.chartData);
                renderStats(statsContent, data.stats);
            } catch (e) { statsContent.innerHTML = `<p class="text-red-400">${e.message}</p>`; }
        };
        fetchAndRender();
    },
    
    deviceManagement: async () => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        try {
            const devices = await apiRequest('/devices');
            let tableHtml = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-white">Gestão de Dispositivos</h3><button id="create-device-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Novo Dispositivo</button></div><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-slate-700"><th class="py-2">Nome</th><th>Temp. Mín</th><th>Temp. Máx</th><th>Ações</th></tr></thead><tbody>`;
            devices.forEach(d => {
                tableHtml += `<tr class="border-b border-slate-700"><td class="py-2 pr-2">${d.name}</td><td>${d.settings.tempMin}°C</td><td>${d.settings.tempMax}°C</td><td class="whitespace-nowrap"><button class="edit-device-button text-blue-400 mr-2" data-deviceid="${d._id}">Editar</button><button class="delete-device-button text-red-400" data-deviceid="${d._id}">Apagar</button></td></tr>`;
            });
            tableHtml += `</tbody></table></div></div>`;
            mainContentView.innerHTML = tableHtml;
        } catch (error) { mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`; }
    },
    
    deviceForm: async (deviceId = null) => {
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalContainer.classList.remove('hidden');
        modalTitle.textContent = deviceId ? 'Editar Dispositivo' : 'Criar Novo Dispositivo';
        let formHtml = `<form id="device-form" class="space-y-4"><input type="hidden" id="deviceId" value="${deviceId || ''}"><div><label for="deviceName" class="block text-sm font-medium text-slate-300">Nome do Dispositivo</label><input type="text" id="deviceName" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div class="grid grid-cols-2 gap-4"><div><label for="deviceTempMin" class="block text-sm font-medium text-slate-300">Temp. Mín (°C)</label><input type="number" step="0.1" id="deviceTempMin" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600" value="2"></div><div><label for="deviceTempMax" class="block text-sm font-medium text-slate-300">Temp. Máx (°C)</label><input type="number" step="0.1" id="deviceTempMax" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600" value="8"></div></div><div id="device-key-display" class="hidden pt-4"><label class="block text-sm font-medium text-slate-400">Device Key (só leitura)</label><input type="text" id="deviceKey" readonly class="w-full p-2 border rounded bg-slate-900 border-slate-600 cursor-not-allowed"></div><div class="flex justify-end space-x-2 pt-4"><button type="button" id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Salvar</button></div></form>`;
        modalBody.innerHTML = formHtml;
        
        if (deviceId) {
            const device = await apiRequest(`/devices/${deviceId}`);
            document.getElementById('deviceName').value = device.name;
            document.getElementById('deviceTempMin').value = device.settings.tempMin;
            document.getElementById('deviceTempMax').value = device.settings.tempMax;
            document.getElementById('device-key-display').classList.remove('hidden');
            document.getElementById('deviceKey').value = device.deviceKey;
        }
    },
    
    userManagement: async () => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        try {
            const users = await apiRequest('/users');
            let usersHtml = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-white">Gestão de Utilizadores</h3><button id="create-user-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Novo Utilizador</button></div><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-slate-700"><th class="py-2">Nome</th><th class="py-2">Email</th><th>Role</th><th>Ações</th></tr></thead><tbody>`;
            users.forEach(u => {
                usersHtml += `<tr class="border-b border-slate-700"><td class="py-2 pr-2">${u.name}</td><td class="py-2 pr-2">${u.email}</td><td>${u.role}</td><td class="whitespace-nowrap"><button class="edit-user-button text-blue-400 mr-2" data-userid="${u._id}">Editar</button><button class="delete-user-button text-red-400" data-userid="${u._id}">Apagar</button></td></tr>`;
            });
            usersHtml += `</tbody></table></div></div>`;
            mainContentView.innerHTML = usersHtml;
        } catch (error) { mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`; }
    },
    
    userForm: async (userId = null) => {
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        modalContainer.classList.remove('hidden');
        modalTitle.textContent = userId ? 'Editar Utilizador' : 'Criar Novo Utilizador';
        let formHtml = `<form id="user-form" class="space-y-4"><input type="hidden" id="userId" value="${userId || ''}"><input type="hidden" id="tenantName" value="${localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).tenant : ''}"><div><label for="userName" class="block text-sm font-medium text-slate-300">Nome Completo</label><input type="text" id="userName" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userEmail" class="block text-sm font-medium text-slate-300">Email</label><input type="email" id="userEmail" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div class="relative"><label for="userPassword" class="block text-sm font-medium text-slate-300">Senha</label><input type="password" id="userPassword" ${!userId ? 'required' : ''} class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600 pr-10" placeholder="${userId ? 'Deixar em branco para não alterar' : 'Pelo menos 6 caracteres'}"><button type="button" id="togglePassword" class="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-sm leading-5 text-slate-400"><svg class="h-5 w-5" id="eye-open" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><svg class="h-5 w-5 hidden" id="eye-closed" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.111 3.496-5.441 6.553-6.288m1.144-1.144A9.983 9.983 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.005 10.005 0 01-2.036 3.875m-4.472-4.472a3 3 0 10-4.243 4.243M1 1l22 22" /></svg></button></div><div><label for="userPhone" class="block text-sm font-medium text-slate-300">Telefone</label><input type="tel" id="userPhone" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userWhatsappKey" class="block text-sm font-medium text-slate-300">Chave API (WhatsApp)</label><input type="text" id="userWhatsappKey" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userRole" class="block text-sm font-medium text-slate-300">Função</label><select id="userRole" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"><option value="viewer">Viewer</option><option value="admin">Admin</option></select></div><div id="device-assignment-container" class="hidden"><label class="block text-sm font-medium text-slate-300">Dispositivos Vinculados</label><div id="device-list-checkboxes" class="border rounded p-2 h-32 overflow-y-auto bg-slate-700 border-slate-600"></div></div><div class="flex justify-end space-x-2 pt-4"><button type="button" id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Salvar</button></div></form>`;
        modalBody.innerHTML = formHtml;
        
        addPasswordToggleListener('user-form');
        
        const roleSelect = document.getElementById('userRole');
        const toggleDeviceCheckboxes = async () => {
            const selectedRole = roleSelect.value;
            const container = document.getElementById('device-assignment-container');
            if (selectedRole === 'viewer') {
                const userToEdit = userId ? (await apiRequest('/users')).find(u => u._id === userId) : null;
                const assignedDevices = userToEdit ? userToEdit.devices.map(d => d._id) : [];
                await populateDeviceCheckboxes(assignedDevices);
            } else {
                container.style.display = 'none';
            }
        };

        roleSelect.addEventListener('change', toggleDeviceCheckboxes);
        
        if (userId) {
            const users = await apiRequest('/users');
            const userToEdit = users.find(u => u._id === userId);
            document.getElementById('userName').value = userToEdit.name;
            document.getElementById('userEmail').value = userToEdit.email;
            document.getElementById('userPhone').value = userToEdit.phoneNumber || '';
            document.getElementById('userWhatsappKey').value = userToEdit.whatsappApiKey || '';
            roleSelect.value = userToEdit.role;
        }
        
        await toggleDeviceCheckboxes();
    },
    
    myProfileForm: async () => {
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        modalContainer.classList.remove('hidden');
        modalTitle.textContent = 'Editar Meu Perfil';
        let formHtml = `<form id="profile-form" class="space-y-4">
           <div><label for="profileName" class="block text-sm font-medium text-slate-300">Nome</label><input type="text" id="profileName" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div>
           <div><label for="profileEmail" class="block text-sm font-medium text-slate-300">Email</label><input type="email" id="profileEmail" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div>
           <div class="relative"><label for="profilePassword" class="block text-sm font-medium text-slate-300">Nova Senha</label><input type="password" id="profilePassword" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600 pr-10" placeholder="Deixar em branco para não alterar"><button type="button" id="togglePassword" class="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-sm leading-5 text-slate-400"><svg class="h-5 w-5" id="eye-open" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><svg class="h-5 w-5 hidden" id="eye-closed" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.111 3.496-5.441 6.553-6.288m1.144-1.144A9.983 9.983 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.005 10.005 0 01-2.036 3.875m-4.472-4.472a3 3 0 10-4.243 4.243M1 1l22 22" /></svg></button></div>
           <div><label for="profilePhone" class="block text-sm font-medium text-slate-300">Telefone</label><input type="tel" id="profilePhone" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div>
           <div><label for="profileWhatsappKey" class="block text-sm font-medium text-slate-300">Chave API (WhatsApp)</label><input type="text" id="profileWhatsappKey" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div>
           <div class="flex justify-end space-x-2 pt-4"><button type="button" id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Salvar Alterações</button></div>
        </form>`;
        modalBody.innerHTML = formHtml;
        addPasswordToggleListener('profile-form');
        const profile = await apiRequest('/users/me');
        document.getElementById('profileName').value = profile.name;
        document.getElementById('profileEmail').value = profile.email;
        document.getElementById('profilePhone').value = profile.phoneNumber || '';
        document.getElementById('profileWhatsappKey').value = profile.whatsappApiKey || '';
    }
};
