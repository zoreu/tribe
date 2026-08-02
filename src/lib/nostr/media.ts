import { MediaAttachment } from '../../types';

// Faz o upload via XMLHttpRequest para conseguir acompanhar o progresso em tempo real
function xhrUpload(
  file: File,
  url: string,
  fieldName: 'fileToUpload' | 'file',
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    if (fieldName === 'fileToUpload') {
      formData.append('fileToUpload', file);
      formData.append('submit', 'Upload Image');
    } else {
      formData.append('file', file);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Upload falhou com status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
    xhr.ontimeout = () => reject(new Error('Tempo do upload esgotado'));

    xhr.send(formData);
  });
}

export async function uploadMediaToNostrBuild(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  // Tenta upload via nostr.build NIP-96 / v2 API
  try {
    const resText = await xhrUpload(file, 'https://nostr.build/api/v2/upload/files', 'fileToUpload', onProgress);
    const data = JSON.parse(resText);
    if (data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }
  } catch (e) {
    console.warn('Serviço nostr.build v2 indisponível, tentando endpoint secundário...', e);
  }

  // Tenta endpoint secundário nostrimg / nostr.build v1
  try {
    const text = await xhrUpload(file, 'https://nostr.build/upload.php', 'file', onProgress);
    const match = text.match(/https:\/\/nostr\.build\/i\/[a-zA-Z0-9_\-.]+/);
    if (match) return match[0];
  } catch (e) {
    console.warn('Fallback para ObjectURL local...', e);
  }

  // Fallback seguro usando DataURL local caso a rede do serviço de mídia esteja inacessível
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function extractMediaUrls(content: string): { textWithoutMedia: string; media: MediaAttachment[] } {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  const dataUrlRegex = /data:(image|video|audio)\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
  
  const media: MediaAttachment[] = [];
  let cleanedText = content;

  // Data URLs embutidos (imagens/vídeos/áudio em base64) gerados pelo fallback de upload local
  const dataMatches = cleanedText.match(dataUrlRegex) || [];
  for (const dataUrl of dataMatches) {
    const mime = dataUrl.match(/^data:(image|video|audio)\//i)?.[1];
    if (mime) {
      media.push({ url: dataUrl, type: mime as 'image' | 'video' | 'audio' });
      cleanedText = cleanedText.replace(dataUrl, '');
    }
  }

  const matches = cleanedText.match(urlRegex) || [];

  for (const url of matches) {
    const lowerUrl = url.toLowerCase();
    
    // Imagens
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(lowerUrl) || lowerUrl.includes('nostr.build/i/') || lowerUrl.includes('void.cat/')) {
      media.push({ url, type: 'image' });
      cleanedText = cleanedText.replace(url, '');
    }
    // Vídeos
    else if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(lowerUrl) || lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/')) {
      media.push({ url, type: 'video' });
      cleanedText = cleanedText.replace(url, '');
    }
    // Áudio
    else if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(lowerUrl)) {
      media.push({ url, type: 'audio' });
      cleanedText = cleanedText.replace(url, '');
    }
    // Documentos / Arquivos (PDF, Word, Excel, PPT, TXT, CSV...)
    else if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv)(\?.*)?$/i.test(lowerUrl)) {
      media.push({ url, type: 'file' });
      cleanedText = cleanedText.replace(url, '');
    }
  }

  return {
    textWithoutMedia: cleanedText.trim(),
    media
  };
}
