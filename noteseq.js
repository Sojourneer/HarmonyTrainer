function NoteSequence(vNotes)
{
    for(i=0, this.notes = []; i < vNotes.length; ++i) {
        note = vNotes[i];
        if(note instanceof teoria.Note)
            this.notes.push(note);
        else if(typeof note == "string")
            this.notes.push(teoria.note(note));
        else
            this.notes.push(teoria.note(note));  
    }        
}

NoteSequence.prototype = {
    length : function() {
        return this.notes.length;
    },
    
    toString: function() {
        return "NoteSequence(" + this.notes.map(n => n.toString()).join(" ") + ")";
    },
    scaleDegrees: function(scale) {
        var deg = [], sio0, ni, nk, si, sk;
       
        // get the starting point for the scale for scanning, dropping octaves until it starts lower than the first note
        var nkMin = this.notes.reduce((r,n) => Math.min(n.key(),r), 1000);
        for(si0=1; scale.get(si0).key() > nkMin; si0 -= 7); // tonic == 1

        // This method uses key(), which means that double sharps and flats are simplified.
        // To try: Alternatively, we could use the note names and calculate the accidentals.
        for(ni=0; ni < this.notes.length; ++ni) {
            nk = this.notes[ni].key()
            
            for(si=si0; true; si++) {
                sk = scale.get(si).key();
                if(sk == nk) {
                    deg.push(si);
                    break;
                } else if(sk > nk) {    // too far.  Take the last scale degree, and calculate accidental. Use interval to recover note
                    //console.log("extra note",{ni,nk, si,sk})
                    deg.push({d:si, acc: nk - sk})
                    break;
                }
            }
        }
        console.log("degrees of",this.notes.map(n => n.toString()).join(","),"are",deg);
        return deg;
    },

    diatonicTranspose: function(scale, nDegrees) {
        var deg = this.scaleDegrees(scale);
        var result = deg.map(function(d) {
            if(typeof(d) == "number")
                return scale.get(d + nDegrees);

            var base = scale.get(d.d + nDegrees), adjusted;
            switch(d.acc) {
                case -1:
                    adjusted = base.interval("m-2"); break;
                case -2:
                    adjusted =  base.interval("M-2"); break;
                case -3:
                    adjusted =  base.interval("m-3"); break;
                default:
                    throw `Error: ${d.acc} is outside the range of adjustments for a scale degree`;
            }
            return adjusted.asNamed(base.name());
        });
        
        console.log("diatonicTranspose",result.map(n => n.toString()).join(","));
        return new NoteSequence(result);
    }
}
