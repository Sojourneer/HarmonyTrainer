document.body.addEventListener("click", onUserInteraction, {capture:true});

var firstInteraction = true;
function onUserInteraction()
{
    if(firstInteraction) {
        console.log(Tone.Transport.state);
        sequencer.reset(); // throw away
        Tone.start();
        firstInteraction = false;
    }
}

var app;
function InitApp() {
    app = new Vue({
        el: '#app1',
        props: [ 'scales' ],
        data: {
            Title: 'Harmony Trainer',
            tonality: {
                tonics: ["C","C#","D","D#","E","F","G","G#","A","A#","B"],
                scaleNames:["(any)"],
                tonic:"C",
                scaleName : null,
                modeNames: [],
                modeName: null
            },
            melody: {
                nCount: 4,
                percentLeaps: 100,
                nChromatics: 0,
                pick:null,
                lastPick:null
            },
            harmony:{
                types: [
                        {name:"+3rd",type:"diatonicTranspose",transposeDegrees: 2},
                        {name:"-3rd",type:"diatonicTranspose",transposeDegrees:-2},
                        {name:"+2nd",type:"diatonicTranspose",transposeDegrees: 1},
                        {name:"-2nd",type:"diatonicTranspose",transposeDegrees:-1},
                        {name:"+6th",type:"diatonicTranspose",transposeDegrees: 5},
                        {name:"-6th",type:"diatonicTranspose",transposeDegrees:-5},
                        {name:"Pedal tonic",type:"pedal",degree:1},
                        {name:"Pedal 5",type:"pedal",degree:5},
                        {name:"Pedal 2",type:"pedal",degree:2},
                        {name:"Pedal 4",type:"pedal",degree:4},
                        {name:"Pedal 3",type:"pedal",degree:3},
                        {name:"Pedal 6",type:"pedal",degree:6},
                        {name:"Pedal 7",type:"pedal",degree:7}
                        ],
                type:{}
       
            }
        },
        computed: {
            melody_fragmentSet: function() {
                console.log("fragmentSet", this.melody.nCount);
                if(this.melody.nCount <= 4)
                    return data.f4;
                if(this.melody.nCount <= 8)
                    return data.f8;
                return data.f12;
            },
            melody_sequence: function() {
                this.onUpdateMelody = true;
                var pick; while((pick = Math.floor(Math.random()*40)) == this.melody.lastPick) {};
                this.melody.pick = pick;    // this should cause melody_sequence to recalc
                
                console.log("melody_sequence",this.melody.nCount, this.melody.percentLeaps, this.melody.nChromatics, this.melody.pick, this.melody.lastPick);
                this.melody.sequence = generateMelody(this.tonality, this.melody, this.melody_fragmentSet, this.melody.pick);
                console.log(this.melody.sequence);
                return this.melody.sequence;
            },
            harmony_sequence: function() {
                this.onUpdateHarmony = true;
                console.log("harmony_sequence for melody",this.melody_sequence);
                this.harmony.sequence = generateHarmony(this);
                return this.harmony.sequence;
            }
        },
        watch: {
            // These tonality.xxx functions detect changes in options, do the necessary calcs and then set flag on UI update 
            "tonality.scaleName": function(newSN, oldSN) {
                console.log("watch","tonality.scaleName");
                var tonality = this.tonality;
                tonality.modeNames = [];
                if(tonality.scaleName == "") return;

                // populate the modes
                scaleInfo.scaleModes.filter(sm => sm.name == newSN).forEach(function(sm) { tonality.modeNames.push(sm.mode); });
                
                tonality.modeName = tonality.modeNames[0];
                this.onUpdateScaleOptions = true;
           },
           "tonality.tonic": function(newT, oldT) {
                this.onUpdateScaleOptions = true;
           },
           "tonality.modeName": function(newT, oldT) {
                this.onUpdateScaleOptions = true;
           },
           melody: function(newM, oldM) {
               console.log(newM, oldM);
           }
        },
        created: function() {
            // initialize
            scaleInfo.scales.forEach(sn => this.tonality.scaleNames.push(sn));
            this.tonality.scaleName = "major";
            this.harmony.type = this.harmony.types[0];
            
            // Decorate the scale modes
            for(i in scaleInfo.scaleModes) {
                sm = scaleInfo.scaleModes[i];
                sm.intervals = offsetsToNotes(teoria.note("c3"), sm.offsets);
            }
        },
        updated: function() {   // process triggers
            console.log("updated",this.onUpdateMelody);
            if(this.onUpdateScaleOptions) {
                // scale config updated, so update mode and cached teoria info, and then display & play
                var tonality = this.tonality;
                console.log("app:updateScale", this.tonality);

                tonality.scaleMode = scaleInfo.scaleModes.find(sm => sm.name == tonality.scaleName && parseInt(sm.mode) == tonality.modeName);

                tonality.scale = generateScale(tonality.tonic, tonality.scaleMode);
                tonality.scaleBookend = generateScale(tonality.tonic, tonality.scaleMode, true);
                
                showSM('notation1', tonality.scaleBookend.notes());    
                //playSM(0.2, tonality.scaleBookend.notes());
                
                this.melody.pick = this.melody.lastPick = null;
                
                this.onUpdateScaleOptions = null;
            }
            if(this.onUpdateMelody) {
                var melody = this.melody;
                console.log("app:updateMelody", this.onUpdateMelody);

                if(this.melody_sequence) {
                    showSM('notation2', this.melody_sequence.notes);    
                    playSM(0.1, this.tonality.scaleBookend.notes());  
                    playSM(0.5, this.melody_sequence.notes);  
                }
                
                this.onUpdateMelody = null;                
            }
            if(this.onUpdateHarmony) {
                // when harmony is updated, show the notation but its manual to play
                var harmony = this.harmony;
                console.log("app:updateHarmony", this.onUpdateHarmony);
                
                if(this.melody_sequence && this.harmony_sequence) {
                    showSM('notation2',this.melody_sequence.notes, this.harmony_sequence.notes);  
                    //playSM(0.5, this.melody_sequence.notes, this.harmony_sequence.notes);  
                }
                this.onUpdateHarmony = null;                
            }
        },
        methods: {
            regenerate_melody: function() {
                var pick;
                while((pick = Math.floor(Math.random()*70)) == this.melody.lastPick) {};
                this.melody.pick = pick;    // this should cause melody_sequence to recalc
                
                this.onUpdateMelody = true;
            }
        }
    });
    
}

function playScale()
{
    var tonality = app._data.tonality;
    showSM('notation1', tonality.scaleBookend.notes());    
    playSM(0.2, tonality.scaleBookend.notes());
}
