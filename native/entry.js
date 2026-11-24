import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';

window.grapletonNative = {
  async getPhoto(source) {
    try {
      const photo = await Camera.getPhoto({
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 85,
        width: 1200,
        height: 1200,
        correctOrientation: true,
        saveToGallery: false,
      });
      return await (await fetch(photo.webPath)).blob();
    } catch (error) {
      if (/cancel/i.test(error.message)) return null;
      throw error;
    }
  },
};

await App.addListener('backButton', () => {
  const dialog = document.querySelector('dialog[open]');
  if (dialog) {
    if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  } else if (location.hash && location.hash !== '#rack') {
    location.hash = 'rack';
  } else {
    App.minimizeApp();
  }
});

// The OS can reclaim the WebView while its camera Activity is open.
await App.addListener('appRestoredResult', async result => {
  if (result.pluginId !== 'Camera' || result.methodName !== 'getPhoto' || !result.success) return;
  window.grapletonRestoredPhoto = result.data.webPath;
  window.dispatchEvent(new Event('grapleton:restored-photo'));
});

if (!Capacitor.isNativePlatform()) throw new Error('Use index.html for the browser app.');
await import('../app.js');
