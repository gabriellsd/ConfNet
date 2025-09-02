const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Criar diretório de dados se não existir
        this.dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        // Caminho do banco de dados
        this.dbPath = path.join(this.dataDir, 'confnet.db');
        this.db = null;
        
        console.log('Database: Caminho do banco:', this.dbPath);
    }
    
    // Inicializar conexão com o banco
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco:', err);
                    reject(err);
                } else {
                    console.log('Conectado ao banco SQLite:', this.dbPath);
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }
    
    // Criar tabelas necessárias
    async createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Tabela de empresas
                `CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    address TEXT,
                    phone TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Tabela de filiais
                `CREATE TABLE IF NOT EXISTS branches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    address TEXT,
                    proxy_ip TEXT,
                    proxy_port INTEGER,
                    proxy_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
                    UNIQUE(company_id, name)
                )`,
                
                // Tabela de configurações
                `CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Índices para melhor performance
                `CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id)`,
                `CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)`
            ];
            
            let completed = 0;
            const total = queries.length;
            
            queries.forEach((query, index) => {
                this.db.run(query, (err) => {
                    if (err) {
                        console.error(`Erro ao criar tabela/índice ${index + 1}:`, err);
                        reject(err);
                    } else {
                        completed++;
                        console.log(`Tabela/índice ${index + 1}/${total} criada com sucesso`);
                        
                        if (completed === total) {
                            console.log('Todas as tabelas foram criadas com sucesso');
                            resolve();
                        }
                    }
                });
            });
        });
    }
    
    // ===== MÉTODOS PARA EMPRESAS =====
    
    // Buscar todas as empresas com suas filiais
    async getCompanies() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    c.id, c.name, c.description, c.address, c.phone,
                    c.created_at, c.updated_at,
                    b.id as branch_id, b.name as branch_name, b.address as branch_address,
                    b.proxy_ip, b.proxy_port, b.proxy_active,
                    b.created_at as branch_created_at, b.updated_at as branch_updated_at
                FROM companies c
                LEFT JOIN branches b ON c.id = b.company_id
                ORDER BY c.name, b.name
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar empresas:', err);
                    reject(err);
                } else {
                    // Agrupar dados por empresa
                    const companiesMap = new Map();
                    
                    rows.forEach(row => {
                        if (!companiesMap.has(row.id)) {
                            companiesMap.set(row.id, {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                address: row.address,
                                phone: row.phone,
                                createdAt: row.created_at,
                                updatedAt: row.updated_at,
                                branches: []
                            });
                        }
                        
                        // Adicionar filial se existir
                        if (row.branch_id) {
                            companiesMap.get(row.id).branches.push({
                                id: row.branch_id,
                                companyId: row.id,
                                name: row.branch_name,
                                address: row.branch_address,
                                proxyIP: row.proxy_ip,
                                proxyPort: row.proxy_port,
                                proxyActive: Boolean(row.proxy_active),
                                createdAt: row.branch_created_at,
                                updatedAt: row.branch_updated_at
                            });
                        }
                    });
                    
                    const companies = Array.from(companiesMap.values());
                    console.log(`Encontradas ${companies.length} empresas no banco`);
                    resolve(companies);
                }
            });
        });
    }
    
    // Buscar empresa por ID
    async getCompanyById(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM companies WHERE id = ?';
            this.db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // Criar nova empresa
    async createCompany(companyData) {
        return new Promise((resolve, reject) => {
            const { name, description, address, phone } = companyData;
            const query = `
                INSERT INTO companies (name, description, address, phone)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [name, description, address, phone], function(err) {
                if (err) {
                    console.error('Erro ao criar empresa:', err);
                    reject(err);
                } else {
                    console.log(`Empresa criada com ID: ${this.lastID}`);
                    resolve({ id: this.lastID, ...companyData });
                }
            });
        });
    }
    
    // Atualizar empresa
    async updateCompany(id, companyData) {
        return new Promise((resolve, reject) => {
            const { name, description, address, phone } = companyData;
            const query = `
                UPDATE companies 
                SET name = ?, description = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(query, [name, description, address, phone, id], function(err) {
                if (err) {
                    console.error('Erro ao atualizar empresa:', err);
                    reject(err);
                } else {
                    console.log(`Empresa ${id} atualizada`);
                    resolve({ id, ...companyData });
                }
            });
        });
    }
    
    // Excluir empresa
    async deleteCompany(id) {
        return new Promise((resolve, reject) => {
            // As filiais serão excluídas automaticamente devido ao CASCADE
            const query = 'DELETE FROM companies WHERE id = ?';
            
            this.db.run(query, [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir empresa:', err);
                    reject(err);
                } else {
                    console.log(`Empresa ${id} excluída (${this.changes} registros afetados)`);
                    resolve({ deleted: this.changes > 0 });
                }
            });
        });
    }
    
    // ===== MÉTODOS PARA FILIAIS =====
    
    // Buscar filiais de uma empresa
    async getBranchesByCompany(companyId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM branches WHERE company_id = ? ORDER BY name';
            
            this.db.all(query, [companyId], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar filiais:', err);
                    reject(err);
                } else {
                    const branches = rows.map(row => ({
                        id: row.id,
                        companyId: row.company_id,
                        name: row.name,
                        address: row.address,
                        proxyIP: row.proxy_ip,
                        proxyPort: row.proxy_port,
                        proxyActive: Boolean(row.proxy_active),
                        createdAt: row.created_at,
                        updatedAt: row.updated_at
                    }));
                    resolve(branches);
                }
            });
        });
    }
    
    // Criar nova filial
    async createBranch(branchData) {
        return new Promise((resolve, reject) => {
            const { companyId, name, address, proxyIP, proxyPort, proxyActive } = branchData;
            const query = `
                INSERT INTO branches (company_id, name, address, proxy_ip, proxy_port, proxy_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [companyId, name, address, proxyIP, proxyPort, proxyActive ? 1 : 0], function(err) {
                if (err) {
                    console.error('Erro ao criar filial:', err);
                    reject(err);
                } else {
                    console.log(`Filial criada com ID: ${this.lastID}`);
                    resolve({ id: this.lastID, ...branchData });
                }
            });
        });
    }
    
    // Atualizar filial
    async updateBranch(id, branchData) {
        return new Promise((resolve, reject) => {
            const { name, address, proxyIP, proxyPort, proxyActive } = branchData;
            const query = `
                UPDATE branches 
                SET name = ?, address = ?, proxy_ip = ?, proxy_port = ?, proxy_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(query, [name, address, proxyIP, proxyPort, proxyActive ? 1 : 0, id], function(err) {
                if (err) {
                    console.error('Erro ao atualizar filial:', err);
                    reject(err);
                } else {
                    console.log(`Filial ${id} atualizada`);
                    resolve({ id, ...branchData });
                }
            });
        });
    }
    
    // Excluir filial
    async deleteBranch(id) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM branches WHERE id = ?';
            
            this.db.run(query, [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir filial:', err);
                    reject(err);
                } else {
                    console.log(`Filial ${id} excluída (${this.changes} registros afetados)`);
                    resolve({ deleted: this.changes > 0 });
                }
            });
        });
    }
    
    // ===== MÉTODOS PARA CONFIGURAÇÕES =====
    
    // Buscar configuração por chave
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT value FROM settings WHERE key = ?';
            
            this.db.get(query, [key], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar configuração:', err);
                    reject(err);
                } else {
                    resolve(row ? row.value : null);
                }
            });
        });
    }
    
    // Buscar todas as configurações
    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const query = 'SELECT key, value FROM settings';
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar configurações:', err);
                    reject(err);
                } else {
                    const settings = {};
                    rows.forEach(row => {
                        try {
                            settings[row.key] = JSON.parse(row.value);
                        } catch (e) {
                            settings[row.key] = row.value;
                        }
                    });
                    resolve(settings);
                }
            });
        });
    }
    
    // Salvar configuração
    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            const query = `
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [key, valueStr, valueStr], function(err) {
                if (err) {
                    console.error('Erro ao salvar configuração:', err);
                    reject(err);
                } else {
                    console.log(`Configuração ${key} salva`);
                    resolve({ key, value });
                }
            });
        });
    }
    
    // ===== MÉTODOS DE MIGRAÇÃO =====
    
    // Migrar dados do localStorage para SQLite
    async migrateFromLocalStorage(localStorageData) {
        console.log('Iniciando migração do localStorage para SQLite...');
        
        try {
            // Migrar empresas
            if (localStorageData.companies && Array.isArray(localStorageData.companies)) {
                console.log(`Migrando ${localStorageData.companies.length} empresas...`);
                
                for (const company of localStorageData.companies) {
                    try {
                        // Criar empresa
                        const createdCompany = await this.createCompany({
                            name: company.name,
                            description: company.description,
                            address: company.address,
                            phone: company.phone
                        });
                        
                        // Migrar filiais da empresa
                        if (company.branches && Array.isArray(company.branches)) {
                            console.log(`Migrando ${company.branches.length} filiais da empresa ${company.name}...`);
                            
                            for (const branch of company.branches) {
                                await this.createBranch({
                                    companyId: createdCompany.id,
                                    name: branch.name,
                                    address: branch.address,
                                    proxyIP: branch.proxyIP,
                                    proxyPort: branch.proxyPort,
                                    proxyActive: branch.proxyActive !== false
                                });
                            }
                        }
                    } catch (err) {
                        console.error(`Erro ao migrar empresa ${company.name}:`, err);
                        // Continuar com as outras empresas
                    }
                }
            }
            
            // Migrar configurações
            if (localStorageData.settings) {
                console.log('Migrando configurações...');
                for (const [key, value] of Object.entries(localStorageData.settings)) {
                    await this.setSetting(key, value);
                }
            }
            
            console.log('Migração concluída com sucesso!');
            return { success: true };
            
        } catch (error) {
            console.error('Erro na migração:', error);
            throw error;
        }
    }
    
    // Fechar conexão com o banco
    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Erro ao fechar banco:', err);
                    } else {
                        console.log('Conexão com banco fechada');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = Database;
