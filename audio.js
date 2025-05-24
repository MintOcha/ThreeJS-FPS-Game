// Audio module
// Exported audio state variables
export let sounds = {
  hit: new Howl({ src: ['hit.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
  reload: new Howl({ src: ['reload.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
  shoot: new Howl({ src: ['shoot.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) })
};
