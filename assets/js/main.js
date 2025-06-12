// --- Módulo Principal ---
// O ponto de entrada da nossa aplicação, que orquestra tudo.

import { apiRequest } from './api.js';
import { render } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[main.js] > DOM carregado. A iniciar a aplicação...');

    // --- Seletores do DOM ---
    const elements = {
        mainContentView: document.getElementById('main-content-view'),
        userMenuButton: document.getElementById('user-menu-button'),
        userMenu: document.getElementById('user-menu'),
        menuUserEmail: document.getElementById('menu-user-email'),
        myProfileLink: document.getElementById('my-profile-link'),
        manageUsersLink: document.getElementById('manage-users-link'),
        manageDevicesLink: document.getElementById('manage-devices-link'),
        viewDevicesLink: document.getElementById('view-devices-link'),
        logoutLink: document.getElementById('logout-link'),
        homeLink: document.getElementById('home-link'),
        deviceDetailView: document.getElementById('device-detail-view'),
        modalContainer: document.getElementById('modal-container'),
    };

    // --- Estado da Aplicação ---
    const state = {
        user: JSON.parse(localStorage.getItem('user')),
    };

    if (!state.user) {
        console.error("[main.js] > ERRO: Utilizador não encontrado no localStorage. A redirecionar para o login.");
        window.location.href = 'login.html';
        return;
    }

    // --- Handlers de Ações (a lógica por trás dos cliques) ---
    const actions = {
        logout: () => {
            localStorage.clear();
            window.location.href = 'login.html';
        },
        deleteUser: async (userId) => {
            if (confirm('Tem a certeza que deseja apagar este utilizador?')) {
                try {
                    await apiRequest(`/users/${userId}`, 'DELETE');
                    render.userManagement();
                } catch (error) {
                    alert(`Erro ao apagar: ${error.message}`);
                }
            }
        },
        deleteDevice: async (deviceId) => {
             if (confirm('Tem a certeza? Os dados de histórico deste dispositivo não serão apagados.')) {
                try {
                    await apiRequest(`/devices/${deviceId}`, 'DELETE');
                    render.deviceManagement();
                } catch(error) {
                    alert(`Erro ao apagar: ${error.message}`);
                }
            }
        },
        saveUser: async (event) => {
            event.preventDefault();
            const modalBody = document.getElementById('modal-body');
            const userId = modalBody.querySelector('#userId').value;
            const password = modalBody.querySelector('#userPassword').value;
            
            const payload = {
                name: modalBody.querySelector('#userName').value,
                email: modalBody.querySelector('#userEmail').value,
                role: modalBody.querySelector('#userRole').value,
                phoneNumber: modalBody.querySelector('#userPhone').value,
                whatsappApiKey: modalBody.querySelector('#userWhatsappKey').value,
            };
            if (password) payload.password = password;

            if (payload.role === 'viewer') { 
                payload.devices = Array.from(modalBody.querySelectorAll('#device-list-checkboxes input:checked')).map(cb => cb.value); 
            }
            
            try {
                if (userId) {
                    await apiRequest(`/users/${userId}`, 'PUT', payload);
                } else {
                    if (!password) { alert('A senha é obrigatória para novos utilizadores.'); return; }
                    payload.tenantName = state.user.tenant;
                    await apiRequest(`/auth/register`, 'POST', payload);
                }
                elements.modalContainer.classList.add('hidden');
                render.userManagement();
            } catch (error) { 
                alert(`Erro ao salvar: ${error.message}`); 
            }
        },
        saveDevice: async (event) => {
            event.preventDefault();
            const modalBody = document.getElementById('modal-body');
            const deviceId = modalBody.querySelector('#deviceId').value;
            const payload = { 
                name: modalBody.querySelector('#deviceName').value, 
                tempMin: modalBody.querySelector('#deviceTempMin').value, 
                tempMax: modalBody.querySelector('#deviceTempMax').value 
            };
            try {
                if (deviceId) {
                    await apiRequest(`/devices/${deviceId}`, 'PUT', payload);
                    elements.modalContainer.classList.add('hidden');
                    render.deviceManagement();
                } else {
                    const newDevice = await apiRequest('/devices', 'POST', payload);
                    document.getElementById('modal-title').textContent = 'Dispositivo Criado com Sucesso!';
                    modalBody.innerHTML = `
                        <p class="mb-4 text-slate-300">Guarde esta Device Key. Ela é necessária para configurar o seu dispositivo físico e para vinculá-lo a utilizadores.</p>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-400">Device Key</label>
                            <input type="text" readonly value="${newDevice.deviceKey}" class="w-full p-2 border rounded bg-slate-700 border-slate-600">
                        </div>
                        <div class="flex justify-end">
                            <button id="close-success-modal" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Fechar</button>
                        </div>`;
                }
            } catch(error) { 
                alert(`Erro ao salvar: ${error.message}`); 
            }
        },
        saveMyProfile: async (e) => {
            e.preventDefault();
            const modalBody = document.getElementById('modal-body');
            const payload = {
                name: modalBody.querySelector('#profileName').value,
                email: modalBody.querySelector('#profileEmail').value,
                phoneNumber: modalBody.querySelector('#profilePhone').value,
                whatsappApiKey: modalBody.querySelector('#profileWhatsappKey').value
            };
            try {
                await apiRequest('/users/me', 'PUT', payload);
                elements.modalContainer.classList.add('hidden');
                alert('Perfil atualizado com sucesso!');
            } catch(error) { 
                alert(`Erro ao salvar: ${error.message}`); 
            }
        },
    };

    // --- Inicialização e Event Listeners ---
    function init() {
        console.log('[main.js] > A iniciar. Utilizador:', state.user);
        elements.menuUserEmail.textContent = state.user.email;
        if (state.user.role !== 'admin') {
            elements.manageUsersLink.style.display = 'none';
            elements.manageDevicesLink.style.display = 'none';
        }
        
        elements.userMenuButton.addEventListener('click', () => elements.userMenu.classList.toggle('hidden'));
        document.addEventListener('click', e => {
            if (!elements.userMenu.contains(e.target) && !elements.userMenuButton.contains(e.target)) {
                elements.userMenu.classList.add('hidden');
            }
        });
        
        const menuActions = {
            'view-devices-link': render.deviceCards,
            'manage-devices-link': render.deviceManagement,
            'manage-users-link': render.userManagement,
            'my-profile-link': render.myProfileForm,
            'logout-link': actions.logout,
            'home-link': render.deviceCards,
        };

        console.log('[main.js] > A ligar os botões do menu...');
        for (const id in menuActions) {
            const elementKey = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            const element = elements[elementKey];
            
            console.log(`[main.js] > A procurar pelo elemento do menu: #${id}`);
            if (element) {
                console.log(`[main.js] > SUCESSO: Elemento #${id} encontrado. A adicionar listener.`);
                element.addEventListener('click', e => {
                    e.preventDefault();
                    menuActions[id]();
                    elements.userMenu.classList.add('hidden');
                });
            } else {
                console.error(`[main.js] > ERRO: Elemento #${id} não foi encontrado no HTML ou no objeto 'elements'.`);
            }
        }
        
        elements.deviceDetailView.addEventListener('click', e => {
            if (e.target && e.target.id === 'back-to-list-button') {
                render.deviceCards();
            }
        });
        
        elements.mainContentView.addEventListener('click', (e) => {
            const target = e.target;
            const actionMap = {
                'edit-user-button': () => render.userForm(target.dataset.userid),
                'delete-user-button': () => actions.deleteUser(target.dataset.userid),
                'create-user-button': () => render.userForm(),
                'edit-device-button': () => render.deviceForm(target.dataset.deviceid),
                'delete-device-button': () => actions.deleteDevice(target.dataset.deviceid),
                'create-device-button': () => render.deviceForm(),
                'device-card': () => render.deviceDetail(target.dataset.deviceid, target.dataset.devicename),
            };
            for (const className in actionMap) {
                if (target.matches(`.${className}, #${className}`)) {
                    actionMap[className]();
                    break;
                }
            }
        });
        
        elements.modalContainer.addEventListener('click', (e) => {
             if (e.target.id === 'cancel-modal-button' || e.target.id === 'close-success-modal') {
                elements.modalContainer.classList.add('hidden');
            }
        });

        elements.modalContainer.addEventListener('submit', (e) => {
            if (e.target.id === 'user-form') {
                actions.saveUser(e);
            } else if (e.target.id === 'device-form') {
                actions.saveDevice(e);
            } else if (e.target.id === 'profile-form') {
                actions.saveMyProfile(e);
            }
        });

        console.log('[main.js] > Inicialização completa. A renderizar a vista inicial...');
        render.deviceCards();
    }

    init();
});
