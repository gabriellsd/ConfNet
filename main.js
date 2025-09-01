const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const loggerConfig = require('./logger-config');
const Database = require('./database');
const NetworkManager = require('./network-manager');

// Sistema de logging robusto
class Logger {
    constructor() {
        this.config = loggerConfig;
        this.logDir = path.join(__dirname, this.config.logDir);
        this.ensureLogDirectory();
        this.logFile = path.join(this.logDir, `confnet-${new Date().toISOString().split('T')[0]}.log`);
        
        console.log('=== SISTEMA DE LOGGING INICIADO ===');
        console.log('Configuração:', this.config);
        console.log('Diretório de logs:', this.logDir);
        console.log('Arquivo de log:', this.logFile);
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(level, message, data = null) {
        // Verificar se o nível de log está habilitado
        if (this.config.levels[level] > this.config.currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        // Log no console (se habilitado)
        if (this.config.consoleLogging) {
            const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            if (data) {
                console.log(consoleMessage, data);
            } else {
                console.log(consoleMessage);
            }
        }

        // Log no arquivo (se habilitado)
        if (this.config.fileLogging) {
            try {
                const logLine = JSON.stringify(logEntry) + '\n';
                fs.appendFileSync(this.logFile, logLine);
            } catch (error) {
                console.error('Erro ao escrever no arquivo de log:', error);
            }
        }
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }
}

// Instância global do logger
const logger = new Logger();

// Instância global do banco de dados
let database = null;

// Instância global do gerenciador de rede
let networkManager = null;

// Manter referência global da janela
let mainWindow;

// Função para verificar se está rodando como administrador
async function checkAndEnsureAdminPrivileges() {
    return new Promise((resolve) => {
        const command = 'powershell -Command "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] \'Administrator\')"';
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao verificar privilégios:', error);
                resolve(false);
                return;
            }
            
            const isAdmin = stdout.trim().toLowerCase() === 'true';
            console.log(`Executando como administrador: ${isAdmin ? 'SIM' : 'NÃO'}`);
            
            if (!isAdmin) {
                console.log('⚠️  Aplicação não está rodando como administrador');
                console.log('🔄 Tentando reiniciar com privilégios administrativos...');
                
                // Reiniciar como administrador
                const electronPath = process.execPath;
                const appPath = __dirname;
                
                // Usar PowerShell para reiniciar como administrador
                const restartCommand = `Start-Process -FilePath "${electronPath}" -ArgumentList "${appPath}" -Verb RunAs`;
                
                exec(`powershell -Command "${restartCommand}"`, (restartError) => {
                    if (restartError) {
                        console.error('❌ Erro ao reiniciar como administrador:', restartError);
                        console.log('📝 Por favor, execute manualmente como administrador');
                        resolve(false);
                    } else {
                        console.log('✅ Reiniciando como administrador...');
                        // Fechar a instância atual
                        app.quit();
                        resolve(true);
                    }
                });
            } else {
                console.log('✅ Aplicação já está rodando como administrador');
                resolve(true);
            }
        });
    });
}

// Configurações da aplicação
const appConfig = {
    title: 'ConfNet - Configurador de Proxy',
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
    }
};

// Criar janela principal
function createWindow() {
    logger.info('Criando janela principal da aplicação');
    logger.debug('Configurações da janela:', appConfig);
    
    mainWindow = new BrowserWindow({
        ...appConfig,
        show: false, // Não mostrar até estar pronto
        frame: true, // Manter frame da janela
        autoHideMenuBar: true, // Esconder barra de menu
        webPreferences: {
            ...appConfig.webPreferences,
            devTools: process.env.NODE_ENV === 'development'
        }
    });
    
    logger.info('Janela principal criada com sucesso');
    
    // Sempre iniciar em modo restaurado (janela normal)
    // mainWindow.maximize(); // REMOVIDO - não maximizar automaticamente
    
    // Garantir que a janela esteja em modo restaurado
    mainWindow.on('show', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
    });

    // Carregar o arquivo HTML
    logger.info('Carregando arquivo HTML principal');
    mainWindow.loadFile('index.html');

    // Mostrar janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        logger.info('Janela pronta para exibição');
        mainWindow.show();
        
        // Focar na janela
        mainWindow.focus();
        logger.info('Janela focada e visível');
        
        // Abrir DevTools em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
            logger.info('Abrindo DevTools em modo desenvolvimento');
            mainWindow.webContents.openDevTools();
        }
    });

    // Eventos da janela
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // Permitir que o usuário maximize/restaure normalmente
    // mainWindow.on('restore', () => { ... }); // REMOVIDO - não forçar maximização

    // Prevenir navegação externa
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        event.preventDefault();
    });

    // Configurar permissões de segurança (compatível com versões mais antigas)
    try {
        if (mainWindow.webContents.setPermissionRequestHandler) {
            mainWindow.webContents.setPermissionRequestHandler((webContents, permission, callback) => {
                // Permitir apenas permissões necessárias
                if (permission === 'notifications') {
                    callback(true);
                } else {
                    callback(false);
                }
            });
        }
    } catch (error) {
        console.log('setPermissionRequestHandler não disponível nesta versão');
    }

    // Configurar handler para links externos
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
    });

    // NÃO criar menu da aplicação - interface mais limpa
    // createApplicationMenu();
    
    // Remover menu completamente
    mainWindow.setMenuBarVisibility(false);
}

// Criar menu da aplicação - DESABILITADO para interface mais limpa
/*
function createApplicationMenu() {
    const template = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Nova Configuração de Proxy',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-proxy-config');
                    }
                },
                {
                    label: 'Importar Configuração',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Arquivos JSON', extensions: ['json'] },
                                { name: 'Todos os Arquivos', extensions: ['*'] }
                            ]
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('file-opened', result.filePaths[0]);
                        }
                    }
                },
                {
                    label: 'Exportar Configuração',
                    accelerator: 'CmdOrCtrl+S',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'Arquivos JSON', extensions: ['json'] }
                            ],
                            defaultPath: 'configuracao-proxy.json'
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('export-config', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Navegação',
            submenu: [
                {
                    label: 'Início',
                    accelerator: 'Ctrl+1',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'inicio');
                    }
                },
                {
                    label: 'Configurar Proxy',
                    accelerator: 'Ctrl+2',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'configurar-proxy');
                    }
                },
                {
                    label: 'Configurações',
                    accelerator: 'Ctrl+3',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'configuracoes');
                    }
                },
                {
                    label: 'Sobre',
                    accelerator: 'Ctrl+4',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'sobre');
                    }
                }
            ]
        },
        {
            label: 'Proxy',
            submenu: [
                {
                    label: 'Testar Conexão',
                    accelerator: 'Ctrl+T',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'test-connection');
                    }
                },
                {
                    label: 'Limpar Proxy',
                    accelerator: 'Ctrl+L',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'clear-proxy');
                    }
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre ConfNet',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'sobre');
                    }
                },
                {
                    label: 'Documentação',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-docs');
                    }
                },
                {
                    label: 'Verificar Atualizações',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'check-updates');
                    }
                }
            ]
        }
    ];

    // Adicionar menu específico do Windows
    if (process.platform === 'win32') {
        template.unshift({
            label: 'ConfNet',
            submenu: [
                {
                    label: 'Sobre ConfNet',
                    click: () => {
                        mainWindow.webContents.send('navigate-to', 'sobre');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
*/

// Eventos da aplicação
logger.info('Iniciando aplicação ConfNet');
logger.info('Versão da aplicação:', app.getVersion());
logger.info('Plataforma:', process.platform);
logger.info('Versão do Node.js:', process.version);
logger.info('Versão do Electron:', process.versions.electron);

app.whenReady().then(async () => {
    logger.info('Aplicação pronta, verificando privilégios administrativos...');
    
    try {
        // Verificar e garantir privilégios administrativos
        const hasAdminPrivileges = await checkAndEnsureAdminPrivileges();
        
        // Se não conseguiu obter privilégios administrativos, a aplicação já foi reiniciada
        if (!hasAdminPrivileges) {
            return;
        }
        
        logger.info('Privilégios administrativos confirmados, inicializando banco de dados...');
        
        // Inicializar banco de dados
        database = new Database();
        await database.init();
        logger.info('Banco de dados inicializado com sucesso');
        
        // Inicializar gerenciador de rede
        networkManager = new NetworkManager();
        networkManager.setLogger(logger);
        logger.info('Gerenciador de rede inicializado com sucesso');
        
        // Verificar se há dados no localStorage para migrar
        const shouldMigrate = await checkForLocalStorageMigration();
        if (shouldMigrate) {
            logger.info('Dados do localStorage detectados, iniciando migração...');
            await migrateLocalStorageData();
        }
        
        logger.info('Criando janela principal');
        createWindow();
        
    } catch (error) {
        logger.error('Erro ao inicializar aplicação:', error);
        // Mesmo com erro no banco, tentar abrir a aplicação
        createWindow();
    }
});

app.on('window-all-closed', async () => {
    logger.info('Todas as janelas foram fechadas');
    
    // Fechar conexão com o banco de dados
    if (database) {
        try {
            await database.close();
            logger.info('Conexão com banco de dados fechada');
        } catch (error) {
            logger.error('Erro ao fechar banco de dados:', error);
        }
    }
    
    if (process.platform !== 'darwin') {
        logger.info('Saindo da aplicação (não é macOS)');
        app.quit();
    }
});

app.on('activate', () => {
    logger.info('Aplicação ativada');
    if (BrowserWindow.getAllWindows().length === 0) {
        logger.info('Nenhuma janela ativa, criando nova janela');
        createWindow();
    }
});

// Eventos IPC
logger.info('Configurando handlers IPC');

// Handler para receber logs do renderer (JavaScript)
ipcMain.handle('renderer-log', async (event, logData) => {
    const { level, message, data, component } = logData;
    
            if (component && logger.config.development[component]) {
            logger.debug(`[${component}] ${message}`, data);
        } else {
            logger[level] || logger.info(message, data);
        }
    
    return { success: true };
});



ipcMain.handle('get-app-version', () => {
    logger.debug('Handler get-app-version chamado');
    return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
    logger.debug('Handler get-app-name chamado');
    return app.getName();
});

ipcMain.handle('show-message', async (event, options) => {
    logger.debug('Handler show-message chamado', options);
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
});

// Configurar proxy no Windows
ipcMain.handle('configure-proxy', async (event, config) => {
    logger.info('Handler configure-proxy chamado', config);
    
    try {
        const { company, branch, proxy, connection } = config;
        logger.debug('Configuração recebida:', { company, branch, proxy, connection });
        
        // Comando PowerShell para configurar proxy
        const psCommand = `
            $proxyAddress = "${proxy}"
            $proxyParts = $proxyAddress.Split(':')
            $proxyHost = $proxyParts[0]
            $proxyPort = $proxyParts[1]
            
            # Configurar proxy para Ethernet
            netsh winhttp set proxy proxy-server="$proxyAddress"
            
            # Configurar proxy no registro do Windows
            $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
            Set-ItemProperty -Path $regPath -Name ProxyServer -Value $proxyAddress
            Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 1
            
            Write-Host "Proxy configurado com sucesso: $proxyAddress"
        `;
        
        logger.debug('Comando PowerShell gerado:', psCommand);
        
        // Executar comando PowerShell
        exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
            if (error) {
                logger.error('Erro ao configurar proxy via PowerShell:', error);
                return { success: false, error: error.message };
            }
            
            logger.info('Proxy configurado com sucesso via PowerShell:', stdout);
            return { success: true, message: stdout };
        });
        
        logger.info('Retornando sucesso para configuração de proxy');
        return { success: true, message: `Proxy configurado: ${proxy}` };
        
    } catch (error) {
        logger.error('Erro na configuração de proxy:', error);
        return { success: false, error: error.message };
    }
});

// Testar conexão
ipcMain.handle('test-connection', async (event) => {
    try {
        // Comando para testar conectividade
        exec('ping 8.8.8.8 -n 1', (error, stdout, stderr) => {
            if (error) {
                console.error('Erro no teste de conexão:', error);
                return { success: false, error: error.message };
            }
            
            console.log('Teste de conexão:', stdout);
            return { success: true, message: stdout };
        });
        
        return { success: true, message: 'Teste de conexão executado' };
        
    } catch (error) {
        console.error('Erro no teste de conexão:', error);
        return { success: false, error: error.message };
    }
});

// Limpar configuração de proxy
ipcMain.handle('clear-proxy', async (event) => {
    try {
        const psCommand = `
            # Limpar configurações de proxy
            netsh winhttp reset proxy
            
            # Limpar proxy no registro
            $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
            Set-ItemProperty -Path $regPath -Name ProxyServer -Value ""
            Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0
            
            Write-Host "Configurações de proxy limpas com sucesso"
        `;
        
        exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao limpar proxy:', error);
                return { success: false, error: error.message };
            }
            
            console.log('Proxy limpo:', stdout);
            return { success: true, message: stdout };
        });
        
        return { success: true, message: 'Configurações de proxy limpas' };
        
    } catch (error) {
        console.error('Erro ao limpar proxy:', error);
        return { success: false, error: error.message };
    }
});

// Handler de teste para verificar comandos PowerShell
ipcMain.handle('test-powershell', async () => {
    try {
        console.log('=== TESTE POWERSHELL INICIADO ===');
        
        // Teste 1: Comando básico
        const test1 = await executePowerShell('Write-Output "Teste básico funcionando"');
        console.log('Teste 1 (básico):', test1);
        
        // Teste 2: Comando simples do sistema
        const test2 = await executePowerShell('Get-ComputerInfo | Select-Object -Property WindowsProductName, WindowsVersion | ConvertTo-Json');
        console.log('Teste 2 (ComputerInfo):', test2);
        
        // Teste 3: Comando de rede simples
        const test3 = await executePowerShell('ipconfig | Select-String "IPv4" | Select-Object -First 2');
        console.log('Teste 3 (ipconfig):', test3);
        
        // Teste 4: Comando de adaptadores simples
        const test4 = await executePowerShell('Get-NetAdapter | Select-Object Name, Status, InterfaceDescription | ConvertTo-Json');
        console.log('Teste 4 (NetAdapter simples):', test4);
        
        // Teste 5: Comando de IP simples
        const test5 = await executePowerShell('Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias | ConvertTo-Json');
        console.log('Teste 5 (NetIP simples):', test5);
        
        console.log('=== TESTE POWERSHELL CONCLUÍDO ===');
        
        return {
            success: true,
            results: {
                basic: test1,
                computerInfo: test2,
                ipconfig: test3,
                netAdapter: test4,
                netIP: test5
            }
        };
        
    } catch (error) {
        console.error('Erro no teste PowerShell:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Handlers IPC para dados reais do sistema
ipcMain.handle('get-network-adapters', async () => {
    try {
        const script = `Get-NetAdapter | Select-Object Name, Status, MacAddress, LinkSpeed, InterfaceDescription | ConvertTo-Json -Compress`;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (adapters):', result);
        
        if (!result || result.trim() === '') {
            return [];
        }
        
        const adapters = JSON.parse(result);
        
        if (adapters.error) {
            throw new Error(adapters.error);
        }
        
        return Array.isArray(adapters) ? adapters : [adapters];
        
    } catch (error) {
        console.error('Erro ao obter adaptadores:', error);
        return [];
    }
});

ipcMain.handle('get-current-proxy', async () => {
    try {
        const script = `Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable,ProxyServer | Select-Object ProxyEnable,ProxyServer | ConvertTo-Json -Compress`;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (proxy):', result);
        
        if (!result || result.trim() === '') {
            console.log('PowerShell retornou stdout vazio para proxy');
            return { ProxyEnable: 0, ProxyServer: "" };
        }
        
        const proxyConfig = JSON.parse(result);
        console.log('Proxy config parsed:', proxyConfig);
        
        if (proxyConfig.error) {
            throw new Error(proxyConfig.error);
        }
        
        return proxyConfig;
        
    } catch (error) {
        console.error('Erro ao obter proxy:', error);
        return { ProxyEnable: 0, ProxyServer: "" };
    }
});

ipcMain.handle('get-local-ip', async () => {
    try {
        const script = `Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" | Where-Object { $_.IPAddress -notmatch "^169.254" -and $_.IPAddress -notmatch "^127.0.0.1" -and $_.IPAddress -notmatch "^0.0.0.0" -and $_.IPAddress -notmatch "^192.168.56" -and $_.IPAddress -notmatch "^172.19" } | Select-Object -First 1 -ExpandProperty IPAddress`;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (IP):', result);
        return result.trim();
        
    } catch (error) {
        console.error('Erro ao obter IP local:', error);
        return "";
    }
});

ipcMain.handle('get-gateway-info', async () => {
    try {
        const script = `
            try {
                $gateway = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop
                if ($gateway) { 
                    Write-Output $gateway 
                } else { 
                    Write-Output "" 
                }
            } catch {
                Write-Output ""
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (gateway):', result);
        return result.trim();
        
    } catch (error) {
        console.error('Erro ao obter gateway:', error);
        return "";
    }
});

ipcMain.handle('get-dns-info', async () => {
    try {
        const script = `
            try {
                $dns = Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
                       Where-Object { $_.ServerAddresses.Count -gt 0 } | 
                       Select-Object -First 1
                
                if ($dns) {
                    $result = @{
                        primary = $dns.ServerAddresses[0]
                        secondary = if ($dns.ServerAddresses.Count -gt 1) { $dns.ServerAddresses[1] } else { "" }
                    }
                } else {
                    $result = @{
                        primary = ""
                        secondary = ""
                    }
                }
                
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ primary = ""; secondary = "" }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (DNS):', result);
        
        if (!result || result.trim() === '') {
            return { primary: "", secondary: "" };
        }
        
        const dnsInfo = JSON.parse(result);
        return dnsInfo;
        
    } catch (error) {
        console.error('Erro ao obter DNS:', error);
        return { primary: "", secondary: "" };
    }
});

ipcMain.handle('test-ping', async (event, host) => {
    try {
        const script = `
            try {
                $ping = Test-NetConnection -ComputerName "${host}" -InformationLevel Quiet -ErrorAction SilentlyContinue
                $result = @{ success = $ping }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ success = $false }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (ping):', result);
        
        if (!result || result.trim() === '') {
            return { success: false };
        }
        
        const pingResult = JSON.parse(result);
        return pingResult;
        
    } catch (error) {
        console.error('Erro no teste de ping:', error);
        return { success: false };
    }
});

ipcMain.handle('test-dns', async (event, host) => {
    try {
        const script = `
            try {
                $dns = Resolve-DnsName -Name "${host}" -ErrorAction SilentlyContinue
                $result = @{ success = $true }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ success = $false }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (DNS test):', result);
        
        if (!result || result.trim() === '') {
            return { success: false };
        }
        
        const dnsResult = JSON.parse(result);
        return dnsResult;
        
    } catch (error) {
        console.error('Erro no teste de DNS:', error);
        return { success: false };
    }
});

ipcMain.handle('test-internet', async () => {
    try {
        const script = `
            try {
                $webClient = New-Object System.Net.WebClient
                $webClient.Timeout = 5000
                $response = $webClient.DownloadString("http://www.google.com")
                $result = @{ success = $true }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ success = $false }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (internet):', result);
        
        if (!result || result.trim() === '') {
            return { success: false };
        }
        
        const internetResult = JSON.parse(result);
        return internetResult;
        
    } catch (error) {
        console.error('Erro no teste de internet:', error);
        return { success: false };
    }
});

ipcMain.handle('test-proxy', async () => {
    try {
        const script = `
            try {
                $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
                $proxyEnable = Get-ItemProperty -Path $regPath -Name "ProxyEnable" -ErrorAction SilentlyContinue
                
                if ($proxyEnable -and $proxyEnable.ProxyEnable -eq 1) {
                    $result = @{ success = $true }
                } else {
                    $result = @{ success = $false }
                }
                
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ success = $false }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (proxy test):', result);
        
        if (!result || result.trim() === '') {
            return { success: false };
        }
        
        const proxyResult = JSON.parse(result);
        return proxyResult;
        
    } catch (error) {
        console.error('Erro no teste de proxy:', error);
        return { success: false };
    }
});

ipcMain.handle('clear-proxy-settings', async () => {
    try {
        const script = `
            try {
                $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
                Set-ItemProperty -Path $regPath -Name "ProxyEnable" -Value 0
                Set-ItemProperty -Path $regPath -Name "ProxyServer" -Value ""
                Set-ItemProperty -Path $regPath -Name "ProxyBypass" -Value ""
                
                # Limpar WinHTTP também
                netsh winhttp reset proxy
                
                $result = @{ success = $true; error = $null }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            } catch {
                $result = @{ success = $false; error = $_.Exception.Message }
                $json = $result | ConvertTo-Json -Compress
                Write-Output $json
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (clear proxy):', result);
        
        if (!result || result.trim() === '') {
            return { success: false, error: "Comando PowerShell não retornou resultado" };
        }
        
        const clearResult = JSON.parse(result);
        return clearResult;
        
    } catch (error) {
        console.error('Erro ao limpar proxy:', error);
        return { success: false, error: error.message };
    }
});

// Função auxiliar para executar PowerShell
async function executePowerShell(script) {
    return new Promise((resolve, reject) => {
        // Usar aspas simples para evitar problemas de escape
        const command = `powershell -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`;
        
        console.log('Executando PowerShell:', command);
        
        exec(command, { 
            encoding: 'utf8',
            timeout: 30000,
            maxBuffer: 1024 * 1024,
            windowsHide: true
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('PowerShell error:', error);
                reject(error);
                return;
            }
            
            if (stderr) {
                console.log('PowerShell stderr:', stderr);
            }
            
            console.log('PowerShell stdout (raw):', stdout);
            console.log('PowerShell stdout (length):', stdout ? stdout.length : 0);
            
            // Verificar se stdout está vazio
            if (!stdout || stdout.trim() === '') {
                console.log('PowerShell stdout está vazio!');
                resolve('');
                return;
            }
            
            resolve(stdout.trim());
        });
    });
}

// Obter MAC addresses dos adaptadores de rede
ipcMain.handle('get-mac-addresses', async () => {
    try {
        // Comando simplificado - uma linha por vez
        const script = `Get-NetAdapter | Select-Object Name, Status, MacAddress | ConvertTo-Json -Compress`;
        
        const result = await executePowerShell(script);
        console.log('PowerShell result (MAC addresses):', result);
        
        if (!result || result.trim() === '') {
            return [];
        }
        
        const macAddresses = JSON.parse(result);
        
        if (macAddresses.error) {
            throw new Error(macAddresses.error);
        }
        
        return Array.isArray(macAddresses) ? macAddresses : [macAddresses];
        
    } catch (error) {
        console.error('Erro ao obter MAC addresses:', error);
        return [];
    }
});

// Função de teste para MAC addresses
ipcMain.handle('test-mac-simple', async () => {
    try {
        const script = `
            try {
                Write-Output "=== TESTE SIMPLES DE MAC ==="
                
                # Teste 1: Listar todos os adaptadores
                Write-Output "--- Todos os adaptadores ---"
                Get-NetAdapter | Select-Object Name, Status, MacAddress | ConvertTo-Json -Compress
                
            } catch {
                $errorResult = @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
                Write-Output $errorResult
            }
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell test result (MAC simple):', result);
        
        if (!result || result.trim() === '') {
            return { error: 'Nenhum resultado do PowerShell' };
        }
        
        return { result: result };
        
    } catch (error) {
        console.error('Erro no teste MAC:', error);
        return { error: error.message };
    }
});

// Função de teste ultra-simples para diagnosticar PowerShell
ipcMain.handle('test-powershell-ultra-simple', async () => {
    try {
        // Comando ultra-simples
        const script = `Write-Output "HELLO WORLD"`;
        
        const result = await executePowerShell(script);
        console.log('PowerShell test result (ultra-simple):', result);
        
        return { 
            success: true, 
            result: result,
            resultLength: result ? result.length : 0,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Erro no teste ultra-simples:', error);
        return { 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});

// Função de teste para MAC addresses
ipcMain.handle('test-powershell-basic', async () => {
    try {
        const script = `
            Write-Output "TESTE BÁSICO FUNCIONANDO"
            Get-Date | ConvertTo-Json -Compress
        `;
        
        const result = await executePowerShell(script);
        console.log('PowerShell test result (basic):', result);
        
        return { 
            success: true, 
            result: result,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Erro no teste básico:', error);
        return { 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});

// Obter informações detalhadas da interface de rede
ipcMain.handle('get-network-details', async () => {
    try {
        // Comando para verificar se a interface está configurada para DHCP
        const dhcpScript = `Get-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv4 | Select-Object Dhcp | ConvertTo-Json -Compress`;
        
        const dhcpResult = await executePowerShell(dhcpScript);
        console.log('PowerShell result (DHCP check):', dhcpResult);
        
        if (!dhcpResult || dhcpResult.trim() === '') {
            console.log('PowerShell retornou stdout vazio para DHCP check');
            return { error: 'Nenhum resultado do PowerShell' };
        }
        
        const dhcpInfo = JSON.parse(dhcpResult);
        const isDHCP = dhcpInfo.Dhcp === 1;
        
        // Obter informações básicas do adaptador
        const adapterScript = `Get-NetAdapter -Name "Ethernet" | Select-Object Name,Status,MacAddress,LinkSpeed | ConvertTo-Json -Compress`;
        const adapterResult = await executePowerShell(adapterScript);
        const adapterInfo = JSON.parse(adapterResult);
        
        // Obter IP atual da interface
        const ipScript = `Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^169.254" -and $_.IPAddress -notmatch "^127.0.0.1" } | Select-Object -First 1 -ExpandProperty IPAddress`;
        const ipResult = await executePowerShell(ipScript);
        const currentIP = ipResult.trim();
        
        // Obter gateway
        const gatewayScript = `Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Where-Object { $_.InterfaceAlias -eq "Ethernet" } | Select-Object -First 1 -ExpandProperty NextHop`;
        const gatewayResult = await executePowerShell(gatewayScript);
        const gateway = gatewayResult.trim();
        
        // Obter DNS configurado
        const dnsScript = `Get-DnsClientServerAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses | ConvertTo-Json -Compress`;
        const dnsResult = await executePowerShell(dnsScript);
        let dnsServers = [];
        
        try {
            if (dnsResult && dnsResult.trim() !== '') {
                dnsServers = JSON.parse(dnsResult);
                // Se for string única, converter para array
                if (typeof dnsServers === 'string') {
                    dnsServers = [dnsServers];
                }
            }
        } catch (dnsError) {
            console.log('Erro ao parsear DNS:', dnsError);
            dnsServers = [];
        }
        
        // Combinar as informações
        const combinedResult = {
            InterfaceName: adapterInfo.Name,
            Status: adapterInfo.Status,
            MacAddress: adapterInfo.MacAddress,
            LinkSpeed: adapterInfo.LinkSpeed,
            IPv4Address: currentIP,
            Gateway: gateway,
            DHCPEnabled: isDHCP,
            DNSServers: dnsServers
        };
        
        console.log('Resultado combinado:', combinedResult);
        return combinedResult;
        
    } catch (error) {
        console.error('Erro ao obter detalhes da rede:', error);
        return { error: error.message };
    }
});

// Prevenir múltiplas instâncias
logger.info('Verificando instância única da aplicação');
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    logger.warn('Segunda instância detectada, saindo da aplicação');
    app.quit();
} else {
    logger.info('Instância única confirmada');
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        logger.info('Segunda instância tentou abrir, focando janela existente');
        // Alguém tentou executar uma segunda instância, devemos focar nossa janela
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Configurações de segurança
app.on('web-contents-created', (event, contents) => {
    logger.debug('Novo conteúdo web criado');
    contents.on('new-window', (event, navigationUrl) => {
        logger.warn('Tentativa de abrir nova janela bloqueada:', navigationUrl);
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Handlers para erros não tratados
process.on('uncaughtException', (error) => {
    logger.error('Erro não tratado (uncaughtException):', error);
    logger.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rejeitada não tratada:', reason);
    logger.error('Promise:', promise);
});

// ===== FUNÇÕES DE MIGRAÇÃO =====

// Verificar se há dados do localStorage para migrar
async function checkForLocalStorageMigration() {
    // Esta função será chamada pelo renderer para verificar se há dados para migrar
    return false; // Por enquanto, a migração será manual
}

// Migrar dados do localStorage
async function migrateLocalStorageData() {
    // Esta função será implementada quando necessário
    logger.info('Função de migração chamada, mas não implementada ainda');
}

// ===== HANDLERS IPC PARA BANCO DE DADOS =====

// Handlers para empresas
ipcMain.handle('db-get-companies', async () => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.getCompanies();
    } catch (error) {
        logger.error('Erro ao buscar empresas:', error);
        throw error;
    }
});

ipcMain.handle('db-create-company', async (event, companyData) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.createCompany(companyData);
    } catch (error) {
        logger.error('Erro ao criar empresa:', error);
        throw error;
    }
});

ipcMain.handle('db-update-company', async (event, id, companyData) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.updateCompany(id, companyData);
    } catch (error) {
        logger.error('Erro ao atualizar empresa:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-company', async (event, id) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.deleteCompany(id);
    } catch (error) {
        logger.error('Erro ao excluir empresa:', error);
        throw error;
    }
});

// Handlers para filiais
ipcMain.handle('db-get-branches', async (event, companyId) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.getBranchesByCompany(companyId);
    } catch (error) {
        logger.error('Erro ao buscar filiais:', error);
        throw error;
    }
});

ipcMain.handle('db-create-branch', async (event, branchData) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.createBranch(branchData);
    } catch (error) {
        logger.error('Erro ao criar filial:', error);
        throw error;
    }
});

ipcMain.handle('db-update-branch', async (event, id, branchData) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.updateBranch(id, branchData);
    } catch (error) {
        logger.error('Erro ao atualizar filial:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-branch', async (event, id) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.deleteBranch(id);
    } catch (error) {
        logger.error('Erro ao excluir filial:', error);
        throw error;
    }
});

// Handlers para configurações
ipcMain.handle('db-get-setting', async (event, key) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.getSetting(key);
    } catch (error) {
        logger.error('Erro ao buscar configuração:', error);
        throw error;
    }
});

ipcMain.handle('db-get-all-settings', async () => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.getAllSettings();
    } catch (error) {
        logger.error('Erro ao buscar configurações:', error);
        throw error;
    }
});

ipcMain.handle('db-set-setting', async (event, key, value) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        return await database.setSetting(key, value);
    } catch (error) {
        logger.error('Erro ao salvar configuração:', error);
        throw error;
    }
});

// Handler para migração manual do localStorage
ipcMain.handle('db-migrate-from-localstorage', async (event, localStorageData) => {
    try {
        if (!database) throw new Error('Banco de dados não inicializado');
        logger.info('Iniciando migração manual do localStorage...');
        return await database.migrateFromLocalStorage(localStorageData);
    } catch (error) {
        logger.error('Erro na migração:', error);
        throw error;
    }
});

// Handler para verificar se o banco está inicializado
ipcMain.handle('db-is-ready', async () => {
    return database !== null;
});

// ===== HANDLERS IPC PARA GERENCIAMENTO DE REDE =====

// Handler para aplicar configuração completa por tipo de conexão
ipcMain.handle('network-apply-config', async (event, config) => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        
        logger.info('Aplicando configuração de rede:', config);
        
        let result;
        
        if (config.connectionType === 'ethernet') {
            // Configurar para cabo com proxy manual
            result = await networkManager.configureForEthernet(config.proxyIP, config.proxyPort);
        } else if (config.connectionType === 'wifi') {
            // Configurar para Wi-Fi com detecção automática
            result = await networkManager.configureForWifi();
        } else {
            throw new Error('Tipo de conexão inválido');
        }
        
        logger.info('Configuração de rede aplicada:', result);
        return result;
        
    } catch (error) {
        logger.error('Erro ao aplicar configuração de rede:', error);
        throw error;
    }
});

// Handler para configurar proxy manual
ipcMain.handle('network-set-manual-proxy', async (event, proxyIP, proxyPort) => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.setManualProxy(proxyIP, proxyPort);
    } catch (error) {
        logger.error('Erro ao configurar proxy manual:', error);
        throw error;
    }
});

// Handler para configurar proxy automático
ipcMain.handle('network-set-auto-proxy', async () => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.setAutoProxy();
    } catch (error) {
        logger.error('Erro ao configurar proxy automático:', error);
        throw error;
    }
});

// Handler para limpar configurações de proxy
ipcMain.handle('network-clear-proxy', async () => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.clearProxy();
    } catch (error) {
        logger.error('Erro ao limpar proxy:', error);
        throw error;
    }
});

// Handler para listar interfaces de rede
ipcMain.handle('network-get-interfaces', async () => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.getNetworkInterfaces();
    } catch (error) {
        logger.error('Erro ao listar interfaces:', error);
        throw error;
    }
});

// Handler para desabilitar interface de rede
ipcMain.handle('network-disable-interface', async (event, interfaceName) => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.disableNetworkInterface(interfaceName);
    } catch (error) {
        logger.error('Erro ao desabilitar interface:', error);
        throw error;
    }
});

// Handler para habilitar interface de rede
ipcMain.handle('network-enable-interface', async (event, interfaceName) => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.enableNetworkInterface(interfaceName);
    } catch (error) {
        logger.error('Erro ao habilitar interface:', error);
        throw error;
    }
});

// Handler para resetar configurações de rede
ipcMain.handle('network-reset-config', async () => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.resetNetworkConfiguration();
    } catch (error) {
        logger.error('Erro ao resetar configurações:', error);
        throw error;
    }
});

// Handler para obter status de interface
ipcMain.handle('network-get-interface-status', async (event, interfaceName) => {
    try {
        if (!networkManager) throw new Error('Gerenciador de rede não inicializado');
        return await networkManager.getInterfaceStatus(interfaceName);
    } catch (error) {
        logger.error('Erro ao obter status da interface:', error);
        throw error;
    }
});

// Log de finalização
logger.info('Configuração da aplicação concluída');
logger.info('Aguardando eventos da aplicação...');
