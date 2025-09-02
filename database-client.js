// Módulo cliente para interagir com o banco de dados SQLite via IPC
// Este arquivo contém todas as funções que substituem o localStorage

class DatabaseClient {
    constructor() {
        this.isReady = false;
        this.checkConnection();
    }
    
    // Verificar se a conexão com o banco está pronta
    async checkConnection() {
        try {
            this.isReady = await window.ConfNet.isDatabaseReady();
            console.log('DatabaseClient: Conexão com banco está', this.isReady ? 'pronta' : 'não disponível');
        } catch (error) {
            console.error('DatabaseClient: Erro ao verificar conexão:', error);
            this.isReady = false;
        }
    }
    
    // ===== MÉTODOS PARA EMPRESAS =====
    
    // Buscar todas as empresas com suas filiais
    async getCompanies() {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Buscando empresas...');
            const companies = await window.ConfNet.getCompanies();
            console.log(`DatabaseClient: ${companies.length} empresas encontradas`);
            return companies;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao buscar empresas:', error);
            // Fallback para localStorage se houver erro
            return this.getCompaniesFromLocalStorage();
        }
    }
    
    // Criar nova empresa
    async createCompany(companyData) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Criando empresa:', companyData.name);
            const result = await window.ConfNet.createCompany(companyData);
            console.log('DatabaseClient: Empresa criada com ID:', result.id);
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao criar empresa:', error);
            throw error;
        }
    }
    
    // Atualizar empresa
    async updateCompany(id, companyData) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Atualizando empresa ID:', id);
            const result = await window.ConfNet.updateCompany(id, companyData);
            console.log('DatabaseClient: Empresa atualizada');
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao atualizar empresa:', error);
            throw error;
        }
    }
    
    // Excluir empresa
    async deleteCompany(id) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Excluindo empresa ID:', id);
            const result = await window.ConfNet.deleteCompany(id);
            console.log('DatabaseClient: Empresa excluída');
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao excluir empresa:', error);
            throw error;
        }
    }
    
    // ===== MÉTODOS PARA FILIAIS =====
    
    // Buscar filiais de uma empresa
    async getBranches(companyId) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Buscando filiais da empresa ID:', companyId);
            const branches = await window.ConfNet.getBranches(companyId);
            console.log(`DatabaseClient: ${branches.length} filiais encontradas`);
            return branches;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao buscar filiais:', error);
            throw error;
        }
    }
    
    // Criar nova filial
    async createBranch(branchData) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Criando filial:', branchData.name);
            const result = await window.ConfNet.createBranch(branchData);
            console.log('DatabaseClient: Filial criada com ID:', result.id);
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao criar filial:', error);
            throw error;
        }
    }
    
    // Atualizar filial
    async updateBranch(id, branchData) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Atualizando filial ID:', id);
            const result = await window.ConfNet.updateBranch(id, branchData);
            console.log('DatabaseClient: Filial atualizada');
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao atualizar filial:', error);
            throw error;
        }
    }
    
    // Excluir filial
    async deleteBranch(id) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Excluindo filial ID:', id);
            const result = await window.ConfNet.deleteBranch(id);
            console.log('DatabaseClient: Filial excluída');
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao excluir filial:', error);
            throw error;
        }
    }
    
    // ===== MÉTODOS PARA CONFIGURAÇÕES =====
    
    // Buscar uma configuração específica
    async getSetting(key) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Buscando configuração:', key);
            const value = await window.ConfNet.getSetting(key);
            console.log('DatabaseClient: Configuração encontrada:', value);
            return value;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao buscar configuração:', error);
            // Fallback para localStorage
            return localStorage.getItem(key);
        }
    }
    
    // Buscar todas as configurações
    async getAllSettings() {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Buscando todas as configurações...');
            const settings = await window.ConfNet.getAllSettings();
            console.log('DatabaseClient: Configurações encontradas:', Object.keys(settings).length);
            return settings;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao buscar configurações:', error);
            // Fallback para localStorage
            return this.getSettingsFromLocalStorage();
        }
    }
    
    // Salvar uma configuração
    async setSetting(key, value) {
        try {
            if (!this.isReady) {
                throw new Error('Banco de dados não está pronto');
            }
            
            console.log('DatabaseClient: Salvando configuração:', key);
            const result = await window.ConfNet.setSetting(key, value);
            console.log('DatabaseClient: Configuração salva');
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro ao salvar configuração:', error);
            throw error;
        }
    }
    
    // ===== MÉTODOS DE MIGRAÇÃO =====
    
    // Migrar dados do localStorage para o banco
    async migrateFromLocalStorage() {
        try {
            console.log('DatabaseClient: Iniciando migração do localStorage...');
            
            // Coletar dados do localStorage
            const localStorageData = {
                companies: JSON.parse(localStorage.getItem('confnet-companies') || '[]'),
                settings: {
                    theme: localStorage.getItem('confnet-theme'),
                    settings: JSON.parse(localStorage.getItem('confnet-settings') || '{}')
                }
            };
            
            console.log('DatabaseClient: Dados coletados do localStorage:', {
                companies: localStorageData.companies.length,
                settings: Object.keys(localStorageData.settings).length
            });
            
            // Enviar dados para migração
            const result = await window.ConfNet.migrateFromLocalStorage(localStorageData);
            
            if (result.success) {
                console.log('DatabaseClient: Migração concluída com sucesso!');
                
                // Limpar localStorage após migração bem-sucedida
                localStorage.removeItem('confnet-companies');
                localStorage.removeItem('confnet-theme');
                localStorage.removeItem('confnet-settings');
                
                // Adicionar uma flag para indicar que a migração foi feita
                localStorage.setItem('confnet-migrated', 'true');
                
                console.log('DatabaseClient: localStorage limpo após migração');
                
                // Atualizar status de conexão
                await this.checkConnection();
            }
            
            return result;
            
        } catch (error) {
            console.error('DatabaseClient: Erro na migração:', error);
            throw error;
        }
    }
    
    // Verificar se há dados no localStorage para migrar
    hasLocalStorageData() {
        // Verificar se a migração já foi feita
        const migrated = localStorage.getItem('confnet-migrated');
        if (migrated === 'true') {
            return false; // Migração já foi feita, não há necessidade de migrar novamente
        }
        
        const companies = localStorage.getItem('confnet-companies');
        const settings = localStorage.getItem('confnet-settings');
        const theme = localStorage.getItem('confnet-theme');
        
        return !!(companies || settings || theme);
    }
    
    // ===== MÉTODOS DE FALLBACK =====
    
    // Buscar empresas do localStorage (fallback)
    getCompaniesFromLocalStorage() {
        try {
            const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
            console.log('DatabaseClient: Fallback - empresas do localStorage:', companies.length);
            return companies;
        } catch (error) {
            console.error('DatabaseClient: Erro no fallback do localStorage:', error);
            return [];
        }
    }
    
    // Buscar configurações do localStorage (fallback)
    getSettingsFromLocalStorage() {
        try {
            const settings = {};
            
            // Buscar configurações conhecidas
            const confnetSettings = localStorage.getItem('confnet-settings');
            if (confnetSettings) {
                Object.assign(settings, JSON.parse(confnetSettings));
            }
            
            const theme = localStorage.getItem('confnet-theme');
            if (theme) {
                settings.theme = theme;
            }
            
            console.log('DatabaseClient: Fallback - configurações do localStorage:', Object.keys(settings).length);
            return settings;
        } catch (error) {
            console.error('DatabaseClient: Erro no fallback das configurações:', error);
            return {};
        }
    }
    
    // Função para marcar migração como concluída (para uso manual se necessário)
    markMigrationAsCompleted() {
        localStorage.setItem('confnet-migrated', 'true');
        console.log('DatabaseClient: Migração marcada como concluída manualmente');
    }
}

// Instância global do cliente de banco de dados
window.dbClient = new DatabaseClient();

console.log('DatabaseClient: Módulo carregado e instância criada');
