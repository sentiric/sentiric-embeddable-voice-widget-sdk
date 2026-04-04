// env.d.ts

// Vite'in ?raw ekiyle import edilen dosyaların string olduğunu bildirir
declare module "*?raw" {
  const content: string;
  export default content;
}

// Vite'in ?inline ekiyle import edilen CSS dosyalarının string olduğunu bildirir
declare module "*?inline" {
  const content: string;
  export default content;
}

// Global uygulama versiyonu (Vite define ile ekleniyor)
declare const __APP_VERSION__: string;
