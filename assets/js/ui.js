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

function renderStats(container, stats) {
    if (!stats || stats.maxTemp === null) {
        container.innerHTML = '<p class="text-slate-400">Nenhuma leitura disponível</p>';
        return;
    }

    const statsHtml = `
        <div class="space-y-4">
            <div class="bg-slate-700/50 rounded-lg p-4">
                <h5 class="text-sm font-medium text-slate-300 mb-2">Temperatura</h5>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <p class="text-xs text-slate-400">Máxima</p>
                        <p class="text-lg font-semibold text-white">${stats.maxTemp.toFixed(2)}°C</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Mínima</p>
                        <p class="text-lg font-semibold text-white">${stats.minTemp.toFixed(2)}°C</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Média</p>
                        <p class="text-lg font-semibold text-white">${stats.avgTemp.toFixed(2)}°C</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Atual</p>
                        <p class="text-lg font-semibold text-white">${stats.currentTemp ? stats.currentTemp.toFixed(2) : 'N/A'}°C</p>
                    </div>
                </div>
            </div>
            <div class="bg-slate-700/50 rounded-lg p-4">
                <h5 class="text-sm font-medium text-slate-300 mb-2">Humidade</h5>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <p class="text-xs text-slate-400">Máxima</p>
                        <p class="text-lg font-semibold text-white">${stats.maxHumidity ? stats.maxHumidity.toFixed(2) : 'N/A'}%</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Mínima</p>
                        <p class="text-lg font-semibold text-white">${stats.minHumidity ? stats.minHumidity.toFixed(2) : 'N/A'}%</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Média</p>
                        <p class="text-lg font-semibold text-white">${stats.avgHumidity ? stats.avgHumidity.toFixed(2) : 'N/A'}%</p>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Atual</p>
                        <p class="text-lg font-semibold text-white">${stats.currentHumidity ? stats.currentHumidity.toFixed(2) : 'N/A'}%</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = statsHtml;
}

async function populateDeviceCheckboxes(assignedDeviceIds = []) {
    const listContainer = document.getElementById('device-list-checkboxes');
    const assignmentContainer = document.getElementById('device-assignment-container');
    
    assignmentContainer.style.display = 'block';
    listContainer.innerHTML = 'A carregar...';
    
    try {
        const response = await apiRequest('/devices?limit=1000'); // Pede todos os dispositivos para o admin
        const devices = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
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
    } catch (e) { listContainer.innerHTML = `<p class="text-red-400">Erro ao carregar dispositivos.</p>`; }
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

// Função para calcular estatísticas das leituras
function calculateStats(readings) {
    console.log('[calculateStats] Iniciando cálculo de estatísticas...');
    
    // Filtrar leituras válidas
    const validReadings = readings.filter(r => 
        r.temperature !== null && 
        r.temperature !== undefined && 
        r.humidity !== null && 
        r.humidity !== undefined
    );
    
    console.log('[calculateStats] Leituras válidas:', validReadings.length);
    
    if (validReadings.length === 0) {
        console.warn('[calculateStats] Nenhuma leitura válida encontrada');
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
    
    console.log('[calculateStats] Estatísticas calculadas:', stats);
    return stats;
}

const render = {
    deviceCards: async (page = 1, search = '') => {
        switchView('list');
        const mainContentView = document.getElementById('main-content-view');
        mainContentView.innerHTML = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl"><p>A carregar...</p></div>`;
        
        try {
            const apiUrl = `/devices?page=${page}${search ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
            console.log('[deviceCards] URL da API:', apiUrl);
            const response = await apiRequest(apiUrl);
            console.log('[deviceCards] Resposta da API:', response);
            console.log('[deviceCards] Tipo da resposta:', typeof response);
            console.log('[deviceCards] Resposta é array?', Array.isArray(response));
            console.log('[deviceCards] Resposta tem propriedade data?', response && response.hasOwnProperty('data'));
            console.log('[deviceCards] Resposta.data é array?', response && response.data && Array.isArray(response.data));
            
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
            console.log('[deviceCards] Dispositivos extraídos:', devices);
            console.log('[deviceCards] Número de dispositivos:', devices.length);
            console.log('[deviceCards] Dispositivos é array?', Array.isArray(devices));
            
            // Teste detalhado da estrutura dos dados
            if (devices.length > 0) {
                console.log('[deviceCards] Estrutura do primeiro dispositivo:', JSON.stringify(devices[0], null, 2));
                console.log('[deviceCards] Propriedades do primeiro dispositivo:', Object.keys(devices[0]));
                
                if (devices[0].readings) {
                    console.log('[deviceCards] Estrutura das leituras:', JSON.stringify(devices[0].readings.slice(0, 2), null, 2));
                    console.log('[deviceCards] Primeira leitura:', devices[0].readings[0]);
                    console.log('[deviceCards] Tipo da temperatura na primeira leitura:', typeof devices[0].readings[0]?.temperature);
                }
                
                if (devices[0].lastReading) {
                    console.log('[deviceCards] Estrutura da última leitura:', JSON.stringify(devices[0].lastReading, null, 2));
                    console.log('[deviceCards] Tipo da temperatura na última leitura:', typeof devices[0].lastReading.temperature);
                }
                
                // Teste com dados simulados
                const testDevice = {
                    name: 'Teste',
                    readings: [
                        { temperature: 25.5, humidity: 60, timestamp: new Date().toISOString() },
                        { temperature: 26.0, humidity: 62, timestamp: new Date().toISOString() }
                    ],
                    lastReading: { temperature: 26.0, humidity: 62, timestamp: new Date().toISOString() }
                };
                
                const testLastReadings = testDevice.readings?.slice(-10) || [];
                const testValidReadings = testLastReadings.filter(r => 
                    r && typeof r.temperature === 'number' && !isNaN(r.temperature)
                );
                const testAvgTemp = testValidReadings.length > 0 
                    ? (testValidReadings.reduce((sum, r) => sum + r.temperature, 0) / testValidReadings.length).toFixed(1)
                    : 'N/A';
                const testLastTemp = testDevice.lastReading && typeof testDevice.lastReading.temperature === 'number' && !isNaN(testDevice.lastReading.temperature)
                    ? testDevice.lastReading.temperature.toFixed(1)
                    : 'N/A';
                
                console.log('[deviceCards] Teste com dados simulados:', {
                    testLastReadings,
                    testValidReadings,
                    testAvgTemp,
                    testLastTemp
                });
            }
            
            let headerHtml = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 class="text-xl font-bold text-white">Seus Dispositivos</h3>
                    <div class="w-full sm:w-auto">
                        <form id="search-form" class="max-w-md mx-auto">
                            <label for="search-input" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Pesquisar</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                </div>
                                <input type="search" id="search-input" value="${search}" class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Pesquisar por nome..." required />
                                <button type="submit" id="search-button" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Pesquisar</button>
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
                    console.log(`[deviceCards] Dispositivo ${device.name}:`, {
                        readings: device.readings,
                        lastReadings: lastReadings,
                        lastReading: device.lastReading,
                        hasReadings: !!device.readings,
                        readingsLength: device.readings?.length || 0,
                        lastReadingsLength: lastReadings.length
                    });
                    
                    // Verificar se há leituras válidas
                    const validReadings = lastReadings.filter(r => 
                        r && typeof r.temperature === 'number' && !isNaN(r.temperature)
                    );
                    
                    console.log(`[deviceCards] Leituras válidas para ${device.name}:`, validReadings);
                    
                    // Verificar se os dados estão chegando como string e converter se necessário
                    const processedReadings = lastReadings.map(r => {
                        if (r && r.temperature !== undefined && r.temperature !== null) {
                            const temp = typeof r.temperature === 'string' ? parseFloat(r.temperature) : r.temperature;
                            return { ...r, temperature: temp };
                        }
                        return r;
                    }).filter(r => r && typeof r.temperature === 'number' && !isNaN(r.temperature));
                    
                    console.log(`[deviceCards] Leituras processadas para ${device.name}:`, processedReadings);
                    
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
                        <div class="device-card bg-slate-700 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" data-deviceid="${device._id}" data-devicename="${device.name}">
                            <h4 class="text-lg font-semibold text-white mb-2">${device.name}</h4>
                            <div class="space-y-2">
                                <p class="text-slate-300">Média da temperatura: ${avgTempMsg}</p>
                                <p class="text-slate-300">Última temperatura: ${lastTempMsg}</p>
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
                    <h3 class="text-xl font-bold text-white mb-4">${deviceName}</h3>
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
                    switchView('list');
                    await render.deviceCards();
                });
            }
            // Primeira renderização
            atualizarGraficoEStats();
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
            
            let headerHtml = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Gestão de Dispositivos</h3>
                    <div class="flex items-center gap-2">
                        <form class="max-w-md mx-auto">
                            <label for="search-input" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Pesquisar</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                </div>
                                <input type="search" id="search-input" value="${search}" class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Pesquisar por nome..." required />
                                <button type="submit" id="search-button" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Pesquisar</button>
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
            console.log('[userManagement] Valor de pesquisa:', search);
            const apiUrl = `/users?page=${page}${search ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
            console.log('[userManagement] URL da API:', apiUrl);
            const response = await apiRequest(apiUrl);
            console.log('[userManagement] Resposta da API:', response);
            
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
            console.log('[userManagement] Usuários extraídos:', users);
            
            if (search) {
                const searchLower = search.toLowerCase();
                users = users.filter(user => 
                    user.name.toLowerCase().includes(searchLower) || 
                    user.email.toLowerCase().includes(searchLower)
                );
            }
            console.log('[userManagement] Usuários após filtragem:', users);
            
            let headerHtml = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Gestão de Usuários</h3>
                    <div class="flex items-center gap-2">
                        <form class="max-w-md mx-auto">
                            <label for="search-input" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Pesquisar</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                    </svg>
                                </div>
                                <input type="search" id="search-input" value="${search}" class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Pesquisar por nome..." required />
                                <button type="submit" id="search-button" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Pesquisar</button>
                            </div>
                        </form>
                        <button id="create-user-button" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ml-2">Novo Usuário</button>
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
                    console.log('[userManagement] Renderizando usuário:', u);
                    usersHtml += `<tr class="border-b border-slate-700"><td class="py-2 pr-2">${u.name}</td><td class="py-2 pr-2">${u.email}</td><td>${u.role}</td><td class="whitespace-nowrap"><button class="edit-user-button text-blue-400 mr-2" data-userid="${u._id}">Editar</button><button class="delete-user-button text-red-400" data-userid="${u._id}">Apagar</button></td></tr>`;
                });
            usersHtml += `</tbody></table></div>`;
                contentHtml = usersHtml;
            }
            
            const finalHtml = `<div class="rounded-lg bg-slate-800 p-6 shadow-xl">${headerHtml}${contentHtml}</div>`;
            console.log('[userManagement] HTML final:', finalHtml);
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
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        modalContainer.classList.remove('hidden');
        modalTitle.textContent = userId ? 'Editar Usuário' : 'Criar Novo Usuário';
        let formHtml = `<form id="user-form" class="space-y-4"><input type="hidden" id="userId" value="${userId || ''}"><div><label for="userName" class="block text-sm font-medium text-slate-300">Nome</label><input type="text" id="userName" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userEmail" class="block text-sm font-medium text-slate-300">Email</label><input type="email" id="userEmail" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userPassword" class="block text-sm font-medium text-slate-300">Senha${userId ? ' (deixe em branco para manter a atual)' : ''}</label><div class="relative"><input type="password" id="userPassword" ${userId ? '' : 'required'} class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"><button type="button" id="togglePassword" class="absolute inset-y-0 right-0 pr-3 flex items-center"><svg id="eye-open" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><svg id="eye-closed" class="h-5 w-5 text-slate-400 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg></button></div></div><div><label for="userRole" class="block text-sm font-medium text-slate-300">Papel</label><select id="userRole" required class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"><option value="admin">Administrador</option><option value="viewer">Visualizador</option></select></div><div><label for="userPhone" class="block text-sm font-medium text-slate-300">Número de Telefone</label><input type="tel" id="userPhone" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div><label for="userWhatsappKey" class="block text-sm font-medium text-slate-300">Chave da API do WhatsApp</label><input type="text" id="userWhatsappKey" class="mt-1 block w-full p-2 border rounded bg-slate-700 border-slate-600"></div><div id="device-assignment-container" class="hidden"><label class="block text-sm font-medium text-slate-300 mb-2">Dispositivos Vinculados</label><div id="device-list-checkboxes" class="space-y-2"></div></div><div class="flex justify-end space-x-2 pt-4"><button type="button" id="cancel-modal-button" class="bg-slate-500 text-white px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Salvar</button></div></form>`;
        modalBody.innerHTML = formHtml;
        addPasswordToggleListener('user-form');
        
        if (userId) {
            try {
                console.log('[userForm] Carregando dados do usuário:', userId);
                const response = await apiRequest(`/users/${userId}`, 'GET');
                console.log('[userForm] Resposta completa da API:', response);
                
                let userData;
                if (response && response.data) {
                    userData = response.data;
                } else if (response && typeof response === 'object') {
                    userData = response;
                }
                
                console.log('[userForm] Dados do usuário extraídos:', userData);
                
                if (userData) {
                    document.getElementById('userName').value = userData.name || '';
                    document.getElementById('userEmail').value = userData.email || '';
                    document.getElementById('userRole').value = userData.role || 'viewer';
                    document.getElementById('userPhone').value = userData.phoneNumber || '';
                    document.getElementById('userWhatsappKey').value = userData.whatsappApiKey || '';
                    
                    if (userData.role === 'viewer') {
                        await populateDeviceCheckboxes(userData.devices || []);
                    }
            } else {
                    console.error('[userForm] Dados do usuário não encontrados na resposta');
                    alert('Erro ao carregar dados do usuário: Dados não encontrados');
                }
            } catch (error) {
                console.error('[userForm] Erro ao carregar dados do usuário:', error);
                alert(`Erro ao carregar dados do usuário: ${error.message}`);
            }
        }
        
        document.getElementById('userRole').addEventListener('change', async (e) => {
            const deviceAssignmentContainer = document.getElementById('device-assignment-container');
            if (e.target.value === 'viewer') {
                await populateDeviceCheckboxes();
            } else {
                deviceAssignmentContainer.style.display = 'none';
            }
        });
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
    }
};

document.addEventListener('click', async (e) => {
    const deviceCard = e.target.closest('.device-card');
    if (deviceCard) {
        const deviceId = deviceCard.dataset.deviceid;
        const deviceName = deviceCard.dataset.devicename;
        if (deviceId) {
            console.log('[main.js] Card clicado:', { deviceId, deviceName });
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
