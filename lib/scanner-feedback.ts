let sharedAudioContext: AudioContext | null = null;

export function playScannerFeedbackTone(kind: "success" | "not-found") {
  if (typeof window === "undefined") return;

  try {
    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor =
      window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;
    sharedAudioContext ??= new AudioContextConstructor();
    const context = sharedAudioContext;

    const play = () => {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const now = context.currentTime;
      const duration = kind === "success" ? 0.12 : 0.2;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        kind === "success" ? 880 : 420,
        now,
      );
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    };

    if (context.state === "suspended") {
      void context.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch {
    // Audio is optional; the scanner keeps its visual feedback if playback is unavailable.
  }
}
