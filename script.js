// Configurações padrão da aplicação
let appSettings = {
    theme: 'light',
    language: 'pt-BR',
    notifications: true,
    autoBackup: true
};

// Variáveis globais para configuração de proxy
let currentProxyConfig = {
    company: null,
    branch: null,
    connectionType: null
};

// Senha para acesso às configurações
const CONFIG_PASSWORD = '12qw!@QW';

// Estado de autenticação
let isAuthenticated = false;

// Elementos DOM
const navButtons = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async function() {
    console.log('ConfNet iniciando...');
    
    // Aguardar inicialização do banco de dados
    await initializeDatabase();
    
    loadSavedTheme();
    await loadSettings();
    initializeApp();
    setupEventListeners();
    setupHierarchicalMenu();
    setupThemeListeners();
    setupSaveButton();
    
    console.log('ConfNet inicializado completamente');
    console.log('Estado final de isAuthenticated:', isAuthenticated);
});

// Função para inicializar conexão com banco de dados
async function initializeDatabase() {
    console.log('=== INICIALIZANDO BANCO DE DADOS ===');
    
    try {
        // Aguardar o dbClient estar pronto
        if (window.dbClient) {
            await window.dbClient.checkConnection();
            
            // Verificar se há dados do localStorage para migrar
            if (window.dbClient.hasLocalStorageData()) {
                console.log('Dados do localStorage detectados, oferecendo migração...');
                
                const shouldMigrate = confirm(
                    'Foram detectados dados salvos no sistema antigo (localStorage).\n\n' +
                    'Deseja migrar estes dados para o novo sistema de banco de dados?\n\n' +
                    'Recomendamos fazer a migração para melhor performance e segurança.'
                );
                
                if (shouldMigrate) {
                    try {
                        console.log('Usuário optou por migrar os dados...');
                        await window.dbClient.migrateFromLocalStorage();
                        alert('Migração concluída com sucesso!\n\nSeus dados foram transferidos para o novo sistema.');
                    } catch (error) {
                        console.error('Erro na migração:', error);
                        alert('Erro na migração dos dados:\n' + error.message + '\n\nO sistema continuará funcionando com os dados antigos.');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        alert('Aviso: Não foi possível conectar com o banco de dados.\nO sistema funcionará em modo de compatibilidade.');
    }
    
    console.log('=== INICIALIZAÇÃO DO BANCO CONCLUÍDA ===');
}

// Função de inicialização
function initializeApp() {
    console.log('ConfNet iniciado com sucesso!');
    console.log('Estado inicial de autenticação:', isAuthenticated);
    
    // Aplicar tema inicial
    applyTheme(appSettings.theme);
    
    // Mostrar seção inicial
    showSection('inicio');
}

// Configurar event listeners
function setupEventListeners() {
    // Navegação entre seções
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
                updateActiveButton(this);
            }
        });
    });
}

// Função para inicializar o menu hierárquico lateral
function setupHierarchicalMenu() {
    console.log('=== SETUP HIERARCHICAL MENU ===');
    
            // Event listener para o botão pai "Configurações"
        const configParent = document.querySelector('.nav-parent');
        const navGroup = document.querySelector('.nav-group');
        
        console.log('Config parent encontrado:', configParent);
        console.log('Nav group encontrado:', navGroup);
        
        if (configParent && navGroup) {
            configParent.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Botão pai config clicado');
                
                // Verificar autenticação antes de expandir o menu
                if (!isAuthenticated) {
                    console.log('Usuário não autenticado, abrindo modal de login');
                    openLoginModal();
                    return;
                }
                
                // Alternar estado expandido apenas se autenticado
                navGroup.classList.toggle('expanded');
                console.log('Estado expandido:', navGroup.classList.contains('expanded'));
            });
        
        // Event listeners para os subitens
        const subButtons = document.querySelectorAll('.nav-sub-btn');
        console.log('Sub-botões encontrados:', subButtons.length);
        
        subButtons.forEach((btn, index) => {
            console.log(`Sub-botão ${index}:`, btn.textContent, 'Dataset:', btn.dataset);
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Sub-botão clicado:', btn.textContent, 'Dataset:', btn.dataset);
                
                // Verificar autenticação antes de mostrar configurações
                if (!isAuthenticated) {
                    console.log('Usuário não autenticado, abrindo modal de login');
                    openLoginModal();
                    return;
                }
                
                console.log('Usuário autenticado, prosseguindo...');
                
                // Remover classe active de todos os subitens
                document.querySelectorAll('.nav-sub-btn').forEach(subBtn => {
                    subBtn.classList.remove('active');
                });
                
                // Adicionar classe active ao subitem clicado
                btn.classList.add('active');
                
                // Mostrar seção de configurações
                showSection('configuracoes');
                
                // Alternar para a subseção correspondente
                const subsection = btn.dataset.subsection;
                console.log('Alternando para subseção:', subsection);
                switchConfigSubsection(subsection);
            });
        });
        
        // Verificar se há subseções disponíveis
        const configSubsections = document.querySelectorAll('.config-subsection');
        console.log('Subseções de configuração encontradas:', configSubsections.length);
        configSubsections.forEach((subsection, index) => {
            console.log(`  Subseção ${index}:`, subsection.id, 'Classe:', subsection.className);
        });
        
    } else {
        console.error('Elementos do menu hierárquico não encontrados!');
    }
    
    console.log('=== FIM SETUP HIERARCHICAL MENU ===');
}

// Função para alternar entre subseções de configurações
function switchConfigSubsection(subsectionId) {
    console.log('=== SWITCH CONFIG SUBSECTION ===');
    console.log('Subseção solicitada:', subsectionId);
    
    // Verificar todas as subseções disponíveis
    const allSubsections = document.querySelectorAll('.config-subsection');
    console.log('Total de subseções encontradas:', allSubsections.length);
    allSubsections.forEach(subsection => {
        console.log('  - Subseção:', subsection.id, 'Classe:', subsection.className);
    });
    
    // Esconder todas as subseções
    document.querySelectorAll('.config-subsection').forEach(subsection => {
        subsection.classList.remove('active');
        console.log('Removendo active de:', subsection.id);
    });
    
    // Mostrar subseção selecionada
    const targetSubsection = document.getElementById(`config-${subsectionId}`);
    console.log('Subseção encontrada:', targetSubsection);
    
    if (targetSubsection) {
        targetSubsection.classList.add('active');
        console.log('Classe active adicionada a:', targetSubsection.id);
        
        // Inicializar subseção específica se necessário
        if (subsectionId === 'lojas') {
            console.log('Inicializando subseção lojas');
            loadCompanies();
        } else if (subsectionId === 'geral') {
            console.log('Inicializando subseção geral');
            // Aqui você pode adicionar inicializações específicas da subseção geral se necessário
        }
        
        // Garantir que a subseção seja visível
        targetSubsection.style.display = 'block';
        targetSubsection.style.opacity = '1';
        
        // Garantir que apenas esta subseção seja exibida
        allSubsections.forEach(subsection => {
            if (subsection !== targetSubsection) {
                subsection.style.display = 'none';
                subsection.style.opacity = '0';
                subsection.classList.remove('active');
            }
        });
        
    } else {
        console.error('Subseção não encontrada:', `config-${subsectionId}`);
        
        // Tentar encontrar a subseção de outra forma
        const alternativeSubsection = document.querySelector(`[id*="${subsectionId}"]`);
        if (alternativeSubsection) {
            console.log('Subseção encontrada de forma alternativa:', alternativeSubsection.id);
            alternativeSubsection.classList.add('active');
            alternativeSubsection.style.display = 'block';
            alternativeSubsection.style.opacity = '1';
            
            // Garantir que apenas esta subseção seja exibida
            allSubsections.forEach(subsection => {
                if (subsection !== alternativeSubsection) {
                    subsection.style.display = 'none';
                    subsection.style.opacity = '0';
                    subsection.classList.remove('active');
                }
            });
        }
        
        // Verificar se há algum problema com o ID
        console.log('Verificando IDs disponíveis:');
        allSubsections.forEach(subsection => {
            console.log('  ID disponível:', subsection.id);
        });
    }
    
    console.log('=== FIM SWITCH CONFIG SUBSECTION ===');
}

// Variáveis globais para gerenciamento de empresas e filiais
let editingCompanyId = null;
let editingBranchId = null;
let selectedCompanyId = null; // Empresa selecionada para mostrar filiais

// Funções para gerenciar empresas
function openNewCompanyModal() {
    console.log('Abrindo modal para nova empresa');
    
    // Resetar estado de edição
    editingCompanyId = null;
    
    // Resetar título do modal
    document.getElementById('modal-title').textContent = 'Nova Empresa';
    
    // Limpar formulário completamente
    const form = document.getElementById('company-form');
    if (form) {
        form.reset();
    }
    
    // Limpar campos específicos para garantir
    document.getElementById('company-name').value = '';
    document.getElementById('company-description').value = '';
    document.getElementById('company-address').value = '';
    document.getElementById('company-phone').value = '';
    
    // Mostrar modal
    document.getElementById('company-modal').style.display = 'block';
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('company-name').focus();
    }, 100);
    
    console.log('Modal aberto e limpo para nova empresa');
}

function closeCompanyModal() {
    const modal = document.getElementById('company-modal');
    const form = document.getElementById('company-form');
    
    // Ocultar o modal
    modal.style.display = 'none';
    
    // Limpar o formulário
    if (form) {
        form.reset();
    }
    
    // Limpar campos específicos
    document.getElementById('company-name').value = '';
    document.getElementById('company-description').value = '';
    document.getElementById('company-address').value = '';
    document.getElementById('company-phone').value = '';
    
    // Resetar estado de edição
    editingCompanyId = null;
    
    // Resetar título do modal
    document.getElementById('modal-title').textContent = 'Nova Empresa';
    
    console.log('Modal fechado e resetado');
}

async function saveCompany() {
    console.log('Salvando empresa, modo edição:', editingCompanyId ? 'sim' : 'não');
    
    const form = document.getElementById('company-form');
    const formData = new FormData(form);
    
    // Validar campos obrigatórios
    const companyName = formData.get('company-name').trim();
    if (!companyName) {
        alert('Por favor, preencha o nome da empresa');
        return;
    }
    
    // Criar objeto da empresa
    const companyData = {
        name: companyName,
        description: formData.get('company-description').trim(),
        address: formData.get('company-address').trim(),
        phone: formData.get('company-phone').trim()
    };
    
    console.log('Dados da empresa a salvar:', companyData);
    
    try {
        let result;
        
        if (editingCompanyId) {
            // Atualizar empresa existente
            result = await window.dbClient.updateCompany(editingCompanyId, companyData);
            console.log('Empresa atualizada:', result);
        } else {
            // Criar nova empresa
            result = await window.dbClient.createCompany(companyData);
            console.log('Nova empresa criada:', result);
        }
        
        // Fechar modal e recarregar lista
        closeCompanyModal();
        await loadCompanies();
        
        // Mostrar mensagem de sucesso
        const message = editingCompanyId ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!';
        alert(message);
        
        console.log('Operação concluída com sucesso');
        
    } catch (error) {
        console.error('Erro ao salvar empresa:', error);
        alert('Erro ao salvar empresa: ' + error.message);
    }
}

function editCompany(companyId) {
    console.log('Editando empresa ID:', companyId);
    
    const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
    const company = companies.find(c => c.id === companyId);
    
    if (company) {
        // Definir empresa sendo editada
        editingCompanyId = companyId;
        
        // Atualizar título do modal
        document.getElementById('modal-title').textContent = 'Editar Empresa';
        
        // Limpar formulário primeiro
        const form = document.getElementById('company-form');
        if (form) {
            form.reset();
        }
        
        // Preencher campos com dados da empresa
        document.getElementById('company-name').value = company.name || '';
        document.getElementById('company-description').value = company.description || '';
        document.getElementById('company-address').value = company.address || '';
        document.getElementById('company-phone').value = company.phone || '';
        
        // Mostrar modal
        document.getElementById('company-modal').style.display = 'block';
        
        // Focar no primeiro campo
        setTimeout(() => {
            document.getElementById('company-name').focus();
        }, 100);
        
        console.log('Modal aberto para edição da empresa:', company.name);
    } else {
        console.error('Empresa não encontrada para edição:', companyId);
        alert('Erro: Empresa não encontrada');
    }
}

async function deleteCompany(companyId) {
    if (confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
        try {
            const result = await window.dbClient.deleteCompany(companyId);
            
            if (result.deleted) {
                // Se a empresa excluída estava selecionada, limpar seleção
                if (selectedCompanyId === companyId) {
                    selectedCompanyId = null;
                    // Limpar card das filiais
                    const branchesContent = document.getElementById('branches-content');
                    if (branchesContent) {
                        branchesContent.innerHTML = `
                            <div class="no-company-selected">
                                <p>Selecione uma empresa para ver suas filiais</p>
                            </div>
                        `;
                    }
                    // Desabilitar botão de adicionar filial
                    const addBranchBtn = document.getElementById('add-branch-btn');
                    if (addBranchBtn) {
                        addBranchBtn.disabled = true;
                    }
                }
                
                await loadCompanies();
                alert('Empresa excluída com sucesso!');
                
                console.log('Empresa excluída com sucesso');
            } else {
                alert('Erro: Empresa não encontrada ou já foi excluída.');
            }
            
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            alert('Erro ao excluir empresa: ' + error.message);
        }
    }
}

async function loadCompanies() {
    console.log('=== CARREGANDO EMPRESAS ===');
    
    const companiesList = document.getElementById('companies-list');
    if (!companiesList) {
        console.error('Elemento companies-list não encontrado!');
        return;
    }
    console.log('Elemento companies-list encontrado:', companiesList);
    
    try {
        // Tentar buscar do banco SQLite primeiro
        const companies = await window.dbClient.getCompanies();
        console.log('Empresas encontradas no banco:', companies);
        console.log('Total de empresas:', companies.length);
        
        // Verificar se há empresa selecionada e se ela ainda existe
        if (selectedCompanyId) {
            const companyExists = companies.find(c => c.id === selectedCompanyId);
            if (!companyExists) {
                console.log('Empresa selecionada não existe mais, limpando seleção');
                selectedCompanyId = null;
            } else {
                console.log('Empresa selecionada ainda existe:', selectedCompanyId);
            }
        }
        
        // Se não houver empresas, mostrar lista vazia (sem criar padrões)
        displayCompanies(companies);
        
    } catch (error) {
        console.error('Erro ao carregar empresas do banco:', error);
        
        // Fallback para localStorage se houver erro
        try {
            const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
            console.log('Fallback: empresas do localStorage:', companies.length);
            displayCompanies(companies);
        } catch (fallbackError) {
            console.error('Erro no fallback do localStorage:', fallbackError);
            displayCompanies([]);
        }
    }
    
    console.log('=== EMPRESAS CARREGADAS ===');
}

function displayCompanies(companies) {
    const companiesList = document.getElementById('companies-list');
    if (!companiesList) return;
    
    if (companies.length === 0) {
        companiesList.innerHTML = '';
        return;
    }
    
    const companiesHTML = companies.map(company => {
        const branches = company.branches || [];
        const branchesCount = branches.length;
        const isSelected = selectedCompanyId === company.id;
        
        return `
            <div class="company-item ${isSelected ? 'selected' : ''}" data-company-id="${company.id}" onclick="selectCompany(${company.id})">
                <div class="company-info">
                    <div class="company-name">${company.name}</div>
                    <div class="company-details">
                        ${company.description ? company.description : ''}
                        ${company.address ? `<br>${company.address}` : ''}
                        ${company.phone ? `<br>${company.phone}` : ''}
                        <br><strong>Filiais: ${branchesCount}</strong>
                    </div>
                </div>
                <div class="company-actions" onclick="event.stopPropagation()">
                    <button class="btn-edit" data-company-id="${company.id}">Editar</button>
                    <button class="btn-delete" data-company-id="${company.id}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
    
    companiesList.innerHTML = companiesHTML;
    
    // Adicionar event listeners para botões de empresa
    companiesList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const companyId = parseInt(this.getAttribute('data-company-id'));
            console.log('Botão Editar clicado para empresa ID:', companyId);
            editCompany(companyId);
        });
    });
    
    companiesList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const companyId = parseInt(this.getAttribute('data-company-id'));
            console.log('Botão Excluir clicado para empresa ID:', companyId);
            deleteCompany(companyId);
        });
    });
    
    console.log('Empresas exibidas:', companies);
    console.log('Total de empresas:', companies.length);
    console.log('Botões de editar encontrados:', companiesList.querySelectorAll('.btn-edit').length);
    console.log('Botões de excluir encontrados:', companiesList.querySelectorAll('.btn-delete').length);
}

// Mostrar seção específica
function showSection(sectionId) {
    console.log('=== SHOW SECTION ===');
    console.log('Seção solicitada:', sectionId);
    
    // Verificação de segurança para configurações
    if (sectionId === 'configuracoes' && !isAuthenticated) {
        console.log('Tentativa de mostrar configurações sem autenticação - bloqueando');
        return;
    }
    
    // Ocultar todas as seções
    contentSections.forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar seção selecionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Atualizar botão ativo
    const activeButton = document.querySelector(`[data-section="${sectionId}"]`);
    updateActiveButton(activeButton);

    // Inicializar seção específica se necessário
    if (sectionId === 'inicio') {
        console.log('Inicializando seção inicio');
        // Carregar informações do sistema automaticamente
        setTimeout(() => {
            refreshSystemInfo();
        }, 100);
    } else if (sectionId === 'configurar-proxy') {
        console.log('Inicializando seção configurar-proxy');
        // Inicializar a aba de configuração de proxy
        setTimeout(() => {
            loadStepData(1);
        }, 100);
    } else if (sectionId === 'configuracoes') {
        // Verificar autenticação antes de mostrar configurações
        if (!isAuthenticated) {
            console.log('Tentativa de acessar configurações sem autenticação');
            openLoginModal();
            return; // Não mostrar a seção se não estiver autenticado
        }
        
        // Verificar se há uma subseção ativa específica
        const activeSubsection = document.querySelector('.nav-sub-btn.active');
        if (activeSubsection) {
            const subsection = activeSubsection.dataset.subsection;
            console.log('Subseção ativa encontrada:', subsection);
            setTimeout(() => {
                switchConfigSubsection(subsection);
            }, 100);
        } else {
            // Se não houver subseção ativa, mostrar geral por padrão
            console.log('Nenhuma subseção ativa, mostrando geral por padrão');
            setTimeout(() => {
                switchConfigSubsection('geral');
            }, 100);
        }
        
        // Garantir que apenas a subseção ativa seja exibida
        setTimeout(() => {
            const allSubsections = document.querySelectorAll('.config-subsection');
            allSubsections.forEach(subsection => {
                if (!subsection.classList.contains('active')) {
                    subsection.style.display = 'none';
                    subsection.style.opacity = '0';
                }
            });
        }, 150);
        
        // Verificar se as subseções estão sendo encontradas
        setTimeout(() => {
            const configSubsections = document.querySelectorAll('.config-subsection');
            console.log('Subseções encontradas na seção configurações:', configSubsections.length);
            configSubsections.forEach((subsection, index) => {
                console.log(`  Subseção ${index}:`, subsection.id, 'Classe:', subsection.className);
            });
        }, 200);
    }
}

// Atualizar botão ativo
function updateActiveButton(activeButton) {
    navButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Aplicar tema
function applyTheme(theme) {
    const body = document.body;
    
    // Remover tema anterior
    body.removeAttribute('data-theme');
    
    // Aplicar novo tema
    if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
    }
    
    // Salvar preferência
    appSettings.theme = theme;
    localStorage.setItem('confnet-theme', theme);
    
    console.log('Tema aplicado:', theme);
}

// Função para carregar tema salvo
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeSelect = document.getElementById('theme');
    
    if (themeSelect) {
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    }
}

// Função para salvar configurações
async function saveSettings() {
    const themeSelect = document.getElementById('theme');
    const languageSelect = document.getElementById('language');
    const notificationsCheckbox = document.getElementById('notifications');
    const backupCheckbox = document.getElementById('auto-backup');
    
    if (themeSelect) {
        const selectedTheme = themeSelect.value;
        applyTheme(selectedTheme);
    }
    
    try {
        // Salvar configurações no banco SQLite
        const settings = {
            theme: themeSelect ? themeSelect.value : 'light',
            language: languageSelect ? languageSelect.value : 'pt-BR',
            notifications: notificationsCheckbox ? notificationsCheckbox.checked : true,
            backup: backupCheckbox ? backupCheckbox.checked : true
        };
        
        // Salvar cada configuração individualmente
        await window.dbClient.setSetting('confnet-settings', settings);
        
        // Salvar tema separadamente para compatibilidade
        await window.dbClient.setSetting('confnet-theme', settings.theme);
        
        console.log('Configurações salvas no banco SQLite:', settings);
        
        // Mostrar mensagem de sucesso
        alert('Configurações salvas com sucesso!');
        
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        
        // Fallback para localStorage se houver erro
        try {
            const settings = {
                theme: themeSelect ? themeSelect.value : 'light',
                language: languageSelect ? languageSelect.value : 'pt-BR',
                notifications: notificationsCheckbox ? notificationsCheckbox.checked : true,
                backup: backupCheckbox ? backupCheckbox.checked : true
            };
            
            localStorage.setItem('confnet-settings', JSON.stringify(settings));
            localStorage.setItem('confnet-theme', settings.theme);
            
            alert('Configurações salvas com sucesso! (modo de compatibilidade)');
            
        } catch (fallbackError) {
            console.error('Erro no fallback do localStorage:', fallbackError);
            alert('Erro ao salvar configurações: ' + error.message);
        }
    }
}

// Função para carregar configurações salvas
async function loadSettings() {
    try {
        // Tentar carregar do banco SQLite primeiro
        const allSettings = await window.dbClient.getAllSettings();
        
        let settings = {};
        
        // Verificar se há configurações salvas
        if (allSettings && allSettings['confnet-settings']) {
            settings = allSettings['confnet-settings'];
        }
        
        // Verificar tema separado para compatibilidade
        if (allSettings && allSettings['confnet-theme']) {
            settings.theme = allSettings['confnet-theme'];
        }
        
        console.log('Configurações carregadas do banco SQLite:', settings);
        
        // Aplicar configurações se existirem
        if (Object.keys(settings).length > 0) {
            applyLoadedSettings(settings);
        } else {
            // Se não há configurações no banco, tentar localStorage
            await loadSettingsFromLocalStorage();
        }
        
    } catch (error) {
        console.error('Erro ao carregar configurações do banco:', error);
        
        // Fallback para localStorage
        await loadSettingsFromLocalStorage();
    }
}

// Função auxiliar para aplicar configurações carregadas
function applyLoadedSettings(settings) {
    // Aplicar tema
    if (settings.theme) {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = settings.theme;
            applyTheme(settings.theme);
        }
    }
    
    // Aplicar outras configurações
    const languageSelect = document.getElementById('language');
    const notificationsCheckbox = document.getElementById('notifications');
    const backupCheckbox = document.getElementById('auto-backup');
    
    if (languageSelect && settings.language) {
        languageSelect.value = settings.language;
    }
    
    if (notificationsCheckbox && settings.notifications !== undefined) {
        notificationsCheckbox.checked = settings.notifications;
    }
    
    if (backupCheckbox && settings.backup !== undefined) {
        backupCheckbox.checked = settings.backup;
    }
}

// Função auxiliar para carregar do localStorage (fallback)
async function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('confnet-settings');
        
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('Fallback: configurações do localStorage:', settings);
            applyLoadedSettings(settings);
        }
    } catch (error) {
        console.error('Erro no fallback do localStorage:', error);
    }
}

// Event listeners para mudanças de tema
function setupThemeListeners() {
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            applyTheme(this.value);
        });
    }
}

// Event listener para o botão salvar
function setupSaveButton() {
    const saveButton = document.querySelector('.save-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
    }
}

// Funções do dashboard
function refreshSystemInfo() {
    console.log('Atualizando informações do sistema...');
    loadNetworkConsolidated();
    loadProxyInfo();
}

// Carregar informações de rede consolidadas
async function loadNetworkConsolidated() {
    const networkContainer = document.getElementById('network-consolidated');
    if (!networkContainer) return;
    
    try {
        networkContainer.innerHTML = '<p class="loading">Carregando interfaces de rede...</p>';
        
        if (!window.ConfNet || !window.ConfNet.getNetworkDetails) {
            throw new Error('API getNetworkDetails não disponível');
        }
        
        // Obter detalhes da interface Ethernet
        const networkDetails = await window.ConfNet.getNetworkDetails();
        console.log('Detalhes da rede obtidos:', networkDetails);
        
        if (networkDetails.error) {
            throw new Error(networkDetails.error);
        }
        
        if (!networkDetails) {
            networkContainer.innerHTML = '<p class="error">Não foi possível obter detalhes da rede</p>';
            return;
        }
        
        // Determinar tipo de configuração
        const configType = networkDetails.DHCPEnabled ? 'DHCP' : 'IP Estático';
        const configClass = networkDetails.DHCPEnabled ? 'dhcp' : 'static';
        
        // Gerar HTML para interface Ethernet
        let html = `
            <div class="network-item ethernet">
                <div class="network-info">
                    <div class="network-name">${networkDetails.InterfaceName}</div>
                    <div class="network-details">
                        <span class="mac-address">MAC: ${networkDetails.MacAddress}</span>
                        <span class="speed">Velocidade: ${networkDetails.LinkSpeed || 'N/A'}</span>
                        <span class="ip-address">IP: ${networkDetails.IPv4Address}</span>
                        <span class="config-type ${configClass} clickable" onclick="showNetworkModal(${JSON.stringify(networkDetails).replace(/"/g, '&quot;')})">Config: ${configType}</span>
                        ${networkDetails.Gateway ? `<span class="gateway">Gateway: ${networkDetails.Gateway}</span>` : ''}
                    </div>
                </div>
                <div class="network-status">
                    <div class="status-indicator ${networkDetails.Status.toLowerCase() === 'up' ? 'online' : 'offline'}"></div>
                    <span class="status-text">${networkDetails.Status}</span>
                </div>
            </div>
        `;
        
        // Adicionar Wi-Fi se disponível (usando dados básicos)
        if (window.ConfNet.getNetworkAdapters) {
            try {
                const adapters = await window.ConfNet.getNetworkAdapters();
                const wifiAdapter = adapters.find(adapter => 
                    adapter.Name.toLowerCase() === 'wi-fi' || 
                    adapter.Name.toLowerCase() === 'wifi' || 
                    adapter.Name.toLowerCase() === 'wireless'
                );
                
                if (wifiAdapter) {
                    html += `
                        <div class="network-item wifi">
                            <div class="network-info">
                                <div class="network-name">${wifiAdapter.Name}</div>
                                <div class="network-details">
                                    <span class="mac-address">MAC: ${wifiAdapter.MacAddress}</span>
                                    <span class="speed">Velocidade: ${wifiAdapter.LinkSpeed || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="network-status">
                                <div class="status-indicator ${wifiAdapter.Status.toLowerCase() === 'up' ? 'online' : 'offline'}"></div>
                                <span class="status-text">${wifiAdapter.Status}</span>
                            </div>
                        </div>
                    `;
                }
            } catch (wifiError) {
                console.log('Wi-Fi não disponível:', wifiError);
            }
        }
        
        networkContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar informações de rede:', error);
        networkContainer.innerHTML = `<p class="error">Erro ao carregar informações de rede: ${error.message}</p>`;
    }
}

// Carregar informações de proxy
async function loadProxyInfo() {
    console.log('=== LOAD PROXY INFO ===');
    const proxyContainer = document.getElementById('proxy-info');
    if (!proxyContainer) {
        console.error('Elemento proxy-info não encontrado!');
        return;
    }
    console.log('Container de proxy encontrado:', proxyContainer);
    
    try {
        proxyContainer.innerHTML = '<p class="loading">Carregando configurações de proxy...</p>';
        
        console.log('Verificando API ConfNet:', window.ConfNet);
        if (!window.ConfNet || !window.ConfNet.getCurrentProxySettings) {
            throw new Error('API getCurrentProxySettings não disponível');
        }
        
        console.log('Chamando getCurrentProxySettings...');
        const proxySettings = await window.ConfNet.getCurrentProxySettings();
        console.log('Configurações de proxy obtidas:', proxySettings);
        
        if (!proxySettings) {
            proxyContainer.innerHTML = '<p class="error">Não foi possível obter configurações de proxy</p>';
            return;
        }
        
        const isEnabled = proxySettings.ProxyEnable === 1;
        const statusClass = isEnabled ? 'online' : 'offline';
        
        let html = '';
        
        if (isEnabled && proxySettings.ProxyServer) {
            // Separar IP e porta do ProxyServer
            const serverParts = proxySettings.ProxyServer.split(':');
            const proxyIP = serverParts[0] || proxySettings.ProxyServer;
            const proxyPort = serverParts[1] || '';
            
            html = `
                <div class="proxy-item">
                    <div class="mac-info">
                        <div class="mac-name">Status do Proxy</div>
                        <div class="mac-address">${proxyIP}:${proxyPort}</div>
                    </div>
                    <div class="mac-status">
                        <div class="status-indicator ${statusClass}"></div>
                        <span class="status-text">HABILITADO</span>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="proxy-item">
                    <div class="mac-info">
                        <div class="mac-name">Status do Proxy</div>
                        <div class="mac-address">Desabilitado</div>
                    </div>
                    <div class="mac-status">
                        <div class="status-indicator ${statusClass}"></div>
                        <span class="status-text">DESABILITADO</span>
                    </div>
                </div>
            `;
        }
        
        console.log('HTML gerado para proxy:', html);
        proxyContainer.innerHTML = html;
        console.log('HTML inserido no container');
        
    } catch (error) {
        console.error('Erro ao carregar configurações de proxy:', error);
        proxyContainer.innerHTML = `<p class="error">Erro ao carregar configurações de proxy: ${error.message}</p>`;
    }
    
    console.log('=== FIM LOAD PROXY INFO ===');
}

// Função para mostrar o modal de configurações de rede
function showNetworkModal(networkDetails) {
    console.log('Abrindo modal com detalhes:', networkDetails);
    
    // Configurar status de configuração IP
    const ipStatusText = document.getElementById('ip-status-text');
    const ipConfigStatus = document.getElementById('ip-config-status');
    
    if (networkDetails.DHCPEnabled) {
        // DHCP ativo - campos devem ficar vazios
        ipStatusText.textContent = 'DHCP (Automático)';
        ipStatusText.className = 'status-value dhcp';
        ipConfigStatus.className = 'status-item dhcp-active';
        
        // Limpar campos IP para DHCP
        document.getElementById('modal-ip-display').textContent = 'Obtido automaticamente';
        document.getElementById('modal-subnet-display').textContent = 'Obtido automaticamente';
        document.getElementById('modal-gateway-display').textContent = 'Obtido automaticamente';
    } else {
        // IP estático - preencher campos com valores reais
        ipStatusText.textContent = 'IP Estático (Manual)';
        ipStatusText.className = 'status-value static';
        ipConfigStatus.className = 'status-item static-active';
        
        // Preencher campos IP com valores reais
        document.getElementById('modal-ip-display').textContent = networkDetails.IPv4Address || 'N/A';
        document.getElementById('modal-subnet-display').textContent = '255.255.255.0';
        document.getElementById('modal-gateway-display').textContent = networkDetails.Gateway || 'N/A';
    }
    
    // Configurar status de DNS (assumindo DHCP para DNS também)
    const dnsStatusText = document.getElementById('dns-status-text');
    const dnsConfigStatus = document.getElementById('dns-config-status');
    
    if (networkDetails.DHCPEnabled) {
        // DHCP ativo - DNS também automático
        dnsStatusText.textContent = 'DHCP (Automático)';
        dnsStatusText.className = 'status-value dhcp';
        dnsConfigStatus.className = 'status-item dhcp-active';
        
        // Limpar campos DNS para DHCP
        document.getElementById('modal-dns-primary-display').textContent = 'Obtido automaticamente';
        document.getElementById('modal-dns-secondary-display').textContent = 'Obtido automaticamente';
    } else {
        // IP estático - verificar DNS real configurado
        dnsStatusText.textContent = 'Manual (Configurado)';
        dnsStatusText.className = 'status-value static';
        dnsConfigStatus.className = 'status-item static-active';
        
        // Usar DNS real do Windows se disponível
        if (networkDetails.DNSServers && networkDetails.DNSServers.length > 0) {
            document.getElementById('modal-dns-primary-display').textContent = networkDetails.DNSServers[0] || 'Não configurado';
            document.getElementById('modal-dns-secondary-display').textContent = networkDetails.DNSServers[1] || 'Não configurado';
        } else {
            // Se não tiver DNS configurado, mostrar vazio
            document.getElementById('modal-dns-primary-display').textContent = 'Não configurado';
            document.getElementById('modal-dns-secondary-display').textContent = 'Não configurado';
        }
    }
    
    // Mostrar o modal
    document.getElementById('network-modal').style.display = 'block';
}

// Função para fechar o modal
function closeNetworkModal() {
    document.getElementById('network-modal').style.display = 'none';
}

// ===== SISTEMA DE FILIAIS =====

// Função para abrir modal de nova filial
async function openNewBranchModal(companyId) {
    console.log('=== ABRINDO MODAL PARA NOVA FILIAL ===');
    
    // Resetar estado de edição
    editingBranchId = null;
    const titleElement = document.getElementById('branch-modal-title');
    if (titleElement) {
        titleElement.textContent = 'Nova Filial';
    }
    
    const modal = document.getElementById('branch-modal');
    const form = document.getElementById('branch-form');
    
    // Garantir que o modal esteja visível
    if (modal) {
        modal.style.display = 'block';
    }
    
    // Reset completo do form
    if (form) {
        form.reset();
        console.log('Formulário resetado na abertura');
        
        // Forçar limpeza de todos os campos
        const allInputs = form.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Configurar checkbox proxy como ativo por padrão
        const proxyActiveCheckbox = document.getElementById('branch-proxy-active');
        if (proxyActiveCheckbox) {
            proxyActiveCheckbox.checked = true;
        }
        
        console.log('Todos os campos forçadamente limpos na abertura');
    }
    
    // Limpar campos específicos explicitamente
    const companySelect = document.getElementById('branch-company');
    const nameInput = document.getElementById('branch-name');
    const addressInput = document.getElementById('branch-address');
    const proxyIPInput = document.getElementById('branch-proxy-ip');
    const proxyPortInput = document.getElementById('branch-proxy-port');
    
    if (companySelect) companySelect.value = '';
    if (nameInput) nameInput.value = '';
    if (addressInput) addressInput.value = '';
    if (proxyIPInput) proxyIPInput.value = '';
    if (proxyPortInput) proxyPortInput.value = '';
    
    // Remover atributos de dados residuais
    if (form) {
        form.removeAttribute('data-company-id');
        form.removeAttribute('data-branch-id');
        console.log('Atributos de dados removidos na abertura');
    }
    
    // Carregar lista de empresas no select
    await loadCompaniesForSelect();
    
    // Se foi passado companyId, pré-selecionar
    if (companyId && companySelect) {
        companySelect.value = companyId;
        console.log('Empresa pré-selecionada:', companyId);
    }
    
    // Focar no campo correto
    setTimeout(() => {
        if (companySelect) {
            companySelect.focus();
            console.log('Foco definido no select de empresa');
        }
    }, 100);
    
    console.log('=== MODAL ABERTO E COMPLETAMENTE LIMPO ===');
}

// Função para fechar modal de filial
function closeBranchModal() {
    console.log('=== FECHANDO MODAL DE FILIAL ===');
    
    const modal = document.getElementById('branch-modal');
    const form = document.getElementById('branch-form');
    
    // Ocultar modal
    modal.style.display = 'none';
    
    // Reset completo do form
    if (form) {
        form.reset();
        console.log('Formulário resetado');
        
        // Forçar limpeza de todos os campos
        const allInputs = form.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Configurar checkbox proxy como ativo por padrão
        const proxyActiveCheckbox = document.getElementById('branch-proxy-active');
        if (proxyActiveCheckbox) {
            proxyActiveCheckbox.checked = true;
        }
        
        console.log('Todos os campos forçadamente limpos');
    }
    
    // Limpar campos específicos explicitamente
    const companySelect = document.getElementById('branch-company');
    const nameInput = document.getElementById('branch-name');
    const addressInput = document.getElementById('branch-address');
    const proxyIPInput = document.getElementById('branch-proxy-ip');
    const proxyPortInput = document.getElementById('branch-proxy-port');
    
    if (companySelect) companySelect.value = '';
    if (nameInput) nameInput.value = '';
    if (addressInput) addressInput.value = '';
    if (proxyIPInput) proxyIPInput.value = '';
    if (proxyPortInput) proxyPortInput.value = '';
    
    // Resetar estado
    editingBranchId = null;
    const titleElement = document.getElementById('branch-modal-title');
    if (titleElement) {
        titleElement.textContent = 'Nova Filial';
    }
    
    // Remover qualquer atributo de dados residual
    if (form) {
        form.removeAttribute('data-company-id');
        form.removeAttribute('data-branch-id');
        console.log('Atributos de dados removidos');
    }
    
    // Forçar limpeza adicional após um pequeno delay
    setTimeout(() => {
        if (form) {
            form.reset();
            console.log('Formulário resetado novamente após timeout');
        }
    }, 50);
    
    console.log('=== MODAL FECHADO E COMPLETAMENTE LIMPO ===');
}

// Função para salvar filial
async function saveBranch() {
    console.log('=== INÍCIO DA FUNÇÃO saveBranch ===');
    console.log('Salvando filial, modo edição:', editingBranchId ? 'sim' : 'não');
    console.log('Valor de editingBranchId:', editingBranchId);
    
    const form = document.getElementById('branch-form');
    if (!form) {
        console.error('Form não encontrado!');
        alert('Erro: Formulário não encontrado');
        return;
    }
    console.log('Form encontrado:', form);
    
    const formData = new FormData(form);
    console.log('FormData criado com sucesso');
    
    // Log de todos os campos do formulário
    console.log('=== CAMPOS DO FORMULÁRIO ===');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }
    
    const branchName = formData.get('branch-name').trim();
    console.log('Nome da filial:', branchName);
    if (!branchName) {
        alert('Por favor, preencha o nome da filial');
        return;
    }
    
    const proxyIP = formData.get('branch-proxy-ip').trim();
    const proxyPort = formData.get('branch-proxy-port').trim();
    console.log('Proxy IP:', proxyIP, 'Porta:', proxyPort);
    
    // Validação básica de IP
    if (proxyIP && !isValidIP(proxyIP)) {
        alert('Por favor, insira um IP válido (ex: 192.168.1.100)');
        return;
    }
    
    // Validação de porta
    if (proxyPort && (!isValidPort(proxyPort) || proxyPort < 1 || proxyPort > 65535)) {
        alert('Por favor, insira uma porta válida (1-65535)');
        return;
    }
    
    const companyId = parseInt(formData.get('branch-company'));
    console.log('ID da empresa selecionada:', companyId);
    if (!companyId) {
        alert('Por favor, selecione uma empresa');
        return;
    }
    
    const branchData = {
        companyId: companyId,
        name: branchName,
        address: formData.get('branch-address').trim(),
        proxyIP: proxyIP,
        proxyPort: proxyPort ? parseInt(proxyPort) : null,
        proxyActive: formData.get('branch-proxy-active') === 'on'
    };
    
    console.log('Dados da filial a salvar:', branchData);
    
    try {
        let result;
        
        if (editingBranchId) {
            // Atualizar filial existente
            result = await window.dbClient.updateBranch(editingBranchId, branchData);
            console.log('Filial atualizada:', result);
        } else {
            // Criar nova filial
            result = await window.dbClient.createBranch(branchData);
            console.log('Nova filial criada:', result);
        }
        
        // Fechar modal e limpar estado
        console.log('Chamando closeBranchModal...');
        closeBranchModal();
        console.log('Modal fechado após salvar');
        
        // Recarregar dados
        console.log('Recarregando empresas...');
        await loadCompanies(); // Recarregar lista de empresas
        
        // Recarregar filiais se a empresa estiver selecionada
        if (selectedCompanyId === companyId) {
            console.log('Recarregando filiais da empresa selecionada...');
            await loadBranches(companyId);
        }
        
        const message = editingBranchId ? 'Filial atualizada com sucesso!' : 'Filial criada com sucesso!';
        alert(message);
        
        // Resetar estado de edição
        editingBranchId = null;
        
        console.log('Operação de filial concluída com sucesso');
        
    } catch (error) {
        console.error('Erro ao salvar filial:', error);
        alert('Erro ao salvar filial: ' + error.message);
    }
}

// Função para editar filial
async function editBranch(branchId, companyId) {
    console.log('Editando filial ID:', branchId, 'da empresa ID:', companyId);
    
    try {
        // Buscar dados da empresa e filial no banco
        const companies = await window.dbClient.getCompanies();
        const company = companies.find(c => c.id === companyId);
        
        if (!company || !company.branches) {
            alert('Erro: Empresa ou filiais não encontradas');
            return;
        }
        
        const branch = company.branches.find(b => b.id === branchId);
        
        if (branch) {
            editingBranchId = branchId;
            document.getElementById('branch-modal-title').textContent = 'Editar Filial';
            
            const modal = document.getElementById('branch-modal');
            const form = document.getElementById('branch-form');
            
            // Reset simples do form
            if (form) {
                form.reset();
            }
            
            // Carregar empresas no select
            await loadCompaniesForSelect();
        
        // Preencher campos com verificações de segurança
        const companySelect = document.getElementById('branch-company');
        const nameInput = document.getElementById('branch-name');
        const addressInput = document.getElementById('branch-address');
        const proxyIPInput = document.getElementById('branch-proxy-ip');
        const proxyPortInput = document.getElementById('branch-proxy-port');
        const proxyActiveCheckbox = document.getElementById('branch-proxy-active');
        
        if (companySelect) companySelect.value = companyId;
        if (nameInput) nameInput.value = branch.name || '';
        if (addressInput) addressInput.value = branch.address || '';
        if (proxyIPInput) proxyIPInput.value = branch.proxyIP || '';
        if (proxyPortInput) proxyPortInput.value = branch.proxyPort || '';
        if (proxyActiveCheckbox) proxyActiveCheckbox.checked = branch.proxyActive !== false;
        
        // Mostrar modal
        modal.style.display = 'block';
        
        // Focar no campo correto
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
        
            console.log('Modal aberto para edição da filial:', branch.name);
        } else {
            console.error('Filial não encontrada para edição:', branchId);
            alert('Erro: Filial não encontrada');
        }
        
    } catch (error) {
        console.error('Erro ao editar filial:', error);
        alert('Erro ao carregar dados da filial: ' + error.message);
    }
}

// Função para excluir filial
async function deleteBranch(branchId, companyId) {
    if (confirm('Tem certeza que deseja excluir esta filial? Esta ação não pode ser desfeita.')) {
        try {
            console.log('Excluindo filial ID:', branchId, 'da empresa ID:', companyId);
            
            const result = await window.dbClient.deleteBranch(branchId);
            
            if (result.deleted) {
                // Recarregar dados
                await loadCompanies(); // Recarregar lista de empresas
                
                // Recarregar filiais se a empresa estiver selecionada
                if (selectedCompanyId === companyId) {
                    await loadBranches(companyId);
                }
                
                alert('Filial excluída com sucesso!');
                
                console.log('Filial excluída com sucesso');
            } else {
                alert('Erro: Filial não encontrada ou já foi excluída.');
            }
            
        } catch (error) {
            console.error('Erro ao excluir filial:', error);
            alert('Erro ao excluir filial: ' + error.message);
        }
    }
}

// Função para testar conectividade do proxy
function testProxyConnection(branchId, companyId) {
    console.log('Testando conectividade do proxy para filial ID:', branchId);
    
    const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
    const company = companies.find(c => c.id === companyId);
    
    if (!company || !company.branches) {
        alert('Erro: Empresa ou filiais não encontradas');
        return;
    }
    
    const branch = company.branches.find(b => b.id === branchId);
    
    if (!branch || !branch.proxyIP || !branch.proxyPort) {
        alert('Esta filial não possui configurações de proxy válidas para teste');
        return;
    }
    
    const proxyAddress = `${branch.proxyIP}:${branch.proxyPort}`;
    
    // Aqui você pode implementar um teste real de conectividade
    // Por enquanto, vamos simular um teste
    alert(`Testando conectividade com proxy: ${proxyAddress}\n\nFuncionalidade de teste será implementada em breve!`);
    
    console.log('Teste de proxy solicitado para:', proxyAddress);
}

// Funções auxiliares de validação
function isValidIP(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
    });
}

function isValidPort(port) {
    const num = parseInt(port);
    return !isNaN(num) && num >= 1 && num <= 65535;
}

// Função para selecionar uma empresa e mostrar suas filiais
function selectCompany(companyId) {
    console.log('=== SELECIONANDO EMPRESA ===');
    console.log('Empresa ID a ser selecionada:', companyId);
    console.log('Empresa ID atualmente selecionada:', selectedCompanyId);
    
    // Se clicar na mesma empresa, desmarcar
    if (selectedCompanyId === companyId) {
        console.log('Clicando na mesma empresa, desmarcando seleção');
        selectedCompanyId = null;
        
        // Remover seleção visual
        const allCompanyItems = document.querySelectorAll('.company-item');
        allCompanyItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // Desabilitar botão de adicionar filial
        const addBranchBtn = document.getElementById('add-branch-btn');
        if (addBranchBtn) {
            addBranchBtn.disabled = true;
        }
        
        // Limpar conteúdo das filiais
        const branchesContent = document.getElementById('branches-content');
        if (branchesContent) {
            branchesContent.innerHTML = `
                <div class="no-company-selected">
                    <p>Selecione uma empresa para ver suas filiais</p>
                </div>
            `;
        }
        
        console.log('=== SELECÃO DESMARCADA ===');
        return;
    }
    
    // Atualizar empresa selecionada
    selectedCompanyId = companyId;
    
    // Atualizar visual das empresas (remover seleção anterior)
    const allCompanyItems = document.querySelectorAll('.company-item');
    console.log('Total de empresas encontradas:', allCompanyItems.length);
    
    allCompanyItems.forEach((item, index) => {
        const itemCompanyId = item.getAttribute('data-company-id');
        const wasSelected = item.classList.contains('selected');
        item.classList.remove('selected');
        console.log(`Empresa ${index + 1} (ID: ${itemCompanyId}): seleção removida (era selecionada: ${wasSelected})`);
    });
    
    // Adicionar seleção na empresa clicada
    const selectedItem = document.querySelector(`[data-company-id="${companyId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        console.log(`Empresa ${companyId} marcada como selecionada`);
    } else {
        console.error(`Empresa com ID ${companyId} não encontrada no DOM`);
    }
    
    // Habilitar botão de adicionar filial
    const addBranchBtn = document.getElementById('add-branch-btn');
    if (addBranchBtn) {
        addBranchBtn.disabled = false;
        addBranchBtn.onclick = () => openNewBranchModal(companyId);
        console.log('Botão de adicionar filial habilitado');
    }
    
    // Carregar e exibir filiais da empresa selecionada
    loadBranches(companyId);
    
    console.log('=== EMPRESA SELECIONADA COM SUCESSO ===');
}

// Função para carregar empresas no select do modal de filiais
async function loadCompaniesForSelect() {
    console.log('=== CARREGANDO EMPRESAS NO SELECT ===');
    
    try {
        const companies = await window.dbClient.getCompanies();
        console.log('Empresas encontradas no banco:', companies.length);
        console.log('Empresas:', companies);
        
        const select = document.getElementById('branch-company');
        if (!select) {
            console.error('Select branch-company não encontrado!');
            return;
        }
        console.log('Select encontrado:', select);
        
        // Limpar opções existentes (mantendo a primeira)
        select.innerHTML = '<option value="">Selecione uma empresa</option>';
        console.log('Select limpo, opção padrão adicionada');
        
        // Adicionar empresas
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            select.appendChild(option);
            console.log(`Opção adicionada: ${company.name} (ID: ${company.id})`);
        });
        
        console.log('Total de opções no select:', select.options.length);
        console.log('=== EMPRESAS CARREGADAS NO SELECT ===');
        
    } catch (error) {
        console.error('Erro ao carregar empresas no select:', error);
        
        // Fallback para localStorage em caso de erro
        console.log('Tentando fallback para localStorage...');
        const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
        console.log('Empresas encontradas no localStorage (fallback):', companies.length);
        
        const select = document.getElementById('branch-company');
        if (select) {
            select.innerHTML = '<option value="">Selecione uma empresa</option>';
            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.name;
                select.appendChild(option);
            });
        }
    }
}

// Função para carregar e exibir filiais de uma empresa
async function loadBranches(companyId) {
    console.log('Carregando filiais para empresa ID:', companyId);
    
    try {
        // Buscar filiais do banco SQLite
        const branches = await window.dbClient.getBranches(companyId);
        
        // Buscar dados da empresa também
        const companies = await window.dbClient.getCompanies();
        const company = companies.find(c => c.id === companyId);
        
        if (!company) {
            console.error('Empresa não encontrada:', companyId);
            return;
        }
        
        displayBranches(branches, company);
        
    } catch (error) {
        console.error('Erro ao carregar filiais:', error);
        
        // Fallback para localStorage se houver erro
        try {
            const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
            const company = companies.find(c => c.id === companyId);
            
            if (company) {
                const branches = company.branches || [];
                displayBranches(branches, company);
            }
        } catch (fallbackError) {
            console.error('Erro no fallback do localStorage:', fallbackError);
        }
    }
}

// Função para exibir filiais no card direito
function displayBranches(branches, company) {
    const branchesContent = document.getElementById('branches-content');
    if (!branchesContent) return;
    
    if (branches.length === 0) {
        branchesContent.innerHTML = `
            <div class="no-branches">
                <p>Esta empresa ainda não possui filiais</p>
                <button class="btn-primary" onclick="openNewBranchModal(${company.id})">+ Criar Primeira Filial</button>
            </div>
        `;
        return;
    }
    
    const branchesHTML = branches.map(branch => `
        <div class="branch-item" data-branch-id="${branch.id}">
            <div class="branch-info">
                <div class="branch-name">${branch.name}</div>
                <div class="branch-details">
                    ${branch.address ? `<br>${branch.address}` : ''}
                    ${branch.proxyIP ? `<br><strong>Proxy:</strong> ${branch.proxyIP}:${branch.proxyPort || 'N/A'}` : ''}
                    ${branch.proxyActive ? '<span class="status-active">Ativo</span>' : '<span class="status-inactive">Inativo</span>'}
                </div>
            </div>
            <div class="branch-actions">
                <button class="btn-test" onclick="testProxyConnection(${branch.id}, ${company.id})">Testar</button>
                <button class="btn-edit" onclick="editBranch(${branch.id}, ${company.id})">Editar</button>
                <button class="btn-delete" onclick="deleteBranch(${branch.id}, ${company.id})">Excluir</button>
            </div>
        </div>
    `).join('');
    
    branchesContent.innerHTML = branchesHTML;
    
    console.log('Filiais exibidas:', branches.length);
}

// Função para forçar limpeza completa do modal de filiais
function forceCleanBranchModal() {
    console.log('Forçando limpeza completa do modal de filiais');
    
    const modal = document.getElementById('branch-modal');
    const form = document.getElementById('branch-form');
    
    if (!modal || !form) return;
    
    // Ocultar modal
    modal.style.display = 'none';
    
    // Forçar reset completo do form
    form.reset();
    
    // Remover todos os atributos do form
    const attributes = form.getAttributeNames();
    attributes.forEach(attr => {
        form.removeAttribute(attr);
    });
    
    // Forçar limpeza de todos os campos
    const allInputs = modal.querySelectorAll('input, select, textarea');
    allInputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
        // Remover atributos de validação
        input.removeAttribute('required');
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
    });
    
    // Limpar select de empresas especificamente
    const companySelect = document.getElementById('branch-company');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">Selecione uma empresa</option>';
        companySelect.value = '';
    }
    
    // Resetar estado
    editingBranchId = null;
    document.getElementById('branch-modal-title').textContent = 'Nova Filial';
    
    console.log('Limpeza forçada do modal concluída');
}

// Função para expandir/recolher filiais de uma empresa (mantida para compatibilidade)
function toggleBranches(companyId) {
    const branchesContainer = document.getElementById(`branches-${companyId}`);
    const toggleButton = document.getElementById(`toggle-${companyId}`);
    
    if (branchesContainer.style.display === 'none' || !branchesContainer.style.display) {
        branchesContainer.style.display = 'block';
        toggleButton.textContent = '▼ Recolher Filiais';
        toggleButton.classList.add('expanded');
    } else {
        branchesContainer.style.display = 'none';
        toggleButton.textContent = '▶ Expandir Filiais';
        toggleButton.classList.remove('expanded');
    }
}

// Fechar modal quando clicar fora dele
window.addEventListener('click', function(event) {
    const companyModal = document.getElementById('company-modal');
    const branchModal = document.getElementById('branch-modal');
    
    if (event.target === companyModal) {
        closeCompanyModal();
    }
    
    if (event.target === branchModal) {
        closeBranchModal();
    }
});

// Fechar modal de filiais com tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const branchModal = document.getElementById('branch-modal');
        if (branchModal && branchModal.style.display === 'block') {
            closeBranchModal();
        }
    }
});

// Fechar modal com tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeCompanyModal();
        closeBranchModal();
    }
});

// Exportar funções para uso global (útil para debugging)
window.ConfNet = {
    showSection,
    applyTheme,
    changeLanguage,
    toggleNotifications,
    saveSettings,
    loadSettings,
    appSettings,
    currentConfig,
    proxyConfigs,
    selectCompany,
    selectBranch,
    selectConnection,
    applyProxyConfig
};

// Exportar funções de empresas para uso global
window.editCompany = editCompany;
window.deleteCompany = deleteCompany;
window.openNewCompanyModal = openNewCompanyModal;
window.closeCompanyModal = closeCompanyModal;
window.saveCompany = saveCompany;
window.clearAllCompanies = clearAllCompanies;
window.addGridBranches = addGridBranches;

// Exportar funções de filiais para uso global
window.openNewBranchModal = openNewBranchModal;
window.closeBranchModal = closeBranchModal;
window.saveBranch = saveBranch;
window.editBranch = editBranch;
window.deleteBranch = deleteBranch;
window.testProxyConnection = testProxyConnection;
window.toggleBranches = toggleBranches;
window.selectCompany = selectCompany;
window.loadBranches = loadBranches;
window.displayBranches = displayBranches;
window.loadCompaniesForSelect = loadCompaniesForSelect;
window.forceCleanBranchModal = forceCleanBranchModal;

// Função para limpar todas as empresas
function clearAllCompanies() {
    if (confirm('Tem certeza que deseja excluir TODAS as empresas? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('confnet-companies');
        loadCompanies();
        alert('Todas as empresas foram removidas!');
    }
}

// Função para adicionar filiais do GRID automaticamente
function addGridBranches() {
    console.log('=== INÍCIO DA FUNÇÃO addGridBranches ===');
    console.log('Adicionando filiais do GRID...');
    
    // Verificar se GRID já existe
    let companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
    console.log('Empresas existentes:', companies.length);
    
    let gridCompany = companies.find(c => c.name === 'GRID');
    console.log('Empresa GRID encontrada:', gridCompany ? 'sim' : 'não');
    
    // Se GRID não existir, criar
    if (!gridCompany) {
        gridCompany = {
            id: Date.now(),
            name: 'GRID',
            description: 'Empresa GRID',
            address: '',
            phone: '',
            branches: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        companies.push(gridCompany);
        console.log('Empresa GRID criada com ID:', gridCompany.id);
    }
    
    console.log('Filiais existentes na GRID:', gridCompany.branches.length);
    
    // Filiais do GRID com seus proxies
    const gridBranches = [
        { name: 'Campo Largo', proxyIP: '10.0.10.1', proxyPort: 3128 },
        { name: 'Avenida', proxyIP: '10.0.70.1', proxyPort: 3128 },
        { name: 'Corupa', proxyIP: '10.0.20.1', proxyPort: 3128 },
        { name: 'Jaragua', proxyIP: '10.0.30.1', proxyPort: 3128 },
        { name: 'Vila Nova', proxyIP: '10.0.40.1', proxyPort: 3128 },
        { name: 'Garuva', proxyIP: '10.0.60.1', proxyPort: 3128 },
        { name: 'Itapoa', proxyIP: '10.0.50.1', proxyPort: 3128 }
    ];
    
    // Adicionar filiais se não existirem
    let branchesAdded = 0;
    gridBranches.forEach(branchData => {
        const existingBranch = gridCompany.branches.find(b => b.name === branchData.name);
        if (!existingBranch) {
            const newBranch = {
                id: Date.now() + Math.random(),
                companyId: gridCompany.id,
                name: branchData.name,
                address: '',
                proxyIP: branchData.proxyIP,
                proxyPort: branchData.proxyPort,
                proxyActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            gridCompany.branches.push(newBranch);
            branchesAdded++;
            console.log(`Filial ${branchData.name} adicionada com ID:`, newBranch.id);
        } else {
            console.log(`Filial ${branchData.name} já existe`);
        }
    });
    
    console.log('Total de filiais adicionadas:', branchesAdded);
    console.log('Total de filiais na GRID após adição:', gridCompany.branches.length);
    
    // Salvar no localStorage
    localStorage.setItem('confnet-companies', JSON.stringify(companies));
    console.log('Dados salvos no localStorage');
    
    // Recarregar interface
    loadCompanies();
    console.log('Interface recarregada');
    
    // Se GRID estiver selecionada, recarregar filiais
    if (selectedCompanyId === gridCompany.id) {
        loadBranches(gridCompany.id);
        console.log('Filiais recarregadas na interface');
    }
    
    if (branchesAdded > 0) {
        console.log(`${branchesAdded} filiais do GRID foram adicionadas automaticamente`);
    } else {
        console.log('Todas as filiais do GRID já existem');
    }
    
    console.log('=== FIM DA FUNÇÃO addGridBranches ===');
}

// ===== SISTEMA DE AUTENTICAÇÃO PARA CONFIGURAÇÕES =====

// Função para abrir o modal de login
function openLoginModal() {
    console.log('=== OPEN LOGIN MODAL ===');
    
    const loginModal = document.getElementById('login-modal');
    console.log('Modal de login encontrado:', loginModal);
    
    if (loginModal) {
        loginModal.style.display = 'block';
        loginModal.classList.add('active');
        document.getElementById('config-password').focus();
        document.getElementById('login-error').style.display = 'none';
        console.log('Modal de login aberto com sucesso');
        
        // Garantir que a seção de configurações não seja exibida
        const configSection = document.getElementById('configuracoes');
        if (configSection) {
            configSection.classList.remove('active');
        }
        
        // Voltar para a seção inicial se não estiver autenticado
        if (!isAuthenticated) {
            showSection('inicio');
        }
    } else {
        console.error('Modal de login não encontrado!');
    }
    
    console.log('=== FIM OPEN LOGIN MODAL ===');
}

// Função para fechar o modal de login
function closeLoginModal() {
    console.log('=== CLOSE LOGIN MODAL ===');
    
    const loginModal = document.getElementById('login-modal');
    console.log('Modal de login encontrado:', loginModal);
    
    if (loginModal) {
        loginModal.style.display = 'none';
        loginModal.classList.remove('active');
        document.getElementById('config-password').value = '';
        console.log('Modal de login fechado com sucesso');
        
        // Verificar se o usuário estava tentando acessar configurações
        if (!isAuthenticated) {
            console.log('Usuário cancelou login, voltando para seção inicial');
            showSection('inicio');
        }
    } else {
        console.error('Modal de login não encontrado!');
    }
    
    console.log('=== FIM CLOSE LOGIN MODAL ===');
}

// Função para validar a senha
function validatePassword() {
    console.log('=== VALIDATE PASSWORD ===');
    
    const password = document.getElementById('config-password').value;
    const errorElement = document.getElementById('login-error');
    
    console.log('Validando senha:', password);
    console.log('Senha esperada:', CONFIG_PASSWORD);
    
    if (password === CONFIG_PASSWORD) {
        isAuthenticated = true;
        console.log('Autenticação bem-sucedida, isAuthenticated:', isAuthenticated);
        closeLoginModal();
        
        // Mostrar mensagem de sucesso
        console.log('Acesso às configurações autorizado');
        
        // Ativar botão de configurações
        const configBtn = document.querySelector('.nav-btn[data-section="configuracoes"]');
        if (configBtn) {
            configBtn.style.opacity = '1';
            configBtn.style.borderLeftColor = '#0078d4';
        }
        
        // Expandir automaticamente o menu de configurações
        const navGroup = document.querySelector('.nav-group');
        if (navGroup) {
            navGroup.classList.add('expanded');
            console.log('Menu de configurações expandido automaticamente');
        }
        
        // Mostrar seção de configurações apenas após autenticação bem-sucedida
        setTimeout(() => {
            console.log('Mostrando seção de configurações após autenticação');
            showSection('configuracoes');
        }, 100);
        
    } else {
        console.log('Senha incorreta');
        errorElement.style.display = 'block';
        document.getElementById('config-password').value = '';
        document.getElementById('config-password').focus();
    }
    
    console.log('=== FIM VALIDATE PASSWORD ===');
}

// Função para lidar com tecla Enter no campo de senha
function handlePasswordKeypress(event) {
    if (event.key === 'Enter') {
        validatePassword();
    }
}

// Função para fazer logout das configurações
function logoutConfig() {
    console.log('=== LOGOUT CONFIG ===');
    console.log('Estado de autenticação antes:', isAuthenticated);
    
    isAuthenticated = false;
    console.log('Estado de autenticação depois:', isAuthenticated);
    
    // Desativar botão de configurações
    const configBtn = document.querySelector('.nav-btn[data-section="configuracoes"]');
    if (configBtn) {
        configBtn.style.opacity = '0.8';
        configBtn.style.borderLeftColor = 'var(--border-color)';
        console.log('Botão de configurações desativado');
    }
    
    // Fechar menu de configurações
    const navGroup = document.querySelector('.nav-group');
    if (navGroup) {
        navGroup.classList.remove('expanded');
        console.log('Menu de configurações fechado');
    }
    
    // Voltar para a seção inicial
    showSection('inicio');
    
    console.log('Logout das configurações realizado');
    console.log('=== FIM LOGOUT CONFIG ===');
}

// ========================================
// FUNÇÕES DA ABA CONFIGURAR PROXY
// ========================================

// Variáveis globais para configuração de proxy (já declaradas no topo do arquivo)

// Função para navegar para o próximo passo
function nextStep() {
    // Log para o processo principal
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('info', 'Função nextStep() chamada', null, 'stepNavigation');
    }
    
    console.log('=== NEXT STEP ===');
    
    const currentStep = document.querySelector('.config-step.active');
    if (!currentStep) {
        console.error('Nenhum passo ativo encontrado!');
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('error', 'Nenhum passo ativo encontrado no DOM', null, 'stepNavigation');
        }
        return;
    }
    
    const currentStepId = currentStep.id;
    const stepNumber = parseInt(currentStepId.replace('step-', ''));
    console.log('Passo atual:', stepNumber);
    
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('debug', `Navegando do passo ${stepNumber} para o próximo`, null, 'stepNavigation');
    }
    
    if (stepNumber < 5) {
        console.log('Validando passo atual...');
        console.log('Estado atual do currentProxyConfig:', currentProxyConfig);
        
        // Validar o passo atual antes de avançar
        if (validateCurrentStep(stepNumber)) {
            console.log('Validação aprovada, avançando para próximo passo...');
            
            if (window.ConfNet && window.ConfNet.log) {
                window.ConfNet.log('info', `Validação aprovada para o passo ${stepNumber}`, null, 'validation');
            }
            
            // Esconder passo atual
            currentStep.classList.remove('active');
            console.log('Passo atual escondido');
            
            // Mostrar próximo passo
            const nextStepElement = document.getElementById(`step-${stepNumber + 1}`);
            if (nextStepElement) {
                nextStepElement.classList.add('active');
                console.log('Próximo passo ativado:', `step-${stepNumber + 1}`);
                
                if (window.ConfNet && window.ConfNet.log) {
                    window.ConfNet.log('info', `Passo ${stepNumber + 1} ativado com sucesso`, null, 'stepNavigation');
                }
                
                // Carregar dados específicos do passo se necessário
                console.log('Carregando dados do passo', stepNumber + 1);
                loadStepData(stepNumber + 1);
            } else {
                console.error('Próximo passo não encontrado:', `step-${stepNumber + 1}`);
                if (window.ConfNet && window.ConfNet.log) {
                    window.ConfNet.log('error', `Próximo passo ${stepNumber + 1} não encontrado no DOM`, null, 'stepNavigation');
                }
            }
        } else {
            console.log('Validação falhou para o passo', stepNumber);
            if (window.ConfNet && window.ConfNet.log) {
                window.ConfNet.log('warn', `Validação falhou para o passo ${stepNumber}`, null, 'validation');
            }
        }
    } else {
        console.log('Já no último passo');
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('info', 'Tentativa de avançar além do último passo', null, 'stepNavigation');
        }
    }
    
    console.log('=== FIM NEXT STEP ===');
}

// Função para voltar ao passo anterior
function previousStep() {
    const currentStep = document.querySelector('.config-step.active');
    const currentStepId = currentStep.id;
    const stepNumber = parseInt(currentStepId.replace('step-', ''));
    
    if (stepNumber > 1) {
        // Esconder passo atual
        currentStep.classList.remove('active');
        
        // Mostrar passo anterior
        const prevStep = document.getElementById(`step-${stepNumber - 1}`);
        if (prevStep) {
            prevStep.classList.add('active');
        }
    }
}

// Função para validar o passo atual
function validateCurrentStep(stepNumber) {
    switch (stepNumber) {
        case 1:
            // Verificar se uma empresa foi selecionada
            console.log('Validando passo 1 - currentProxyConfig.company:', currentProxyConfig.company);
            if (!currentProxyConfig.company) {
                console.error('Validação falhou: nenhuma empresa selecionada');
                alert('Por favor, selecione uma empresa primeiro.');
                return false;
            }
            console.log('Validação do passo 1 aprovada');
            break;
        case 2:
            // Verificar se uma filial foi selecionada
            if (!currentProxyConfig.branch) {
                alert('Por favor, selecione uma filial primeiro.');
                return false;
            }
            break;
        case 3:
            // Verificar se o tipo de conexão foi selecionado
            if (!currentProxyConfig.connectionType) {
                alert('Por favor, selecione o tipo de conexão primeiro.');
                return false;
            }
            break;
    }
    return true;
}

// Função para carregar dados específicos de cada passo
function loadStepData(stepNumber) {
    console.log('=== LOAD STEP DATA ===');
    console.log('Carregando dados para o passo:', stepNumber);
    
    switch (stepNumber) {
        case 1:
            console.log('Carregando empresas...');
            loadCompaniesForProxy();
            break;
        case 2:
            console.log('Carregando filiais...');
            loadBranchesForProxy();
            break;
        case 4:
            console.log('Mostrando resumo da configuração...');
            showConfigSummary();
            break;
        default:
            console.log('Nenhuma ação específica para o passo', stepNumber);
    }
    
    console.log('=== FIM LOAD STEP DATA ===');
}

// Função para carregar empresas no passo 1
async function loadCompaniesForProxy() {
    // Log para o processo principal
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('info', 'Carregando empresas para seleção de proxy', null, 'proxyFunctions');
    }
    
    const companySelection = document.querySelector('.company-selection');
    
    try {
        const companies = await window.dbClient.getCompanies();
        
        if (companies.length === 0) {
            if (window.ConfNet && window.ConfNet.log) {
                window.ConfNet.log('warn', 'Nenhuma empresa encontrada no banco', null, 'database');
            }
            
            companySelection.innerHTML = `
                <div class="no-companies">
                    <p>Nenhuma empresa cadastrada.</p>
                    <p>Vá para Configurações > Lojas para cadastrar empresas.</p>
                </div>
            `;
            return;
        }
        
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('info', `Encontradas ${companies.length} empresas`, companies.map(c => ({ id: c.id, name: c.name, branches: c.branches?.length || 0 })), 'database');
        }
        
        const companiesHTML = companies.map(company => `
            <div class="company-card" onclick="selectCompanyForProxy(${company.id})">
                <h4>${company.name}</h4>
                <p>${company.description || 'Empresa'}</p>
                <div class="company-branches-count">
                    ${company.branches ? company.branches.length : 0} filiais
                </div>
            </div>
        `).join('');
        
        companySelection.innerHTML = companiesHTML;
        
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('debug', 'HTML das empresas gerado e inserido', null, 'proxyFunctions');
        }
        
    } catch (error) {
        console.error('Erro ao carregar empresas para proxy:', error);
        
        // Fallback para localStorage
        try {
            const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
            
            if (companies.length === 0) {
                companySelection.innerHTML = `
                    <div class="no-companies">
                        <p>Nenhuma empresa cadastrada.</p>
                        <p>Vá para Configurações > Lojas para cadastrar empresas.</p>
                    </div>
                `;
                return;
            }
            
            const companiesHTML = companies.map(company => `
                <div class="company-card" onclick="selectCompanyForProxy(${company.id})">
                    <h4>${company.name}</h4>
                    <p>${company.description || 'Empresa'}</p>
                    <div class="company-branches-count">
                        ${company.branches ? company.branches.length : 0} filiais
                    </div>
                </div>
            `).join('');
            
            companySelection.innerHTML = companiesHTML;
            
        } catch (fallbackError) {
            console.error('Erro no fallback do localStorage:', fallbackError);
            companySelection.innerHTML = `
                <div class="no-companies">
                    <p>Erro ao carregar empresas.</p>
                </div>
            `;
        }
    }
}

// Função para selecionar empresa no proxy
async function selectCompanyForProxy(companyId) {
    try {
        console.log('=== SELECT COMPANY FOR PROXY ===');
        console.log('ID da empresa selecionada:', companyId);
        
        // Log para o processo principal
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('info', `Empresa selecionada: ID ${companyId}`, null, 'selectionEvents');
        }
    
        try {
            // Buscar empresas do banco SQLite
            const companies = await window.dbClient.getCompanies();
            console.log('Empresas no banco:', companies);
            
            const company = companies.find(c => c.id === companyId);
            console.log('Empresa encontrada:', company);
            
            if (company) {
                currentProxyConfig.company = company;
                console.log('Empresa configurada em currentProxyConfig:', currentProxyConfig.company);
                
                if (window.ConfNet && window.ConfNet.log) {
                    window.ConfNet.log('info', 'Empresa configurada no currentProxyConfig', { 
                        companyId: company.id, 
                        companyName: company.name,
                        branchesCount: company.branches?.length || 0 
                    }, 'selectionEvents');
                }
                
                // Marcar empresa selecionada
                document.querySelectorAll('.company-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Encontrar o card clicado
                const clickedCard = document.querySelector(`[onclick="selectCompanyForProxy(${companyId})"]`);
                if (clickedCard) {
                    clickedCard.classList.add('selected');
                    console.log('Card da empresa marcado como selecionado');
                }
                
                // Avançar imediatamente para o próximo passo
                console.log('Avançando imediatamente para o próximo passo...');
                console.log('Chamando nextStep()...');
                
                if (window.ConfNet && window.ConfNet.log) {
                    window.ConfNet.log('debug', 'Chamando nextStep() imediatamente após seleção de empresa', null, 'stepNavigation');
                }
                
                try {
                    nextStep();
                    console.log('nextStep() executada com sucesso');
                } catch (error) {
                    console.error('ERRO ao executar nextStep():', error);
                    if (window.ConfNet && window.ConfNet.log) {
                        window.ConfNet.log('error', `Erro ao executar nextStep(): ${error.message}`, { stack: error.stack }, 'stepNavigation');
                    }
                }
            } else {
                console.error('Empresa não encontrada para o ID:', companyId);
                if (window.ConfNet && window.ConfNet.log) {
                    window.ConfNet.log('error', `Empresa não encontrada para o ID: ${companyId}`, null, 'selectionEvents');
                }
            }
            
        } catch (dbError) {
            console.error('Erro ao buscar empresa do banco:', dbError);
            
            // Fallback para localStorage
            const companies = JSON.parse(localStorage.getItem('confnet-companies') || '[]');
            console.log('Fallback: empresas do localStorage:', companies);
            
            const company = companies.find(c => c.id === companyId);
            
            if (company) {
                currentProxyConfig.company = company;
                console.log('Empresa configurada via fallback:', company.name);
                
                // Marcar empresa selecionada
                document.querySelectorAll('.company-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                const clickedCard = document.querySelector(`[onclick="selectCompanyForProxy(${companyId})"]`);
                if (clickedCard) {
                    clickedCard.classList.add('selected');
                }
                
                nextStep();
            }
        }
    
        console.log('=== FIM SELECT COMPANY FOR PROXY ===');
    } catch (error) {
        console.error('ERRO na função selectCompanyForProxy:', error);
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('error', `Erro na seleção de empresa: ${error.message}`, { stack: error.stack }, 'selectionEvents');
        }
    }
}

// Função para carregar filiais no passo 2
function loadBranchesForProxy() {
    // Log para o processo principal
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('info', 'Carregando filiais para seleção de proxy', null, 'proxyFunctions');
    }
    
    console.log('=== LOAD BRANCHES FOR PROXY ===');
    console.log('Company config:', currentProxyConfig.company);
    
    if (!currentProxyConfig.company) {
        console.error('Nenhuma empresa selecionada!');
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('error', 'Tentativa de carregar filiais sem empresa selecionada', null, 'validation');
        }
        return;
    }
    
    const branches = currentProxyConfig.company.branches || [];
    console.log('Filiais encontradas:', branches);
    
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('info', `Carregando ${branches.length} filiais da empresa ${currentProxyConfig.company.name}`, 
            branches.map(b => ({ id: b.id, name: b.name, hasProxy: !!(b.proxyIP && b.proxyPort) })), 
            'localStorage'
        );
    }
    
    const branchSelection = document.getElementById('branch-selection');
    if (!branchSelection) {
        console.error('Elemento branch-selection não encontrado!');
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('error', 'Elemento branch-selection não encontrado no DOM', null, 'proxyFunctions');
        }
        return;
    }
    
    if (branches.length === 0) {
        console.log('Nenhuma filial encontrada para esta empresa');
        if (window.ConfNet && window.ConfNet.log) {
            window.ConfNet.log('warn', `Empresa ${currentProxyConfig.company.name} não possui filiais cadastradas`, null, 'localStorage');
        }
        
        branchSelection.innerHTML = `
            <div class="no-branches">
                <p>Esta empresa não possui filiais cadastradas.</p>
                <p>Vá para Configurações > Lojas para cadastrar filiais.</p>
            </div>
        `;
        return;
    }
    
    console.log('Gerando HTML para', branches.length, 'filiais');
    const branchesHTML = branches.map(branch => `
        <div class="branch-card" onclick="selectBranchForProxy(${branch.id})">
            <h4>${branch.name}</h4>
            <p>${branch.address || 'Endereço não informado'}</p>
            ${branch.proxyIP ? `<div class="proxy-info">Proxy: ${branch.proxyIP}:${branch.proxyPort || 'N/A'}</div>` : ''}
        </div>
    `).join('');
    
    branchSelection.innerHTML = branchesHTML;
    console.log('HTML das filiais inserido com sucesso');
    
    if (window.ConfNet && window.ConfNet.log) {
        window.ConfNet.log('debug', `HTML das filiais gerado e inserido com sucesso (${branches.length} filiais)`, null, 'proxyFunctions');
    }
    
    console.log('=== FIM LOAD BRANCHES FOR PROXY ===');
}

// Função para selecionar filial no proxy
function selectBranchForProxy(branchId) {
    if (!currentProxyConfig.company) return;
    
    const branch = currentProxyConfig.company.branches.find(b => b.id === branchId);
    
    if (branch) {
        currentProxyConfig.branch = branch;
        
        // Marcar filial selecionada
        document.querySelectorAll('.branch-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Encontrar o card clicado
        const clickedCard = document.querySelector(`[onclick="selectBranchForProxy(${branchId})"]`);
        if (clickedCard) {
            clickedCard.classList.add('selected');
        }
        
        // Habilitar botão de próximo passo
        setTimeout(() => {
            nextStep();
        }, 500);
    }
}

// Função para selecionar tipo de conexão
function selectConnectionType(connectionType) {
    currentProxyConfig.connectionType = connectionType;
    
    // Marcar conexão selecionada
    document.querySelectorAll('.connection-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Encontrar o botão clicado
    const clickedBtn = document.querySelector(`[onclick="selectConnectionType('${connectionType}')"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('selected');
    }
    
    // Habilitar botão de próximo passo
    setTimeout(() => {
        nextStep();
    }, 500);
}

// Função para mostrar resumo da configuração
function showConfigSummary() {
    const configSummary = document.getElementById('config-summary');
    
    if (!currentProxyConfig.company || !currentProxyConfig.branch || !currentProxyConfig.connectionType) {
        configSummary.innerHTML = '<p>Erro: Configuração incompleta</p>';
        return;
    }
    
    const connectionText = currentProxyConfig.connectionType === 'ethernet' ? 'Cabo (Ethernet)' : 'Wi-Fi';
    
    configSummary.innerHTML = `
        <div class="config-summary-item">
            <strong>Empresa:</strong> ${currentProxyConfig.company.name}
        </div>
        <div class="config-summary-item">
            <strong>Filial:</strong> ${currentProxyConfig.branch.name}
        </div>
        <div class="config-summary-item">
            <strong>Tipo de Conexão:</strong> ${connectionText}
        </div>
        <div class="config-summary-item">
            <strong>Configuração de Proxy:</strong> ${currentProxyConfig.branch.proxyIP || 'Não configurado'}:${currentProxyConfig.branch.proxyPort || 'N/A'}
        </div>
    `;
}

// Função para mostrar o resumo final da configuração aplicada
function showFinalConfigSummary(networkResult = null) {
    const finalConfig = document.getElementById('final-config');
    
    if (!currentProxyConfig.company || !currentProxyConfig.branch || !currentProxyConfig.connectionType) {
        finalConfig.innerHTML = '<p>Erro: Configuração incompleta</p>';
        return;
    }
    
    const connectionText = currentProxyConfig.connectionType === 'ethernet' ? 'Cabo (Ethernet)' : 'Wi-Fi';
    
    let configDetails = '';
    
    if (currentProxyConfig.connectionType === 'ethernet') {
        configDetails = `
            <div class="final-config-item">
                <strong>Proxy Configurado:</strong> ${currentProxyConfig.branch.proxyIP}:${currentProxyConfig.branch.proxyPort}
            </div>
            <div class="final-config-item network-changes">
                <strong>Alterações de Rede:</strong>
                <ul>
                    <li>✅ Proxy manual configurado</li>
                    <li>✅ Wi-Fi desabilitado</li>
                    <li>✅ Ethernet habilitado</li>
                </ul>
            </div>
        `;
    } else {
        configDetails = `
            <div class="final-config-item">
                <strong>Configuração de Proxy:</strong> Detecção Automática
            </div>
            <div class="final-config-item network-changes">
                <strong>Alterações de Rede:</strong>
                <ul>
                    <li>✅ Detecção automática de proxy habilitada</li>
                    <li>✅ Ethernet desabilitado</li>
                    <li>✅ Wi-Fi habilitado</li>
                </ul>
            </div>
        `;
    }
    
    finalConfig.innerHTML = `
        <div class="final-config-item">
            <strong>Empresa:</strong> ${currentProxyConfig.company.name}
        </div>
        <div class="final-config-item">
            <strong>Filial:</strong> ${currentProxyConfig.branch.name}
        </div>
        <div class="final-config-item">
            <strong>Tipo de Conexão:</strong> ${connectionText}
        </div>
        ${configDetails}
        <div class="final-config-item">
            <strong>Status:</strong> <span class="status-success">✅ Configurado com Sucesso no Windows</span>
        </div>

    `;
}

// Função para aplicar configuração de proxy
async function applyProxyConfig() {
    if (!currentProxyConfig.company || !currentProxyConfig.branch || !currentProxyConfig.connectionType) {
        alert('Erro: Configuração incompleta');
        return;
    }
    
    console.log('=== APLICANDO CONFIGURAÇÃO DE PROXY ===');
    console.log('Configuração atual:', currentProxyConfig);
    
    try {
        // Mostrar loading
        const configSummary = document.getElementById('config-summary');
        if (configSummary) {
            configSummary.innerHTML = '<p class="loading">⏳ Aplicando configurações no Windows...</p>';
        }
        
        let networkConfig = {
            connectionType: currentProxyConfig.connectionType,
            company: currentProxyConfig.company.name,
            branch: currentProxyConfig.branch.name
        };
        
        let result;
        
        if (currentProxyConfig.connectionType === 'ethernet') {
            // Configuração para cabo (Ethernet)
            if (!currentProxyConfig.branch.proxyIP || !currentProxyConfig.branch.proxyPort) {
                alert('Erro: Esta filial não possui configuração de proxy válida para conexão por cabo.');
                return;
            }
            
            networkConfig.proxyIP = currentProxyConfig.branch.proxyIP;
            networkConfig.proxyPort = currentProxyConfig.branch.proxyPort;
            
            console.log('Configurando para conexão por cabo:', networkConfig);
            result = await window.ConfNet.applyNetworkConfig(networkConfig);
            
        } else if (currentProxyConfig.connectionType === 'wifi') {
            // Configuração para Wi-Fi
            console.log('Configurando para conexão Wi-Fi:', networkConfig);
            result = await window.ConfNet.applyNetworkConfig(networkConfig);
            
        } else {
            throw new Error('Tipo de conexão inválido');
        }
        
        console.log('Resultado da configuração de rede:', result);
        
        if (result.success) {
            console.log('✅ Configuração aplicada com sucesso!');
            
            // Preencher o resumo final com detalhes
            showFinalConfigSummary(result);
            
            // Avançar para o passo de sucesso
            nextStep();
            
            // Mostrar detalhes do que foi configurado
            let detailsMessage = `Configuração aplicada com sucesso!\n\n`;
            
            if (currentProxyConfig.connectionType === 'ethernet') {
                detailsMessage += `✅ Proxy configurado: ${currentProxyConfig.branch.proxyIP}:${currentProxyConfig.branch.proxyPort}\n`;
                detailsMessage += `✅ Wi-Fi desabilitado\n`;
                detailsMessage += `✅ Ethernet habilitado\n`;
            } else {
                detailsMessage += `✅ Detecção automática de proxy habilitada\n`;
                detailsMessage += `✅ Ethernet desabilitado\n`;
                detailsMessage += `✅ Wi-Fi habilitado\n`;
            }
            
            if (result.details) {
                console.log('Detalhes da configuração:', result.details);
            }
            
        } else {
            throw new Error(result.error || 'Falha na configuração de rede');
        }
        
    } catch (error) {
        console.error('❌ Erro ao aplicar configuração:', error);
        
        // Restaurar interface de configuração
        showConfigSummary();
        
        let errorMessage = 'Erro ao aplicar configuração de rede:\n\n';
        
        // Verificar se é erro de permissões
        if (error.message && (error.message.includes('administrativas') || error.message.includes('Acesso negado') || error.message.includes('Access is denied'))) {
            errorMessage += '🔒 PERMISSÕES INSUFICIENTES\n\n';
            errorMessage += 'Para modificar configurações de rede, é necessário:\n';
            errorMessage += '• Executar o ConfNet como Administrador\n';
            errorMessage += '• Clicar com botão direito no ConfNet\n';
            errorMessage += '• Selecionar "Executar como administrador"\n\n';
            errorMessage += 'Algumas operações podem funcionar parcialmente sem privilégios administrativos.';
        } else if (error.message && error.message.includes('arquivo especificado')) {
            errorMessage += '⚙️ PROBLEMA DE SISTEMA\n\n';
            errorMessage += 'Erro ao localizar o PowerShell do Windows.\n';
            errorMessage += 'Verifique se o Windows PowerShell está instalado corretamente.';
        } else {
            errorMessage += error.message || 'Erro desconhecido';
            errorMessage += '\n\nVerifique se você tem permissões de administrador.';
        }
        
        alert(errorMessage);
    }
}

// Função para iniciar nova configuração
function startNewConfig() {
    // Resetar configuração atual
    currentProxyConfig = {
        company: null,
        branch: null,
        connectionType: null
    };
    
    // Limpar seleções visuais
    document.querySelectorAll('.company-card, .branch-card, .connection-btn').forEach(element => {
        element.classList.remove('selected');
    });
    
    // Voltar para o primeiro passo
    document.querySelectorAll('.config-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step-1').classList.add('active');
    
    // Recarregar dados do primeiro passo
    loadStepData(1);
}

// Função para resetar configurações de rede
async function resetNetworkConfig() {
    if (confirm('Tem certeza que deseja resetar todas as configurações de rede?\n\nIsso irá:\n• Limpar configurações de proxy\n• Habilitar todas as interfaces de rede\n• Restaurar configurações padrão')) {
        try {
            console.log('=== RESETANDO CONFIGURAÇÕES DE REDE ===');
            
            // Mostrar loading
            const finalConfig = document.getElementById('final-config');
            if (finalConfig) {
                finalConfig.innerHTML = '<p class="loading">⏳ Resetando configurações de rede...</p>';
            }
            
            const result = await window.ConfNet.resetNetworkConfig();
            
            console.log('Resultado do reset:', result);
            
            if (result.success) {
                console.log('✅ Configurações resetadas com sucesso!');
                
                alert('Configurações de rede resetadas com sucesso!\n\n• Proxy limpo\n• Todas as interfaces habilitadas\n• Configurações padrão restauradas');
                
                // Voltar ao início
                showSection('inicio');
                
                // Atualizar informações do dashboard
                setTimeout(() => {
                    refreshSystemInfo();
                }, 1000);
                
            } else {
                throw new Error(result.error || 'Falha no reset das configurações');
            }
            
        } catch (error) {
            console.error('❌ Erro ao resetar configurações:', error);
            
            let errorMessage = 'Erro ao resetar configurações de rede:\n\n';
            
            // Verificar se é erro de permissões
            if (error.message && (error.message.includes('administrativas') || error.message.includes('Acesso negado') || error.message.includes('Access is denied'))) {
                errorMessage += '🔒 PERMISSÕES INSUFICIENTES\n\n';
                errorMessage += 'Para resetar configurações de rede, é necessário:\n';
                errorMessage += '• Executar o ConfNet como Administrador\n';
                errorMessage += '• Clicar com botão direito no ConfNet\n';
                errorMessage += '• Selecionar "Executar como administrador"\n\n';
                errorMessage += 'O reset pode funcionar parcialmente sem privilégios administrativos.';
            } else if (error.message && error.message.includes('arquivo especificado')) {
                errorMessage += '⚙️ PROBLEMA DE SISTEMA\n\n';
                errorMessage += 'Erro ao localizar o PowerShell do Windows.\n';
                errorMessage += 'Verifique se o Windows PowerShell está instalado corretamente.';
            } else {
                errorMessage += error.message || 'Erro desconhecido';
                errorMessage += '\n\nVerifique se você tem permissões de administrador.';
            }
            
            alert(errorMessage);
            
            // Restaurar interface
            showFinalConfigSummary();
        }
    }
}

// Event listeners já estão configurados via onclick no HTML

// Exportar funções para uso global
window.nextStep = nextStep;
window.previousStep = previousStep;
window.selectCompanyForProxy = selectCompanyForProxy;
window.selectBranchForProxy = selectBranchForProxy;
window.selectConnectionType = selectConnectionType;
window.applyProxyConfig = applyProxyConfig;
window.startNewConfig = startNewConfig;
window.resetNetworkConfig = resetNetworkConfig;





// Garantir que as funções sejam carregadas
console.log('=== SCRIPT.JS CARREGADO ===');
console.log('Funções disponíveis:');

console.log('- selectCompanyForProxy:', typeof window.selectCompanyForProxy);
console.log('- nextStep:', typeof window.nextStep);