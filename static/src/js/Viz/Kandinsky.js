import {
    Utility
} from "../Utility/Utility";

export class Kandinsky {
    constructor(bpm, MaxVolume = 1, ) {
        this.bpm = bpm;
        this.MaxVolume = MaxVolume;
        this.canvasSizeY = 40
        this.canvasSizeX = 200
        this.MIDISCOPE = 23;
        // this.midiScope=35;

        this.DictPitch = {
            0: "C",
            1: "C#",
            2: "D",
            3: "D#",
            4: "E",
            5: "F",
            6: "F#",
            7: "G",
            8: "G#",
            9: "A",
            10: "A#",
            11: "B"
        };
        this.pitch;
        this.energy;
        this.pitchHeight
        this.octave;
        this.tone;
    }

    calculate([pitch, energy], frameRate = 60) {

        this.pitch = pitch;
        this.energy = energy / this.MaxVolume;
        // console.log(this.MaxVolume);
        this.pitchHeight = this.canvasSizeY / this.MIDISCOPE / 2
        this.pitchWidth = this.canvasSizeX / (60 * frameRate / this.bpm * 4) // 
        //total frameRate per minute   / 4 bpm 
        this.octave = Math.floor((pitch) / 12) - 1; //옥타브 구하는 방식
        this.tone = (pitch) % 12;
        // Make reminder positive integer

        // if (this.energy < 0.15) {
        //     this.energy = 0;
        // }
    }

    getNormalizedTone() {
        return this.tone / 12
    }
    getNormalizedOctave() {
        return (this.octave - 1) / 5
    }

    getPitchWidth() {
        // this.positionX= this.counter * this.pitchWidth - 100
        return this.pitchWidth
    }

    getPitchHeight() {
        return this.pitchHeight * (this.pitch - 60) - 10;
    }

    getPitchEnergy() {
        return this.pitchHeight * (this.energy * 5);
    }

    setBPM(bpm) {
        this.bpm = bpm
    }

    setMaxVolume(MaxVolume) {
        this.MaxVolume = MaxVolume;
    }

}