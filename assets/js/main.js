// --- Módulo Principal ---
// O ponto de entrada da nossa aplicação, que orquestra tudo.

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores do DOM ---
    const elements = {  
        mainContentView: document.getElementById('main-content-view'),
        userMenuButton: document.getElementById('user-menu-button'),
        userMenu: document.getElementById('user-menu'),
        menuUserEmail: document.getElementById('menu-user-email'),
        myProfileLink: document.getElementById('my-profile-link'),
        manageUsersLink: document.getElementById('manage-users-link'),
        manageDevicesLink: document.getElementById('manage-devices-link'),
        exportReportLink: document.getElementById('export-report-link'),
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
            const modalContainer = document.getElementById('modal-container');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            
            modalContainer.classList.remove('hidden');
            modalTitle.textContent = 'Confirmar Exclusão';
            modalBody.innerHTML = `
                <div class="space-y-4">
                    <p class="text-slate-300">Tem a certeza que deseja apagar este usuário?</p>
                    <div class="flex justify-end space-x-2">
                        <button id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button>
                        <button id="confirm-delete-user" class="bg-red-600 text-white px-4 py-2 rounded-lg">Apagar</button>
                    </div>
                </div>
            `;

            document.getElementById('confirm-delete-user').addEventListener('click', async () => {
                try {
                    await apiRequest(`/users/${userId}`, 'DELETE');
                    modalContainer.classList.add('hidden');
                    toast.success('Usuário apagado com sucesso!');
                    render.userManagement();
                } catch (error) {
                    toast.error(`Erro ao apagar: ${error.message}`);
                }
            });
        },
        deleteDevice: async (deviceId) => {
            const modalContainer = document.getElementById('modal-container');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            
            modalContainer.classList.remove('hidden');
            modalTitle.textContent = 'Confirmar Exclusão';
            modalBody.innerHTML = `
                <div class="space-y-4">
                    <p class="text-slate-300">Tem a certeza? Os dados de histórico deste dispositivo não serão apagados.</p>
                    <div class="flex justify-end space-x-2">
                        <button id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button>
                        <button id="confirm-delete-device" class="bg-red-600 text-white px-4 py-2 rounded-lg">Apagar</button>
                    </div>
                </div>
            `;

            document.getElementById('confirm-delete-device').addEventListener('click', async () => {
                try {
                    await apiRequest(`/devices/${deviceId}`, 'DELETE');
                    modalContainer.classList.add('hidden');
                    toast.success('Dispositivo apagado com sucesso!');
                    render.deviceManagement();
                } catch(error) {
                    toast.error(`Erro ao apagar: ${error.message}`);
                }
            });
        },
        saveUser: async (form) => {
            const userId = form.querySelector('#userId').value;
            const password = form.querySelector('#password').value;

            // Se for um novo usuário, a lógica é diferente.
            if (!userId) {
                if (!password) { 
                    toast.error('A senha é obrigatória para novos usuários.');
                    return; 
                }
                const payload = {
                    name: form.querySelector('#name').value,
                    email: form.querySelector('#email').value,
                    role: form.querySelector('#role').value,
                    password: password,
                    phoneNumber: form.querySelector('#userPhone').value,
                    whatsappApiKey: form.querySelector('#userWhatsappKey').value,
                    tenantName: state.user.tenant,
                    devices: Array.from(form.querySelectorAll('#device-checkboxes input:checked')).map(cb => cb.value)
                };
                try {
                    await apiRequest(`/auth/register`, 'POST', payload);
                    toast.success('Usuário criado com sucesso!');
                    render.userManagement();
                } catch (error) { 
                    toast.error(`Erro ao criar usuário: ${error.message}`); 
                }
                return;
            }

            // Lógica de atualização para um usuário existente
            const initialState = JSON.parse(form.dataset.initialState || '{}');
            const payload = {};
            
            const fields = {
                name: form.querySelector('#name').value,
                email: form.querySelector('#email').value,
                role: form.querySelector('#role').value,
                phoneNumber: form.querySelector('#userPhone').value,
                whatsappApiKey: form.querySelector('#userWhatsappKey').value
            };

            for (const key in fields) {
                // Compara o valor atual com o inicial. Usa '' como fallback para campos que podem não existir no estado inicial (ex: phoneNumber)
                if (fields[key] !== (initialState[key] || '')) {
                    payload[key] = fields[key];
                }
            }

            if (password) {
                payload.password = password;
            }

            const currentRole = fields.role;
            // A comparação de dispositivos só é relevante se o papel atual ou inicial for 'viewer' ('user' para compatibilidade)
            if (currentRole === 'viewer' || initialState.role === 'viewer' || currentRole === 'user' || initialState.role === 'user') {
                // Extrai apenas os IDs dos dispositivos do estado inicial para uma comparação correta
                const initialDevices = (initialState.devices || []).map(d => d._id || d).sort();
                const currentDevices = Array.from(form.querySelectorAll('#device-checkboxes input:checked')).map(cb => cb.value).sort();
                
                if (JSON.stringify(initialDevices) !== JSON.stringify(currentDevices)) {
                    payload.devices = currentDevices;
                }
            }
            
            if (Object.keys(payload).length === 0) {
                toast.info('Nenhuma alteração para salvar.');
                return;
            }

            try {
                await apiRequest(`/users/${userId}`, 'PUT', payload);
                toast.success('Usuário atualizado com sucesso!');
                render.userManagement();
            } catch (error) { 
                toast.error(`Erro ao atualizar: ${error.message}`); 
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
                    toast.success('Dispositivo atualizado com sucesso!');
                    elements.modalContainer.classList.add('hidden');
                    render.deviceManagement();
                } else {
                    const newDevice = await apiRequest('/devices', 'POST', payload);
                    toast.success('Dispositivo criado com sucesso!');
                    document.getElementById('modal-title').textContent = 'Dispositivo Criado com Sucesso!';
                    modalBody.innerHTML = `
                        <p class="mb-4 text-slate-300">Guarde esta Device Key. Ela é necessária para configurar o seu dispositivo físico e para vinculá-lo a usuários.</p>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-400">Device Key</label>
                            <input type="text" readonly value="${newDevice.deviceKey}" class="w-full p-2 border rounded bg-slate-700 border-slate-600">
                        </div>
                        <div class="flex justify-end">
                            <button id="close-success-modal" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Fechar</button>
                        </div>`;
                }
            } catch(error) { 
                toast.error(`Erro ao salvar: ${error.message}`); 
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
                toast.success('Perfil atualizado com sucesso!');
            } catch(error) { 
                toast.error(`Erro ao salvar: ${error.message}`); 
            }
        },
    };

    // --- Inicialização e Event Listeners ---
    function init() {
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
            'view-devices-link': () => {
                render.deviceCards();
            },
            'manage-devices-link': () => {
                render.deviceManagement();
            },
            'manage-users-link': () => {
                render.userManagement();
            },
            'export-report-link': () => {
                render.exportReportForm();
            },
            'my-profile-link': () => {
                render.myProfileForm();
            },
            'logout-link': actions.logout,
            'home-link': () => {
                render.deviceCards();
            },
        };

        for (const id in menuActions) {
            const elementKey = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            const element = elements[elementKey];
            
            if (element) {
                element.addEventListener('click', e => {
                    e.preventDefault();
                    menuActions[id]();
                    elements.userMenu.classList.add('hidden');
                });
            }
        }
        
        elements.deviceDetailView.addEventListener('click', async (e) => {
            if (e.target && e.target.id === 'back-to-list-button') {
                switchView('list');
                await render.deviceCards();
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
                'device-card': function() {
                    render.deviceDetail(this.dataset.deviceid, this.dataset.devicename);
                },
            };
            for (const className in actionMap) {
                const card = target.closest(`.${className}, #${className}`);
                if (card) {
                    actionMap[className].call(card, e);
                    break;
                }
            }
        });
        
        elements.modalContainer.addEventListener('click', e => {
            if (e.target === elements.modalContainer) {
                elements.modalContainer.classList.add('hidden');
            }
        });
        
        document.getElementById('modal-container').addEventListener('click', e => {
            if (e.target.id === 'cancel-modal-button') {
                elements.modalContainer.classList.add('hidden');
            }
        });
        
        document.getElementById('modal-container').addEventListener('submit', e => {
            const formId = e.target.id;
            if (formId === 'device-form') actions.saveDevice(e);
            else if (formId === 'profile-form') actions.saveMyProfile(e);
        });
        
        elements.mainContentView.addEventListener('submit', async (e) => {
            const formId = e.target.id;
            if (formId === 'user-form') {
                e.preventDefault();
                actions.saveUser(e.target);
            } else if (formId === 'search-form') {
                e.preventDefault();
                const searchInput = e.target.querySelector('#search-input');
                const searchValue = searchInput.value.trim();
                const currentView = document.getElementById('main-content-view');
                const headerText = currentView.querySelector('h3')?.textContent;
                
                if (headerText === 'Gestão de Usuários') {
                    await render.userManagement(1, searchValue);
                } else if (headerText === 'Gestão de Dispositivos') {
                    await render.deviceManagement(1, searchValue);
                } else {
                    await render.deviceCards(1, searchValue);
                }
            } else if (formId === 'export-report-form') {
                e.preventDefault();
                exportReportToPDF();
            }
        });
        
        render.deviceCards();
    }

    init();
});

document.addEventListener('click', async (e) => {
    const deviceCard = e.target.closest('.device-card');
    if (deviceCard) {
        const deviceId = deviceCard.dataset.deviceid;
        const deviceName = deviceCard.dataset.devicename;
        if (deviceId) {
            try {
                // Mostrar loading
                const mainContentView = document.getElementById('main-content-view');
                mainContentView.innerHTML = `
                    <div class="rounded-lg bg-slate-800 p-6 shadow-xl">
                        <div class="flex items-center justify-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span class="ml-2 text-slate-300">Carregando detalhes do dispositivo...</span>
                        </div>
                    </div>
                `;
                // Chamar a função de detalhes do render
                await render.deviceDetail(deviceId, deviceName);
            } catch (error) {
                console.error('[main.js] Erro ao carregar detalhes:', error);
                toast.error('Erro ao carregar detalhes do dispositivo');
            }
        }
    }
}); 