/**
 * Rückmeldung am Ende der Pause: Vibration und ein kurzer Ton.
 * Beides funktioniert nur, nachdem der Nutzer einmal auf die Seite getippt hat
 * (Browser-Regel) – im Training ist das durch das Abhaken immer der Fall.
 */

let audio: AudioContext | null = null;

/** Beim ersten Tippen aufrufen, damit der Ton später ohne Verzögerung abgespielt werden kann. */
export function audioVorbereiten(): void {
  try {
    if (!audio) audio = new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    // Kein Ton möglich – kein Problem.
  }
}

export function vibrieren(muster: number[] = [300, 120, 300, 120, 500]): void {
  try {
    navigator.vibrate?.(muster);
  } catch {
    // Gerät kann nicht vibrieren.
  }
}

export function piepen(): void {
  try {
    if (!audio) return;
    const t = audio.currentTime;
    for (const [i, frequenz] of [880, 880, 1320].entries()) {
      const osz = audio.createOscillator();
      const lautst = audio.createGain();
      osz.frequency.value = frequenz;
      lautst.gain.setValueAtTime(0.0001, t + i * 0.25);
      lautst.gain.exponentialRampToValueAtTime(0.4, t + i * 0.25 + 0.02);
      lautst.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.25 + 0.2);
      osz.connect(lautst).connect(audio.destination);
      osz.start(t + i * 0.25);
      osz.stop(t + i * 0.25 + 0.22);
    }
  } catch {
    // Ton fehlgeschlagen – ignorieren.
  }
}
