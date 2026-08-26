const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost" });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.URL = {
  createObjectURL: (blob) => "blob:http://localhost/" + Math.random(),
  revokeObjectURL: () => {}
};

const TmyAudioStore = {
  memoryBlobs: new Map(),
  saveAudio(trackId, fileBlob) {
    if (!fileBlob) return;
    try {
      const url = URL.createObjectURL(fileBlob);
      this.memoryBlobs.set(trackId, url);
    } catch(e) {}
  },
  async getAudioSrc(trackId, defaultSrc) {
    if (this.memoryBlobs.has(trackId)) {
      return this.memoryBlobs.get(trackId);
    }
    return defaultSrc;
  }
};

const fakeBlob = { size: 1024, type: "audio/wav" };
TmyAudioStore.saveAudio("track_123", fakeBlob);

TmyAudioStore.getAudioSrc("track_123", "beats/LOOPKIT1.wav").then(src => {
  console.log("Audio src for track_123:", src);
  if (src.startsWith("blob:")) {
    console.log("SUCCESS: Blob URL returned successfully!");
  } else {
    console.log("FAILURE: Default src returned instead of blob.");
  }
});
