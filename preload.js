const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('ConfNet', {
    // Sistema de logging para o renderer
    log: (level, message, data, component) => ipcRenderer.invoke('renderer-log', { level, message, data, component }),
    

    
    // Função de teste PowerShell
    testPowerShell: () => ipcRenderer.invoke('test-powershell'),
    testMacSimple: () => ipcRenderer.invoke('test-mac-simple'),
    testPowerShellBasic: () => ipcRenderer.invoke('test-powershell-basic'),
    testPowerShellUltraSimple: () => ipcRenderer.invoke('test-powershell-ultra-simple'),
    
    // Funções de configuração de proxy
    configureProxy: (config) => ipcRenderer.invoke('configure-proxy', config),
    testConnection: () => ipcRenderer.invoke('test-connection'),
    clearProxy: () => ipcRenderer.invoke('clear-proxy'),
    
    // Funções para coletar dados reais do sistema
    getNetworkAdapters: () => ipcRenderer.invoke('get-network-adapters'),
    getCurrentProxySettings: () => ipcRenderer.invoke('get-current-proxy'),
    getLocalIPAddress: () => ipcRenderer.invoke('get-local-ip'),
    getGatewayInfo: () => ipcRenderer.invoke('get-gateway-info'),
    getDNSInfo: () => ipcRenderer.invoke('get-dns-info'),
    getMacAddresses: () => ipcRenderer.invoke('get-mac-addresses'),
    getNetworkDetails: () => ipcRenderer.invoke('get-network-details'),
    
    // Funções de teste de conectividade
    testPing: (host) => ipcRenderer.invoke('test-ping', host),
    testDNS: (host) => ipcRenderer.invoke('test-dns', host),
    testInternetConnection: () => ipcRenderer.invoke('test-internet'),
    testProxyConnection: () => ipcRenderer.invoke('test-proxy'),
    
    // Funções de gerenciamento
    clearProxySettings: () => ipcRenderer.invoke('clear-proxy-settings'),
    
    // Menu actions
    onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
    removeAllListeners: () => ipcRenderer.removeAllListeners('menu-action'),
    
    // ===== APIs DO BANCO DE DADOS =====
    
    // Verificar se o banco está pronto
    isDatabaseReady: () => ipcRenderer.invoke('db-is-ready'),
    
    // APIs para empresas
    getCompanies: () => ipcRenderer.invoke('db-get-companies'),
    createCompany: (companyData) => ipcRenderer.invoke('db-create-company', companyData),
    updateCompany: (id, companyData) => ipcRenderer.invoke('db-update-company', id, companyData),
    deleteCompany: (id) => ipcRenderer.invoke('db-delete-company', id),
    
    // APIs para filiais
    getBranches: (companyId) => ipcRenderer.invoke('db-get-branches', companyId),
    createBranch: (branchData) => ipcRenderer.invoke('db-create-branch', branchData),
    updateBranch: (id, branchData) => ipcRenderer.invoke('db-update-branch', id, branchData),
    deleteBranch: (id) => ipcRenderer.invoke('db-delete-branch', id),
    
    // APIs para configurações
    getSetting: (key) => ipcRenderer.invoke('db-get-setting', key),
    getAllSettings: () => ipcRenderer.invoke('db-get-all-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),
    
    // API para migração
    migrateFromLocalStorage: (localStorageData) => ipcRenderer.invoke('db-migrate-from-localstorage', localStorageData),
    
    // ===== APIs DE GERENCIAMENTO DE REDE =====
    
    // Aplicar configuração completa por tipo de conexão
    applyNetworkConfig: (config) => ipcRenderer.invoke('network-apply-config', config),
    
    // Configurações de proxy
    setManualProxy: (proxyIP, proxyPort) => ipcRenderer.invoke('network-set-manual-proxy', proxyIP, proxyPort),
    setAutoProxy: () => ipcRenderer.invoke('network-set-auto-proxy'),
    clearProxyConfig: () => ipcRenderer.invoke('network-clear-proxy'),
    
    // Gerenciamento de interfaces de rede
    getNetworkInterfaces: () => ipcRenderer.invoke('network-get-interfaces'),
    disableNetworkInterface: (interfaceName) => ipcRenderer.invoke('network-disable-interface', interfaceName),
    enableNetworkInterface: (interfaceName) => ipcRenderer.invoke('network-enable-interface', interfaceName),
    getInterfaceStatus: (interfaceName) => ipcRenderer.invoke('network-get-interface-status', interfaceName),
    
    // Reset de configurações
    resetNetworkConfig: () => ipcRenderer.invoke('network-reset-config')
});
