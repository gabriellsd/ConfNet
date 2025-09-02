// Configuração do sistema de logging
module.exports = {
    // Níveis de log disponíveis
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    
    // Nível atual de log (0 = apenas erros, 3 = tudo)
    currentLevel: 3,
    
    // Diretório de logs
    logDir: 'logs',
    
    // Formato do arquivo de log
    logFileFormat: 'confnet-{date}.log',
    
    // Tamanho máximo do arquivo de log (em MB)
    maxLogSize: 10,
    
    // Número máximo de arquivos de log
    maxLogFiles: 5,
    
    // Habilitar logs no console
    consoleLogging: true,
    
    // Habilitar logs em arquivo
    fileLogging: true,
    
    // Habilitar logs de debug para aba "Configurar Proxy"
    proxyDebugLogging: true,
    
    // Logs específicos para desenvolvimento
    development: {
        // Logs detalhados para funções da aba "Configurar Proxy"
        proxyFunctions: true,
        // Logs de navegação entre passos
        stepNavigation: true,
        // Logs de seleção de empresas/filiais
        selectionEvents: true,
        // Logs de localStorage
        localStorage: true,
        // Logs de validação
        validation: true
    }
};
