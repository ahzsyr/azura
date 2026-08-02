const line = '    titleAr: "x",\r';
console.log("match", line.match(/^(\s*)(\w+)Ar\s*:\s*(.*)$/));
console.log("match2", line.match(/^(\s*)(\w+)Ar\s*:\s*(.*)\r?$/));
