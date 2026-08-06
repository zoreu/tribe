// Copia texto para a área de transferência com fallback para o Firefox Android,
// onde navigator.clipboard pode não estar disponível ou falhar silenciosamente.
export function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  // Fallback: textarea + execCommand (funciona no Firefox mobile)
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
