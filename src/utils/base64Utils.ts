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
      bytes.push(chars.indexOf(chunk[j]));
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