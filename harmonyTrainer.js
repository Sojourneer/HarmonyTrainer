
audioNet = {
    masterVol: new Tone.Volume(-6).toDestination()
}
audioNet.centerSynth = new Tone.PolySynth(Tone.FMSynth).connect(audioNet.centerPan = new Tone.Panner(0).connect(audioNet.masterVol));
audioNet.centerSynth.connect(audioNet.masterVol);

audioNet.leftSynth = new Tone.PolySynth(Tone.FMSynth).connect(audioNet.leftPan = new Tone.Panner(-1).connect(audioNet.masterVol));
audioNet.rightSynth = new Tone.PolySynth(Tone.FMSynth).connect(audioNet.rightPan = new Tone.Panner(1).connect(audioNet.masterVol));


function updateConfig()
{
    eval(editor.getValue());
    console.log(config);
    
    generateScale(config.key, config.scale);
}

 function showSM(eltName, notes) {
     baseScale = app._data.tonality.scale; 
    var s = "";
    var bSolfege = (eltName == "notation2");
    for(var i=1; i < arguments.length; ++i) {
    //  s = s + `V:${i}\n` +  arguments[i].reduce((str,note) => str + note.abc() + " ", "") + "\n";
        if(i == 1) s = ''; else s += ' & ';
        var ann = i % 2 ? "_\"" : "^\"";
        if(bSolfege && i==1)
            s += arguments[i].reduce((str,note) => str + ann + note.solfege(baseScale) + "\"" + note.abc() + " ", "");
        else
            s += arguments[i].reduce((str,note) => str + note.abc() + " ", "");
        
    }
    console.log(s);
    ABCJS.renderAbc(eltName, 'K: C\nL:1/4\n' + s + "\n",{add_classes:true});
}

function Sequencer()
{
    this.sequences = [];
    this.sequenceId = 0;
    this.running = false;
    var self = this;
    
    Tone.Transport.on("sequenceEnd", function(entry) {
        console.log(entry.id,"transport:sequenceEnd", self.sequences.length == 1 ? "last": "more");
        if(self.sequences.length == 0) {
            return;
        }
        console.assert(self.sequences[0].id == entry.id, "sequence id %d, expected %d", entry.id, self.sequences[0].id);

        var top = self.sequences.shift(); // get and remove the top (do we need to do anything else to it?)
        // chain to the next part
        self.start();
    });
    Tone.Transport.on("stop", function(when) { console.log("transport.stop at",when); });

}
Sequencer.prototype.append = function(sequence) {
    this.sequences.push({id: ++this.sequenceId, sequence:sequence});
    if(!this.running && Tone.context.state != "suspended")
        this.start();
}
Sequencer.prototype.reset = function()
{
    this.sequences = [];
    this.running = false;
}
Sequencer.prototype.start = function()
{
    if(this.sequences.length == 0) {
        console.log("Sequencer.start","empty");
        this.running = false;
        return;
    }
    this.running = true;

    Tone.Transport.cancel(0);

    // Get the sequence, and output it
    var entry = this.sequences[0], sequence = entry.sequence;
    console.log(entry.id, "Sequencer.start", sequence);
    sequence.events.forEach(ev => sequence.callback(ev, entry.id));
    
    // schedule start and stop.
    Tone.Transport.start();
    Tone.Transport.scheduleOnce(function() { Tone.Transport.stop(); Tone.Transport.emit("sequenceEnd", entry); }, sequence.stop);
}

var sequencer = new Sequencer();

function playSM(sec, notes) {
    nArg = arguments.length;    // for some reason, the arguments vector is getting munged.  So we cache it.
    var when;
    events = [];
    maxTime = 0;
    for(var ia=1; ia < nArg; ia++) {
        var synth;
        if(nArg == 2)
            synth = audioNet.centerSynth;
        else
            synth = (ia == 1 ? audioNet.leftSynth : audioNet.rightSynth); 
        arguments[ia].forEach(function(n,i) {
                events.push({time: "+" + i*sec + "s", note: n.toString(), synth: synth}); 
            } );
        maxTime = Math.max(maxTime, arguments[ia].length*sec);
    }
    sequencer.append({start:0, stop: "+" + (maxTime + sec) + "s", events: events,
                callback:function(ev, entryId) {
                        //console.log(entryId, "callback", ev.time, ev.note);
                        ev.synth.triggerAttackRelease(ev.note, "8n", ev.time);
                    },
            });
 }
 
//--------------------------
/*
function generate() {
    generateScale(config.key, config.scale);

    //todo generate random start note for melody
    startDegree = Math.floor(1 + Math.random() * 8);  
    startNote = cache.scale.get(startDegree);
    console.log(`%c ${startDegree} ${startNote}`, 'color:green;font-weight:bold');     
    generateMelody(startNote);
}
*/

function generateScale(sTonic, mode, bBookend) {
    v = bBookend ? mode.intervals.concat("P8") : mode.intervals;
    return teoria.scale(sTonic + "4", v);
}

//-----------------
function generateMelody(cfgTonality,cfgMelody, fragmentSet, pick)
{
    console.log(cfgTonality,cfgMelody);
    /*
        Phase 1: just find anything that matches. Make the first fragment start at the tonic????? Or random?
        Phase 2: Find the closest thing that matches to the n-th position, where n is random  0..100%
    */
    
    // The approach below produces notes, not scale degrees.  So, semantic info such as spelling is not produced.
    //  It may be better to produce scale degrees, but then +/- adjustments may be needed, eg. flatted 5th degree.
    //  What is the correct music theory way to do this?  Does it all have to be brought back to the Major scale?
    chromatic = teoria.note(cfgTonality.tonic + "4").scale("chromatic")
    var offsets = [];
    
    for(n=pick, i=0; i < fragmentSet.length && n > 0; ++i) {
        var entry = fragmentSet[i];
        frag = entry.matches.find(match =>
               (match.s == cfgTonality.scaleName)
            && (match.m == cfgTonality.modeName)
            && (parseInt(cfgMelody.nChromatics) == (match.c ? match.c : 0) )
            )
        if(frag == null) continue;

        --n;
        //if(--n > 0) continue; // skip if we are still counting
        
        offsets = []
        for(j=0, pos=0; j < entry.steps.length; ++j) {
            pos += entry.steps[j];
            offsets.push(pos);
        }
        //break;
    }
   
    sequence = new NoteSequence(notes = offsets.map(o => chromatic.get(o+1)));
    console.log("GenerateMelody",entry.steps,offsets,notes.map(n => n.toString()));
    
    return sequence;
}

function offsetsToNotes(base,offsets)
{
    console.groupCollapsed();
    baseKey = base.key();
    
    nn = ["c","d","e","f","g","a","b"];
    showMissing = false
    intvls = ["P1"];
    for(j=1; j < offsets.length; ++j) {
       pk = baseKey + offsets[j];
       note = teoria.note.fromKey(pk)
       if((offsets.length == 7 && note.name() != nn[j])) {
            // Found that note name doesn't follow the major scale sequence.  Fix by looking at enharmonics
            enh = note.enharmonics()
            note2 = enh.find(n => n.name() == nn[j])
            if(note2) { // found the expecting name in the enharmonics
                note = note2;
                //console.log("enharmonic",sm.name,sm.mode,sm.intervals[j]);
            } else {
                // Hmm, the name isn't available enharmonically either.  Pick the note with smallest number of accidentals
                console.log("missing scale degree",sm.name,sm.mode,j,sm.offsets[j],note.toString(), enh.map(n => n.toString()).join("/"));
                showMissing = true;
                minAcc = enh.reduce(function(m,n) { return Math.min(m, Math.abs(n.accidentalValue())); }, 1000);
                note = enh.find(n => Math.abs(n.accidentalValue()) == minAcc);
            }
       }
       if(offsets.length < 7) {
            enh = note.enharmonics().concat(note)
            function dislike(n) {   // maps -ve and +ve values diagonally. if same accidentalValue, -ve is better
                acc = n.accidentalValue();
                return acc < 0 ? -2*acc - 1 : 2*acc;
            }
            console.log("non-hepta notes:dislike",enh.map(n => n.toString() + ":" + dislike(n)))
            minAcc = enh.reduce(function(m,n) { return Math.min(m, dislike(n)); }, 1000);
            note = enh.find(n => dislike(n) == minAcc);
       }
       intvls.push(teoria.interval(base,note).toString())
    }
    if(showMissing)
        console.log(intvls);

    console.groupEnd();
    return intvls;
}

//----------------------------
function generateHarmony(cfg)
{
    h = cfg.harmony;
    if(!h.type || !cfg.tonality.scale || ! cfg.melody.sequence)
        return;
    if(h.type.type == "diatonicTranspose")
        return cfg.melody.sequence.diatonicTranspose(cfg.tonality.scale, h.type.transposeDegrees);
    else if (h.type.type == "pedal") {
        pedal = cfg.tonality.scale.get(h.type.degree)
        return new NoteSequence(Array(cfg.melody.sequence.length()).fill(pedal))
    }
}

function playHarmony()
{
    playSM(0.5, options.melody.sequence.notes, options.harmony.sequence.notes);  
}