const installButton=document.querySelector('#install-app');
const instructions=document.querySelector('#install-instructions');
const installDialog=document.querySelector('#install-dialog');
let installPrompt=null,registration=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function updateInstallButton(){installButton.hidden=standalone()}
updateInstallButton();
window.matchMedia('(display-mode: standalone)').addEventListener('change',updateInstallButton);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;updateInstallButton()});
window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true});
installButton.addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')installButton.hidden=true;return}catch{/* Use the visible platform instructions if this browser cannot open the prompt. */}}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios)instructions.textContent='No Safari, abra este endereço, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Confirme em “Adicionar”.';
  else instructions.textContent='Abra este endereço no Chrome, Edge ou Safari. No Chrome/Edge, use o ícone de instalação na barra de endereço ou a opção de instalar no menu. No Safari do Mac, use Arquivo → Adicionar ao Dock. Se estiver no navegador integrado do Codex, abra o link no navegador do dispositivo.';
  installDialog.showModal();
});
const connection=document.querySelector('#connection-status');
function showConnection(){connection.replaceChildren();const dot=document.createElement('span');connection.append(dot,document.createTextNode(navigator.onLine?'Pessoal e privado':'Você está offline'));connection.classList.toggle('offline',!navigator.onLine)}
window.addEventListener('online',showConnection);window.addEventListener('offline',showConnection);showConnection();
function offerUpdate(){if(registration?.waiting&&navigator.serviceWorker.controller)document.querySelector('#pwa-update').hidden=false}
if('serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',async()=>{try{
    registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    offerUpdate();
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate()})});
  }catch{instructions.textContent='Não foi possível preparar o modo offline. Abra o app com conexão em um navegador compatível e tente novamente.';console.warn('O modo offline do Saldo não está disponível neste navegador.')}});
  document.querySelector('#apply-update').addEventListener('click',()=>{if(!registration?.waiting)return;if(document.querySelector('dialog[open]')){window.alert('Conclua ou feche o formulário aberto antes de atualizar.');return}registration.waiting.postMessage({type:'SKIP_WAITING'})});
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing&&document.querySelector('#pwa-update').hidden===false){refreshing=true;window.location.reload()}});
}
