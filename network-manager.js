const { exec } = require('child_process');
const util = require('util');

// Promisificar exec para usar async/await
const execPromise = util.promisify(exec);

class NetworkManager {
    constructor() {
        this.logger = null; // Será definido pelo main.js
        console.log('NetworkManager: Inicializando gerenciador de rede');
    }
    
    setLogger(logger) {
        this.logger = logger;
    }
    
    // Log helper
    log(level, message, data = null) {
        if (this.logger) {
            this.logger[level](message, data);
        } else {
            console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }

    // Verificar se está executando como administrador
    async checkAdminPrivileges() {
        try {
            const command = `([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")`;
            const result = await this.executePowerShell(command, 'Verificação de privilégios administrativos');
            
            if (result.success) {
                const isAdmin = result.output.toLowerCase().trim() === 'true';
                this.log('info', `Privilégios administrativos: ${isAdmin ? 'SIM' : 'NÃO'}`);
                return isAdmin;
            }
            
            return false;
        } catch (error) {
            this.log('warn', 'Não foi possível verificar privilégios administrativos:', error.message);
            return false;
        }
    }
    
         // Executar comando PowerShell com tratamento de erro
     async executePowerShell(command, description = 'Comando PowerShell') {
         try {
             this.log('debug', `Executando: ${description}`);
             this.log('debug', `Comando: ${command}`);
             
             // Usar caminho completo do PowerShell para evitar problemas
             const powershellPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
             
             // CORRIGIDO: Usar base64 para evitar problemas de aspas
             const commandBase64 = Buffer.from(command, 'utf16le').toString('base64');
             const { stdout, stderr } = await execPromise(`"${powershellPath}" -ExecutionPolicy Bypass -EncodedCommand ${commandBase64}`);
             
             if (stderr) {
                 this.log('warn', `Aviso em ${description}:`, stderr);
             }
             
             this.log('debug', `Resultado: ${stdout.trim()}`);
             return { success: true, output: stdout.trim(), error: null };
             
         } catch (error) {
             this.log('error', `Erro em ${description}:`, error.message);
             return { success: false, output: null, error: error.message };
         }
     }
    
    // ===== CONFIGURAÇÕES DE PROXY =====
    
    // Configurar proxy manual (para conexão por cabo)
    async setManualProxy(proxyIP, proxyPort) {
        try {
            this.log('info', `Configurando proxy manual: ${proxyIP}:${proxyPort}`);
            
            // Executar comandos separadamente para melhor controle
            const results = [];
            
            // 1. Configurar proxy no registro do Internet Explorer/Edge
            this.log('debug', 'Configurando proxy no registro do Internet Explorer...');
            
            // PRIMEIRO: Ler e preservar o valor atual usando múltiplos métodos
            const readCurrentCommand = `
                $regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
                
                # Método 1: Get-ItemProperty
                try {
                    $current1 = Get-ItemProperty -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
                    if ($current1 -and $current1.ProxyOverride) {
                        Write-Output "METHOD1:$($current1.ProxyOverride)"
                    } else {
                        Write-Output "METHOD1:EMPTY"
                    }
                } catch {
                    Write-Output "METHOD1:ERROR"
                }
                
                # Método 2: Get-ItemPropertyValue
                try {
                    $current2 = Get-ItemPropertyValue -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
                    if ($current2) {
                        Write-Output "METHOD2:$current2"
                    } else {
                        Write-Output "METHOD2:EMPTY"
                    }
                } catch {
                    Write-Output "METHOD2:ERROR"
                }
                
                # Método 3: Registry direto
                try {
                    $reg = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings')
                    if ($reg) {
                        $current3 = $reg.GetValue('ProxyOverride')
                        if ($current3) {
                            Write-Output "METHOD3:$current3"
                        } else {
                            Write-Output "METHOD3:EMPTY"
                        }
                        $reg.Close()
                    } else {
                        Write-Output "METHOD3:NOREG"
                    }
                } catch {
                    Write-Output "METHOD3:ERROR"
                }
            `;
            
            const currentResult = await this.executePowerShell(readCurrentCommand, 'Ler ProxyOverride atual');
            let currentOverride = '';
            
            if (currentResult.success) {
                // Analisar os resultados dos 3 métodos
                const output = currentResult.output;
                this.log('debug', `Resultados dos métodos de leitura: ${output}`);
                
                // Tentar extrair valor de qualquer método que funcionou
                const methods = ['METHOD1:', 'METHOD2:', 'METHOD3:'];
                for (const method of methods) {
                    if (output.includes(method)) {
                        const value = output.split(method)[1]?.split('\n')[0]?.split('\r')[0]?.trim();
                        if (value && value !== 'EMPTY' && value !== 'ERROR' && value !== 'NOREG') {
                            currentOverride = value;
                            this.log('info', `✅ Valor encontrado via ${method.replace(':', '')}: "${currentOverride}"`);
                            break;
                        }
                    }
                }
            }
            
            this.log('info', `🔍 ProxyOverride ANTES da mudança: "${currentOverride}"`);
            
            // Garantir que <local> esteja incluído no ProxyOverride para marcar o checkbox
            let finalOverride = currentOverride;
            if (!finalOverride.includes('<local>')) {
                finalOverride = finalOverride ? `${finalOverride};<local>` : '<local>';
            }
            
            this.log('info', `✅ ProxyOverride FINAL será: "${finalOverride}"`);
            
            const regCommands = [
                `$regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'`,
                `Set-ItemProperty -Path $regPath -Name ProxyServer -Value '${proxyIP}:${proxyPort}' -Force`,
                `Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 1 -Force`,
                `Set-ItemProperty -Path $regPath -Name ProxyOverride -Value '${finalOverride}' -Force`,
                `Set-ItemProperty -Path $regPath -Name AutoDetect -Value 0 -Force`,
                `Set-ItemProperty -Path $regPath -Name AutoConfigURL -Value '' -Force`,
                `Write-Output 'Registro IE configurado'`
            ];
            
            const regResult = await this.executePowerShell(regCommands.join('; '), 'Configurar registro IE');
            results.push(regResult);
            
            // 2. Configurar proxy no WinHTTP (para aplicações do sistema)
            this.log('debug', 'Configurando proxy no WinHTTP...');
            const winhttpCommand = `netsh winhttp set proxy "${proxyIP}:${proxyPort}" "<local>"`;
            const winhttpResult = await this.executePowerShell(winhttpCommand, 'Configurar WinHTTP');
            results.push(winhttpResult);
            
            // 3. Notificar mudanças no sistema
            this.log('debug', 'Notificando mudanças no sistema...');
            const notifyCommand = `
                Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinAPI { [DllImport("wininet.dll")] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength); }'
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)
                Write-Output 'Sistema notificado'
            `;
            const notifyResult = await this.executePowerShell(notifyCommand, 'Notificar sistema');
            results.push(notifyResult);
            
            // Verificar se pelo menos as configurações principais foram aplicadas
            const criticalSuccess = regResult.success || winhttpResult.success;
            
            if (criticalSuccess) {
                this.log('info', 'Proxy manual configurado com sucesso');
                return { 
                    success: true, 
                    message: `Proxy configurado: ${proxyIP}:${proxyPort}`,
                    details: {
                        registry: regResult.success,
                        winhttp: winhttpResult.success,
                        notification: notifyResult.success
                    }
                };
            } else {
                const errors = results.filter(r => !r.success).map(r => r.error).join('; ');
                throw new Error(`Falha na configuração: ${errors}`);
            }
            
        } catch (error) {
            this.log('error', 'Erro ao configurar proxy manual:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Configurar detecção automática de proxy (para Wi-Fi)
    async setAutoProxy() {
        try {
            this.log('info', 'Configurando detecção automática de proxy');
            
            const results = [];
            
            // 1. Configurar detecção automática no registro
            this.log('debug', 'Configurando detecção automática no registro...');
            
            // Primeiro, obter o valor atual do ProxyOverride para preservá-lo
            const getOverrideCommand = `
                $regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
                try {
                    $currentOverride = Get-ItemPropertyValue -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
                    if ([string]::IsNullOrEmpty($currentOverride)) {
                        Write-Output 'EMPTY'
                    } else {
                        Write-Output $currentOverride
                    }
                } catch {
                    Write-Output 'EMPTY'
                }
            `;
            
            const overrideResult = await this.executePowerShell(getOverrideCommand, 'Obter ProxyOverride atual');
            let currentOverride = overrideResult.success ? overrideResult.output.trim() : 'EMPTY';
            
            // Se estiver vazio, usar string vazia
            if (currentOverride === 'EMPTY') {
                currentOverride = '';
            }
            
            // Para Wi-Fi, remover <local> se existir, mas manter outros dados
            let finalOverride = currentOverride.replace(';<local>', '').replace('<local>;', '').replace('<local>', '');
            
            this.log('debug', `ProxyOverride preservado para Wi-Fi: "${finalOverride}"`);
            
            const regCommands = [
                `$regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'`,
                // Desabilitar proxy manual
                `Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0 -Force`,
                `Set-ItemProperty -Path $regPath -Name ProxyServer -Value '' -Force`,
                // PRESERVAR ProxyOverride (não limpar os dados)
                `Set-ItemProperty -Path $regPath -Name ProxyOverride -Value '${finalOverride}' -Force`,
                // DESMARCAR "Não usar proxy para endereços locais" mas manter dados
                `Set-ItemProperty -Path $regPath -Name ProxyOverrideLocal -Value 0 -Force`,
                // Habilitar detecção automática
                `Set-ItemProperty -Path $regPath -Name AutoDetect -Value 1 -Force`,
                `Set-ItemProperty -Path $regPath -Name AutoConfigURL -Value '' -Force`,
                `Write-Output 'Detecção automática configurada'`
            ];
            
            const regResult = await this.executePowerShell(regCommands.join('; '), 'Configurar detecção automática');
            results.push(regResult);
            
            // 2. Limpar proxy do WinHTTP
            this.log('debug', 'Limpando proxy do WinHTTP...');
            const winhttpResult = await this.executePowerShell('netsh winhttp reset proxy', 'Limpar WinHTTP');
            results.push(winhttpResult);
            
            // 3. Notificar mudanças no sistema
            this.log('debug', 'Notificando mudanças no sistema...');
            const notifyCommand = `
                Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinAPI { [DllImport("wininet.dll")] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength); }'
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)
                Write-Output 'Sistema notificado'
            `;
            const notifyResult = await this.executePowerShell(notifyCommand, 'Notificar sistema');
            results.push(notifyResult);
            
            // Verificar se pelo menos a configuração principal foi bem-sucedida
            const criticalSuccess = regResult.success;
            
            if (criticalSuccess) {
                this.log('info', 'Detecção automática de proxy configurada com sucesso');
                return { 
                    success: true, 
                    message: 'Detecção automática ativada',
                    details: {
                        registry: regResult.success,
                        winhttp: winhttpResult.success,
                        notification: notifyResult.success
                    }
                };
            } else {
                const errors = results.filter(r => !r.success).map(r => r.error).join('; ');
                throw new Error(`Falha na configuração: ${errors}`);
            }
            
        } catch (error) {
            this.log('error', 'Erro ao configurar proxy automático:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Limpar configurações de proxy
    async clearProxy() {
        try {
            this.log('info', 'Limpando configurações de proxy');
            
            const results = [];
            
            // 1. Limpar configurações do registro
            this.log('debug', 'Limpando configurações do registro...');
            
            // Primeiro, obter o valor atual do ProxyOverride para preservá-lo
            const getOverrideCommand = `
                $regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
                try {
                    $currentOverride = Get-ItemPropertyValue -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
                    if ([string]::IsNullOrEmpty($currentOverride)) {
                        Write-Output 'EMPTY'
                    } else {
                        Write-Output $currentOverride
                    }
                } catch {
                    Write-Output 'EMPTY'
                }
            `;
            
            const overrideResult = await this.executePowerShell(getOverrideCommand, 'Obter ProxyOverride atual');
            let currentOverride = overrideResult.success ? overrideResult.output.trim() : 'EMPTY';
            
            // Se estiver vazio, usar string vazia
            if (currentOverride === 'EMPTY') {
                currentOverride = '';
            }
            
            this.log('debug', `ProxyOverride preservado no reset: "${currentOverride}"`);
            
            const regCommands = [
                `$regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'`,
                `Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0 -Force`,
                `Set-ItemProperty -Path $regPath -Name ProxyServer -Value '' -Force`,
                `Set-ItemProperty -Path $regPath -Name AutoDetect -Value 0 -Force`,
                `Set-ItemProperty -Path $regPath -Name AutoConfigURL -Value '' -Force`,
                // PRESERVAR ProxyOverride (não limpar os dados)
                `Set-ItemProperty -Path $regPath -Name ProxyOverride -Value '${currentOverride}' -Force`,
                // PRESERVAR configuração local (não alterar)
                `Write-Output 'Registro limpo'`
            ];
            
            const regResult = await this.executePowerShell(regCommands.join('; '), 'Limpar registro');
            results.push(regResult);
            
            // 2. Limpar WinHTTP
            this.log('debug', 'Limpando configurações do WinHTTP...');
            const winhttpResult = await this.executePowerShell('netsh winhttp reset proxy', 'Limpar WinHTTP');
            results.push(winhttpResult);
            
            // 3. Notificar mudanças no sistema
            this.log('debug', 'Notificando limpeza no sistema...');
            const notifyCommand = `
                Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinAPI { [DllImport("wininet.dll")] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength); }'
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)
                [WinAPI]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)
                Write-Output 'Sistema notificado'
            `;
            const notifyResult = await this.executePowerShell(notifyCommand, 'Notificar limpeza');
            results.push(notifyResult);
            
            // Verificar se pelo menos a limpeza principal foi bem-sucedida
            const criticalSuccess = regResult.success || winhttpResult.success;
            
            if (criticalSuccess) {
                this.log('info', 'Configurações de proxy limpas com sucesso');
                return { 
                    success: true, 
                    message: 'Proxy limpo',
                    details: {
                        registry: regResult.success,
                        winhttp: winhttpResult.success,
                        notification: notifyResult.success
                    }
                };
            } else {
                const errors = results.filter(r => !r.success).map(r => r.error).join('; ');
                throw new Error(`Falha na limpeza: ${errors}`);
            }
            
        } catch (error) {
            this.log('error', 'Erro ao limpar proxy:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // ===== GERENCIAMENTO DE INTERFACES DE REDE =====
    
    // Listar interfaces de rede disponíveis
    async getNetworkInterfaces() {
        try {
            this.log('debug', 'Listando interfaces de rede');
            
            const command = `Get-NetAdapter | Select-Object Name, Status, InterfaceDescription | ConvertTo-Json -Compress`;
            const result = await this.executePowerShell(command, 'Listagem de interfaces');
            
            if (result.success && result.output) {
                const interfaces = JSON.parse(result.output);
                const interfaceList = Array.isArray(interfaces) ? interfaces : [interfaces];
                
                this.log('debug', `Encontradas ${interfaceList.length} interfaces de rede`);
                return { success: true, interfaces: interfaceList };
            } else {
                throw new Error(result.error || 'Nenhuma interface encontrada');
            }
            
        } catch (error) {
            this.log('error', 'Erro ao listar interfaces:', error.message);
            return { success: false, error: error.message, interfaces: [] };
        }
    }
    
    // Desabilitar interface de rede
    async disableNetworkInterface(interfaceName) {
        try {
            this.log('info', `Desabilitando interface: ${interfaceName}`);
            
            // Verificar privilégios administrativos primeiro
            const isAdmin = await this.checkAdminPrivileges();
            if (!isAdmin) {
                const errorMsg = `Permissões administrativas necessárias para desabilitar ${interfaceName}`;
                this.log('warn', errorMsg);
                return { 
                    success: false, 
                    error: errorMsg,
                    requiresAdmin: true 
                };
            }
            
            const command = `Disable-NetAdapter -Name "${interfaceName}" -Confirm:$false; Write-Output "Interface ${interfaceName} desabilitada"`;
            const result = await this.executePowerShell(command, `Desabilitar ${interfaceName}`);
            
            if (result.success) {
                this.log('info', `Interface ${interfaceName} desabilitada com sucesso`);
                return { success: true, message: `Interface ${interfaceName} desabilitada` };
            } else {
                // Verificar se é erro de permissão
                if (result.error && result.error.includes('Access is denied') || result.error.includes('Acesso negado')) {
                    return { 
                        success: false, 
                        error: `Permissões insuficientes para desabilitar ${interfaceName}`,
                        requiresAdmin: true 
                    };
                }
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.log('error', `Erro ao desabilitar interface ${interfaceName}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Habilitar interface de rede
    async enableNetworkInterface(interfaceName) {
        try {
            this.log('info', `Habilitando interface: ${interfaceName}`);
            
            // Verificar privilégios administrativos primeiro
            const isAdmin = await this.checkAdminPrivileges();
            if (!isAdmin) {
                const errorMsg = `Permissões administrativas necessárias para habilitar ${interfaceName}`;
                this.log('warn', errorMsg);
                return { 
                    success: false, 
                    error: errorMsg,
                    requiresAdmin: true 
                };
            }
            
            const command = `Enable-NetAdapter -Name "${interfaceName}" -Confirm:$false; Write-Output "Interface ${interfaceName} habilitada"`;
            const result = await this.executePowerShell(command, `Habilitar ${interfaceName}`);
            
            if (result.success) {
                this.log('info', `Interface ${interfaceName} habilitada com sucesso`);
                return { success: true, message: `Interface ${interfaceName} habilitada` };
            } else {
                // Verificar se é erro de permissão
                if (result.error && result.error.includes('Access is denied') || result.error.includes('Acesso negado')) {
                    return { 
                        success: false, 
                        error: `Permissões insuficientes para habilitar ${interfaceName}`,
                        requiresAdmin: true 
                    };
                }
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.log('error', `Erro ao habilitar interface ${interfaceName}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Obter status de uma interface específica
    async getInterfaceStatus(interfaceName) {
        try {
            const command = `Get-NetAdapter -Name "${interfaceName}" | Select-Object Name, Status | ConvertTo-Json -Compress`;
            const result = await this.executePowerShell(command, `Status da interface ${interfaceName}`);
            
            if (result.success && result.output) {
                const interfaceInfo = JSON.parse(result.output);
                return { success: true, status: interfaceInfo.Status };
            } else {
                throw new Error(result.error || 'Interface não encontrada');
            }
            
        } catch (error) {
            this.log('error', `Erro ao obter status da interface ${interfaceName}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    // ===== CONFIGURAÇÕES COMPLETAS POR TIPO DE CONEXÃO =====
    
    // Configurar para conexão por cabo (Ethernet)
    async configureForEthernet(proxyIP, proxyPort) {
        try {
            this.log('info', 'Configurando sistema para conexão por cabo');
            
            const results = {
                proxy: null,
                wifiDisabled: null,
                ethernetEnabled: null
            };
            
            // 1. Configurar proxy manual
            results.proxy = await this.setManualProxy(proxyIP, proxyPort);
            
            // 2. Desabilitar Wi-Fi (se existir)
            const interfaces = await this.getNetworkInterfaces();
            if (interfaces.success) {
                const wifiInterface = interfaces.interfaces.find(i => 
                    i.Name.toLowerCase().includes('wi-fi') || 
                    i.Name.toLowerCase().includes('wifi') ||
                    i.InterfaceDescription.toLowerCase().includes('wireless')
                );
                
                if (wifiInterface) {
                    results.wifiDisabled = await this.disableNetworkInterface(wifiInterface.Name);
                } else {
                    this.log('info', 'Interface Wi-Fi não encontrada');
                    results.wifiDisabled = { success: true, message: 'Wi-Fi não encontrado' };
                }
            }
            
            // 3. Garantir que Ethernet esteja habilitada
            const ethernetInterface = interfaces.interfaces.find(i => 
                i.Name.toLowerCase() === 'ethernet' ||
                i.InterfaceDescription.toLowerCase().includes('ethernet')
            );
            
            if (ethernetInterface) {
                results.ethernetEnabled = await this.enableNetworkInterface(ethernetInterface.Name);
            } else {
                this.log('warn', 'Interface Ethernet não encontrada');
                results.ethernetEnabled = { success: true, message: 'Ethernet não encontrada' };
            }
            
            const success = results.proxy.success && results.wifiDisabled.success && results.ethernetEnabled.success;
            
            this.log('info', 'Configuração para cabo concluída', results);
            
            return {
                success,
                message: success ? 'Sistema configurado para conexão por cabo' : 'Configuração parcialmente bem-sucedida',
                details: results
            };
            
        } catch (error) {
            this.log('error', 'Erro na configuração para cabo:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Configurar para conexão Wi-Fi
    async configureForWifi() {
        try {
            this.log('info', 'Configurando sistema para conexão Wi-Fi');
            
            const results = {
                proxyAuto: null,
                ethernetDisabled: null,
                wifiEnabled: null
            };
            
            // 1. Configurar detecção automática de proxy
            results.proxyAuto = await this.setAutoProxy();
            
            // 2. Desabilitar Ethernet
            const interfaces = await this.getNetworkInterfaces();
            if (interfaces.success) {
                const ethernetInterface = interfaces.interfaces.find(i => 
                    i.Name.toLowerCase() === 'ethernet' ||
                    (i.InterfaceDescription.toLowerCase().includes('ethernet') && 
                     !i.InterfaceDescription.toLowerCase().includes('virtual') &&
                     !i.InterfaceDescription.toLowerCase().includes('hyper-v'))
                );
                
                if (ethernetInterface) {
                    results.ethernetDisabled = await this.disableNetworkInterface(ethernetInterface.Name);
                } else {
                    this.log('info', 'Interface Ethernet principal não encontrada');
                    results.ethernetDisabled = { success: true, message: 'Ethernet não encontrada' };
                }
            }
            
            // 3. Garantir que Wi-Fi esteja habilitado
            const wifiInterface = interfaces.interfaces.find(i => 
                i.Name.toLowerCase().includes('wi-fi') || 
                i.Name.toLowerCase().includes('wifi') ||
                i.InterfaceDescription.toLowerCase().includes('wireless')
            );
            
            if (wifiInterface) {
                results.wifiEnabled = await this.enableNetworkInterface(wifiInterface.Name);
            } else {
                this.log('warn', 'Interface Wi-Fi não encontrada');
                results.wifiEnabled = { success: true, message: 'Wi-Fi não encontrada' };
            }
            
            const success = results.proxyAuto.success && results.ethernetDisabled.success && results.wifiEnabled.success;
            
            this.log('info', 'Configuração para Wi-Fi concluída', results);
            
            return {
                success,
                message: success ? 'Sistema configurado para conexão Wi-Fi' : 'Configuração parcialmente bem-sucedida',
                details: results
            };
            
        } catch (error) {
            this.log('error', 'Erro na configuração para Wi-Fi:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Resetar todas as configurações
    async resetNetworkConfiguration() {
        try {
            this.log('info', 'Resetando configurações de rede');
            
            const results = {
                proxyCleared: null,
                allInterfacesEnabled: null
            };
            
            // 1. Limpar configurações de proxy
            results.proxyCleared = await this.clearProxy();
            
            // 2. Habilitar todas as interfaces
            const interfaces = await this.getNetworkInterfaces();
            if (interfaces.success) {
                const enablePromises = interfaces.interfaces.map(async (networkInterface) => {
                    if (networkInterface.Status.toLowerCase() === 'disabled') {
                        return await this.enableNetworkInterface(networkInterface.Name);
                    }
                    return { success: true, message: `${networkInterface.Name} já habilitada` };
                });
                
                const enableResults = await Promise.all(enablePromises);
                results.allInterfacesEnabled = {
                    success: enableResults.every(r => r.success),
                    results: enableResults
                };
            }
            
            const success = results.proxyCleared.success && results.allInterfacesEnabled.success;
            
            this.log('info', 'Reset de configurações concluído', results);
            
            return {
                success,
                message: success ? 'Configurações de rede resetadas' : 'Reset parcialmente bem-sucedido',
                details: results
            };
            
        } catch (error) {
            this.log('error', 'Erro no reset das configurações:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = NetworkManager;
