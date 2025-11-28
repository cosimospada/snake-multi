// Band.js is loaded from CDN and Conductor is available globally

// Use BandJS global constructor for compatibility with CDN version
var conductor = new BandJS();
// Set time signature and tempo
conductor.setTempo(150);
conductor.setTimeSignature(2, 2);

// Create an instrument using the default oscillators pack
var lead = conductor.createInstrument('sine', 'oscillators'),
    mid = conductor.createInstrument('sine', 'oscillators'),
    bass = conductor.createInstrument('sawtooth', 'oscillators'),
    kick = conductor.createInstrument('brown', 'noises'),
    highhat = conductor.createInstrument('white', 'noises'),
    snare = conductor.createInstrument('white', 'noises');

lead.setVolume(80);
mid.setVolume(80);
bass.setVolume(40);
kick.setVolume(120);
highhat.setVolume(20);
snare.setVolume(65);

setHighhat();   // all the time

part1();
part1();
part1();
part1();
part2();
part2WithSnares();
part2WithSnares();
part2WithSnares();
partMarioDungeon();
partMarioDungeon();

function part1() {
    lead4Bars();

    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();

    bass2bars();
    bass2bars();

    kickdrum2bars();
    kickdrum2bars();

    snare4Bars();
}


function part2() {
    lead4Bars();

    mid4bars();

    bass1BarRest();
    bass1BarRest();
    bass1BarRest();
    bass1BarRest();

    kickdrum2bars();
    kickdrum2bars();

    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
}

function part2WithSnares() {
    lead4Bars();

    mid4bars();

    bass1BarRest();
    bass1BarRest();
    bass1BarRest();
    bass1BarRest();

    kickdrum2bars();
    kickdrum2bars();

    snare4Bars();
}

function partMarioDungeon() {
    bass2BarsLow();
    bass2BarsLow();
    bass2BarsHigh();
    bass2BarsHigh();

    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();

    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();

    kickdrum2bars();
    kickdrum2bars();
    kickdrum2bars();
    kickdrum2bars();

    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
    snare1BarRest();
}

function partMarioDungeonWithSnare() {
    bass2BarsLow();
    bass2BarsLow();
    bass2BarsHigh();
    bass2BarsHigh();

    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();
    lead1BarRest();

    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();
    mid1BarRest();

    kickdrum2bars();
    kickdrum2bars();
    kickdrum2bars();
    kickdrum2bars();

    snare4Bars();
    snare4Bars();
}

function mid4bars(){
    mid
        .note('whole', 'F3')
        .note('whole', 'F3')
        .note('whole', 'D#3')
        .note('whole', 'D#3')
        .note('whole', 'G#2')
        .note('whole', 'G#2')
        .note('whole', 'A#2')
        .note('whole', 'A#2')
    ;
}

function bass2bars() {
    bass
        .note('quarter', 'D#1')
        .note('quarter', 'F1')
        .note('quarter', 'F1')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
    ;

    bass
        .note('half', 'G1')
        .rest('quarter')
        .note('half', 'Ab1')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
    ;
}

function bass2BarsLow() {
    bass
        .note('quarter', 'F2')
        .note('quarter', 'F2')
        .note('quarter', 'D2')
        .note('quarter', 'D2')
        .note('quarter', 'D#2')
        .note('quarter', 'D#2')
        .rest('quarter')
        .rest('quarter')
    ;
    bass1BarRest()
}

function bass2BarsHigh() {
    bass
        .note('quarter', 'A#2')
        .note('quarter', 'A#2')
        .note('quarter', 'G2')
        .note('quarter', 'G2')
        .note('quarter', 'G#2')
        .note('quarter', 'G#2')
        .rest('quarter')
        .rest('quarter')
    ;
    bass1BarRest()
}

function lead1BarRest() {
    lead
        .rest('whole')
        .rest('whole')
    ;
}

function mid1BarRest() {
    mid
        .rest('whole')
        .rest('whole')
    ;
}

function bass1BarRest() {
    bass
        .rest('whole')
        .rest('whole')
    ;
}

function lead4Bars() {
    lead
        .rest('quarter')
        .rest('quarter')
        .note('quarter', 'F4')
        .note('quarter', 'F4')
        .rest('quarter')
        .note('quarter', 'F4')
        .rest('quarter')
        .note('quarter', 'F4')
    ;

    lead
        .note('quarter', 'D#4')
        .rest('quarter')
        .note('quarter', 'D#4')
        .note('quarter', 'D#4')
        .note('quarter', 'F3')
        .rest('quarter')
        .note('quarter', 'F3')
        .note('quarter', 'F3')
    ;

    lead
        .rest('quarter')
        .rest('quarter')
        .note('quarter', 'F4')
        .note('quarter', 'F4')
        .rest('quarter')
        .note('quarter', 'F4')
        .note('quarter', 'F3')
        .note('quarter', 'F3')
    ;

    lead
        .note('quarter', 'D#4')
        .rest('quarter')
        .note('quarter', 'A#3')
        .note('quarter', 'A#3')
        .note('quarter', 'A#4')
        .rest('quarter')
        .note('quarter', 'A#4')
        .note('quarter', 'A#4')
    ;
}



lead.repeat(400);
mid.repeat(400);
bass.repeat(400);
kick.repeat(400);
snare.repeat(400);
highhat.repeat(10000);

// Tell the conductor everything is done
var player = conductor.finish();

function kickdrum2bars() {
    // Bar 1
    kick
        .note('eighth', 'C2')
        .rest('eighth')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .note('eighth', 'C2')
        .rest('eighth')
        .note('eighth', 'C2')
        .rest('eighth')
    ;

    // Bar 2
    kick
        .rest('quarter')
        .note('eighth', 'C2')
        .rest('eighth')
        .note('eighth', 'C2')
        .rest('eighth')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
        .rest('quarter')
    ;
}

function setHighhat() {
    highhat
        .note('sixteenth', 'C5')
        .rest('sixteenth')
        .rest('eighth')
        .rest('quarter')
    ;
}

function snare1BarRest() {
    snare
        .rest('whole')
        .rest('whole')
    ;
}

function snare4Bars() {
    snare
        .rest('whole')
        .note('eighth', 'C5')
        .rest('eighth')
        .rest('quarter')
        .rest('half')
    ;
    snare
        .rest('whole')
        .note('eighth', 'C5')
        .rest('eighth')
        .rest('quarter')
        .rest('half')
    ;
    snare
        .rest('whole')
        .note('eighth', 'C5')
        .rest('eighth')
        .rest('quarter')
        .rest('half')
    ;
    snare
        .rest('whole')
        .note('eighth', 'C5')
        .rest('eighth')
        .rest('quarter')
        .rest('quarter')
        .note('eighth', 'C2')
        .rest('eighth')
    ;
}

// Start music only after a user gesture (click/touch)
function startMusicOnce() {
    player.play();
    window.removeEventListener('mousedown', startMusicOnce);
    window.removeEventListener('touchstart', startMusicOnce);
}
window.addEventListener('mousedown', startMusicOnce);
window.addEventListener('touchstart', startMusicOnce);
