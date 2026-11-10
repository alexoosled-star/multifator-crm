# CRM MULTIFATOR SAAS - DOCKERFILE CORPORATIVO
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Executa o servidor de produção com cabeçalhos de segurança nativos
CMD ["node", "server.js"]
