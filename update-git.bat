@echo off
echo Atualizando projeto no GitHub...

git config --global user.name "Gabriel"
git config --global user.email "gabriel@confnet.com"

git add .
git commit -m "feat: Limpeza completa do projeto e otimizacoes - WiFi automatico, codigo limpo, arquivos desnecessarios removidos"

echo.
echo Commit realizado! Agora configure o remote do GitHub:
echo git remote add origin https://github.com/SEU_USUARIO/ConfNet.git
echo git branch -M main
echo git push -u origin main
echo.
pause
