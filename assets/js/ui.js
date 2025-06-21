// --- Módulo de UI (Interface do Usuário) ---
// Responsável por gerar o HTML dinâmico da aplicação.

let chartInstance = null;

// --- Funções Auxiliares de UI ---
function switchView(viewName) {
    document.getElementById('main-content-view').style.display = viewName === 'detail' ? 'none' : 'block';
    document.getElementById('device-detail-view').style.display = viewName === 'detail' ? 'block' : 'none';
}

function renderChart(canvas, chartData, detailLevel = 'auto') {
    if (chartInstance) {
        chartInstance.destroy();
    }   
    
    if (!canvas || !chartData || !Array.isArray(chartData) || chartData.length === 0) {
        return;
    }
    
    // Estratégia responsiva baseada na quantidade de dados e nível de detalhe
    let processedData = [];
    let labels = [];
    
    // Se o nível de detalhe for manual, usar as configurações específicas
    if (detailLevel === 'high') {
        // Alto detalhe: mostrar todos os pontos (máximo 100)
        const maxPoints = Math.min(chartData.length, 100);
        const step = Math.ceil(chartData.length / maxPoints);
        processedData = chartData.filter((_, index) => index % step === 0).reverse();
        labels = processedData.map(d => new Date(d.timestamp).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    }));
    } else if (detailLevel === 'medium') {
        // Médio detalhe: amostragem moderada (máximo 50 pontos)
        const maxPoints = Math.min(chartData.length, 50);
        const step = Math.ceil(chartData.length / maxPoints);
        processedData = chartData.filter((_, index) => index % step === 0).reverse();
        labels = processedData.map(d => new Date(d.timestamp).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }));
    } else if (detailLevel === 'low') {
        // Baixo detalhe: agregação por hora ou dia
        if (chartData.length <= 1000) {
            processedData = aggregateDataByHour(chartData);
            labels = processedData.map(d => new Date(d.timestamp).toLocaleString('pt-BR', { 
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        } else {
            processedData = aggregateDataByDay(chartData);
            labels = processedData.map(d => new Date(d.timestamp).toLocaleDateString('pt-BR', { 
                day: '2-digit',
                month: '2-digit'
            }));
        }
    } else {
        // Automático: usar a lógica responsiva baseada na quantidade de dados
        if (chartData.length <= 50) {
            // Poucos dados: mostrar todos os pontos
            processedData = chartData.reverse();
            labels = processedData.map(d => new Date(d.timestamp).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        } else if (chartData.length <= 200) {
            // Dados moderados: mostrar a cada 2-3 pontos
            const step = Math.ceil(chartData.length / 50);
            processedData = chartData.filter((_, index) => index % step === 0).reverse();
            labels = processedData.map(d => new Date(d.timestamp).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        } else if (chartData.length <= 1000) {
            // Muitos dados: agregação por hora
            processedData = aggregateDataByHour(chartData);
            labels = processedData.map(d => new Date(d.timestamp).toLocaleString('pt-BR', { 
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        } else {
            // Muitíssimos dados: agregação por dia
            processedData = aggregateDataByDay(chartData);
            labels = processedData.map(d => new Date(d.timestamp).toLocaleDateString('pt-BR', { 
                day: '2-digit',
                month: '2-digit'
            }));
        }
    }
    
    Chart.defaults.color = '#94a3b8';
    
    try {
        chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Temperatura',
                    data: processedData.map(d => d.temperature),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const dataPoint = processedData[dataIndex];
                                if (dataPoint && dataPoint.count > 1) {
                                    return `${context[0].label} (${dataPoint.count} leituras)`;
                                }
                                return context[0].label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Temperatura (°C)',
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(100, 116, 139, 0.2)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(100, 116, 139, 0.2)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxRotation: 45,
                            minRotation: 45,
                            maxTicksLimit: 20
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao criar gráfico:', error);
    }
    
    return chartInstance;
}

// Função para agregar dados por hora
function aggregateDataByHour(data) {
    const hourlyData = {};
    
    data.forEach(reading => {
        const date = new Date(reading.timestamp);
        const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
        
        if (!hourlyData[hourKey]) {
            hourlyData[hourKey] = {
                temperatures: [],
                timestamp: hourKey
            };
        }
        
        hourlyData[hourKey].temperatures.push(reading.temperature);
    });
    
    return Object.values(hourlyData).map(hour => ({
        temperature: hour.temperatures.reduce((a, b) => a + b, 0) / hour.temperatures.length,
        timestamp: hour.timestamp,
        count: hour.temperatures.length
    }));
}

// Função para agregar dados por dia
function aggregateDataByDay(data) {
    const dailyData = {};
    
    data.forEach(reading => {
        const date = new Date(reading.timestamp);
        const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                temperatures: [],
                timestamp: dayKey
            };
        }
        
        dailyData[dayKey].temperatures.push(reading.temperature);
    });
    
    return Object.values(dailyData).map(day => ({
        temperature: day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length,
        timestamp: day.timestamp,
        count: day.temperatures.length
    }));
}

// Função para renderizar estatísticas
function renderStats(container, stats) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-slate-700 rounded-lg p-4">
                <h5 class="text-sm font-medium text-slate-300 mb-2">Temperatura</h5>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="text-slate-400">Atual:</span> <span class="text-white">${stats.temperature.current}°C</span></div>
                    <div><span class="text-slate-400">Média:</span> <span class="text-white">${stats.temperature.avg}°C</span></div>
                    <div><span class="text-slate-400">Mín:</span> <span class="text-white">${stats.temperature.min}°C</span></div>
                    <div><span class="text-slate-400">Máx:</span> <span class="text-white">${stats.temperature.max}°C</span></div>
                    </div>
                    </div>
            <div class="bg-slate-700 rounded-lg p-4">
                <h5 class="text-sm font-medium text-slate-300 mb-2">Humidade</h5>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="text-slate-400">Atual:</span> <span class="text-white">${stats.humidity.current}%</span></div>
                    <div><span class="text-slate-400">Média:</span> <span class="text-white">${stats.humidity.avg}%</span></div>
                    <div><span class="text-slate-400">Mín:</span> <span class="text-white">${stats.humidity.min}%</span></div>
                    <div><span class="text-slate-400">Máx:</span> <span class="text-white">${stats.humidity.max}%</span></div>
                    </div>
            </div>
        </div>
    `;
}

// Função para popular checkboxes de dispositivos
async function populateDeviceCheckboxes(assignedDevices = []) {
    const container = document.getElementById('device-checkboxes');
    if (!container) return;

    try {
        const response = await apiRequest('/devices');
        const devices = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        if (devices.length === 0) {
            container.innerHTML = '<p class="text-slate-400">Nenhum dispositivo disponível para vincular.</p>';
            return;
        }

        devices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        // Criar um array simples de IDs para uma pesquisa eficiente
        const assignedDeviceIds = (assignedDevices || []).map(d => d._id || d);

        const checkboxesHtml = devices.map(device => `
            <label class="flex items-center space-x-3 cursor-pointer hover:bg-slate-600 p-2 rounded-md">
                <input type="checkbox" name="devices" value="${device._id}" 
                       class="form-checkbox h-5 w-5 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"
                       ${assignedDeviceIds.includes(device._id) ? 'checked' : ''}>
                <span class="text-slate-200">${device.name}</span>
            </label>
        `).join('');

        container.innerHTML = checkboxesHtml;
    } catch (error) {
        console.error('Erro ao buscar dispositivos:', error);
        container.innerHTML = '<p class="text-red-400">Erro ao carregar dispositivos.</p>';
    }
}

// Função para adicionar listener de toggle de senha
function addPasswordToggleListener(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const passwordField = form.querySelector('input[type="password"]');
    const toggleButton = form.querySelector('.password-toggle');
    
    if (passwordField && toggleButton) {
    toggleButton.addEventListener('click', () => {
            const type = passwordField.type === 'password' ? 'text' : 'password';
            passwordField.type = type;
            toggleButton.innerHTML = type === 'password' 
                ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>'
                : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path></svg>';
        });
    }
}

// Função para calcular estatísticas das leituras
function calculateStats(readings) {
    // Filtrar leituras válidas
    const validReadings = readings.filter(r => 
        r.temperature !== null && 
        r.temperature !== undefined && 
        r.humidity !== null && 
        r.humidity !== undefined
    );
    
    if (validReadings.length === 0) {
        return {
            temperature: {
                current: 'N/A',
                min: 'N/A',
                max: 'N/A',
                avg: 'N/A'
            },
            humidity: {
                current: 'N/A',
                min: 'N/A',
                max: 'N/A',
                avg: 'N/A'
            }
        };
    }
    
    // Extrair valores
    const temperatures = validReadings.map(r => r.temperature);
    const humidities = validReadings.map(r => r.humidity);
    
    // Calcular estatísticas
    const stats = {
        temperature: {
            current: temperatures[temperatures.length - 1].toFixed(1),
            min: Math.min(...temperatures).toFixed(1),
            max: Math.max(...temperatures).toFixed(1),
            avg: (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1)
        },
        humidity: {
            current: humidities[humidities.length - 1].toFixed(1),
            min: Math.min(...humidities).toFixed(1),
            max: Math.max(...humidities).toFixed(1),
            avg: (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1)
        }
    };
    
    return stats;
}

const render = {
    deviceCards: async (page = 1, search = '') => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            const apiUrl = `/devices?page=${page}${search ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
            const response = await apiRequest(apiUrl);
            
            let devices = [];
            if (response) {
                if (Array.isArray(response.data)) {
                    devices = response.data;
                } else if (response.data && Array.isArray(response.data.data)) {
                    devices = response.data.data;
                } else if (Array.isArray(response)) {
                    devices = response;
                }
            }
            
            // Ordenar dispositivos alfabeticamente por nome
            devices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            
            let headerHtml = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 class="text-xl font-bold text-white">Seus Dispositivos</h3>
                    <div class="w-full sm:w-auto">
                        <form id="search-form" class="max-w-2xl mx-auto">
                            <label for="search-input" class="sr-only">Pesquisar</label>
                            <div class="relative">
                                <input type="search" id="search-input" value="${search}" class="block w-full p-3 pe-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Pesquisar dispositivos...">
                                <button type="submit" class="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-blue-500">
                                    <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            let contentHtml = '';
            
            if (!devices || devices.length === 0) {
                contentHtml = `
                    <div class="text-center py-8">
                        <p class="text-slate-400">Nenhum dispositivo encontrado${search ? ` com o nome "${search}"` : ''}</p>
                    </div>
                `;
            } else {
                contentHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`;
                devices.forEach(device => {
                    // Calcular média das últimas 10 coletas
                    const lastReadings = device.readings?.slice(-10) || [];
                    
                    // Verificar se há leituras válidas
                    const validReadings = lastReadings.filter(r => 
                        r && typeof r.temperature === 'number' && !isNaN(r.temperature)
                    );
                    
                    // Verificar se os dados estão chegando como string e converter se necessário
                    const processedReadings = lastReadings.map(r => {
                        if (r && r.temperature !== undefined && r.temperature !== null) {
                            const temp = typeof r.temperature === 'string' ? parseFloat(r.temperature) : r.temperature;
                            return { ...r, temperature: temp };
                        }
                        return r;
                    }).filter(r => r && typeof r.temperature === 'number' && !isNaN(r.temperature));
                    
                    const avgTemp = processedReadings.length > 0 
                        ? (processedReadings.reduce((sum, r) => sum + r.temperature, 0) / processedReadings.length).toFixed(1)
                        : 'N/A';

                    // Verificar última leitura
                    let lastTemp = 'N/A';
                    if (device.lastReading && device.lastReading.temperature !== undefined && device.lastReading.temperature !== null) {
                        const temp = typeof device.lastReading.temperature === 'string' 
                            ? parseFloat(device.lastReading.temperature) 
                            : device.lastReading.temperature;
                        if (typeof temp === 'number' && !isNaN(temp)) {
                            lastTemp = temp.toFixed(1);
                        }
                    }

                    // Se não houver dados, mostrar mensagem amigável
                    const avgTempMsg = processedReadings.length > 0 ? `${avgTemp}°C` : 'Sem dados recentes';
                    const lastTempMsg = lastTemp !== 'N/A' ? `${lastTemp}°C` : 'Sem dados recentes';

                    contentHtml += `
                        <div class="device-card bg-slate-700 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative" data-deviceid="${device._id}" data-devicename="${device.name}">
                            <!-- Status Indicator -->
                            <div class="absolute top-3 right-3">
                                <div class="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded-full">
                                    <div class="w-2 h-2 rounded-full ${device.isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}" title="${device.lastSeen ? `Visto pela última vez em ${new Date(device.lastSeen).toLocaleString('pt-BR')}` : 'Nunca visto'}"></div>
                                    <span class="text-xs text-slate-300 font-medium">${device.isOnline ? 'Online' : 'Offline'}</span>
                                </div>
                            </div>
                            
                            <h4 class="text-lg font-semibold text-white mb-2 pr-20">${device.name}</h4>
                            <div class="space-y-2">
                                <p class="text-slate-300">Média da temperatura: ${avgTempMsg}</p>
                                <p class="text-slate-300">Última temperatura: ${lastTempMsg}</p>
                                ${device.lastSeen ? `<p class="text-xs text-slate-400">Última comunicação: ${new Date(device.lastSeen).toLocaleString('pt-BR')}</p>` : ''}
                            </div>
                        </div>
                    `;
                });
                contentHtml += `</div>`;
            }
            
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${contentHtml}</div>`;
            
            if (response.pagination) {
            render.pagination(mainContentView.querySelector('.rounded-lg'), response, (newPage) => render.deviceCards(newPage, search));
            }
        } catch (error) {
            console.error('[deviceCards] Erro:', error);
            if (error.response && error.response.status === 429) {
                toast.error('Muitas requisições! Aguarde alguns segundos e tente novamente.');
            }
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`;
        }
    },
    
    deviceDetail: async (deviceId, deviceName) => {
        try {
            // Busca inicial (últimas 24 leituras)
            let readings = await apiRequest(`/devices/${deviceId}/readings?limit=24`);
        switchView('detail');
        
            const detail = document.getElementById('device-detail-view');
            detail.innerHTML = `
                <button id="back-to-list-button" class="mb-4 rounded-lg bg-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-700">
                    &larr; Voltar
                </button>
                <div class="rounded-lg bg-slate-800 p-6 shadow-xl">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-xl font-bold text-white">${deviceName}</h3>
                        <div class="flex items-center gap-2 bg-slate-700/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                            <div class="w-3 h-3 rounded-full bg-gray-400" id="device-status-dot"></div>
                            <span class="text-sm text-slate-300 font-medium" id="device-status-text">Verificando...</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 mb-4 items-end">
                        <label class="flex flex-col">
                            <span class="text-sm text-slate-300 mb-1">De:</span>
                            <input type="datetime-local" id="start-date" class="rounded p-1 bg-gray-700 text-white text-opacity-50 placeholder:text-slate-400 placeholder-opacity-40 border border-gray-600 focus:ring-blue-500 focus:border-blue-500" />
                        </label>
                        <label class="flex flex-col">
                            <span class="text-sm text-slate-300 mb-1">Até:</span>
                            <input type="datetime-local" id="end-date" class="rounded p-1 bg-gray-700 text-white text-opacity-50 placeholder:text-slate-400 placeholder-opacity-40 border border-gray-600 focus:ring-blue-500 focus:border-blue-500" />
                        </label>
                        <button id="search-history" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                            Buscar
                        </button>
                        <div class="flex items-center gap-2 ml-4">
                            <span class="text-sm text-slate-300">Detalhe:</span>
                            <select id="detail-level" class="rounded p-1 bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500">
                                <option value="auto">Automático</option>
                                <option value="high">Alto</option>
                                <option value="medium">Médio</option>
                                <option value="low">Baixo</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div class="lg:col-span-3">
                            <h4 class="text-lg font-semibold mb-2 text-slate-200">
                                <span id="chart-title">Últimas leituras</span>
                            </h4>
                            <div class="chart-container" style="position: relative; height: 320px; width: 100%; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px;">
                                <canvas id="temperature-chart"></canvas>
                            </div>
                        </div>
                        <div class="lg:col-span-1">
                            <h4 class="text-lg font-semibold mb-2 text-slate-200">Estatísticas</h4>
                            <div id="stats-content" class="space-y-2"></div>
                        </div>
                    </div>
                </div>
            `;
            // Evento de busca por período
            document.getElementById('search-history').addEventListener('click', async () => {
                const start = document.getElementById('start-date').value;
                const end = document.getElementById('end-date').value;
                if (!start || !end) {
                    alert('Selecione o período!');
                    return;
                }
                const startDate = new Date(start).toISOString();
                const endDate = new Date(end).toISOString();
                try {
                    readings = await apiRequest(`/devices/${deviceId}/readings?startDate=${startDate}&endDate=${endDate}`);
                    atualizarGraficoEStats();
                } catch (err) {
                    alert('Erro ao buscar histórico: ' + err.message);
                }
            });
            // Evento de mudança no nível de detalhe
            document.getElementById('detail-level').addEventListener('change', () => {
                atualizarGraficoEStats();
            });
            // Função para atualizar gráfico e estatísticas
            function atualizarGraficoEStats() {
                requestAnimationFrame(() => {
                    const chartCanvas = document.getElementById('temperature-chart');
                    const dataCountElement = document.getElementById('data-count');
                    const chartTitleElement = document.getElementById('chart-title');
                    
                    if (dataCountElement) {
                        dataCountElement.textContent = readings.length;
                    }
                    
                    if (chartCanvas) {
                        // Passar o nível de detalhe selecionado
                        const detailLevel = document.getElementById('detail-level')?.value || 'auto';
                        renderChart(chartCanvas, readings, detailLevel);
                    }
                    
            const statsContent = document.getElementById('stats-content');
                    if (statsContent) {
                        const temps = readings.map(r => r.temperature);
                        const max = Math.max(...temps).toFixed(2);
                        const min = Math.min(...temps).toFixed(2);
                        const avg = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2);
                        
                        // Atualizar título do gráfico baseado na quantidade de dados
                        if (readings.length <= 50) {
                            chartTitleElement.textContent = `Últimas leituras`;
                        } else if (readings.length <= 200) {
                            chartTitleElement.textContent = `Amostragem`;
                        } else if (readings.length <= 1000) {
                            chartTitleElement.textContent = `Agregação por hora`;
                        } else {
                            chartTitleElement.textContent = `Agregação por dia`;
                        }
                        
                        statsContent.innerHTML = `
                            <div class="p-3 bg-red-900/50 rounded-lg text-red-300">
                                <strong>Máxima:</strong> ${max}°C
                            </div>
                            <div class="p-3 bg-blue-900/50 rounded-lg text-blue-300">
                                <strong>Mínima:</strong> ${min}°C
                            </div>
                            <div class="p-3 bg-green-900/50 rounded-lg text-green-300">
                                <strong>Média:</strong> ${avg}°C
                            </div>
                        `;
                    }
                });
            }
            // Botão voltar
            const backButton = document.getElementById('back-to-list-button');
            if (backButton) {
                backButton.addEventListener('click', async () => {
                    // Parar o polling da view de detalhes
                    stopDeviceDetailPolling();
                    switchView('list');
                    await render.deviceCards();
                });
            }
            // Primeira renderização
            atualizarGraficoEStats();
            
            // Atualizar status do dispositivo e iniciar polling
            updateDeviceDetailStatus(deviceId);
            startDeviceDetailPolling(deviceId);
        } catch (error) {
            console.error('Erro ao carregar detalhes do dispositivo:', error);
        }
    },
    
    deviceManagement: async (page = 1, search = '') => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            const response = await apiRequest(`/devices?page=${page}&search=${search}`);
            const devices = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
            const totalPages = response.data?.totalPages || 1;
            
            // Ordenar dispositivos alfabeticamente por nome
            devices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            
            let headerHtml = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Gestão de Dispositivos</h3>
                    <div class="flex items-center gap-2">
                        <form id="search-form" class="max-w-2xl mx-auto">
                            <label for="search-input" class="sr-only">Pesquisar</label>
                            <div class="relative">
                                <input type="search" id="search-input" value="${search}" class="block w-full p-3 pe-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Pesquisar por nome...">
                                <button type="submit" class="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-blue-500">
                                    <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                        <button id="create-device-button" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ml-2">Novo Dispositivo</button>
                    </div>
                </div>
            `;

            let contentHtml = '';
            if (!devices || devices.length === 0) {
                contentHtml = `
                    <div class="text-center py-8">
                        <p class="text-slate-400">Nenhum dispositivo encontrado${search ? ` com o nome "${search}"` : ''}</p>
                    </div>
                `;
            } else {
            let tableHtml = `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-slate-700"><th class="py-2">Nome</th><th>Temp. Mín</th><th>Temp. Máx</th><th>Ações</th></tr></thead><tbody>`;
                devices.forEach(d => {
                    tableHtml += `<tr class="border-b border-slate-700"><td class="py-2 pr-2">${d.name}</td><td>${d.settings.tempMin}°C</td><td>${d.settings.tempMax}°C</td><td class="whitespace-nowrap"><button class="edit-device-button text-blue-400 mr-2" data-deviceid="${d._id}">Editar</button><button class="delete-device-button text-red-400" data-deviceid="${d._id}">Apagar</button></td></tr>`;
                });
                tableHtml += `</tbody></table></div>`;
                contentHtml = tableHtml;
            }
            
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${contentHtml}</div>`;
            render.pagination(mainContentView.querySelector('.rounded-lg'), response, (newPage) => render.deviceManagement(newPage, search));
        } catch (error) { 
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`; 
        }
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
    
    userManagement: async (page = 1, search = '') => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            const apiUrl = `/users?page=${page}${search ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
            const response = await apiRequest(apiUrl);
            
            let users = [];
            if (response) {
                if (Array.isArray(response.data)) {
                    users = response.data;
                } else if (response.data && Array.isArray(response.data.data)) {
                    users = response.data.data;
                } else if (Array.isArray(response)) {
                    users = response;
                }
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                users = users.filter(user => 
                    user.name.toLowerCase().includes(searchLower) || 
                    user.email.toLowerCase().includes(searchLower)
                );
            }
            
            let headerHtml = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 class="text-xl font-bold text-white">Gestão de Usuários</h3>
                    <div class="flex gap-2">
                        <div class="w-full sm:w-auto">
                            <form id="search-form" class="max-w-2xl mx-auto">
                                <label for="search-input" class="sr-only">Pesquisar</label>
                            <div class="relative">
                                    <input type="search" id="search-input" value="${search}" class="block w-full p-3 pe-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Pesquisar usuários...">
                                    <button type="submit" class="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-blue-500">
                                        <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                    </button>
                            </div>
                        </form>
                        </div>
                        <button id="create-user-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Criar Usuário</button>
                    </div>
                </div>
            `;

            let contentHtml = '';
            
            if (!users || users.length === 0) {
                contentHtml = `
                    <div class="text-center py-8">
                        <p class="text-slate-400">Nenhum usuário encontrado${search ? ` com o nome "${search}"` : ''}</p>
                    </div>
                `;
            } else {
            let usersHtml = `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-slate-700"><th class="py-2">Nome</th><th class="py-2">Email</th><th>Role</th><th>Ações</th></tr></thead><tbody>`;
                users.forEach(u => {
                    usersHtml += `<tr class="border-b border-slate-700"><td class="py-2 pr-2">${u.name}</td><td class="py-2 pr-2">${u.email}</td><td>${u.role}</td><td class="whitespace-nowrap"><button class="edit-user-button text-blue-400 mr-2" data-userid="${u._id}">Editar</button><button class="delete-user-button text-red-400" data-userid="${u._id}">Apagar</button></td></tr>`;
                });
            usersHtml += `</tbody></table></div>`;
                contentHtml = usersHtml;
            }
            
            const finalHtml = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${contentHtml}</div>`;
            mainContentView.innerHTML = finalHtml;
            
            if (response.pagination) {
            render.pagination(mainContentView.querySelector('.rounded-lg'), response, (newPage) => render.userManagement(newPage, search));
            }
        } catch (error) { 
            console.error('[userManagement] Erro:', error);
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`; 
        }
    },
    
    userForm: async (userId = null) => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            let userData = null;
            if (userId) {
                const response = await apiRequest(`/users/${userId}`);
                userData = response.data || response;
            }
            
            const headerHtml = `
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">${userId ? 'Editar' : 'Criar'} Usuário</h3>
                    <button onclick="render.userManagement()" class="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700">&larr; Voltar</button>
                </div>
            `;
            
            const formHtml = `
                <form id="user-form" class="space-y-4">
                    <input type="hidden" id="userId" name="userId" value="${userId || ''}">
                    <div>
                        <label for="name" class="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                        <input type="text" id="name" name="name" value="${userData?.name || ''}" required class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input type="email" id="email" name="email" value="${userData?.email || ''}" required class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-slate-300 mb-2">${userId ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}</label>
                        <div class="relative">
                            <input type="password" id="password" name="password" ${userId ? '' : 'required'} class="w-full p-3 pr-10 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <button type="button" class="password-toggle absolute inset-y-0 right-0 pr-3 flex items-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label for="role" class="block text-sm font-medium text-slate-300 mb-1">Role</label>
                        <select id="role" name="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-slate-700 border-slate-600 text-white">
                            <option value="admin" ${userData && userData.role === 'admin' ? 'selected' : ''}>Administrador</option>
                            <option value="viewer" ${userData && (userData.role === 'user' || userData.role === 'viewer') ? 'selected' : ''}>Usuário</option>
                        </select>
                    </div>
                    <div>
                        <label for="userPhone" class="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                        <input type="tel" id="userPhone" name="userPhone" value="${userData?.phoneNumber || ''}" class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="userWhatsappKey" class="block text-sm font-medium text-slate-300 mb-2">Chave API (WhatsApp)</label>
                        <input type="text" id="userWhatsappKey" name="userWhatsappKey" value="${userData?.whatsappApiKey || ''}" class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div id="devices-section" class="hidden">
                        <label class="block text-sm font-medium text-slate-300 mb-2">Dispositivos Atribuídos</label>
                        <div id="device-checkboxes" class="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-700 rounded-lg border border-slate-600">
                            <p class="text-slate-400">A carregar dispositivos...</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">${userId ? 'Atualizar' : 'Criar'}</button>
                        <button type="button" onclick="render.userManagement()" class="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700">Cancelar</button>
                    </div>
                </form>
            `;
            
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${formHtml}</div>`;
            
            // Armazena o estado inicial do usuário no próprio formulário para comparação posterior
            const form = mainContentView.querySelector('#user-form');
            if (userData) {
                form.dataset.initialState = JSON.stringify(userData);
            }
            
            const roleSelect = document.getElementById('role');
            const devicesSection = document.getElementById('devices-section');

            const toggleDevicesSection = () => {
                const selectedRole = roleSelect.value;
                if (selectedRole === 'viewer' || selectedRole === 'user') {
                    devicesSection.classList.remove('hidden');
            } else {
                    devicesSection.classList.add('hidden');
                }
            };
            
            roleSelect.addEventListener('change', toggleDevicesSection);

            // Popular checkboxes de dispositivos
            await populateDeviceCheckboxes(userData?.devices || []);
            
            // Adicionar listener de toggle de senha
            addPasswordToggleListener('user-form');

            // Estado inicial da seção de dispositivos
            toggleDevicesSection();
            
            } catch (error) {
                console.error('[userForm] Erro ao carregar dados do usuário:', error);
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`;
        }
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
           <div class="relative"><label for="profilePassword" class="block text-sm font-medium text-slate-300">Nova Senha</label><input type="password" id="profilePassword" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600 pr-10" placeholder="Deixar em branco para não alterar"><button type="button" id="togglePassword" class="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-sm leading-5 text-slate-400"><svg class="h-5 w-5" id="eye-open" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><svg class="h-5 w-5 hidden" id="eye-closed" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.111 3.496-5.441 6.553-6.288m1.144-1.144A9.983 9.983 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.005 10.005 0 01-4.132 5.411m0 0L21 21" /></svg></button></div>
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
    },

    pagination: (container, response, onPageChange) => {
        if (!response.pagination) return;
        
        const { currentPage, totalPages } = response.pagination;
        if (totalPages <= 1) return;

        const paginationHtml = `
            <div class="mt-4 flex justify-center gap-2">
                <button 
                    class="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    ${currentPage === 1 ? 'disabled' : ''}
                    onclick="(${onPageChange.toString()})(${currentPage - 1})"
                >
                    Anterior
                </button>
                <span class="px-3 py-1 text-slate-300">
                    Página ${currentPage} de ${totalPages}
                </span>
                <button 
                    class="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    ${currentPage === totalPages ? 'disabled' : ''}
                    onclick="(${onPageChange.toString()})(${currentPage + 1})"
                >
                    Próxima
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', paginationHtml);
    },
    
    exportReportForm: async () => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            // Obter dados do usuário atual
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error('Usuário não autenticado');
            }
            
            // Buscar dispositivos baseado no role do usuário
            let devices = [];
            if (user.role === 'admin') {
                // Admin vê todos os dispositivos
                const response = await apiRequest('/devices');
                devices = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.data) ? response.data.data : []);
            } else {
                // Viewer vê apenas dispositivos vinculados
                const response = await apiRequest('/users/me');
                const userDevices = response.devices || [];
                if (userDevices.length > 0) {
                    const devicesResponse = await apiRequest('/devices');
                    const allDevices = Array.isArray(devicesResponse.data) ? devicesResponse.data : (devicesResponse.data && Array.isArray(devicesResponse.data.data) ? devicesResponse.data.data : []);
                    devices = allDevices.filter(device => userDevices.includes(device._id));
                }
            }
            
            // Ordenar dispositivos alfabeticamente por nome
            devices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            
            const headerHtml = `
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">Exportar Relatório</h3>
                    <button onclick="render.deviceCards()" class="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700">&larr; Voltar</button>
                </div>
            `;
            
            const formHtml = `
                <form id="export-report-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="export-start-date" class="block text-sm font-medium text-slate-300 mb-2">Data de Início</label>
                            <input type="datetime-local" id="export-start-date" required class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label for="export-end-date" class="block text-sm font-medium text-slate-300 mb-2">Data de Fim</label>
                            <input type="datetime-local" id="export-end-date" required class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-3">Dispositivos para Incluir no Relatório</label>
                        <div id="device-checkboxes-export" class="space-y-2 max-h-60 overflow-y-auto p-4 bg-slate-700 rounded-lg border border-slate-600">
                            ${devices.length === 0 ? '<p class="text-slate-400">Nenhum dispositivo disponível</p>' : ''}
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button type="submit" id="export-report-btn" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Exportar Relatório
                        </button>
                        <button type="button" onclick="render.deviceCards()" class="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700">Cancelar</button>
                    </div>
                </form>
            `;
            
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${formHtml}</div>`;
            
            // Popular checkboxes de dispositivos
            if (devices.length > 0) {
                const deviceCheckboxesContainer = document.getElementById('device-checkboxes-export');
                deviceCheckboxesContainer.innerHTML = '';
                
                devices.forEach(device => {
                    const deviceHtml = `
                        <label class="flex items-center space-x-3 cursor-pointer hover:bg-slate-600 p-2 rounded">
                            <input type="checkbox" name="devices" value="${device._id}" class="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500" checked>
                            <span class="text-slate-200">${device.name}</span>
                        </label>
                    `;
                    deviceCheckboxesContainer.insertAdjacentHTML('beforeend', deviceHtml);
                });
            }
            
            // Inicializar campos de data
            initializeExportDateFields();
            
        } catch (error) {
            console.error('[exportReportForm] Erro:', error);
            mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p class="text-red-400">Erro: ${error.message}</p></div>`;
        }
    }
};

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

// Após inserir o HTML dos inputs de data/hora, inicializar o flatpickr:
requestAnimationFrame(() => {
    if (window.flatpickr) {
        flatpickr("#start-date", { enableTime: true, dateFormat: "Y-m-d H:i" });
        flatpickr("#end-date", { enableTime: true, dateFormat: "Y-m-d H:i" });
    } else {
        console.error("flatpickr não está disponível no escopo global!");
    }
});

// --- Funções de Exportação de Relatório ---

/**
 * Inicializa os campos de data para exportação
 */
function initializeExportDateFields() {
    const startDateField = document.getElementById('export-start-date');
    const endDateField = document.getElementById('export-end-date');
    
    if (startDateField && endDateField) {
        // Definir data inicial como início do dia atual
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        startDateField.value = startOfDay.toISOString().slice(0, 16);
        
        // Definir data final como fim do dia atual
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59);
        endDateField.value = endOfDay.toISOString().slice(0, 16);
    }
}

/**
 * Exporta o relatório em PDF
 */
async function exportReportToPDF() {
    const startDateField = document.getElementById('export-start-date');
    const endDateField = document.getElementById('export-end-date');
    const exportButton = document.getElementById('export-report-btn');
    
    if (!startDateField || !endDateField || !exportButton) {
        toast.error('Elementos de exportação não encontrados');
        return;
    }
    
    // Verificar se há dispositivos selecionados
    const selectedDevices = Array.from(document.querySelectorAll('input[name="devices"]:checked')).map(cb => cb.value);
    if (selectedDevices.length === 0) {
        toast.error('Selecione pelo menos um dispositivo para incluir no relatório');
        return;
    }
    
    // Desabilitar botão durante o processo
    exportButton.disabled = true;
    exportButton.innerHTML = `
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Exportando...
    `;
    
    try {
        // Preparar dados para envio
        const payload = {
            devices: selectedDevices
        };
        
        if (startDateField.value) {
            payload.startDate = new Date(startDateField.value).toISOString();
        }
        
        if (endDateField.value) {
            payload.endDate = new Date(endDateField.value).toISOString();
        }
        
        // Fazer a chamada para a API
        const blob = await exportReport(payload);
        
        // Criar URL do blob
        const url = URL.createObjectURL(blob);
        
        // Criar link de download
        const link = document.createElement('a');
        link.href = url;
        
        // Tentar obter nome do arquivo do cabeçalho Content-Disposition
        const contentDisposition = blob.type === 'application/pdf' ? 'relatorio.pdf' : 'relatorio.pdf';
        link.download = contentDisposition;
        
        // Iniciar download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL do blob
        URL.revokeObjectURL(url);
        
        toast.success('Relatório exportado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        toast.error(`Erro ao exportar relatório: ${error.message}`);
    } finally {
        // Reabilitar botão
        exportButton.disabled = false;
        exportButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exportar Relatório
        `;
    }
}

// Expor funções globalmente
window.initializeExportDateFields = initializeExportDateFields;
window.exportReportToPDF = exportReportToPDF;
window.startDeviceDetailPolling = startDeviceDetailPolling;
window.stopDeviceDetailPolling = stopDeviceDetailPolling;

/**
 * Atualiza o status de um dispositivo específico na view de detalhes
 */
async function updateDeviceDetailStatus(deviceId) {
    try {
        // Usar o novo endpoint específico para status
        const response = await apiRequest(`/devices/${deviceId}/status`);
        const statusData = response.data || response;
        
        const statusDot = document.getElementById('device-status-dot');
        const statusText = document.getElementById('device-status-text');
        
        if (statusDot && statusText && statusData) {
            // Lógica de fallback: se não há isOnline, tentar determinar baseado em lastSeen
            let effectiveIsOnline = statusData.isOnline;
            if (effectiveIsOnline === undefined || effectiveIsOnline === null) {
                // Se há lastSeen nos últimos 10 minutos, considerar online
                const lastSeen = statusData.lastSeen ? new Date(statusData.lastSeen) : null;
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                
                effectiveIsOnline = lastSeen && lastSeen > tenMinutesAgo;
            }
            
            statusDot.className = `w-3 h-3 rounded-full ${effectiveIsOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`;
            statusText.textContent = effectiveIsOnline ? 'Online' : 'Offline';
            
            // Adicionar tooltip com lastSeen
            const lastSeenFormatted = statusData.lastSeen ? 
                new Date(statusData.lastSeen).toLocaleString('pt-BR') : 
                'Nunca';
            
            statusDot.title = `Visto pela última vez em ${lastSeenFormatted}`;
            statusText.title = `Visto pela última vez em ${lastSeenFormatted}`;
        }
    } catch (error) {
        console.error('Erro ao atualizar status do dispositivo:', error);
        const statusDot = document.getElementById('device-status-dot');
        const statusText = document.getElementById('device-status-text');
        
        if (statusDot && statusText) {
            statusDot.className = 'w-3 h-3 rounded-full bg-gray-400';
            statusText.textContent = 'Erro ao verificar';
        }
    }
}

/**
 * Atualiza o status dos dispositivos na interface
 */
async function updateDeviceStatus() {
    try {
        // Buscar status atualizado dos dispositivos
        const response = await apiRequest('/devices');
        let devices = [];
        
        if (response) {
            if (Array.isArray(response.data)) {
                devices = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                devices = response.data.data;
            } else if (Array.isArray(response)) {
                devices = response;
            }
        }
        
      
        
        // Atualizar cada card com o status real
        const deviceCards = document.querySelectorAll('.device-card');
        deviceCards.forEach(card => {
            const deviceId = card.dataset.deviceid;
            const device = devices.find(d => d._id === deviceId);
            
            if (device) {
                // Lógica de fallback: se não há isOnline mas há leituras recentes, considerar online
                let effectiveIsOnline = device.isOnline;
                if (effectiveIsOnline === undefined || effectiveIsOnline === null) {
                    // Se há leituras nos últimos 10 minutos, considerar online
                    const hasRecentReadings = device.readings && device.readings.length > 0;
                    const lastReading = device.readings && device.readings.length > 0 ? 
                        new Date(device.readings[device.readings.length - 1].timestamp) : null;
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                    
                    effectiveIsOnline = hasRecentReadings && lastReading && lastReading > tenMinutesAgo;
                }
                
                const statusIndicator = card.querySelector('.absolute');
                if (statusIndicator) {
                    const statusDot = statusIndicator.querySelector('.w-2');
                    const statusText = statusIndicator.querySelector('.text-xs');
                    const lastSeenText = card.querySelector('.text-xs.text-slate-400');
                    
                    if (statusDot && statusText) {
                        statusDot.className = `w-2 h-2 rounded-full ${effectiveIsOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`;
                        statusText.textContent = effectiveIsOnline ? 'Online' : 'Offline';
                        
                        // Adicionar tooltip com lastSeen
                        const lastSeenFormatted = device.lastSeen ? 
                            new Date(device.lastSeen).toLocaleString('pt-BR') : 
                            'Nunca';
                        
                        statusIndicator.title = `Visto pela última vez em ${lastSeenFormatted}`;
                    }
                    
                    // Atualizar última comunicação
                    if (lastSeenText && device.lastSeen) {
                        lastSeenText.textContent = `Última comunicação: ${new Date(device.lastSeen).toLocaleString('pt-BR')}`;
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar status dos dispositivos:', error);
    }
}

/**
 * Inicia a atualização automática do status dos dispositivos
 */
function startDeviceStatusUpdates() {
    // Atualizar a cada 30 segundos
    setInterval(updateDeviceStatus, 30000);
    
    // Primeira atualização após 5 segundos
    setTimeout(updateDeviceStatus, 5000);
}

/**
 * Inicia o polling específico para um dispositivo na view de detalhes
 */
function startDeviceDetailPolling(deviceId) {
    // Limpar qualquer polling anterior
    if (window.deviceDetailPollingInterval) {
        clearInterval(window.deviceDetailPollingInterval);
    }
    
    // Atualizar a cada 30 segundos
    window.deviceDetailPollingInterval = setInterval(() => {
        updateDeviceDetailStatus(deviceId);
    }, 30000);
    
    // Primeira atualização após 2 segundos
    setTimeout(() => {
        updateDeviceDetailStatus(deviceId);
    }, 2000);
}

/**
 * Para o polling da view de detalhes
 */
function stopDeviceDetailPolling() {
    if (window.deviceDetailPollingInterval) {
        clearInterval(window.deviceDetailPollingInterval);
        window.deviceDetailPollingInterval = null;
    }
}

// Iniciar atualizações quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    startDeviceStatusUpdates();
});
