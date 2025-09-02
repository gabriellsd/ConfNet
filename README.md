# ConfNet - Configurador de Proxy

🌐 **ConfNet** é uma aplicação desktop desenvolvida em Electron para gerenciar configurações de proxy e interfaces de rede no Windows de forma automatizada e intuitiva.

## 📋 Índice

- [Características](#-características)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Como Usar](#-como-usar)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Desenvolvimento](#-desenvolvimento)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## 🚀 Características

- ✅ **Gerenciamento de Empresas e Filiais** - Cadastre múltiplas empresas com suas respectivas filiais
- ✅ **Configuração Automática de Proxy** - Aplique configurações de proxy diretamente no Windows
- ✅ **Gerenciamento de Interfaces de Rede** - Controle automático de Wi-Fi e Ethernet
- ✅ **Banco de Dados SQLite** - Armazenamento local seguro e confiável
- ✅ **Interface Moderna** - Design limpo e intuitivo
- ✅ **Privilégios Administrativos** - Execução automática como administrador
- ✅ **Sistema de Logs** - Registro detalhado de todas as operações

## 📋 Pré-requisitos

- **Windows 7/8/10/11** (64-bit recomendado)
- **Node.js 16+** - [Download aqui](https://nodejs.org/)
- **Git** - [Download aqui](https://git-scm.com/)
- **Privilégios de Administrador** - Necessário para configurações de rede

## 🔧 Instalação

### Método 1: Instalação Automática
```bash
# Clone o repositório
git clone https://github.com/gabriellsd/ConfNet.git

# Entre na pasta do projeto
cd ConfNet

# Execute o instalador automático
install.bat
```

### Método 2: Instalação Manual
```bash
# Clone o repositório
git clone https://github.com/gabriellsd/ConfNet.git

# Entre na pasta do projeto
cd ConfNet

# Instale as dependências
npm install

# Recompile módulos nativos para Electron
npx @electron/rebuild

# Execute a aplicação
npm start
```

## 💻 Como Usar

### 1. **Primeiro Acesso**
- Execute `npm start`
- A aplicação solicitará privilégios administrativos automaticamente
- Se houver dados do localStorage, será oferecida migração automática

### 2. **Cadastro de Empresas**
- Acesse a aba "Empresas"
- Clique em "Nova Empresa"
- Preencha: Nome, Descrição, Endereço, Telefone

### 3. **Cadastro de Filiais**
- Selecione uma empresa
- Clique em "Nova Filial"
- Configure: Nome, Endereço, IP do Proxy, Porta do Proxy

### 4. **Configuração de Proxy**
- Acesse a aba "Configurar Proxy"
- Selecione: Empresa → Filial → Tipo de Conexão
- Clique em "Aplicar Configuração"

### 5. **Tipos de Conexão**

#### 🔌 **Cabo (Ethernet)**
- Configura proxy manual com IP/Porta da filial
- Desativa interface Wi-Fi
- Ativa interface Ethernet
- Habilita "Não usar proxy para endereços locais"

#### 📶 **Wi-Fi**
- Ativa "Detectar configuração de proxy automática"
- Desativa interface Ethernet
- Ativa interface Wi-Fi
- Remove configuração de proxy local

### 6. **Configurações**
- Acesse com senha: `12qw!@QW`
- Configure: Tema, Idioma, Notificações, Backup

## 🛠️ Funcionalidades

### Gerenciamento de Dados
- **Empresas**: CRUD completo com validação
- **Filiais**: Associadas às empresas com configurações de proxy
- **Configurações**: Personalizações da aplicação
- **Migração**: Importação automática do localStorage

### Configurações de Rede
- **Proxy Manual**: Configuração com IP e porta específicos
- **Proxy Automático**: Detecção automática de configurações
- **Interfaces de Rede**: Controle de Wi-Fi e Ethernet
- **Registro do Windows**: Atualização das configurações de proxy
- **WinHTTP**: Configuração para aplicações do sistema

### Sistema
- **Logs Detalhados**: Registro de todas as operações
- **Backup Automático**: Proteção dos dados
- **Validação de Entrada**: Verificação de IPs e portas
- **Tratamento de Erros**: Mensagens informativas

## 🔧 Tecnologias

### Frontend
- **HTML5/CSS3** - Interface moderna e responsiva
- **JavaScript ES6+** - Lógica da aplicação
- **Electron** - Framework para aplicações desktop

### Backend
- **Node.js** - Runtime JavaScript
- **SQLite3** - Banco de dados local
- **PowerShell** - Integração com sistema Windows

### Ferramentas
- **Git** - Controle de versão
- **npm** - Gerenciador de pacotes
- **@electron/rebuild** - Recompilação de módulos nativos

## 📁 Estrutura do Projeto

```
ConfNet/
├── data/
│   └── confnet.db              # Banco de dados SQLite
├── logs/
│   └── confnet-*.log          # Arquivos de log
├── app.manifest               # Manifesto para privilégios admin
├── database.js                # Módulo do banco de dados
├── database-client.js         # Cliente do banco (frontend)
├── index.html                 # Interface principal
├── install.bat               # Script de instalação automática
├── logger-config.js          # Configuração do sistema de logs
├── main.js                   # Processo principal do Electron
├── network-manager.js        # Gerenciador de configurações de rede
├── package.json              # Configurações do projeto
├── preload.js               # Script de pré-carregamento
├── script.js                # Lógica principal do frontend
├── styles.css               # Estilos da interface
├── .gitignore              # Arquivos ignorados pelo Git
└── README.md               # Este arquivo
```

## 👨‍💻 Desenvolvimento

### Executar em Modo de Desenvolvimento
```bash
npm start
```

### Compilar para Produção
```bash
npm run build-win
```

### Logs de Debug
Os logs são salvos automaticamente em `logs/confnet-YYYY-MM-DD.log`

### Banco de Dados
- Localização: `data/confnet.db`
- Tipo: SQLite3
- Tabelas: `companies`, `branches`, `settings`

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/gabriellsd/ConfNet/issues)
- **Autor**: [@gabriellsd](https://github.com/gabriellsd)

## 📊 Status do Projeto

✅ **Funcional** - Versão 1.0.0
- Todas as funcionalidades principais implementadas
- Sistema de migração funcionando
- Configurações de rede operacionais
- Interface completa e responsiva

---

<div align="center">
  <strong>ConfNet</strong> - Simplificando o gerenciamento de proxy no Windows
</div>
