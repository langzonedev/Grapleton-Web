import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Haptics } from '@capacitor/haptics';
import { setupNativeUI } from './ui.js';

const info = await App.getInfo();

window.grapletonNative = {
  version: info.version,
  selectionFeedback() {
    Haptics.selectionChanged().catch(() => {});
  },
  async exportBackup(data, filename) {
    const file = await Filesystem.writeFile({
      path: 'backups/' + filename,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Share.share({ title: 'Grapleton cellar backup', files: [file.uri] });
  },
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
  const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (dialog) {
    if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
      window.grapletonNativeUI.closeDialog(dialog);
    }
  } else if (location.hash && location.hash !== '#cellar') {
    location.hash = 'cellar';
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
if (!location.hash) history.replaceState(null, '', '#cellar');
setupNativeUI();
await import('../app.js');
