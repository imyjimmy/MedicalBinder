// Simple base64 decode polyfill for React Native
export const base64ToUint8Array = (base64: string): Uint8Array => {
  // Remove any whitespace and padding
  const cleanBase64 = base64.replace(/\s/g, '');
  
  // Base64 character set
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  let result = '';
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const chunk = cleanBase64.substr(i, 4);
    const bytes = [];
    
    for (let j = 0; j < chunk.length; j++) {
      const charIndex = chars.indexOf(chunk[j]);
      bytes.push(charIndex === -1 ? 64 : charIndex); // Treat padding as 64, not -1
    }
    
    const byte1 = (bytes[0] << 2) | (bytes[1] >> 4);
    const byte2 = ((bytes[1] & 15) << 4) | (bytes[2] >> 2);
    const byte3 = ((bytes[2] & 3) << 6) | bytes[3];
    
    result += String.fromCharCode(byte1);
    if (bytes[2] !== 64) result += String.fromCharCode(byte2);
    if (bytes[3] !== 64) result += String.fromCharCode(byte3);
  }
  
  const uint8Array = new Uint8Array(result.length);
  for (let i = 0; i < result.length; i++) {
    uint8Array[i] = result.charCodeAt(i);
  }
  
  return uint8Array;
};

export const Uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < uint8Array.length) {
    const a = uint8Array[i++];
    const b = i < uint8Array.length ? uint8Array[i++] : 0;
    const c = i < uint8Array.length ? uint8Array[i++] : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}