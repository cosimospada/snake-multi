// Band.js is loaded from CDN and Conductor is available globally

// Use BandJS global constructor for compatibility with CDN version
var conductor = new BandJS();
// Set time signature and tempo
conductor.setTempo(180);
conductor.setTimeSignature(2, 2);

// Create an instrument using the default oscillators pack
var rightHand = conductor.createInstrument('square', 'oscillators'),
    leftHand = conductor.createInstrument('triangle', 'oscillators'),
    drum = conductor.createInstrument('white', 'noises');

drum.setVolume(50);

/**
 * Intro
 */
// Bar 1
rightHand.note('quarter', 'E5, F#4')
    .note('quarter', 'E5, F#4')
    .rest('quarter')
    .note('quarter', 'E5, F#4');

leftHand.note('quarter', 'D3')
    .note('quarter', 'D3')
    .rest('quarter')
    .note('quarter', 'D3');

drum.rest('whole');

// Bar2
rightHand.rest('quarter')
    .note('quarter', 'C5, F#4')
    .note('quarter', 'E5, F#4')
    .rest('quarter');

leftHand.rest('quarter')
    .note('quarter', 'D3')
    .note('quarter', 'D3')
    .rest('quarter');

drum.rest('whole');

// Tell the conductor everything is done
var player = conductor.finish();

// Start music only after a user gesture (click/touch)
function startMusicOnce() {
    player.play();
    window.removeEventListener('mousedown', startMusicOnce);
    window.removeEventListener('touchstart', startMusicOnce);
}
window.addEventListener('mousedown', startMusicOnce);
window.addEventListener('touchstart', startMusicOnce);
